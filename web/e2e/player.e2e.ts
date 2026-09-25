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

// Defect 2 (NH-291): the failed state used to survive opening a completely different file — a
// single transient engine error disabled the player for the life of the page. Opening a file is
// a deliberate new attempt, and it now clears a stale banner instead of leaving it stuck forever.
// Aborting the soundfont request is the documented way to reach the E202 path (see the SoundFont
// comment on the 60s-backstop test above) — the same class of engine-runtime error Defect 1's
// crash also raised.
test('opening a new file clears a stale engine-error banner', async ({ page }) => {
  await page.route('**/alphatab/soundfont/**', (route) => route.abort());
  await page.goto('/play');
  await expect(page.getByTestId('engine-error')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('engine-error')).toContainText('Error E202');

  await page.unroute('**/alphatab/soundfont/**');
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/1-beat.gpx');
  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute(
    'data-file',
    '1-beat.gpx',
    { timeout: 30_000 },
  );

  await expect(page.getByTestId('engine-error')).toBeHidden({ timeout: 15_000 });
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible();
});

// Defect 3 (NH-291): the engine-error banner had no way to remove it from the screen — the
// maintainer's own words were "make sure we can remove them from the screen (like a close
// button)". A close control now hides it; dismissing does not "fix" the dead engine, only the
// message about it — see NotationSurface's own comment beside the button.
test('the engine-error banner can be dismissed', async ({ page }) => {
  await page.route('**/alphatab/soundfont/**', (route) => route.abort());
  await page.goto('/play');
  const banner = page.getByTestId('engine-error');
  await expect(banner).toBeVisible({ timeout: 15_000 });
  await expect(banner).toContainText('Error E202');

  await banner.getByRole('button', { name: /dismiss error message/i }).click();
  await expect(banner).toBeHidden();
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

  // And the write really reached the api — not just the React state the readout mirrors.
  // `data-speed` is the same `speed` the stepper already set, so polling it only re-asserts the
  // readout above. Read AlphaTabApi.playbackSpeed through the debug handle `useAlphaTab` parks on
  // the host element, the way the Loop/Metronome/Count-In case does. It is AlphaTab's own
  // main-thread mirror — the worker api stores `_playbackSpeed` before posting to the worker — so
  // it proves the engine write RAN; no main-thread read can prove the worker applied it.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            document.querySelector('[data-testid="notation-surface"] > div') as {
              at?: { playbackSpeed: number };
            } | null
          )?.at?.playbackSpeed ?? 0,
      ),
    )
    .toBeGreaterThan(1);
});

/** One animation frame of the loading bar, recorded by the test-side sampler below. */
interface BarSample {
  /** The animation frame it was taken on. A number MISSING from the trace is a frame with no bar. */
  frame: number;
  value: string | null;
  opacity: number;
}

