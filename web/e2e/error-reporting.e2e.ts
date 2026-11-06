import { expect, test } from '@playwright/test';

import { KNOWN_ENGINE_NOISE } from '../lib/monitoring/known-engine-noise';
import { abortEngine } from './player-states';
import { messageOf, recordSentry, throwSentinel, withCode } from './sentry-envelopes';

// The reporting and privacy cases (spec section 6). Every case throws on purpose, so this file
// does NOT install failOnUnexpectedPageErrors — only *.vr.ts files must. Each case reads event
// envelopes only, never the session ping Release Health sends on every visit, and a case that
// expects something NOT to be sent ends with a sentinel it waits for.

// The integrations Sentry 11.4.0 runs with the settings in web/instrumentation-client.ts, measured
// on 2026-10-11. The filter removes four defaults by NAME, so a later version that renames one
// would bring it back without a word: Console lines can quote a broken alphaTex line, and a click
// breadcrumb records a button's label, which can hold a track name. Any change to this list after
// an upgrade needs a person to check what the new integration collects.
const EXPECTED_INTEGRATIONS = [
  'Breadcrumbs',
  'BrowserSession',
  'ConversationId',
  'CultureContext',
  'Dedupe',
  'EventFilters',
  'FunctionToString',
  'GlobalHandlers',
  'HttpContext',
  'InstrumentsTag',
  'LinkedErrors',
  'NextjsClientStackFrameNormalization',
];

test('the SDK runs with exactly the integrations the spec chose', async ({ page }) => {
  const sentry = await recordSentry(page);
  await page.goto('/');
  const sentinel = await throwSentinel(page, sentry, 'sentinel: integrations');
  expect([...(sentinel.sdk?.integrations ?? [])].toSorted((a, b) => a.localeCompare(b))).toEqual(
    EXPECTED_INTEGRATIONS,
  );
  // "Anonymously" rests on `userInfo: false` alone. Sentry 11's default infers each visitor's IP:
  // without that line, `infer_ip` reads `auto` and the session ping carries ip_address "{{auto}}".
  expect(sentinel.sdk?.settings?.infer_ip).toBe('never');
  // The check below reads the session ping, so the ping must be among the recorded envelopes first.
  await expect.poll(() => sentry.raw().join('\n')).toContain('"type":"session"');
  expect(sentry.raw().join('\n')).not.toContain('ip_address');
});

// Case 2. The visitor's file, not our bug: a warning, with what kind of file it is and its size.
test('a file that is not a score sends an E103 warning with its type and size, never its name', async ({
  page,
}) => {
  const sentry = await recordSentry(page);
  await page.goto('/play');
  const bytes = Buffer.from('this is not a guitar pro file');
  await page.getByTestId('open-file-input').setInputFiles({
    name: 'secret-song-name.gp5',
    mimeType: 'application/octet-stream',
    buffer: bytes,
  });
  await expect(page.getByText(/\(Error E103\)/)).toBeVisible({ timeout: 15_000 });

  await expect.poll(() => withCode(sentry, 'E103').length).toBe(1);
  const e103 = withCode(sentry, 'E103')[0] ?? {};
  expect(e103.level).toBe('warning');
  expect(e103.tags?.file_type).toBe('gp5');
  // 29 bytes, sent rounded up to the next power of two.
  expect(e103.contexts?.file).toEqual({ type: 'gp5', bytes: 32 });
  // The fixed sentence, not the engine's parse message, which can quote the file.
  expect(messageOf(e103)).toBe('E103: No AlphaTab importer accepts the bytes.');
  expect(sentry.raw().join('\n')).not.toContain('secret-song-name');
});

