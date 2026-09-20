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

/** One animation frame of the loading bar, recorded by the test-side sampler below. */
interface BarSample {
  value: string | null;
  opacity: number;
}

/** Records the loading bar on every animation frame — TEST-side only, injected before the page. */
async function traceLoadingBar(page: Page): Promise<() => Promise<BarSample[]>> {
  await page.addInitScript(() => {
    const trace: { value: string | null; opacity: number }[] = [];
    (globalThis as unknown as { barTrace: typeof trace }).barTrace = trace;
    const sample = () => {
      const bar = document.querySelector('[role="progressbar"]');
      if (bar) {
        trace.push({
          value: bar.getAttribute('aria-valuenow'),
          opacity: Number(globalThis.getComputedStyle(bar).opacity),
        });
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  return () => page.evaluate(() => (globalThis as unknown as { barTrace: BarSample[] }).barTrace);
}

// The bar means "the player is not ready yet". It is on screen from the FIRST frame (indeterminate:
// the engine files report no progress), turns into a real fraction while the soundfont downloads,
// holds at 100 % and FADES out. Playwright's toBeVisible() counts opacity 0 as visible, so the
// fade is asserted from a per-frame trace, never from visibility.
test('the loading bar is there from the first frame, fills with the sounds, then fades', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const readTrace = await traceLoadingBar(page);

  // Throttle at the browser level BEFORE navigating: the soundfont is 977 KB, so ~400 KB/s keeps
  // the download long enough to watch. Delaying only the START of the request would not — the
  // progress events fire while bytes arrive.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 100,
    downloadThroughput: 400 * 1024,
    uploadThroughput: 400 * 1024,
  });

  await page.goto('/play');
  const play = page.getByTestId('transport-play');
  const bar = page.getByRole('progressbar', { name: 'Loading the player' });

  // There at once, while Play is still unavailable.
  await expect(bar).toBeAttached();
  await expect(play).toHaveAttribute('aria-disabled', 'true');

  // A real fraction once soundfont bytes flow.
  await expect
    .poll(async () => Number(await bar.getAttribute('aria-valuenow')), { timeout: 90_000 })
    .toBeGreaterThan(0);

  await expect(play).toBeEnabled({ timeout: 90_000 });
  await expect(bar).toHaveCount(0, { timeout: 10_000 });

  const trace = await readTrace();
  // Indeterminate first: no fraction exists before the first soundfont byte.
  expect(trace[0]?.value).toBeNull();
  // Never BACK to indeterminate once a fraction was shown — that was a grey blink at the end of
  // every load, in the gap between the download finishing and the player being ready.
  const firstFraction = trace.findIndex((sample) => sample.value !== null);
  expect(firstFraction).toBeGreaterThan(-1);
  expect(trace.slice(firstFraction).every((sample) => sample.value !== null)).toBe(true);
  // It finishes at 100 %, is shown fully opaque there, and then fades rather than vanishing.
  expect(trace.at(-1)?.value).toBe('100');
  expect(trace.some((sample) => sample.value === '100' && sample.opacity === 1)).toBe(true);
  expect(trace.some((sample) => sample.opacity > 0 && sample.opacity < 1)).toBe(true);
});

// The scenario that showed NO bar at all: a second visit on a slow connection. The soundfont is in
// the browser cache, so the request is a tiny revalidation, and AlphaTab reports the whole file in
// two progress events a millisecond apart at the very end of the wait. A bar driven only by those
// events can never show; one that means "not ready yet" does.
test('the loading bar shows on a warm cache, where no download progress is ever reported', async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto('/play');
  const play = page.getByTestId('transport-play');
  await expect(play).toBeEnabled({ timeout: 60_000 });

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 1000,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  await page.reload();

  const bar = page.getByRole('progressbar', { name: 'Loading the player' });
  await expect(bar).toBeAttached();
  await expect(play).toHaveAttribute('aria-disabled', 'true');

  await expect(play).toBeEnabled({ timeout: 90_000 });
  await expect(bar).toHaveCount(0, { timeout: 10_000 });
});