/** Records the loading bar on every animation frame — TEST-side only, injected before the page. */
async function traceLoadingBar(page: Page): Promise<() => Promise<BarSample[]>> {
  await page.addInitScript(() => {
    const trace: { frame: number; value: string | null; opacity: number }[] = [];
    (globalThis as unknown as { barTrace: typeof trace }).barTrace = trace;
    // Counted on every frame, recorded only on the frames the bar is really there, so a bar that
    // blinks out leaves a HOLE in the numbering rather than no trace at all.
    let frame = 0;
    const sample = () => {
      frame += 1;
      const bar = document.querySelector('[role="progressbar"]');
      if (bar) {
        trace.push({
          frame,
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

// Opening a second file while the first bar is still LEAVING must keep one continuous bar: the
// phase re-arms in the same render, the half-faded bar snaps back to full opacity and runs its
// whole life again — 100 %, held, faded. The hook's own unit test reads a phase string, so none of
// this is visible to it: a bar that blinks out for a frame between the two loads, one that goes on
// fading through the second load, and one that vanishes at the end instead of leaving all pass it.
test('a file opened while the bar is fading keeps one continuous bar, not two', async ({
  page,
}) => {
  test.setTimeout(120_000);
  const readTrace = await traceLoadingBar(page);

  await page.goto('/play');
  const play = page.getByTestId('transport-play');
  const bar = page.getByRole('progressbar', { name: 'Loading the player' });
  await expect(play).toBeEnabled({ timeout: 90_000 });

  // Pick the file mid-fade — INSIDE the 700 ms the finished bar is held at 100 % and faded over.
  // The wait runs in the page on animation frames, not on Playwright's 100 ms poll, so it spends
  // as little of that window as it can: measured ~17 ms of the ~280 ms left once the fade starts.
  await page.waitForFunction(
    () => {
      const painted = document.querySelector('[role="progressbar"]');
      return painted !== null && Number(getComputedStyle(painted).opacity) < 1;
    },
    null,
    { polling: 'raf', timeout: 60_000 },
  );
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.gp');

  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute('data-file', 'Punk.gp', {
    timeout: 30_000,
  });
  await expect(bar).toHaveCount(0, { timeout: 10_000 });

  const trace = await readTrace();
  // The file really was picked MID-FADE, and not after the bar had gone: the first load's bar
  // reached 100 %, was on screen at PART opacity, and only then went back to the indeterminate
  // style the open runs under. Miss that window and this fails rather than quietly proving less.
  const finished = trace.findIndex((sample) => sample.value === '100');
  expect(finished).toBeGreaterThan(-1);
  const reopened = trace.findIndex((sample, index) => index > finished && sample.value === null);
  expect(reopened).toBeGreaterThan(-1);
  expect(trace.slice(finished, reopened).some((sample) => sample.opacity < 1)).toBe(true);

  // ONE bar, not two. The sampler counts every frame and records only the frames the bar is really
  // there, so a number missing from the trace is a frame it was NOT painted — the blink between
  // the two loads that a bar re-armed one commit late would leave.
  const blinks = trace.filter(
    (sample, index) => index > 0 && sample.frame - trace[index - 1]!.frame !== 1,
  );
  expect(blinks).toEqual([]);
  // Re-armed at FULL opacity: the first load's leave animation is dropped, not carried on into the
  // second load — a bar that went on fading would reach zero while the file was still opening.
  expect(trace[reopened]?.opacity).toBe(1);

  // And the second load leaves the way the first one was going to: 100 %, held opaque, then faded
  // out — never a bar that simply disappears the moment the file is ready.
  expect(trace.at(-1)?.value).toBe('100');
  const leaving = trace.slice(reopened);
  expect(leaving.some((sample) => sample.value === '100' && sample.opacity === 1)).toBe(true);
  expect(leaving.some((sample) => sample.opacity > 0 && sample.opacity < 1)).toBe(true);
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

/** Clicks the seek rail at a fraction of its width with a real mouse. */
async function clickSeekRail(page: Page, fraction: number): Promise<void> {
  const rail = await page
    .locator('[data-slot="scrubber"] [data-index]')
    .locator('..')
    .boundingBox();
  if (!rail) throw new Error('the seek bar is not laid out');
  await page.mouse.click(rail.x + rail.width * fraction, rail.y + rail.height / 2);
}

const hasBarRange = (page: Page) =>
  page.evaluate(
    () =>
      (
        document.querySelector<HTMLElement>(
          '[data-testid="notation-surface"] > div',
        ) as BeatBoundsHost
      ).at.playbackRange !== null,
  );

// The other half of the rule: you selected bars to practise, and you scrub back to an earlier
// spot INSIDE them. That must not throw the selection away — only a seek that lands outside it
// does. Inside or outside is decided from AlphaTab's own reply to the seek, in ticks.
test('a seek that lands inside the selected bars keeps the selection', async ({ page }) => {
  await page.goto('/play');
  const play = page.getByTestId('transport-play');
  await expect(play).toBeEnabled({ timeout: 60_000 });
  await expect
    .poll(async () => Number(await page.getByTestId('player-status').getAttribute('data-duration')))
    .toBeGreaterThan(0);

  // Bars 1-2 of three: the first four seconds of six.
  await selectBars(page, 0, 1);
  await expect(page.getByRole('button', { name: 'Loop selection' })).toBeVisible();

  // A quarter of the way along — about 00:01.5, well inside bars 1-2.
  await clickSeekRail(page, 0.25);
  await expect.poll(() => engineTick(page)).toBeGreaterThan(960);

  // Give the (absent) clearing every chance to happen, then look.
  await page.waitForTimeout(600);
  expect(await hasBarRange(page)).toBe(true);
  await expect(page.getByRole('button', { name: 'Loop selection' })).toBeVisible();

  // And it still plays from there.
  const from = await engineTick(page);
  await play.click();
  await expect.poll(() => engineTick(page), { timeout: 10_000 }).toBeGreaterThan(from + 480);
});

// While PLAYING, AlphaTab stops the player at once when a seek lands outside the active range.
// Leaving the selection must not cost the person their playback.
test('a seek outside the selected bars while playing keeps playing', async ({ page }) => {
  await page.goto('/play');
  const play = page.getByTestId('transport-play');
  const status = page.getByTestId('player-status');
  await expect(play).toBeEnabled({ timeout: 60_000 });
  await expect
    .poll(async () => Number(await status.getAttribute('data-duration')))
    .toBeGreaterThan(0);

  await selectBars(page, 0, 0);
  await page.getByTestId('toggle-loop').click();
  await play.click();
  await expect(status).toHaveAttribute('data-playing', 'true');

  // Just past the middle: bar 2 of three, outside the selected bar 1.
  await clickSeekRail(page, 0.55);

  await expect(page.getByRole('button', { name: 'Loop score' })).toBeVisible();
  await expect(status).toHaveAttribute('data-playing', 'true');
  // It really plays on from the new place: past the end of bar 1 (3840 ticks) and still moving.
  await expect.poll(() => engineTick(page), { timeout: 10_000 }).toBeGreaterThan(6000);
});

// During a count-in AlphaTab is not playing the score yet and sends NO reply to a seek, so inside
// or outside cannot be told. The safe answer is to let the selection go: the worst case is
// selecting the bars again — never a frozen player.
test('a seek during the count-in lets the selection go rather than guess', async ({ page }) => {
  await page.goto('/play');
  const play = page.getByTestId('transport-play');
  await expect(play).toBeEnabled({ timeout: 60_000 });
  await expect
    .poll(async () => Number(await page.getByTestId('player-status').getAttribute('data-duration')))
    .toBeGreaterThan(0);

  await selectBars(page, 0, 0);
  await page.getByTestId('toggle-countin').click();
  await play.click();
  // The count-in is one bar, about two seconds: seek inside that window.
  await page.waitForTimeout(500);
  await clickSeekRail(page, 0.55);

  await expect.poll(() => hasBarRange(page), { timeout: 5000 }).toBe(false);
  await expect(page.getByRole('button', { name: 'Loop score' })).toBeVisible();
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

// Locator.hover() waits for the BUTTON itself to receive the pointer, and a locked control
// (aria-disabled, which means pointer-events:none) never does — the wrapping span is what
// actually takes it instead, same as every disabled mixer control. The pointer goes where a
// person's would either way.
async function hoverPossiblyLocked(page: Page, control: Locator): Promise<void> {
  if ((await control.getAttribute('aria-disabled')) === 'true') {
    const box = await control.boundingBox();
    if (!box) throw new Error('the control has no box');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    return;
  }
  await control.hover();
}

/** Tablature's own three states: 'unavailable' beats whatever aria-pressed reports. */
function tablatureToggleState(unavailable: boolean, pressed: boolean): string {
  if (unavailable) return 'unavailable';
  return pressed ? 'on' : 'off';
}

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

// What AlphaTab itself holds, through the debug handle `useAlphaTab` parks on the host element.
// The popover's own number field mirrors React state and would show 2 even if the write never
// reached the engine.
const engineState = (page: Page) =>
  page.evaluate(() => {
    const at = (
      document.querySelector('[data-testid="notation-surface"] > div') as {
        at?: {
          playbackSpeed: number;
          metronomeVolume: number;
          masterVolume: number;
          // The playhead, in MIDI ticks. Read to prove the sound-rebuilding rows rewind it.
          tickPosition: number;
          settings: { display: { scale: number } };
          score: { stylesheet: { hideDynamics: boolean } } | null;
        };
      } | null
    )?.at;
    return at
      ? {
          speed: at.playbackSpeed,
          metronomeVolume: at.metronomeVolume,
          masterVolume: at.masterVolume,
          tick: at.tickPosition,
          scale: at.settings.display.scale,
          hideDynamics: at.score?.stylesheet.hideDynamics ?? null,
        }
      : null;
  });

// Record every call the page makes to one AlphaTabApi method. The synth keeps solo, mute and
// volume in its WORKER, so nothing on the main thread can be read back afterwards — and the row's
// aria-pressed mirrors React state, so it flips even when the call never reached the engine
// (exactly what a callback frozen on the pre-engine `undefined` api does). Wrapping the method
// through the debug handle is test-side only: nothing ships for it.
// `method` may be a dotted path: 'changeTrackVolume' is on the api itself, but
// 'player.resetChannelStates' is on the synth wrapper. Without the path form the mixer's reset
// could not be observed at all, and a test would be asserting the absence of something instead of
// the presence of the call.
async function recordApiCalls(page: Page, method: string): Promise<() => Promise<unknown[][]>> {
  await page.evaluate((name) => {
    const root = (
      document.querySelector('[data-testid="notation-surface"] > div') as {
        at?: Record<string, unknown>;
      } | null
    )?.at;
    if (!root) throw new Error('no engine');
    const parts = name.split('.');
    const leaf = parts.pop() as string;
    let at = root;
    for (const part of parts) {
      // `player` is a getter on AlphaTabApi's prototype, not an own property of the instance, so
      // the chain has to be walked. The three names below are the ones a polluted path would use.
      if (part === '__proto__' || part === 'constructor' || part === 'prototype') {
        throw new Error(`no ${part}`);
      }
      let found = false;
      let current: object | null = at;
      while (current !== null && current !== Object.prototype) {
        if (Object.prototype.hasOwnProperty.call(current, part)) {
          found = true;
          break;
        }
        current = Object.getPrototypeOf(current) as object | null;
      }
      if (!found) throw new Error(`no ${part}`);
      at = (at as Record<string, Record<string, unknown>>)[part]; // nosemgrep: prototype-pollution-loop
    }
    const original = (at[leaf] as (...args: unknown[]) => unknown).bind(at);
    const calls: unknown[][] = [];
    const store = ((globalThis as { nhCalls?: Record<string, unknown[][]> }).nhCalls ??= {});
    store[name] = calls;
    at[leaf] = (...args: unknown[]) => {
      // Tracks are live objects; keep only what identifies them. Plain loops, not nested
      // array-method callbacks, so this stays readable at the depth a page.evaluate closure
      // allows.
      const summarized: unknown[] = [];
      for (const arg of args) {
        if (Array.isArray(arg)) {
          const indices: number[] = [];
          for (const track of arg) indices.push((track as { index: number }).index);
          summarized.push(indices);
        } else {
          summarized.push(arg);
        }
      }
      calls.push(summarized);
      return original(...args);
    };
  }, method);
  return () =>
    page.evaluate(
      (name) => (globalThis as { nhCalls?: Record<string, unknown[][]> }).nhCalls?.[name] ?? [],
      method,
    );
}

// Every settings group starts expanded (SettingsPopover's defaultValue lists them all), and Base
// UI's Accordion.Panel does not keepMounted — so clicking an open header removes its rows from the
// DOM and the next fill() times out. Same idiom as a11y.e2e.ts's "open every group" loop.
const openGroup = async (page: Page, name: string) => {
  const header = page.getByRole('button', { name });
  if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click();
};

test('a settings row changes the rendered score without stopping playback', async ({ page }) => {
  await page.goto('/play');
  const play = page.getByTestId('transport-play');
  await expect(play).toBeEnabled({ timeout: 60_000 });
  await play.click();
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');

  const surface = page.getByTestId('notation-surface');
  const boxBefore = await surface.locator('svg').first().boundingBox();
  const widthBefore = boxBefore?.width ?? 0;

  await page.getByTestId('settings-trigger').click();
  await expect(page.getByTestId('settings-popover')).toBeVisible();

  // Change the zoom — a setting whose effect is measurable in the DOM. Through the NUMBER field:
  // it shares the slider's name. The popover opens with every group EXPANDED, so a bare click
  // would CLOSE the group and unmount the row: open only if shut.
  //
  // The field is already showing '1', and pressSequentially APPENDS rather than replacing, so
  // typing '2.5' straight in would yield '12.5'. Select the existing text first.
  //
  // pressSequentially, not fill(): the row reports on EVERY keystroke, so this is also the case
  // that proves the redraw is coalesced. Four characters, four settings pushes, no more than TWO
  // renders — without the coalescer this is four full relayouts while the player runs. Not pinned
  // at exactly one: each keystroke is a separate round trip to the page and can straddle an
  // animation frame boundary, so two adjacent keystrokes occasionally land in different frames.
  // The exact-one guarantee for a single batch of edits is pinned in live-settings.test.ts instead.
  const renders = await recordApiCalls(page, 'render');
  await openGroup(page, 'Display: general');
  const zoom = page.getByRole('spinbutton', { name: 'Zoom' });
  await zoom.selectText();
  await zoom.pressSequentially('2.5');

  await expect
    .poll(async () => {
      const state = await engineState(page);
      return state?.scale;
    })
    .toBe(2.5);
  const renderCalls = await renders();
  expect(renderCalls.length).toBeLessThanOrEqual(2);
  await expect
    .poll(
      async () => {
        const box = await surface.locator('svg').first().boundingBox();
        return box?.width ?? 0;
      },
      { timeout: 20_000 },
    )
    .toBeGreaterThan(widthBefore);

  // The popover never blocks the player: that is the whole reason v0 chose a popover. This case
  // uses a `render` row (zoom); the `midi` rows are the measured exception, pinned by the case
  // below so the difference is a decision on record rather than a bug someone later "fixes".
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');
});

// The ONE exception to the promise above, and the only path that reaches it. loadMidiForScore ->
// loadMidiFile -> stop() pauses AND rewinds (alphaTab.core.mjs:40054 and :39987-39995), so a
// sound-rebuilding row is not something to change mid-take. The case above cannot catch this: zoom
// takes the redraw path and never regenerates the MIDI.
test('a sound-rebuilding row stops the player and rewinds it', async ({ page }) => {
  await page.goto('/play');
  const play = page.getByTestId('transport-play');
  await expect(play).toBeEnabled({ timeout: 60_000 });
  await play.click();
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');
  // Let the playhead actually leave the start, or the rewind assertion proves nothing.
  await expect
    .poll(async () => {
      const state = await engineState(page);
      return state?.tick ?? 0;
    })
    .toBeGreaterThan(0);

  await page.getByTestId('settings-trigger').click();
  await openGroup(page, 'Player');
  await page.getByRole('spinbutton', { name: 'Wide note vibrato: length' }).fill('5');

  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'false');
  // The playhead leaves the start at tick 0, and the score before this reads well into the
  // thousands (asserted above). A few ticks of residual drift are expected here — the stop
  // message is a worker round trip, and a few more audio quanta land before it is processed —
  // so this checks "back near the start", not the literal tick 1 a synthetic, single-worker
  // measurement (no other CPU contention) produced.
  await expect
    .poll(async () => {
      const state = await engineState(page);
      return state?.tick ?? -1;
    })
    .toBeLessThanOrEqual(50);
});

// Two editors, one value, one writer. The header's stepper and this row must never disagree, and
// the ENGINE must hear about it — a row that wrote the speed into the settings JSON would move,
// show its new number, and change nothing.
test('the Player group speed row and the header tempo control are one value', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  await page.getByTestId('settings-trigger').click();
  await openGroup(page, 'Player');
  await page.getByRole('spinbutton', { name: 'Playback speed (%)' }).fill('50');

  await expect(page.getByTestId('player-status')).toHaveAttribute('data-speed', '0.5');
  await expect
    .poll(async () => {
      const state = await engineState(page);
      return state?.speed;
    })
    .toBe(0.5);
});

// The same rule for the metronome: the transport's button and this row are one volume.
test('the metronome volume row and the transport button are one value', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  await page.getByTestId('toggle-metronome').click();
  await expect
    .poll(async () => {
      const state = await engineState(page);
      return state?.metronomeVolume;
    })
    .toBe(1);

  await page.getByTestId('settings-trigger').click();
  await openGroup(page, 'Player');
  await page.getByRole('spinbutton', { name: 'Metronome volume' }).fill('0.4');
  await expect
    .poll(async () => {
      const state = await engineState(page);
      return state?.metronomeVolume;
    })
    .toBe(0.4);
  // Still on: the button reads "volume > 0".
  await expect(page.getByTestId('toggle-metronome')).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('spinbutton', { name: 'Metronome volume' }).fill('0');
  await expect(page.getByTestId('toggle-metronome')).toHaveAttribute('aria-pressed', 'false');
});

// The Stylesheet group is NOT settings: it lives on the open score's model. A row wired like its
// neighbours would write a JSON key AlphaTab ignores — for the whole group, in silence.
test('a Stylesheet row changes the open score, not the settings', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  const beforeState = await engineState(page);
  const before = beforeState?.hideDynamics;

  await page.getByTestId('settings-trigger').click();
  await openGroup(page, 'Stylesheet');
  await page.getByRole('checkbox', { name: 'Hide dynamics' }).click();

  await expect
    .poll(async () => {
      const state = await engineState(page);
      return state?.hideDynamics;
    })
    .toBe(!before);
});

// Vibrato, slides, song-book timings and triplet feel are read when the MIDI is BUILT. Pushing
// the settings or redrawing changes nothing audible, so the row must regenerate the MIDI.
test('a playback-shaping row regenerates the MIDI', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  const midiLoads = await recordApiCalls(page, 'loadMidiForScore');

  await page.getByTestId('settings-trigger').click();
  await openGroup(page, 'Player');
  await page.getByRole('checkbox', { name: /triplet feel/i }).click();

  await expect
    .poll(async () => {
      const calls = await midiLoads();
      return calls.length;
    })
    .toBe(1);
});

test('the Settings icon trigger has a tooltip', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  await page.getByTestId('settings-trigger').hover();
  await expect(openTooltip(page)).toHaveText('Settings');
});

// The heading has to stick inside its own group. A sticky class on the button cannot: that
// button's parent is only as tall as the button, so the title scrolls away with the rows.
test('a group title stays with its rows while the settings list scrolls', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  await page.getByTestId('settings-trigger').click();
  await expect(page.getByTestId('settings-popover')).toBeVisible();

  const stuck = await page.evaluate(() => {
    const popover = document.querySelector('[data-testid="settings-popover"]');
    const viewport = popover?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
    const triggers = [...(popover?.querySelectorAll('[data-slot="accordion-trigger"]') ?? [])];
    const player = triggers.find((button) => button.textContent?.trim().startsWith('Player'));
    const display = triggers.find((button) =>
      button.textContent?.trim().startsWith('Display: general'),
    );
    const playerHeading = player?.parentElement;
    const displayHeading = display?.parentElement;
    const item = playerHeading?.parentElement;
    if (!viewport || !playerHeading || !displayHeading || !(item instanceof HTMLElement))
      return null;
    const viewportTop = viewport.getBoundingClientRect().top;
    viewport.scrollTop = Math.min(420, item.offsetHeight / 2);
    const inside = Math.round(playerHeading.getBoundingClientRect().top - viewportTop);
    viewport.scrollTop = item.offsetTop + item.offsetHeight + 80;
    return {
      inside,
      afterGroup: Math.round(playerHeading.getBoundingClientRect().top - viewportTop),
      nextGroup: Math.round(displayHeading.getBoundingClientRect().top - viewportTop),
    };
  });

  // Still inside Player: its title is pinned to the top of the scroll area.
  expect(stuck?.inside).toBe(0);
  // Past that group: Player has left, and Display: general is the title that holds.
  expect(stuck?.afterGroup).toBeLessThan(0);
  expect(stuck?.nextGroup).toBe(0);
});

// Every path the schema names must exist on the LIVE settings object. fillFromJson ignores a key
// it does not know, so a misspelled path is a row that moves and changes nothing, in silence.
test('every settings row names a key the engine really has', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  await page.getByTestId('settings-trigger').click();

  // Open every group, so every row is in the DOM.
  const headers = page.getByTestId('settings-popover').locator('[data-slot="accordion-trigger"]');
  for (const header of await headers.all()) {
    if ((await header.getAttribute('aria-expanded')) !== 'true') await header.click();
  }

  const missing = await page.evaluate(() => {
    const at = (
      document.querySelector('[data-testid="notation-surface"] > div') as {
        at?: { settings: Record<string, unknown> };
      } | null
    )?.at;
    if (!at) return ['no engine'];
    return [...document.querySelectorAll<HTMLElement>('[data-setting-path]')]
      .map((row) => row.dataset.settingPath ?? '')
      .filter((path) => {
        let current: unknown = at.settings;
        for (const part of path.split('.')) {
          // elementFonts is a real AlphaTab Map<NotationElement, Font>, keyed by a NUMBER this
          // dot-path's string segment cannot address — so a lookup by name stops here. Whether
          // the row's own enum name is real is proven elsewhere, against the loaded engine's own
          // NotationElement enum; here it is enough that the container itself is real and
          // populated, not empty or missing.
          if (current instanceof Map) return current.size === 0;
          // NOT `part in current`: `in` walks the PROTOTYPE CHAIN, so a deprecated getter such as
          // the old font aliases satisfies it while fillFromJson ignores the key entirely — which
          // is exactly how eleven dead font rows passed this gate. Own properties only.
          if (
            current === null ||
            typeof current !== 'object' ||
            !Object.prototype.hasOwnProperty.call(current, part)
          )
            return true;
          // The hasOwnProperty guard above already rules out '__proto__'/'constructor'/
          // 'prototype' and every other inherited key before this line runs, so only the
          // engine's own settings tree is ever indexed — a false positive for the loop shape
          // alone.
          current = (current as Record<string, unknown>)[part]; // nosemgrep: prototype-pollution-loop
        }
        return false;
      });
  });
  expect(missing, 'settings rows whose path is not a real AlphaTab key').toEqual([]);
});

test('a changed setting survives a reload', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  await page.getByTestId('settings-trigger').click();
  await openGroup(page, 'Display: general');
  const zoom = page.getByRole('spinbutton', { name: 'Zoom' });
  await zoom.selectText();
  await zoom.pressSequentially('2');
  await expect
    .poll(async () => {
      const state = await engineState(page);
      return state?.scale;
    })
    .toBe(2);

  await page.reload();
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  // Read the ENGINE, before the popover is ever opened: the stored zoom must be in the api the
  // page built, not merely in the popover's own state.
  await expect
    .poll(async () => {
      const state = await engineState(page);
      return state?.scale;
    })
    .toBe(2);
});

// A bad stored value must never stop the player mounting — the one thing v0 exists to do — and
// must not vanish quietly either.
test('a corrupt stored value resets with a toast, and the player still starts', async ({
  page,
}) => {
  await page.addInitScript(() => {
    globalThis.localStorage.setItem('notation-hero.player-settings', '{broken');
  });
  await page.goto('/play');

  await expect(page.locator('[data-sonner-toast]')).toContainText('reset to the defaults');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  await expect
    .poll(async () => {
      const state = await engineState(page);
      return state?.scale;
    })
    .toBe(1);
});

// Punk.gp parses to three tracks — 0:Drumkit (percussion), 1:Distortion Guitar, 2:Drumkit Left
// (percussion) — so the popover has three rows to audit, not one, even though only two render.
test('the Tracks popover lists every track in the score, not only the rendered ones', async ({
  page,
}) => {
  await openFirstScore(page, 'Punk.gp');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });

  // Opening a file focuses Play, and that focus keeps Play's tooltip open. Blur it so the
  // hover below is the only tip on screen.
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.getByTestId('tracks-trigger').hover();
  await expect(openTooltip(page)).toHaveText('Tracks');

  await page.getByTestId('tracks-trigger').click();
  await expect(page.getByTestId('tracks-popover')).toBeVisible();
  await expect(page.getByTestId('track-row-0')).toBeVisible();
  await expect(page.getByTestId('track-row-1')).toBeVisible();
  await expect(page.getByTestId('track-row-2')).toBeVisible();

  // The two drum tracks are drawn, so their render-select toggles start pressed; the guitar's does not.
  const drawn = (row: number) =>
    page.getByTestId(`track-row-${row}`).getByRole('button', { name: /render/i });
  await expect(drawn(0)).toHaveAttribute('aria-pressed', 'true');
  await expect(drawn(1)).toHaveAttribute('aria-pressed', 'false');
  await expect(drawn(2)).toHaveAttribute('aria-pressed', 'true');
});