// Case 3. `transposed.alphatex` has a title ("Transposed") and two named tracks ("Lead",
// "Rhythm"), so every kind of name the filter knows is present.
test('a report holds no click, no console line, and no name from the file', async ({ page }) => {
  const sentry = await recordSentry(page);
  await page.goto('/play');
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/transposed.alphatex');
  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute(
    'data-file',
    'transposed.alphatex',
    { timeout: 30_000 },
  );
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  // Solo a track from the keyboard, ON the button itself: a click lands on the icon inside it,
  // which can leave the button beyond Sentry's 80-character limit for a click's ancestors — and
  // then no label is recorded even with click breadcrumbs on, so the case would test nothing.
  await page.getByTestId('tracks-trigger').click();
  await page.getByRole('button', { name: 'Solo Rhythm' }).focus();
  await page.keyboard.press('Enter');
  await page.evaluate(() => {
    console.error('console-marker-7f3a');
  });

  // The probe quotes all three kinds of name: the file's (remembered when it was picked), the
  // score's title and a track's (both remembered when it parsed).
  const report = await throwSentinel(
    page,
    sentry,
    "privacy probe: transposed.alphatex, Transposed (reading 'Rhythm')",
    "privacy probe: [file], [file] (reading '[file]')",
  );
  expect(report.breadcrumbs?.some((crumb) => crumb.category?.startsWith('ui.'))).toBe(false);
  const raw = sentry.raw().join('\n');
  for (const text of [
    'transposed.alphatex',
    'Transposed',
    'Rhythm',
    'Lead',
    'console-marker-7f3a',
  ]) {
    expect(raw, `the envelope holds "${text}"`).not.toContain(text);
  }
});

// Case 6. NH-338's throw breaks nothing a person can see; sent as it is, it would use the monthly
// quota on a bug that is already known.
test('known engine noise never reaches Sentry (NH-338)', async ({ page }) => {
  const nh338 = KNOWN_ENGINE_NOISE.find((noise) => noise.ticket === 'NH-338')?.message ?? '';
  const sentry = await recordSentry(page);
  let seen = false;
  page.on('pageerror', (error) => {
    if (error.message.includes(nh338)) seen = true;
  });
  await page.goto('/play');
  const play = page.getByTestId('transport-play');
  await expect(play).toBeEnabled({ timeout: 60_000 });

  // Play, then Pause at once: the race NH-338 records, measured 7 times in 10.
  for (let attempt = 0; attempt < 20 && !seen; attempt += 1) {
    await play.click();
    await play.click();
    await page.waitForTimeout(300);
  }
  // Without the throw this case proves nothing. When NH-338 is fixed, delete the case.
  expect(seen, 'NH-338 never fired in 20 tries').toBe(true);

  await throwSentinel(page, sentry, 'sentinel: after NH-338');
  expect(sentry.events().filter((event) => JSON.stringify(event).includes(nh338))).toEqual([]);
});

// Case 7. Sentry 11's dataCollection settings leave page addresses alone; scrub.ts cuts them.
test('page addresses reach Sentry without their query or fragment', async ({ page }) => {
  const sentry = await recordSentry(page);
  await page.goto('/?fbclid=probe123#anchor-probe-456');
  const home = await throwSentinel(page, sentry, 'sentinel: on the home page');
  // A report from `/` never carries the instruments tag.
  expect(home.tags?.instruments).toBeUndefined();

  await page.getByRole('link', { name: 'Play' }).click();
  await expect(page).toHaveURL(/\/play$/);
  await throwSentinel(page, sentry, 'sentinel: after the Play link');

  const raw = sentry.raw().join('\n');
  expect(raw).not.toContain('probe123');
  expect(raw).not.toContain('anchor-probe-456');
});

// Case 5. Blocked storage is the visitor's environment: a breadcrumb only (S2b), which travels
// inside the next real report.
test('storage the browser blocks leaves a breadcrumb, never a report of its own', async ({
  page,
}) => {
  const sentry = await recordSentry(page);
  await page.addInitScript(() => {
    // What a browser with site data blocked does: the getter itself throws a SecurityError. A
    // plain Error here would be reported as a bug of ours, correctly.
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError');
      },
    });
  });
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  const sentinel = await throwSentinel(page, sentry, 'sentinel: storage blocked');
  expect(sentry.events()).toHaveLength(1);
  expect(
    sentinel.breadcrumbs?.some(
      (crumb) =>
        crumb.category === 'notation-hero' &&
        crumb.message === 'Player settings could not be read from storage' &&
        crumb.data?.error === 'SecurityError',
    ),
  ).toBe(true);
});

