import path from 'node:path';

import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

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

// The loading toast has to be PAINTED before loadScoreFromBytes takes the main thread. Sonner
// enters over 400 ms and a blocked thread freezes that fade wherever it got to, so a toast still
// at opacity 0 when the freeze begins is never seen at all — measured peak opacity 0.00 while the
// text said "Opening …", on every file, throttled or not. It works only because client/'s Toaster
// gives loading toasts `transition-none`. The CPU throttle widens the parse so the window is
// unmissable, and the assertion is on painted OPACITY on purpose: Playwright counts a fully
// transparent element as visible, so toBeVisible() would pass against the bug.
test('the "Opening…" toast is painted, not merely present', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
    timeout: 30_000,
  });

  await page.evaluate(() => {
    const samples: number[] = [];
    (globalThis as unknown as { __opening: number[] }).__opening = samples;
    const tick = () => {
      const toast = document.querySelector('[data-sonner-toast]');
      if (toast?.textContent?.includes('Opening')) {
        samples.push(Number(getComputedStyle(toast).opacity));
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 20 });
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.gp');
  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute('data-file', 'Punk.gp', {
    timeout: 60_000,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });

  const opacities = await page.evaluate(
    () => (globalThis as unknown as { __opening: number[] }).__opening,
  );
  expect(Math.max(0, ...opacities)).toBeGreaterThan(0.9);
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

// The other half of that backstop. The 60 s timer and the font race each other, and the font can
// win LATE — the slow link the timeout is explicitly sized for, or a throttled background tab. The
// banner must then GO AWAY: a finished render proves the font arrived, and "reload the page to try
// again" is simply wrong over a score that is already drawing. Only the FONT errors clear this
// way; a SoundFont failure (E202) is not disproved by a render, and persists on purpose.
test('a music font that arrives after the 60 s backstop clears the error', async ({ page }) => {
  // Definite-assignment: the executor runs synchronously, so releaseFont is set before any await.
  let releaseFont!: () => void;
  const held = new Promise<void>((resolve) => {
    releaseFont = resolve;
  });
  await page.route('**/alphatab/font/**', async (route) => {
    await held;
    await route.continue();
  });

  // Fake time, so 60 s of waiting costs no wall clock. Resumed as soon as the banner is up: left
  // frozen, AlphaTab's own timers never advance and the render could not finish.
  await page.clock.install();
  await page.goto('/play');
  // RETRY the fast-forward. The backstop is armed in an effect keyed on the api, which does not
  // exist until the engine module has imported — fast-forwarding before that moment advances past
  // nothing, and the timer is then armed against the new clock.
  await expect(async () => {
    await page.clock.fastForward(61_000);
    await expect(page.getByTestId('engine-error')).toContainText('Error E204', { timeout: 1000 });
  }).toPass({ timeout: 20_000 });
  await page.clock.resume();

  releaseFont();
  await expect(page.getByTestId('engine-error')).toBeHidden({ timeout: 30_000 });
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible();
  await expect(page.getByTestId('notation-skeleton')).toHaveCount(0);
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
// handlers — a dragenter/dragleave depth counter and acceptDropped — and it is driven here through
// Chrome's OWN drag pipeline, not a synthetic dispatchEvent. That difference is load-bearing and
// already cost one bug: the browser fires `drop` only when dragover leaves the operation
// compatible with the SOURCE's effectAllowed, and dispatchEvent skips that negotiation entirely —
// so a synthetic test goes green against a player that rejects every real drag on the machine.
//
// CDP has no dragLeave type and needs none: Chrome synthesizes leave and enter itself when a
// dragOver lands on a new element, in the real order (enter the CHILD, then leave the parent),
// which is the order the depth counter exists for.
//
// dragOperationsMask is the source's effectAllowed. COPY_ONLY is deliberate: it is what a photo,
// a screenshot or a download offers, and it is the case a stray dropEffect silently rejects. A
// link-capable source would pass even against that bug.
const COPY_ONLY = 1;

async function fileDrag(page: Page, file: string, operations = COPY_ONLY) {
  const cdp = await page.context().newCDPSession(page);
  const data = { items: [], files: [path.resolve(file)], dragOperationsMask: operations };
  return async (type: 'dragEnter' | 'dragOver' | 'drop', target: Locator) => {
    const box = (await target.boundingBox())!;
    await cdp.send('Input.dispatchDragEvent', {
      type,
      x: Math.round(box.x + box.width / 2),
      y: Math.round(box.y + box.height / 2),
      data,
    });
  };
}

test('dragging a file onto the player opens it', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
    timeout: 30_000,
  });

  const drag = await fileDrag(page, 'e2e/fixtures/Punk.gp');
  const zone = page.getByTestId('drop-zone');
  await drag('dragEnter', zone);
  await drag('dragOver', zone);
  // Assert the overlay BEFORE the drop: endDrag() clears it synchronously, so afterwards there is
  // nothing left to see and the assertion could never fail.
  await expect(page.getByText('Drop to open')).toBeVisible();
  await drag('drop', zone);

  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute('data-file', 'Punk.gp', {
    timeout: 30_000,
  });
  // Punk.gp renders two drum tracks and the bundled beat renders one, so this cannot pass on a
  // drop that did nothing.
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2');
  // The overlay must clear on drop, or it would sit over the score for the rest of the session.
  await expect(page.getByText('Drop to open')).toBeHidden();
});

// The dropped-file failure path. A drop the importer cannot read must SAY so — the silent version
// of this is indistinguishable, to the person, from a drop the player never received at all.
// package.json rather than a committed binary: ScoreLoader sniffs content and never sees a name,
// so any unreadable bytes exercise the same branch.
test('dragging a file that is not a score reports it instead of failing silently', async ({
  page,
}) => {
  await page.goto('/play');
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
    timeout: 30_000,
  });

  const drag = await fileDrag(page, 'package.json');
  const zone = page.getByTestId('drop-zone');
  await drag('dragEnter', zone);
  await drag('dragOver', zone);
  await drag('drop', zone);

  await expect(page.getByText(/not a score format the player reads\. \(Error E103\)/)).toBeVisible({
    timeout: 15_000,
  });
  // …and the score already on screen is untouched.
  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute('data-file', '1-beat.gp');
});