test('render-select changes which tracks are drawn', async ({ page }) => {
  await openFirstScore(page, 'Punk.gp');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });

  await page.getByTestId('tracks-trigger').click();
  // Draw the guitar too. `rendered-track-count` is what AlphaTab actually drew (api.tracks), not
  // an echo of the request.
  await page
    .getByTestId('track-row-1')
    .getByRole('button', { name: /render/i })
    .click();

  await expect(page.getByTestId('rendered-track-count')).toHaveText('3', { timeout: 30_000 });
});

// The layout switch collapses the mixer to one track and must restore what was drawn before on
// the way back — both directions reach the engine, not only the ON direction.
test('the track-layout switch redraws the score both ways', async ({ page }) => {
  await openFirstScore(page, 'Punk.gp');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });

  await page.getByTestId('tracks-trigger').click();
  const layout = page.getByTestId('tracks-layout');
  await expect(layout).toHaveAttribute('aria-pressed', 'false');

  await layout.click();
  await expect(layout).toHaveAttribute('aria-pressed', 'true');
  // The ENGINE, not just the control: AlphaTab really drew down to one track.
  await expect(page.getByTestId('rendered-track-count')).toHaveText('1', { timeout: 30_000 });

  await layout.click();
  await expect(layout).toHaveAttribute('aria-pressed', 'false');
  // The way back restores what was drawn before the collapse — Punk.gp's two drum tracks — not
  // just any two tracks.
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });
  await expect(
    page.getByTestId('track-row-0').getByRole('button', { name: /render/i }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByTestId('track-row-1').getByRole('button', { name: /render/i }),
  ).toHaveAttribute('aria-pressed', 'false');
  await expect(
    page.getByTestId('track-row-2').getByRole('button', { name: /render/i }),
  ).toHaveAttribute('aria-pressed', 'true');
});