// Case 8. No case in player.e2e.ts aborts the engine module, so E201 gets its own.
test('an engine that never loads sends one unhandled E201', async ({ page }) => {
  // The recorder FIRST: the import fails during abortEngine's own first load of the page.
  const sentry = await recordSentry(page);
  await abortEngine(page);
  await expect(page.getByTestId('engine-error')).toContainText('Error E201', { timeout: 15_000 });

  await throwSentinel(page, sentry, 'sentinel: after E201');
  const reports = withCode(sentry, 'E201');
  expect(reports).toHaveLength(1);
  // The E201 and the sentinel, nothing else: an untagged copy of the same failure would be a third.
  expect(sentry.events()).toHaveLength(2);
  expect(reports[0]?.level).toBe('error');
  expect(reports[0]?.exception?.values?.[0]?.mechanism?.handled).toBe(false);
});

// Case 1. Before any file is opened, an error on /play carries the bundled beat's value.
test('on /play, before any file opens, an error carries instruments: sample', async ({ page }) => {
  const sentry = await recordSentry(page);
  await page.goto('/play');
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
    timeout: 30_000,
  });
  const sentinel = await throwSentinel(page, sentry, 'sentinel: on the bundled beat');
  expect(sentinel.level).toBe('error');
  expect(sentinel.tags?.instruments).toBe('sample');
});

// Case 4, first half. guitar-no-percussion.gp reaches NH-335 when the bundled beat arrives while
// the file opens — a race, so the file is opened again until the throw is seen (measured: it never
// happens when the beat is held back, so the late-beat half below cannot wait for it). None of
// those throws may be sent, and the next report carries the file's one track — an acoustic guitar,
// program 25 — not the bundled beat's value. When NH-335 is fixed, open the file once instead of
// looping, and stop waiting for the page error; keep the sentinel and its checks.
test("NH-335 is never sent, and the next report carries the opened file's instruments", async ({
  page,
}) => {
  const tries = 10;
  // One try is a page load, an open and a one-second wait: about two seconds measured, five here
  // for a slow machine. The slack covers the sentinel. A slow run then ends on the message below,
  // not on Playwright's 30-second default.
  test.setTimeout(tries * 5000 + 15_000);

  const nh335 = KNOWN_ENGINE_NOISE.find((noise) => noise.ticket === 'NH-335')?.message;
  // A renamed or removed entry would leave nothing to match: `includes('')` is true for any message.
  if (nh335 === undefined) throw new Error('NH-335 is no longer in the known-noise list');
  const sentry = await recordSentry(page);
  let nh335Seen = false;
  page.on('pageerror', (error) => {
    if (error.message.includes(nh335)) nh335Seen = true;
  });

  for (let attempt = 0; attempt < tries && !nh335Seen; attempt += 1) {
    await page.goto('/play');
    await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/guitar-no-percussion.gp');
    await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute(
      'data-file',
      'guitar-no-percussion.gp',
      { timeout: 30_000 },
    );
    await page.waitForTimeout(1000);
  }
  // Without the throw this case proves nothing about it.
  expect(nh335Seen, `NH-335 never fired in ${tries} tries`).toBe(true);

  const sentinel = await throwSentinel(page, sentry, 'sentinel: after NH-335');
  expect(sentinel.tags?.instruments).toBe('025');
  expect(sentry.events()).toHaveLength(1);
});

// Case 4, second half. The bundled beat arrives after the file (the hold-back the late-sample case
// in player.e2e.ts uses), and its score-loaded event must not put `sample` back.
test("a bundled beat that arrives after the file leaves the file's instruments in place", async ({
  page,
}) => {
  const sentry = await recordSentry(page);
  await page.route('**/notation/1-beat.gp', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    await route.continue();
  });
  const lateBeat = page.waitForResponse('**/notation/1-beat.gp');

  await page.goto('/play');
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/guitar-no-percussion.gp');
  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute(
    'data-file',
    'guitar-no-percussion.gp',
    { timeout: 30_000 },
  );
  await lateBeat;
  // Let the late beat's score-loaded event run, and the re-assert of the file that follows it.
  await page.waitForTimeout(2000);

  const sentinel = await throwSentinel(page, sentry, 'sentinel: after the late beat');
  expect(sentinel.tags?.instruments).toBe('025');
  expect(sentry.events()).toHaveLength(1);
});