/** The slice of AlphaTab's bounds lookup the helpers below read through the `at` debug handle. */
interface BeatBoundsHost extends HTMLElement {
  at: {
    playbackRange: unknown;
    tickPosition: number;
    renderer: {
      boundsLookup: {
        staffSystems: {
          bars: {
            index: number;
            bars: { beats: { realBounds: { x: number; y: number; w: number; h: number } }[] }[];
          }[];
        }[];
      };
    };
  };
}

/**
 * Selects a bar range the way a person does: a REAL mouse drag across the notation, from the first
 * beat of one bar to the last beat of another. Coordinates come from AlphaTab's own bounds lookup,
 * so the helper follows the notation wherever the layout puts it.
 */
async function selectBars(page: Page, fromBar: number, toBar: number): Promise<void> {
  const beatPoint = (barIndex: number, pick: 'first' | 'last') =>
    page.evaluate(
      ([index, which]) => {
        const host = document.querySelector<HTMLElement>(
          '[data-testid="notation-surface"] > div',
        ) as BeatBoundsHost;
        const masterBar = host.at.renderer.boundsLookup.staffSystems
          .flatMap((system) => system.bars)
          .find((bar) => bar.index === index);
        if (!masterBar) throw new Error(`bar ${index} is not rendered`);
        const beats = masterBar.bars[0].beats;
        const beat = which === 'first' ? beats[0] : beats.at(-1);
        const surface = host.querySelector('.at-surface');
        if (!beat || !surface) throw new Error('no beat bounds to aim at');
        const origin = surface.getBoundingClientRect();
        return {
          x: origin.x + beat.realBounds.x + beat.realBounds.w / 2,
          y: origin.y + beat.realBounds.y + beat.realBounds.h / 2,
        };
      },
      [barIndex, pick] as const,
    );

  const from = await beatPoint(fromBar, 'first');
  const to = await beatPoint(toBar, 'last');
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  // Several moves: AlphaTab extends the selection on mousemove, and a single jump can miss it.
  await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 6 });
  await page.mouse.move(to.x, to.y, { steps: 6 });
  await page.mouse.up();

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            document.querySelector<HTMLElement>(
              '[data-testid="notation-surface"] > div',
            ) as BeatBoundsHost
          ).at.playbackRange !== null,
      ),
    )
    .toBe(true);
}

// A selection that exists but is not PAINTED is the bug this guards: AlphaTab gives the blocks a
// box and no colour, so `toBeVisible()` and a bounding-box check both pass against an invisible
// selection. The alpha is read by painting the computed colour onto a canvas, because the computed
// value is `oklab(… / 0.12)`, not an rgba() string a regex could be trusted with.
test('a dragged bar range is painted, not merely present', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  await selectBars(page, 0, 1);

  const blocks = await page.evaluate(() => {
    const context = document.createElement('canvas').getContext('2d');
    if (!context) throw new Error('no 2d context');
    return [...document.querySelectorAll('.at-selection > div')].map((block) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = globalThis.getComputedStyle(block).backgroundColor;
      context.fillRect(0, 0, 1, 1);
      const box = block.getBoundingClientRect();
      return {
        alpha: context.getImageData(0, 0, 1, 1).data[3],
        width: box.width,
        height: box.height,
      };
    });
  });
  expect(blocks.length).toBeGreaterThan(0);
  for (const block of blocks) {
    expect(block.alpha).toBeGreaterThan(0);
    expect(block.width).toBeGreaterThan(50);
    expect(block.height).toBeGreaterThan(20);
  }
});