// A score with only one track has nothing to collapse — the switch stays disabled and explains
// why on hover, the same shape every other disabled mixer control uses.
test('the track-layout switch is disabled with nothing to collapse', async ({ page }) => {
  await openFirstScore(page, 'guitar-no-percussion.gp');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('1');

  await page.getByTestId('tracks-trigger').click();
  const layout = page.getByTestId('tracks-layout');
  await expect(layout).toHaveAttribute('aria-disabled', 'true');

  // page.mouse, not locator.hover(): hover() waits for the target to receive pointer events, and
  // aria-disabled:pointer-events-none means the Button itself never does — the span wrapping it
  // is what actually takes the hover, same as every other disabled mixer control.
  const box = await layout.boundingBox();
  if (!box) throw new Error('the layout switch has no box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(openTooltip(page)).toHaveText('Only one track');
});

// The mixer's version of the transport's tooltip case: every control on a row that shows no
// words says what it is AND what state it is in — on hover, where a person's pointer goes. EVERY
// row is walked, not one checked by hand: a row is built in a loop, but a tooltip that depends on
// a track's own state (drawn or not) is exactly what goes wrong on one row and not the next.
test('every mixer control without visible text has a tooltip that tells its state', async ({
  page,
}) => {
  await openFirstScore(page, 'Punk.gp');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  await page.getByTestId('tracks-trigger').click();

  // The four per-staff display toggles by their own accessible-name fragment and tooltip
  // wording. They are icon-only, so — same as render, solo and mute — nothing but the tooltip
  // and aria-pressed/aria-disabled tells a sighted pointer user their state.
  const STAFF_TOGGLES = [
    { query: /standard notation/i, name: 'Standard notation' },
    { query: /slash/i, name: 'Slash notation' },
    { query: /numbered/i, name: 'Numbered notation' },
  ] as const;

  // Punk.gp draws its two drum tracks (rows 0 and 2) and not the guitar (row 1).
  const drawn = ['Shown in the score', 'Hidden from the score', 'Shown in the score'];
  for (const [index, renderTip] of drawn.entries()) {
    const row = page.getByTestId(`track-row-${index}`);
    // The toggle is the 44 px target itself now — no label wrapper to aim at.
    await row.getByRole('button', { name: /render/i }).hover();
    await expect(openTooltip(page)).toHaveText(renderTip);
    await row.getByRole('button', { name: /solo/i }).hover();
    await expect(openTooltip(page)).toHaveText('Solo: off');
    await row.getByRole('button', { name: /mute/i }).hover();
    await expect(openTooltip(page)).toHaveText('Mute: off');

    // Read each toggle's own reported state first — the staff LABEL that precedes it in the
    // tooltip is a different control's concern — then hover and check the tooltip agrees. A
    // staff down to its last enabled notation type locks that toggle instead of letting the
    // engine be asked to draw nothing (NH-291) — Punk.gp's drum rows carry standard notation
    // only, so their Standard notation toggle is exactly this case, not a plain "on".
    for (const { query, name } of STAFF_TOGGLES) {
      const control = row.getByRole('button', { name: query });
      const locked = (await control.getAttribute('aria-disabled')) === 'true';
      const pressed = (await control.getAttribute('aria-pressed')) === 'true';
      const state = pressed ? 'on' : 'off';
      await hoverPossiblyLocked(page, control);
      // toContainText with a plain string, not toHaveText with a dynamic RegExp: the tooltip is
      // prefixed with the staff LABEL ("Staff 1 …"), which this loop does not track, so the
      // check only needs the SUFFIX to match — substring containment says that without building
      // a regex out of runtime strings.
      await expect(openTooltip(page)).toContainText(
        locked ? 'at least one notation type must stay shown' : `${name}: ${state}`,
      );
    }
    // Tablature is the one toggle whose availability itself varies by row: 1.8.4 cannot draw it
    // on a percussion staff (rows 0 and 2 here), so it renders disabled with an explaining
    // tooltip instead of a state it does not have.
    const tablature = row.getByRole('button', { name: /tablature/i });
    const tablatureUnavailable = (await tablature.getAttribute('aria-disabled')) === 'true';
    const tablaturePressed = (await tablature.getAttribute('aria-pressed')) === 'true';
    const tablatureState = tablatureToggleState(tablatureUnavailable, tablaturePressed);
    await hoverPossiblyLocked(page, tablature);
    await expect(openTooltip(page)).toContainText(`Tablature: ${tablatureState}`);

    // A percussion row's expand control is locked too (NH-291 — transposition is meaningless on
    // a drum track), same aria-disabled/pointer-events-none shape as the staff toggles above.
    const expandControl = row.getByRole('button', { name: /more controls/i });
    const expandLocked = (await expandControl.getAttribute('aria-disabled')) === 'true';
    await hoverPossiblyLocked(page, expandControl);
    await expect(openTooltip(page)).toHaveText(expandLocked ? /percussion/i : 'Show more controls');
  }

  // And each one follows its state. A click closes the tooltip; leave and come back to read it.
  const guitar = page.getByTestId('track-row-1');
  for (const [name, after] of [
    [/solo/i, 'Solo: on'],
    [/mute/i, 'Mute: on'],
    [/more controls/i, 'Hide more controls'],
  ] as const) {
    const control = guitar.getByRole('button', { name });
    await control.click();
    await page.getByTestId('notation-surface').hover();
    await control.hover();
    await expect(openTooltip(page)).toHaveText(after);
  }
});

// Rows 0 and 1, NOT 0 and 2. AlphaTab solos a MIDI CHANNEL, and Punk.gp's two drum tracks share
// channel 9 — soloing both would be one channel soloed twice and would prove nothing.
test('solo is not exclusive — two tracks can be soloed at once', async ({ page }) => {
  await openFirstScore(page, 'Punk.gp');
  // Let the score settle before installing the recorder: the mixer's own playerReady re-assert
  // calls changeTrackSolo for every already-soloed row on every playerReady (up to four per
  // renderScore), and transport-play latches from the bundled beat rather than waiting for
  // Punk.gp's own MIDI loads — so recording too early can catch a re-assert instead of a click.
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });
  const soloCalls = await recordApiCalls(page, 'changeTrackSolo');

  await page.getByTestId('tracks-trigger').click();
  await page.getByTestId('track-row-0').getByRole('button', { name: /solo/i }).click();
  await page.getByTestId('track-row-1').getByRole('button', { name: /solo/i }).click();

  await expect(
    page.getByTestId('track-row-0').getByRole('button', { name: /solo/i }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByTestId('track-row-1').getByRole('button', { name: /solo/i }),
  ).toHaveAttribute('aria-pressed', 'true');

  // The ENGINE heard both, and neither click un-soloed the other. Read each clicked track's LAST
  // call rather than the whole recording: a playerReady re-assert lands its own idempotent call
  // for a row that is already soloed, and asserting the full array would break on that call too.
  const calls = (await soloCalls()) as [number[], boolean][];
  const lastFor = (index: number) => calls.findLast(([tracks]) => tracks[0] === index);
  expect(lastFor(0)).toEqual([[0], true]);
  expect(lastFor(1)).toEqual([[1], true]);
});

