import { readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test('renders the bundled sample score as notation', async ({ page }) => {
  await page.goto('/play');

  const surface = page.getByTestId('notation-surface');
  await expect(surface.locator('svg').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('notation-skeleton')).toHaveCount(0);
});

// The regression this whole delivery decision exists to prevent. Without self-hosted ESM the
// notation above still renders on a main-thread fallback and ONLY playback dies, so a test that
// checks for notation passes on a broken build.
test('plays through the real audio worklet, not the silent fallback', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', (message) => logs.push(message.text()));

  // NOTE: do NOT arm page.waitForResponse for alphaTab.worklet.mjs. Chromium does not expose an
  // AudioWorklet.addModule() fetch to ANY Playwright observer — not page.on('request'), not
  // context.on('request'), not context.route(), not even CDP Network.requestWillBeSent. Measured:
  // the server logged serving the file while all four observers missed it, and the original
  // waitForResponse timed out identically on a healthy build, on a 404, and on a wrong MIME type —
  // zero discriminating power. Assertion 3 below uses a direct request instead.
  await page.goto('/play');
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
    timeout: 30_000,
  });

  // 1. AlphaTab reports the native module-worker platform.
  //    `Platform: BrowserModule` comes from Environment.printEnvironmentInfo, which reads
  //    Environment.webPlatform — so it is the real discriminator. The tempting
  //    "Will use webworkers … with worklets for playback" line is NOT: createWorkerPlayer emits
  //    it whenever the context is secure and AudioWorkletNode exists, never consulting
  //    webPlatform, so it still logs on exactly the broken build this test guards against.
  await expect
    .poll(() => logs.some((line) => line.includes('Platform: BrowserModule')), { timeout: 30_000 })
    .toBe(true);

  const play = page.getByTestId('transport-play');
  await expect(play).toBeEnabled({ timeout: 60_000 });
  await play.click();

  // 2. Playback actually advances — read off AlphaTab's OWN cursor, not off anything this app
  //    maintains for the test's benefit. `data-playing` is fair game: it is real UI state, the
  //    Play/Pause button reads it. `.at-cursor-beat` is AlphaTab's beat cursor; it only moves when
  //    the player is genuinely running, which is exactly the claim under test.
  //
  //    A moving bounding box proves MOTION, not VISIBILITY. AlphaTab creates the cursor as a bare
  //    div with inline geometry and no paint, so an unstyled cursor still has a box that moves and
  //    still passes here. Whether it can be SEEN is the host app's CSS, and it stays a manual
  //    check.
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');
  const cursor = page.locator('.at-cursor-beat');
  await expect(cursor).toBeVisible({ timeout: 20_000 });
  const startedAt = await cursor.boundingBox();
  await expect
    .poll(
      async () => {
        // The box is read into a variable first: `(await …)?.x` trips
        // `unicorn/no-await-expression-member`, an error here under --max-warnings 0.
        const box = await cursor.boundingBox();
        return box?.x ?? startedAt?.x;
      },
      { timeout: 20_000 },
    )
    .not.toBe(startedAt?.x);

  // 3. The worklet module is served as executable JavaScript. A direct request, not a network
  //    event: deterministic, no timing race, and independent of the plumbing described above.
  const worklet = await page.request.get('/alphatab/esm/alphaTab.worklet.mjs');
  expect(worklet.status()).toBe(200);
  expect(worklet.headers()['content-type'] ?? '').toMatch(/javascript/i);

  // 4. Neither worker-construction error appeared. LAST, over the whole collected log: these only
  //    fire once the player is constructed, and construction returns early until a score is
  //    loaded — so a console check made before pressing Play passes on a broken build.
  expect(
    logs.filter((line) => line.includes('Failed to create worker for synthesizing audio')),
  ).toEqual([]);
  expect(logs.filter((line) => line.includes('Audio Worklet creation failed'))).toEqual([]);
});

// The player opens ON a score, so the open control must be reachable while one is already
// rendered — it is not tucked inside a start screen that disappears.
test('starts on the bundled sample beat, with the open control always present', async ({
  page,
}) => {
  await page.goto('/play');
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId('open-file-button')).toBeVisible();
});