// Base UI's Slider marks its own elements `data-dragging` while a thumb is held — the same
// attribute the file drop zone uses. A bare `[data-dragging]` rule therefore drew the drop zone's
// dashed outline around the seek bar on every scrub.
test('holding the seek thumb does not borrow the drop zone outline', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  const thumb = page.locator('[data-slot="scrubber"] [data-index]');
  const box = await thumb.boundingBox();
  if (!box) throw new Error('the seek thumb has no box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 60, box.y + box.height / 2, { steps: 4 });

  const held = page.locator('[data-slot="scrubber"] [data-dragging]');
  await expect(held.first()).toBeAttached();
  const outlines = await held.evaluateAll((elements) =>
    elements.map((element) => globalThis.getComputedStyle(element).outlineStyle),
  );
  await page.mouse.up();

  expect(outlines.length).toBeGreaterThan(0);
  expect(outlines).not.toContain('dashed');
});

// The ENGINE's tick through the debug handle, never the app's mirror: `seek` writes its position
// optimistically, so only the engine's own tick proves that audio is really being rendered.
const engineTick = (page: Page) =>
  page.evaluate(
    () =>
      (
        document.querySelector<HTMLElement>(
          '[data-testid="notation-surface"] > div',
        ) as BeatBoundsHost
      ).at.tickPosition,
  );

// The scenario, as it was reported: select a few bars to loop, play a little, pause. Drag the seek
// bar to a place PAST those bars and press Play: the button turns into Pause and nothing moves;
// press Pause and the bar falls back to where it was. In AlphaTab 1.8.4 a seek outside an active
// playback range leaves the sequencer clamped to the range's end while the reported time is the
// requested one, so Play produces empty buffers and its finish check never runs. The seek bar
// covers the WHOLE score, so using it drops the selection first — what AlphaTab itself does for a
// plain click on a beat.
test('a mouse seek past a selected bar range, then Play, plays on from there', async ({ page }) => {
  await page.goto('/play');
  const play = page.getByTestId('transport-play');
  const status = page.getByTestId('player-status');
  await expect(play).toBeEnabled({ timeout: 60_000 });
  await expect
    .poll(async () => Number(await status.getAttribute('data-duration')))
    .toBeGreaterThan(0);

  // Bar 1 of the bundled beat: the first two seconds of six.
  await selectBars(page, 0, 0);
  await expect(page.getByRole('button', { name: 'Loop selection' })).toBeVisible();

  // Play a little inside the range, then pause.
  await play.click();
  await expect.poll(() => engineTick(page)).toBeGreaterThan(480);
  await play.click();
  await expect(status).toHaveAttribute('data-playing', 'false');

  // Drag the THUMB to the middle of the rail with a real mouse — about 00:03, well past bar 1.
  const thumb = page.locator('[data-slot="scrubber"] [data-index]');
  const rail = await thumb.locator('..').boundingBox();
  const grip = await thumb.boundingBox();
  if (!rail || !grip) throw new Error('the seek bar is not laid out');
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(rail.x + rail.width / 2, rail.y + rail.height / 2, { steps: 10 });
  await page.mouse.up();
  // 3840 ticks is the end of bar 1; the middle of the score is well past it.
  await expect.poll(() => engineTick(page)).toBeGreaterThan(4800);
  const seekTick = await engineTick(page);
  // Using the seek bar dropped the selection, and the Loop toggle says so.
  await expect(page.getByRole('button', { name: 'Loop score' })).toBeVisible();

  // Play. The engine must really advance — a full beat past the target, so the seek's own echo
  // cannot satisfy it.
  await play.click();
  await expect.poll(() => engineTick(page), { timeout: 10_000 }).toBeGreaterThan(seekTick + 960);

  // Pause stays where playback got to; it does not fall back to the old position.
  await play.click();
  await expect(status).toHaveAttribute('data-playing', 'false');
  expect(await engineTick(page)).toBeGreaterThan(seekTick);
});

// No seek needed for this one: AlphaTab keeps the main-thread playbackRange across a score change
// while the new sequencer has none. Select bars, open another file, press Play — the cursor froze
// at the old range's end and Pause jumped back, with the toggle still reading "Loop selection".
test('opening a file drops the bar range selected in the previous score', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  await selectBars(page, 0, 0);
  await expect(page.getByRole('button', { name: 'Loop selection' })).toBeVisible();

  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.gp');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });

  await expect(page.getByRole('button', { name: 'Loop score' })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (
          document.querySelector<HTMLElement>(
            '[data-testid="notation-surface"] > div',
          ) as BeatBoundsHost
        ).at.playbackRange,
    ),
  ).toBeNull();
});