test('mute and volume reach the engine, the volume as an absolute channel level', async ({
  page,
}) => {
  await openFirstScore(page, 'Punk.gp');
  // Let the score settle before installing the recorder, as the sibling solo case does: the
  // mixer's own playerReady re-assert calls changeTrackVolume for every row on every playerReady
  // (up to four per renderScore), and transport-play latches from the bundled beat rather than
  // waiting for Punk.gp's own MIDI loads — so recording too early can catch a re-assert at track 0
  // where the click named track 1.
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });
  const muteCalls = await recordApiCalls(page, 'changeTrackMute');
  const volumeCalls = await recordApiCalls(page, 'changeTrackVolume');

  await page.getByTestId('tracks-trigger').click();
  const guitar = page.getByTestId('track-row-1');
  await guitar.getByRole('button', { name: /mute/i }).click();
  const muteRecording = (await muteCalls()) as [number[], boolean][];
  const lastMuteForGuitar = muteRecording.findLast(([tracks]) => tracks[0] === 1);
  expect(lastMuteForGuitar).toEqual([[1], true]);

  const volume = guitar.getByRole('slider', { name: /volume/i });
  const before = Number(await volume.getAttribute('aria-valuenow'));
  await volume.focus();
  await volume.press('ArrowLeft');

  // One step down on the 0-16 scale, sent on AlphaTab's OWN scale as next / 16 — the engine takes
  // an absolute channel level, not a ratio against the file's. Read the keystroke's OWN call —
  // filtered to track 1, the last one — rather than the first call recorded, which a playerReady
  // re-assert can occupy with track 0's volume instead.
  const volumeRecording = (await volumeCalls()) as [number[], number][];
  const lastVolumeForGuitar = volumeRecording.findLast(([tracks]) => tracks[0] === 1);
  const [tracks, level] = lastVolumeForGuitar!;
  expect(tracks).toEqual([1]);
  expect(level).toBeCloseTo((before - 1) / 16, 5);
});