// The COUNTER, not a flag. `dragleave` fires on the container whenever the pointer crosses into a
// CHILD, so a naive setDragging(false) strobes the overlay off mid-drag — 14 transitions were
// measured on one pass across the control. Crossing from the transport row up onto the notation is
// that exact move, and it is the case a flag cannot survive.
test('the drop overlay survives the pointer crossing into a child', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
    timeout: 30_000,
  });

  const drag = await fileDrag(page, 'e2e/fixtures/Punk.gp');
  const overlay = page.getByText('Drop to open');
  const transport = page.getByTestId('player-status');
  const notation = page.getByTestId('notation-surface');

  await drag('dragEnter', transport);
  await drag('dragOver', transport);
  await expect(overlay).toBeVisible();

  // Still inside the drop zone, only over a different child of it — the overlay must stay up.
  await drag('dragOver', notation);
  await expect(overlay).toBeVisible();

  await drag('drop', notation);
  await expect(overlay).toBeHidden();
  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute('data-file', 'Punk.gp', {
    timeout: 30_000,
  });
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

test('Loop, Metronome and Count-In each flip the engine state', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  const status = page.getByTestId('player-status');
  await expect(status).toHaveAttribute('data-looping', 'false');
  await expect(status).toHaveAttribute('data-metronome', 'false');
  await expect(status).toHaveAttribute('data-countin', 'false');

  await page.getByTestId('toggle-loop').click();
  await page.getByTestId('toggle-metronome').click();
  await page.getByTestId('toggle-countin').click();

  await expect(status).toHaveAttribute('data-looping', 'true');
  await expect(status).toHaveAttribute('data-metronome', 'true');
  await expect(status).toHaveAttribute('data-countin', 'true');
  await expect(page.getByRole('button', { name: 'Loop' })).toHaveAttribute('aria-pressed', 'true');

  // The attributes above mirror the app's own state, so they would flip even if the write never
  // reached AlphaTab — a callback that closed over the `undefined` api from before the engine
  // arrived does exactly that. Read the engine itself, through the debug handle `useAlphaTab`
  // parks on the host element.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const at = (
          document.querySelector('[data-testid="notation-surface"] > div') as {
            at?: { isLooping: boolean; metronomeVolume: number; countInVolume: number };
          } | null
        )?.at;
        return at ? [at.isLooping, at.metronomeVolume, at.countInVolume] : null;
      }),
    )
    .toEqual([true, 1, 1]);
});

