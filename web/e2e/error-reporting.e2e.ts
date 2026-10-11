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
  expect(reports[0]?.level).toBe('error');
  expect(reports[0]?.exception?.values?.[0]?.mechanism?.handled).toBe(false);
});