// AlphaTab keeps its muted and soloed CHANNELS across a score change, and drums are channel 9 in
// every file — so without a reset, muting the drums in one score silences them in the next, beside
// a row that reads un-muted.
test('opening another score starts from a clean mix', async ({ page }) => {
  await openFirstScore(page, 'Punk.gp');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  await page.getByTestId('tracks-trigger').click();
  await page.getByTestId('track-row-0').getByRole('button', { name: /mute/i }).click();
  // The mute click leaves its tooltip open (a toggle keeps the tip across the press). The first
  // Escape dismisses that tip; the second dismisses the popover.
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('tracks-popover')).toBeHidden();

  const mutesAfterOpen = await recordApiCalls(page, 'changeTrackMute');
  const resetCalls = await recordApiCalls(page, 'player.resetChannelStates');
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/guitar-no-percussion.gp');
  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute(
    'data-file',
    'guitar-no-percussion.gp',
    { timeout: 30_000 },
  );

  await page.getByTestId('tracks-trigger').click();
  await expect(page.getByTestId('tracks-popover')).toBeVisible();
  await expect(page.getByTestId('track-row-1')).toHaveCount(0); // one track now, not three
  await expect(
    page.getByTestId('track-row-0').getByRole('button', { name: /mute/i }),
  ).toHaveAttribute('aria-pressed', 'false');
  // The reset REACHED the synth. This fails if the handler is moved back to scoreLoaded, where
  // api.player is null.
  await expect
    .poll(async () => {
      const calls = await resetCalls();
      return calls.length;
    })
    .toBeGreaterThan(0);
  // …and the mixer does not replay the old score's mutes on top of it.
  expect(await mutesAfterOpen()).toEqual([]);
});