test('an unsupported file raises a toast and leaves the player usable', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('open-file-input').setInputFiles({
    name: 'not-a-score.gp5',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('this is not a guitar pro file'),
  });

  // The number, not only the wording: it is the contract spec §4's failure table documents.
  await expect(page.getByText(/not a score format the player reads\. \(Error E103\)/)).toBeVisible({
    timeout: 15_000,
  });
  // The sample stays on screen, untouched — the whole point of parsing before swapping state.
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible();
});

// The 25 MB gate runs before the file is read, so a zero-filled buffer one byte over the limit is
// enough — its content never reaches the parser.
test('a file over 25 MB is refused before it is read', async ({ page }) => {
  await page.goto('/play');
  await page.getByTestId('open-file-input').setInputFiles({
    name: 'too-big.gp',
    mimeType: 'application/octet-stream',
    buffer: Buffer.alloc(25 * 1024 * 1024 + 1),
  });

  await expect(
    page.getByText(/too large to open\. The limit is 25 MB\. \(Error E101\)/),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible();
});

// Punk.gp parses to three tracks: 0:Drumkit (percussion, MIDI channel 9), 1:Distortion Guitar
// (not percussion) and 2:Drumkit Left (percussion, channel 9). A regression that rendered only
// track 0 would silently drop the left-hand staff — which is exactly why this fixture exists.
// Punk.mxl (MuseScore) and Punk.alphatex (Tabtify) are exports of the same score and parse to the
// same three tracks, so the promise is checked on Guitar Pro, MusicXML and alphaTex alike.
for (const fixture of ['Punk.gp', 'Punk.mxl', 'Punk.alphatex']) {
  test(`renders every drum track, not only track 0 — ${fixture}`, async ({ page }) => {
    await page.goto('/play');
    await page.getByTestId('open-file-input').setInputFiles(`e2e/fixtures/${fixture}`);
    await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });
  });
}

// Open a file and PROVE it opened. The data-file assertion is the load-bearing one: the bundled
// beat is on screen from the first paint, so "an svg is visible" and "one track rendered" are BOTH
// already true before any file is picked — only the filename tells the two apart. Shared by the
// open cases here and by every replace case further down.
async function openFirstScore(page: Page, fixture: string) {
  await page.goto('/play');
  await page.getByTestId('open-file-input').setInputFiles(`e2e/fixtures/${fixture}`);
  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute('data-file', fixture, {
    timeout: 30_000,
  });
}

// guitar-no-percussion.gp has one track whose only staff is NOT percussion, so
// selectDrumTrackIndexes returns [], the caller passes undefined, and AlphaTab renders
// score.tracks[0]. Verified by RUNNING, not by reading.
test('a score with no percussion staff opens on the first track', async ({ page }) => {
  await openFirstScore(page, 'guitar-no-percussion.gp');
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByTestId('rendered-track-count')).toHaveText('1');
});

// A failed music-font download used to leave the Skeleton up forever: AlphaTab's font checker has
// no fallback, fires no renderFinished and raises no api.error. Abort every font request and expect
// the engine error instead (NotationSurface's loadingerror listener).
test('a failed music-font download shows the engine error, not an endless Skeleton', async ({
  page,
}) => {
  await page.route('**/alphatab/font/**', (route) => route.abort());
  await page.goto('/play');
  await expect(page.getByTestId('engine-error')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('engine-error')).toContainText('Error E203');
  await expect(page.getByTestId('notation-skeleton')).toBeHidden();
});

// One fixture per importer path, and the evidence behind criterion 1's `.gp5`. All are already
// committed — no new content needed. 1-beat.musicxml and 1-beat.mxl are real MuseScore exports
// (plain and compressed MusicXML take different code paths); 1-beat.atex is a real alphaTex
// export. ScoreLoader never sees a filename, so one fixture per path is enough.
for (const fixture of [
  'alphatex-GP5.gp5',
  'alphatex-GPX.gpx',
  '1-beat.musicxml',
  '1-beat.mxl',
  '1-beat.atex',
]) {
  test(`opens ${fixture} and renders notation`, async ({ page }) => {
    await openFirstScore(page, fixture);
    await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
      timeout: 30_000,
    });
  });
}