/** The one OPEN tooltip. A closing popup can stay in the DOM for a frame, hence `[data-open]`. */
const openTooltip = (page: Page) => page.locator('[data-slot="tooltip-content"][data-open]');

// An icon alone says neither what a control is nor what state it is in.
test('every transport icon button has a tooltip that tells its state', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  await page.getByTestId('transport-play').hover();
  await expect(openTooltip(page)).toHaveText('Play');

  await page.getByTestId('open-file-button').hover();
  await expect(openTooltip(page)).toHaveText('Open a file');

  await page.getByTestId('toggle-loop').hover();
  await expect(openTooltip(page)).toContainText('Loop: off');

  await page.getByTestId('toggle-countin').hover();
  await expect(openTooltip(page)).toHaveText('Count-in: off');

  const metronome = page.getByTestId('toggle-metronome');
  await metronome.hover();
  await expect(openTooltip(page)).toHaveText('Metronome: off');
  // A toggle's tooltip stays open across the press and says the NEW state at once — the pointer
  // does not have to leave and come back.
  await metronome.click();
  await expect(openTooltip(page)).toHaveText('Metronome: on');

  const play = page.getByTestId('transport-play');
  await play.hover();
  await play.click();
  await expect(openTooltip(page)).toHaveText('Pause');
  await play.click();
  await expect(openTooltip(page)).toHaveText('Play');
});

// A disabled control is exactly the one that owes an explanation. A disabled Button is
// `pointer-events: none`, so as its own tooltip trigger it never saw the hover: the hint opened on
// keyboard focus only, and a mouse user got a dimmed button and no reason.
test('a disabled transport toggle still opens its tooltip under the mouse', async ({ page }) => {
  // Stall the engine so the whole transport stays disabled.
  await page.route('**/alphatab/esm/alphaTab.mjs', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 8000));
    await route.continue();
  });
  await page.goto('/play');

  const loop = page.getByTestId('toggle-loop');
  await expect(loop).toHaveAttribute('aria-disabled', 'true');
  // page.mouse, not locator.hover(): hover() waits for the target to receive pointer events, and
  // the disabled button never does — which is the whole point. The pointer goes where a person's
  // would.
  const box = await loop.boundingBox();
  if (!box) throw new Error('the Loop toggle has no box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

  await expect(openTooltip(page)).toContainText('Loop: off');
});

// The tooltip centres on its trigger's box. A title button stretched across the header (flex-1)
// therefore put the file name's tooltip far to the right of the text it explains.
test('the file name tooltip opens under the name, not across the header', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  const name = page.getByTestId('loaded-notation-name');
  await name.hover();
  await expect(openTooltip(page)).toBeVisible();

  const trigger = await name.boundingBox();
  const tip = await openTooltip(page).boundingBox();
  if (!trigger || !tip) throw new Error('nothing to measure');
  // The button hugs its text …
  expect(trigger.width).toBeLessThan(400);
  // … and the tooltip's centre sits inside the button's own width.
  const tipCentre = tip.x + tip.width / 2;
  expect(tipCentre).toBeGreaterThan(trigger.x);
  expect(tipCentre).toBeLessThan(trigger.x + trigger.width);
});

// The tempo field behaves like a native number input for the mouse. A drag-to-change gesture once
// wrapped it and cancelled every pointerdown inside, so the number could not be selected at all.
test('the tempo number can be selected with the mouse and typed over', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  const tempo = page.getByRole('textbox', { name: 'Tempo' });
  const before = await tempo.inputValue();
  await tempo.dblclick();
  const selected = await tempo.evaluate((input: HTMLInputElement) =>
    input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0),
  );
  expect(selected).toBe(before);

  await page.keyboard.type('90');
  await page.keyboard.press('Tab');
  await expect(tempo).toHaveValue('90');
});