test('tablature is enabled only on a stringed staff with a tuning', async ({ page }) => {
  await openFirstScore(page, 'Punk.gp');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });

  await page.getByTestId('tracks-trigger').click();

  // The guitar staff reports tuningLen=6, so its tablature toggle is live. The display toggles
  // sit on the always-visible primary row.
  await expect(
    page.getByTestId('track-row-1').getByRole('button', { name: /tablature/i }),
  ).not.toHaveAttribute('aria-disabled', 'true');

  // Both drum staves report showTablature=false, tuningLen=0 — 1.8.4 cannot render percussion
  // tablature at all, so the toggle is shown disabled rather than absent.
  await expect(
    page.getByTestId('track-row-0').getByRole('button', { name: /tablature/i }),
  ).toHaveAttribute('aria-disabled', 'true');
});

// Defect 1 (NH-291): turning off a staff's LAST enabled notation type used to crash the engine in
// one click — AlphaTab's layout code threw "Cannot read properties of undefined (reading
// 'staves')" trying to draw a staff with nothing shown, and the whole player died behind the
// engine-error banner. The toggle now locks instead of ever reaching the engine.
test('turning off the only enabled notation type does not crash the player', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
    timeout: 30_000,
  });

  await page.getByTestId('tracks-trigger').click();
  // The bundled beat's one track, one staff, standard notation only — the exact shape that
  // crashed.
  const standard = page
    .getByTestId('track-row-0')
    .getByRole('button', { name: /standard notation/i });
  await expect(standard).toHaveAttribute('aria-pressed', 'true');
  await expect(standard).toHaveAttribute('aria-disabled', 'true');

  // Keyboard activation, not a mouse click: aria-disabled means pointer-events:none, so a real
  // mouse click can never even reach the button — that IS the fix, and Playwright's own click
  // actionability check refuses it the same way (measured: a plain .click() here times out
  // waiting for "element to be enabled"). The button stays in the tab order — Button's design
  // keeps a disabled control focusable so its tooltip can still explain why — so Enter is the one
  // interaction a person could still attempt, and Button's own onKeyDown guard must swallow it
  // before it ever reaches setStaffDisplay / queueRender / api.render().
  await standard.focus();
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('engine-error')).toHaveCount(0);
  await expect(standard).toHaveAttribute('aria-pressed', 'true');

  // The player really survived, not merely "no banner yet" — the engine still answers Play.
  await page.getByTestId('transport-play').click();
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');
});

// Defect 4 (NH-291): a drum "pitch" is an instrument identifier, not a note, so transposing one
// is meaningless — and it also broke playback (Transpose audio silenced the track, Transpose full
// changed nothing, and returning to zero did not reliably restore sound). The two sliders are the
// ONLY thing behind the expand disclosure, so it locks instead of them.
test('a percussion track locks the expand control instead of the sliders behind it', async ({
  page,
}) => {
  await openFirstScore(page, 'Punk.gp');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });

  await page.getByTestId('tracks-trigger').click();
  const drumExpand = page
    .getByTestId('track-row-0')
    .getByRole('button', { name: /more controls/i });
  await expect(drumExpand).toHaveAttribute('aria-disabled', 'true');

  // page.mouse, not locator.hover(): aria-disabled means pointer-events:none on the Button
  // itself — the wrapping span is what actually takes the hover, same as every other disabled
  // mixer control.
  const box = await drumExpand.boundingBox();
  if (!box) throw new Error('the drum row expand control has no box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(openTooltip(page)).toHaveText(/percussion/i);

  // Keyboard activation, not a mouse click: pointer-events:none means a mouse click can never
  // reach the button at all (Playwright's own click actionability agrees — measured timeout).
  // Enter is the one interaction a person focused on it could still attempt, and Button's own
  // onKeyDown guard must swallow it.
  await drumExpand.focus();
  await page.keyboard.press('Enter');
  await expect(drumExpand).toHaveAttribute('aria-expanded', 'false');
  await expect(
    page.getByTestId('track-row-0').getByRole('slider', { name: /transpose/i }),
  ).toHaveCount(0);

  // The guitar row is unaffected — transposition remains available on a real melodic track.
  const guitarExpand = page
    .getByTestId('track-row-1')
    .getByRole('button', { name: /more controls/i });
  await expect(guitarExpand).not.toHaveAttribute('aria-disabled', 'true');
  await guitarExpand.click();
  await expect(
    page.getByTestId('track-row-1').getByRole('slider', { name: /transpose audio/i }),
  ).toBeVisible();
});

// The two per-track pitch controls, which shipped two defects between them because nothing here
// was covered: a sparse write that poisoned every lower track, and a label promising audio from a
// push that only ever redraws. One case each, both on track 1 — index >= 1 is exactly what the
// sparse write got wrong, and Punk.gp's row 0 is percussion and cannot be expanded.
test('Transpose audio reaches the engine as a per-track call', async ({ page }) => {
  await openFirstScore(page, 'Punk.gp');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });
  const transposeCalls = await recordApiCalls(page, 'changeTrackTranspositionPitch');

  await page.getByTestId('tracks-trigger').click();
  const guitar = page.getByTestId('track-row-1');
  await guitar.getByRole('button', { name: /more controls/i }).click();
  const slider = guitar.getByRole('slider', { name: /transpose audio/i });
  const before = Number(await slider.getAttribute('aria-valuenow'));
  await slider.focus();
  await slider.press('ArrowRight');

  // Filtered to track 1 and taken last, as the sibling volume case does: the mixer's playerReady
  // re-assert also calls this method, and can otherwise occupy the first recorded call.
  const recording = (await transposeCalls()) as [number[], number][];
  const lastForGuitar = recording.findLast(([tracks]) => tracks[0] === 1);
  expect(lastForGuitar).toEqual([[1], before + 1]);
});