// Everything above drives the PICKER. The DROP path is a separate entry point with its own
// handlers — a dragenter/dragleave depth counter and acceptDropped — and no input element to
// drive, so these two cases build a real DataTransfer inside the page and dispatch the events.
async function dropFile(page: Page, fixture: string) {
  // Base64 crosses evaluateHandle's serialization boundary intact; a Node Buffer does not.
  const base64 = readFileSync(`e2e/fixtures/${fixture}`).toString('base64');
  const dataTransfer = await page.evaluateHandle(
    ([data, name]) => {
      const bytes = Uint8Array.from(atob(data), (character) => character.codePointAt(0) ?? 0);
      const transfer = new DataTransfer();
      transfer.items.add(new File([bytes], name));
      return transfer;
    },
    [base64, fixture] as const,
  );

  const zone = page.getByTestId('drop-zone');
  await zone.dispatchEvent('dragenter', { dataTransfer });
  // Assert the overlay BEFORE the drop: endDrag() clears it synchronously, so afterwards there is
  // nothing left to see and the assertion could never fail.
  await expect(page.getByText('Drop to open')).toBeVisible();
  await zone.dispatchEvent('drop', { dataTransfer });
}

test('dragging a file onto the player opens it', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
    timeout: 30_000,
  });

  await dropFile(page, 'Punk.gp');

  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute('data-file', 'Punk.gp', {
    timeout: 30_000,
  });
  // Punk.gp renders two drum tracks and the bundled beat renders one, so this cannot pass on a
  // drop that did nothing.
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2');
  // The overlay must clear on drop, or it would sit over the score for the rest of the session.
  await expect(page.getByText('Drop to open')).toBeHidden();
});

// The COUNTER, not a flag. `dragleave` fires on the container whenever the pointer crosses into a
// CHILD, so a naive setDragging(false) strobes the overlay off mid-drag — 14 transitions were
// measured on one pass across the control. The sequence below is that exact crossing, and it is
// the case a flag cannot survive. No dataTransfer: only dragover and drop read one.
test('the drop overlay survives the pointer crossing into a child', async ({ page }) => {
  await page.goto('/play');
  const zone = page.getByTestId('drop-zone');
  const overlay = page.getByText('Drop to open');

  await zone.dispatchEvent('dragenter');
  await expect(overlay).toBeVisible();

  // Entering a child bubbles a second dragenter to the container (depth 2) BEFORE the container's
  // own dragleave arrives (depth 1) — still inside, so the overlay must stay up.
  await page.getByTestId('notation-surface').dispatchEvent('dragenter');
  await zone.dispatchEvent('dragleave');
  await expect(overlay).toBeVisible();

  // The real exit: the last leave unwinds the counter to 0.
  await zone.dispatchEvent('dragleave');
  await expect(overlay).toBeHidden();
});

// Playwright AUTO-DISMISSES window.confirm() when no listener is attached, which would silently
// turn every replace test into a cancel test. Each case below registers its handler BEFORE the
// action that triggers the prompt.
//
// Every replace case starts by opening a score the PERSON chose, because that is all the prompt
// guards: the bundled beat the page starts on is a default, not a choice, so replacing it never
// asks.
test('opening the first file replaces the bundled beat without asking', async ({ page }) => {
  await page.goto('/play');

  let prompts = 0;
  page.on('dialog', (dialog) => {
    prompts += 1;
    void dialog.dismiss();
  });

  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.gp');

  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute('data-file', 'Punk.gp', {
    timeout: 30_000,
  });
  expect(prompts).toBe(0);
});