test('the scrubber seeks and the position follows', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  const status = page.getByTestId('player-status');
  await expect
    .poll(async () => Number(await status.getAttribute('data-duration')))
    .toBeGreaterThan(0);

  // The rail must really be painted. Its class strings live in a plain `.ts` module shared with
  // RangeSlider, and this app generates design-system CSS by scanning client/ source files — so a
  // scan that misses that module leaves the rail 0 px wide with nothing failing anywhere else:
  // the slider role, its value and keyboard seeking all still work on an invisible control.
  const rail = page
    .locator('[data-slot="scrubber"] [data-slot="slider"] [data-index]')
    .locator('..');
  await expect
    .poll(async () => {
      const box = await rail.boundingBox();
      return box?.width ?? 0;
    })
    .toBeGreaterThan(100);

  const seek = page.getByRole('slider', { name: 'Seek' });
  await seek.focus();
  // Five one-second steps.
  await seek.press('ArrowRight');
  await seek.press('ArrowRight');
  await seek.press('ArrowRight');
  await seek.press('ArrowRight');
  await seek.press('ArrowRight');

  // AlphaTab's own clock, through the debug handle `useAlphaTab` parks on the host element — the
  // same read Plan A Task 11 uses. Deliberately NOT a data-* attribute: `seek` writes
  // `setPositionMs(ms)` optimistically, so a mirrored hook would report the requested value even if
  // the engine refused it, and the assertion would pass on a broken seek.
  //
  // Read the TICK, not the time. With the audio worker enabled (the browser default),
  // `api.timePosition` is served by AlphaSynthWebWorkerApi, whose setter stores the requested value
  // into its local `_currentPosition` BEFORE posting `alphaSynth.setTimePosition` to the worker, and
  // whose getter returns that stored value — so the time position echoes the request whether or not
  // the worker acted on it. That same setter copies `currentTick` through unchanged, so
  // `api.tickPosition` moves only when a real position update arrives back from the worker. The tick
  // is therefore the only one of the two that a refused seek leaves at zero.
  const engineTickPosition = () =>
    page.evaluate(
      () =>
        (
          document.querySelector('[data-testid="notation-surface"] > div') as {
            at?: { tickPosition: number };
          } | null
        )?.at?.tickPosition ?? 0,
    );

  // The score is paused, so the tick only leaves 0 if the worker accepted the five one-second
  // seeks. A tick threshold cannot be a fixed millisecond number — ticks depend on the score's
  // tempo and MIDI division — so assert it moved off the start at all.
  await expect.poll(engineTickPosition, { timeout: 20_000 }).toBeGreaterThan(0);
});

test('the header tempo stepper changes playback speed', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  // The readout is a real input now (Base UI NumberField), so read its value, not its text.
  const value = page.getByRole('textbox', { name: 'Tempo' });
  const shown = Number(await value.inputValue());
  expect(shown).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Increase tempo' }).click();
  await expect(value).toHaveValue(String(shown + 1));
  // Off written speed now, and the button still holds focus, so the percentage is visible.
  await expect(page.getByTestId('tempo-control')).toHaveAttribute('data-off-speed', 'true');
  await expect(page.getByTestId('tempo-percent')).toBeVisible();

  // And the engine actually took it.
  await expect
    .poll(async () => Number(await page.getByTestId('player-status').getAttribute('data-speed')))
    .toBeGreaterThan(1);
});

test('shows a soundfont progress bar while the sounds download, then hides it', async ({
  page,
}) => {
  // Stretch the soundfont TRANSFER so the bar is observable — it is otherwise a sub-second
  // window, and Task 8 Step 4 only mounts the bar once progress has run past a 300 ms delay.
  // Delaying the START of the request (page.route + setTimeout + route.continue) does not help:
  // it shifts the same sub-second transfer later, and AlphaTab's soundFontLoad events only fire
  // while bytes arrive. Throttle the network at the browser level instead, BEFORE navigating.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 100,
    // ~150 KB/s: the ~302 KB soundfont then takes roughly two seconds to arrive, which is
    // comfortably past the 300 ms appear-delay and well inside the 30 s visibility timeout.
    downloadThroughput: 150 * 1024,
    uploadThroughput: 150 * 1024,
  });

  await page.goto('/play');

  const bar = page.getByRole('progressbar', { name: /sound/i });
  await expect(bar).toBeVisible({ timeout: 30_000 });

  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  await expect(bar).toHaveCount(0);
});