test('Transpose notation writes a DENSE pitch array and never reloads the MIDI', async ({
  page,
}) => {
  await openFirstScore(page, 'Punk.gp');
  await expect(page.getByTestId('rendered-track-count')).toHaveText('2', { timeout: 30_000 });
  const midiLoads = await recordApiCalls(page, 'loadMidiForScore');

  await page.getByTestId('tracks-trigger').click();
  const guitar = page.getByTestId('track-row-1');
  await guitar.getByRole('button', { name: /more controls/i }).click();
  const slider = guitar.getByRole('slider', { name: /transpose notation/i });
  await slider.focus();
  await slider.press('ArrowRight');

  const pitches = await page.evaluate(() => {
    const at = (
      document.querySelector('[data-testid="notation-surface"] > div') as {
        at?: { settings: { notation: { transpositionPitches: number[] } } };
      } | null
    )?.at;
    if (!at) return null;
    const raw = at.settings.notation.transpositionPitches;
    return {
      length: raw.length,
      // A HOLE is what poisoned the lower tracks: AlphaTab loops `i < length` and reads a missing
      // index as -undefined, NaN. `in` is the only way to tell [ , 1 ] from [0, 1].
      holes: [...raw.keys()].filter((index) => !(index in raw)),
      values: [...raw],
    };
  });

  expect(pitches).not.toBeNull();
  expect(pitches!.holes).toEqual([]);
  expect(pitches!.values.some((value) => Number.isNaN(value))).toBe(false);
  expect(pitches!.values[1]).not.toBe(0);

  // Notation only. If this ever pushes MIDI, the slider's label has to change with it.
  expect(await midiLoads()).toEqual([]);
});

// Two editors, one value, one writer. The Settings ▸ Player row and the mixer's Master row.
test('the Settings master volume and the mixer Master row are one value', async ({ page }) => {
  await openFirstScore(page, 'Punk.gp');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  await page.getByTestId('settings-trigger').click();
  await openGroup(page, 'Player');
  await page.getByRole('spinbutton', { name: 'Master volume' }).fill('0.5');
  await page.keyboard.press('Escape');

  await page.getByTestId('tracks-trigger').click();
  const master = page.getByTestId('master-row').getByRole('slider', { name: 'Master volume' });
  await expect(master).toHaveAttribute('aria-valuenow', '0.5');
  // Both ends of the DOM assertion are the same React state — they would agree even if the write
  // never reached AlphaTab. Read the engine through the debug handle to prove it did.
  await expect
    .poll(async () => {
      const state = await engineState(page);
      return state?.masterVolume;
    })
    .toBeCloseTo(0.5, 5);

  await master.focus();
  await master.press('ArrowLeft');
  await page.keyboard.press('Escape');

  await page.getByTestId('settings-trigger').click();
  await openGroup(page, 'Player');
  await expect
    .poll(async () => {
      const raw = await page.getByRole('spinbutton', { name: 'Master volume' }).inputValue();
      return Number(raw);
    })
    .toBeCloseTo(0.45, 2);
  await expect
    .poll(async () => {
      const state = await engineState(page);
      return state?.masterVolume;
    })
    .toBeCloseTo(0.45, 2);
});

// PlayerMode.Disabled is 0 and EnabledSynthesizer is 2 in 1.8.4's enum (alphaTab.d.ts). The page
// cannot reach the enum object, so the numbers are written here, beside their source.
const playerModes = (page: Page) =>
  page.evaluate(() => {
    const at = (
      document.querySelector('[data-testid="notation-surface"] > div') as {
        at?: { actualPlayerMode: number; isReadyForPlayback: boolean; player: unknown };
      } | null
    )?.at;
    return at
      ? { actual: at.actualPlayerMode, ready: at.isReadyForPlayback, hasPlayer: at.player !== null }
      : null;
  });

const setPlayerMode = async (page: Page, label: string) => {
  await page.getByTestId('settings-trigger').click();
  await openGroup(page, 'Player');
  await page.getByRole('combobox', { name: 'Playback source' }).selectOption({ label });
  await page.keyboard.press('Escape');
};

// On the bundled beat, actualPlayerMode is ALREADY the synthesizer: AlphaTab resolves the default
// automatic mode to the synthesizer on a score with no embedded recording. Switching the row
// straight to "the synthesizer, always" would rebuild nothing, so this drives a mode that genuinely
// CHANGES actualPlayerMode first — "No playback" — which exercises the destroy-then-rebuild path
// and the un-latching of playerReady that a mode switch or a file replace both depend on.
test('the player-mode row makes AlphaTab build the other player, and Play still works', async ({
  page,
}) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  await setPlayerMode(page, 'No playback');
  await expect
    .poll(async () => {
      const modes = await playerModes(page);
      return modes?.actual;
    })
    .toBe(0);
  await expect
    .poll(async () => {
      const modes = await playerModes(page);
      return modes?.hasPlayer;
    })
    .toBe(false);
  await expect(page.getByTestId('transport-play')).toHaveAttribute('aria-disabled', 'true');

  await setPlayerMode(page, 'The synthesizer, always');
  await expect
    .poll(async () => {
      const modes = await playerModes(page);
      return modes?.actual;
    })
    .toBe(2);

  // Play must not be pressable before the new player is ready, and must work once it is.
  const play = page.getByTestId('transport-play');
  await expect(play).toBeEnabled({ timeout: 60_000 });
  const readyModes = await playerModes(page);
  expect(readyModes?.ready).toBe(true);
  await play.click();
  await expect(page.getByTestId('player-status')).toHaveAttribute('data-playing', 'true');
});

// "No playback" is a real choice, and it is STORED — so the next visit starts with no player. The
// page must say so and stay usable, not pulse a loading bar forever beside a dead Play button.
test('with playback turned off, the page settles and says why', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  await setPlayerMode(page, 'No playback');

  await page.reload();
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
    timeout: 30_000,
  });
  const play = page.getByTestId('transport-play');
  await expect(play).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('progressbar', { name: 'Loading the player' })).toHaveCount(0);

  // The way back is never disabled with the rest.
  await expect(page.getByTestId('settings-trigger')).toBeEnabled();
  // page.mouse, not hover(): a disabled Button takes no pointer events, so hover() would wait
  // forever. The pointer goes where a person's would — the same move the disabled-toggle case uses.
  const box = await play.boundingBox();
  if (!box) throw new Error('the Play button has no box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(openTooltip(page)).toContainText('Playback is turned off in Settings');
});

// The same settled state WITHOUT a reload. The case above reloads before it asserts, so it would
// pass even if a mid-session switch left the bar spinning behind a dead Play button — which is what
// happens when the mode change re-reads only the flags that come from the built player. playerReady
// never fires for a mode that builds no player, so the settings read has to run on the mode change
// too (readChosenMode, called from readPlayer). No reload here.
test('switching to a mode with no player settles without a reload', async ({ page }) => {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  await setPlayerMode(page, 'No playback');

  const play = page.getByTestId('transport-play');
  await expect(play).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('progressbar', { name: 'Loading the player' })).toHaveCount(0);
  await expect(page.getByTestId('settings-trigger')).toBeEnabled();
});