test('cancelling a replacement keeps the current score playing from where it was', async ({
  page,
}) => {
  await openFirstScore(page, 'Punk.gp');
  const play = page.getByTestId('transport-play');
  await expect(play).toBeEnabled({ timeout: 60_000 });
  await play.click();
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');

  // The position comes from AlphaTab itself, through the debug handle the hook parks on the host
  // element. The app keeps no position state — test-only instrumentation never ships — and this is
  // that decision's payoff: the test reads the engine's own clock instead of a number mirrored
  // into the DOM for its benefit.
  const positionMs = () =>
    page.evaluate(
      () =>
        (
          document.querySelector('[data-testid="notation-surface"] > div') as {
            at?: { timePosition: number };
          } | null
        )?.at?.timePosition ?? 0,
    );

  // Wait for the position to MOVE, not just for data-playing. AlphaSynth._playInternal sets
  // PlayerState.Playing and fires stateChanged synchronously, before the worklet has played a
  // sample; timePosition only follows later, once the worklet reports samplesPlayed back. Reading
  // it the instant data-playing turns true therefore reads 0 on a perfectly good build, and a
  // plain expect would not retry.
  await expect.poll(positionMs, { timeout: 20_000 }).toBeGreaterThan(0);

  // Capture the position BEFORE the prompt — this is the value the resume has to preserve.
  const before = await positionMs();

  // Chain the dismissal onto waitForEvent rather than awaiting the dialog after setInputFiles:
  // window.confirm blocks the page, so a dismissal that waits for setInputFiles to resolve could
  // deadlock. This arms the handler first, dismisses as soon as the dialog fires, and still gives
  // us something to await before asserting.
  const dialogHandled = page.waitForEvent('dialog').then((dialog) => dialog.dismiss());
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.mxl');
  await dialogHandled;

  // Still the score the person opened, still playing.
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');
  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute('data-file', 'Punk.gp');

  // Never interrupted — NOT restarted. A lone `.toBeGreaterThan(before)` proves nothing here: a
  // restart from bar 1 climbs past `before` inside the poll window exactly as uninterrupted
  // playback does. The discriminator is the FIRST read after the dialog, taken while a restart
  // would still be near zero — playback that never stopped cannot have gone backwards.
  const after = await positionMs();
  expect(after).toBeGreaterThanOrEqual(before);

  // …and still advancing, not frozen.
  await expect.poll(positionMs).toBeGreaterThan(after);
});

test('re-picking the same file after a cancel prompts again', async ({ page }) => {
  await openFirstScore(page, 'Punk.gp');

  let prompts = 0;
  page.on('dialog', (dialog) => {
    prompts += 1;
    void dialog.dismiss();
  });

  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.mxl');
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.mxl');

  await expect.poll(() => prompts).toBe(2);
});

test('confirming a replacement renders the new score', async ({ page }) => {
  // Punk.gp renders TWO drum tracks and 1-beat.mxl renders ONE, so the count below actually
  // discriminates. An earlier version of this test replaced Punk.mxl with Punk.gp — both render
  // two — so it passed whether the swap happened or the player silently reverted.
  await openFirstScore(page, 'Punk.gp');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });

  page.on('dialog', (dialog) => dialog.accept());
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/1-beat.mxl');

  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute(
    'data-file',
    '1-beat.mxl',
    { timeout: 30_000 },
  );
  await expect(page.getByTestId('rendered-track-count')).toHaveText('1');
});

// The header is React state and the notation is AlphaTab's, so they can disagree — and did: every
// open after the first updated the name while the engine silently kept the previous score. The
// count is read from api.tracks, so this fails if the two ever diverge again.
test('a third score replaces the second — not only the first replacement works', async ({
  page,
}) => {
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/play');

  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.gp');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });

  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/1-beat.mxl');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('1', { timeout: 30_000 });

  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.mxl');
  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute('data-file', 'Punk.mxl', {
    timeout: 30_000,
  });
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2');
});

test('a corrupt replacement leaves the playing score intact', async ({ page }) => {
  await openFirstScore(page, 'Punk.gp');
  const play = page.getByTestId('transport-play');
  await expect(play).toBeEnabled({ timeout: 60_000 });
  await play.click();
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');

  page.on('dialog', (dialog) => dialog.accept());
  await page.getByTestId('open-file-input').setInputFiles({
    name: 'broken.gp5',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('not a score'),
  });

  await expect(page.getByText(/\(Error E103\)/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute('data-file', 'Punk.gp');
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');
});

// The guard that makes this pass has no other cover, and breaking it is silent: AlphaTab fetches
// settings.core.file itself and renders it WHENEVER it arrives, so a score opened during that
// window gets replaced by the bundled beat with no error anywhere. Delaying the bundled fetch
// forces the race open every run instead of leaving it to chance.
test('a score opened before the bundled beat arrives is not replaced by it', async ({ page }) => {
  await page.route('**/notation/1-beat.gp', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 4000));
    await route.continue();
  });

  await page.goto('/play');
  // Deliberately no wait: open while the bundled fetch is still in flight.
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.gp');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });

  // Outlast the delayed bundled load, then prove it did not win.
  await page.waitForTimeout(6000);
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2');
  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute('data-file', 'Punk.gp');
});
