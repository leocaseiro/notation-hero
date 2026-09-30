import path from 'node:path';

import { expect, test } from '@playwright/test';

import { failOnUnexpectedPageErrors } from './page-errors';
import { gotoLanding, gotoPlayer, openLongScore, pressEveryTransportToggle } from './player-states';

import type { Page } from '@playwright/test';

// Pixel screenshots of the product's own screens, against the real `next build`. This is the gate
// client/ VR cannot be: web/ compiles its own Tailwind CSS by scanning client/ SOURCE (the @source
// globs in web/app/globals.css), so a component can be correct in Storybook and broken here — the
// seek rail that shipped 0 px wide was perfect in Storybook, because Storybook scans client/
// itself.
//
// Ten shots, and the count is deliberate: every shot is a file that moves whenever client/ changes
// or AlphaTab is upgraded. An eleventh should have to justify itself.
//
// Page-level shots only, and no mask over the notation. Sixty runs in the pinned Playwright
// container at threshold:0 / maxDiffPixels:0 found AlphaTab's notation render byte-identical 19
// times out of 19; the only drift was the anti-aliased rounded corner of an element-CLIPPED shot.
// No comparison options are passed here at all — one policy in the repo, the same as client/'s.
//
// `animations: 'disabled'` and `caret: 'hide'` are toHaveScreenshot's own defaults, so neither is
// passed. Worth knowing what the first one does to the Skeleton's `animate-skeleton-pulse`:
// Playwright CANCELS an infinite animation to its first frame rather than fast-forwarding it (it
// fast-forwards only FINITE ones, and client/src/styles.css declares that keyframe `infinite`). It
// lands on the right pixels here either way — 0% and 100% of skeleton-pulse are the same colour —
// but the next infinite animation added to web/ may not be so forgiving.
//
// Every shot below also fails if the page threw an uncaught error while it ran. Required, not a
// nicety: a screenshot comparison is even less likely than a behaviour assertion to notice a throw,
// and one out of AlphaTab's worker went unnoticed for a whole merged PR. The allowance there is
// scoped to the engine bundle's own frames, so the deliberately-broken Skeleton and engine-error
// states still pass.
//
// THREE THINGS TO KNOW BEFORE ADDING AN ELEVENTH SHOT.
//
// 1. The app version is a landmine for any shot that opens the wordmark's tooltip. The header
//    renders NEXT_PUBLIC_APP_VERSION inside a CLOSED TooltipContent, so it is painted in none of
//    these ten. With VERCEL_ENV unset it is the constant `local`; with it set the string carries a
//    build timestamp and a commit hash, and a hovered-wordmark baseline would then break on every
//    commit. Such a shot must never run with VERCEL_ENV set.
// 2. A shot that reaches its state by OPENING A FILE needs the long-score shot's two extra waits —
//    the `data-file` marker and the toast's departure — or it bakes a toast bearing the filename
//    into its baseline. The Settings and Tracks popover shots are specified but deliberately
//    deferred; everything they need (including a `[data-slot="popover-content"]` visibility wait
//    after the trigger click) is written down under "Deferred — the two Plan C popover shots" in
//    docs/specs/2026-09-21-web-visual-regression-gate.md rather than left to be re-derived.
// 3. A MID-GESTURE state has to be held open by the test itself, because it exists nowhere else.
//    player-drop-overlay does this: it shoots between dispatchDragEvent('dragOver') and 'drop',
//    and ends the gesture afterwards so nothing leaks into the next test on a reused worker. It
//    needs no frame-holding trick beyond that — the overlay has no transition and no timer, so
//    toHaveScreenshot's own two-consecutive-samples rule settles it like any other shot. The
//    bar-range selection is the remaining state of this kind and is still deferred, recorded under
//    "Candidates deliberately not in v1" in that same spec: it is held by mouse.down() across a
//    move rather than by a drag, so it has a hold to solve that this one did not.
failOnUnexpectedPageErrors();

/**
 * The last two waits every shot in this lane ends with, whatever state it reached.
 *
 * `document.fonts.ready` matters because the music font loads late; the 500 ms is the settle that,
 * with `retries: 2` on CI, is what actually absorbs a one-off timing blip. Neither moves the
 * pointer, so a hover held by a shot above survives both.
 */
async function settleBeforeShot(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(500);
}

/**
 * The engine, the soundfont and the loading bar are all done.
 *
 * The three ceilings are the existing lane's, and they only work because the `chromium` project
 * carries its own `timeout: 180_000` — measured, a per-test cap swallows a higher `expect` ceiling
 * whole, and web/e2e/a11y.e2e.ts's own 60 000 ms ceilings are unreachable today for exactly that
 * reason. A shot does more after readiness than an axe sweep does, so this lane has LESS headroom.
 *
 * Three of the ten shots deliberately never finish loading, so they must not call this — it could
 * never pass for them and would simply hang.
 */
async function awaitPlayerReady(page: Page): Promise<void> {
  await expect(page.getByTestId('notation-surface').locator('svg').first()).toBeVisible({
    timeout: 30_000,
  });
  // Engine + soundfont ready.
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });
  // UNMOUNT, not opacity: the bar fades with `delay-[400ms] duration-300` and is only removed once
  // useLoadingBarPhase reaches `gone`. A bar caught mid-fade is precisely the kind of drift this
  // lane must not bless into a baseline.
  await expect(page.getByRole('progressbar', { name: 'Loading the player' })).toHaveCount(0, {
    timeout: 10_000,
  });
}

/**
 * Whether `testId`'s own background-color differs from the page background's.
 *
 * THREE of these shots guard a surface step the pixel comparator CANNOT see, between them carrying
 * FOUR such assertions — the bundled beat has two, the ghost hover and the engine error one each.
 * Playwright's per-pixel cutoff is `35215 x threshold^2`, so at the default 0.2 a pixel must score
 * above `1408.6` to be counted at all — roughly 53/255 of luminance for a grey-on-grey step. This
 * app's surfaces sit under it: `--elevate` over `--rail` scores 80, `--rail` over `--panel` 20,
 * `--panel` over `--background` 5, the engine panel's tint over `--popover` 173. The comparison is
 * per-pixel, so a flat region that clears no pixel's cutoff contributes nothing however large it
 * is. The picture still earns its place — it catches "this state did not render at all" — but only
 * the assertion catches the surface underneath. Drop one and that shot silently stops covering what
 * it was added for, screenshot still green.
 *
 * Both values are read through the SAME serializer deliberately. A hard-coded
 * `toHaveCSS('background-color', 'oklch(93.5% 0.006 240.4deg)')` invites the very failure this
 * exists to catch: the browser resolves computed colours to its own format, so a format mismatch
 * makes the assertion pass — or fail — for a reason unrelated to the surface.
 */
const surfaceDiffersFromPageBackground = (page: Page, testId: string): Promise<boolean> =>
  page.getByTestId(testId).evaluate((el) => {
    const own = globalThis.getComputedStyle(el).backgroundColor;
    // document.body, NOT el.parentElement: measured, NEITHER parent paints anything. The rail's is
    // <section className="nh-drop-zone …"> and web/app/globals.css gives .nh-drop-zone only a
    // [data-dragging] rule; the footer's is <div className="shrink-0" data-testid="player-status">.
    // Against a transparent parent EVERY opaque colour differs, bg-background included, so the
    // assertion could never fail. body carries `bg-background` (client/src/styles.css), which is
    // what both call sites are actually compared against.
    //
    // The transparent clause is the mirror of that objection, and it is the production failure this
    // whole lane exists for: a `bg-rail` that never reaches the emitted stylesheet leaves the class
    // in the markup and the computed value at `rgba(0, 0, 0, 0)`, which differs from body's opaque
    // white — so without this clause the assertion passes over a rail that paints nothing.
    return (
      own !== 'rgba(0, 0, 0, 0)' &&
      own !== globalThis.getComputedStyle(document.body).backgroundColor
    );
  });

test('the landing page', async ({ page }) => {
  await gotoLanding(page);
  // The page renders a heading and a link — neither test id exists, so this is the same signal
  // web/e2e/a11y.e2e.ts settles this state on. No ceiling named: the bare expect default is ample
  // for a static route, and nothing breaks on a warm run.
  await expect(page.getByRole('link', { name: 'Play' })).toBeVisible();
  await settleBeforeShot(page);
  // Explicit snapshot names throughout, so a reworded test title never orphans a baseline.
  // `fullPage` matches the shape the 60-run determinism study measured. /play cannot scroll as a
  // page (`h-dvh overflow-hidden`) and / fits 1280x900, so fullPage equals the viewport on all
  // ten — which is also why it cannot scroll a hover out from under the pointer.
  await expect(page).toHaveScreenshot('landing.png', { fullPage: true });
});

test('the player on the score it opens with', async ({ page }) => {
  await gotoPlayer(page);
  await awaitPlayerReady(page);
  // The rail (20) and the transport footer (5) both score far under the 1408.6 cutoff, so the
  // picture proves the screen rendered while these two prove the surfaces are still distinct from
  // the page behind them. The header is NOT one of these steps — it paints no background of its own.
  await expect.poll(() => surfaceDiffersFromPageBackground(page, 'player-rail')).toBe(true);
  await expect.poll(() => surfaceDiffersFromPageBackground(page, 'transport-row')).toBe(true);
  await settleBeforeShot(page);
  await expect(page).toHaveScreenshot('player-bundled-beat.png', { fullPage: true });
});

// The one shot in this file that opens a file. Anything added later that does the same needs the
// same two waits.
test('the player with a score long enough to scroll', async ({ page }) => {
  await openLongScore(page);
  await awaitPlayerReady(page);
  // First prove WHICH score is on screen. Every wait above is also satisfied by the bundled beat
  // /play shows before the pick, so only the app's own per-file marker tells the two apart. Prefer
  // this attribute over polling for overflow: the bundled beat measures scrollHeight === clientHeight
  // EXACTLY, so a layout that gave it one pixel of overflow would make such a poll pass vacuously.
  await expect(page.getByTestId('loaded-notation-name')).toHaveAttribute('data-file', 'Punk.gp', {
    timeout: 30_000,
  });
  // Then wait for the success toast to GO, and this one is not optional. Opening a file raises
  // toast.loading then toast.success under one id; neither sets a duration, and Sonner exempts a
  // `loading` toast from the close timer entirely, so the close timer is armed by the success that
  // replaces it. The lifetime comes from the TOASTER, not from Sonner's default: web/app/layout.tsx
  // renders `<Toaster closeButton duration={5000} />`, the design system's wrapper spreads its props
  // last, and sonner 2.0.7 resolves `toast.duration || durationFromToaster || TOAST_LIFETIME` — so
  // the 4 000 ms TOAST_LIFETIME is never reached. Without this wait every long-score baseline carries
  // a toast bearing the filename, over the notation box the shot exists for. Measured in Chromium
  // 1.61.1 against that exact Toaster, the toast leaves the DOM at 5 267 ms (4 269 ms with no Toaster
  // `duration` at all) — so a bare expect, which falls back to 5 000 ms, would go red ON THE TOAST.
  // The ceiling is named, and it is 15 000 ms: 5 267 ms was measured at ONE worker, and CI runs
  // several with `retries: 2`.
  await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 15_000 });
  await settleBeforeShot(page);
  // Expect this baseline to show the Play tooltip: a successful open moves focus to the transport
  // (PlayerShell calls playRef.current?.focus()). Deterministic — identical across fourteen
  // measured runs — but a reviewer approving it should know it is meant to be there.
  await expect(page).toHaveScreenshot('player-long-score.png', { fullPage: true });
});

test('the player with every transport toggle pressed', async ({ page }) => {
  await pressEveryTransportToggle(page);
  await awaitPlayerReady(page);
  // The tempo percentage is revealed only under group-hover, group-focus-within or a timed
  // data-linger. "Increase tempo" leaves focus on that button, so focus-within holds it — but a
  // variant that moved focus away would photograph it at opacity-0 and bless a baseline missing the
  // very thing this shot exists for. The pressed toggles need no such help: `--primary` over
  // `--secondary` scores 14664, ten times over the cutoff, because that step carries chroma.
  await expect
    .poll(() =>
      page.getByTestId('tempo-percent').evaluate((el) => globalThis.getComputedStyle(el).opacity),
    )
    .toBe('1');
  await settleBeforeShot(page);
  await expect(page).toHaveScreenshot('player-transport-pressed.png', { fullPage: true });
});

// The drag-over affordance, and the only shot in this lane that holds a gesture OPEN: the picture
// is taken between dragOver and drop, because that is the only window in which this state exists.
// It is shot rather than deferred because it has already failed in production once — the outline
// was drawn outset, so the shell's overflow-hidden clipped away the one thing that says "let go
// here", and nothing went red: the behaviour tests ask whether "Drop to open" is PRESENT, never
// what it looks like.
test('the drop overlay while a file is dragged over the player', async ({ page }) => {
  await gotoPlayer(page);
  await awaitPlayerReady(page);

  // Chrome's own drag pipeline over CDP, the same shape web/e2e/player.e2e.ts already uses. A
  // drag built from dispatchEvent skips the browser's dropEffect/effectAllowed negotiation and
  // would pass against a real drop bug. dragOperationsMask 1 is COPY_ONLY — what a file dragged
  // from the desktop actually offers, and the case a stray dropEffect silently rejects.
  const cdp = await page.context().newCDPSession(page);
  const data = { items: [], files: [path.resolve('e2e/fixtures/Punk.gp')], dragOperationsMask: 1 };
  const box = (await page.getByTestId('drop-zone').boundingBox())!;
  const at = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
  await cdp.send('Input.dispatchDragEvent', { type: 'dragEnter', ...at, data });
  await cdp.send('Input.dispatchDragEvent', { type: 'dragOver', ...at, data });

  // No companion surface assertion here, unlike the rail and the transport footer, and that is a
  // measured decision rather than an omission: scored against the SAME 1408.6 per-pixel cutoff,
  // the dashed `--primary` outline over the page background comes out at 16494 and the
  // 80%-`--background` scrim over the notation's ink at 19370 — both an order of magnitude above
  // it, the same band as the engine-error text (19698). The comparator can see this one, so an
  // assertion beside it would be noise, and the guard's anchor list stays at four.
  await expect(page.getByText('Drop to open')).toBeVisible();
  await settleBeforeShot(page);
  await expect(page).toHaveScreenshot('player-drop-overlay.png', { fullPage: true });
  // End the gesture. A drag left open outlives the test on a reused worker.
  await cdp.send('Input.dispatchDragEvent', { type: 'drop', ...at, data });
});

/** The one OPEN tooltip. A closing popup can stay in the DOM for a frame, hence `[data-open]`. */
const openTooltip = (page: Page) => page.locator('[data-slot="tooltip-content"][data-open]');

// client/'s ghost variant is `hover:bg-elevate`, and the player chrome gives it three surfaces to
// land on. The step is strongest against Storybook's white canvas — the only place it is
// photographed today — and weakest against `--rail`, where it could regress to invisible with every
// existing gate green. OpenFileControl renders variant="ghost" on `--rail`, so hovering it is the
// shot. Convenient side effect: that button also carries a tooltip, so this captures the hover step
// and its tooltip together.
test('the ghost hover step on the left rail', async ({ page }) => {
  await gotoPlayer(page);
  await awaitPlayerReady(page);

  const ghost = page.getByTestId('open-file-button');
  await ghost.hover();
  // `--elevate` over `--rail` scores 80 against the 1408.6 cutoff, so reverting to
  // `hover:bg-muted` (46) changes ZERO counted pixels — and that revert is the exact regression
  // this shot exists for. The picture is not redundant: the variant's `hover:text-foreground` step
  // scores 4412, so it catches "this state did not render at all".
  //
  // NOT "differs from its own resting value" — measured on 1.61.1: Tailwind's preflight paints every
  // <button> `background-color: transparent`, so resting is rgba(0, 0, 0, 0) and ANY opaque hover
  // differs from it. `hover:bg-muted` (the regression this shot exists for) and `hover:bg-rail`
  // BOTH pass that form. Compare against `--elevate` itself, resolved through the SAME serializer as
  // the button's own computed value: a throwaway element, not getPropertyValue('--elevate'), which
  // returns the authored `oklch(93.5% 0.006 240.4deg)` where the computed value reads
  // `oklch(0.935 0.006 240.4)` — a format mismatch is exactly the failure the surface helper's
  // doc-comment warns about.
  const elevate = await page.evaluate(() => {
    const probe = document.createElement('div');
    probe.style.backgroundColor = 'var(--elevate)';
    document.body.append(probe);
    const value = globalThis.getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
  });
  // The probe has to resolve to a REAL colour, or the comparison below is vacuous: measured in
  // Chromium 1.61.1, a missing `--elevate` makes `var(--elevate)` invalid at computed-value time
  // on BOTH sides — the probe and the button's `hover:bg-elevate` — so both read
  // `rgba(0, 0, 0, 0)`, the equality holds, and at 80 against the 1408.6 cutoff the picture sees
  // nothing either. Same clause surfaceDiffersFromPageBackground already carries.
  expect(elevate).not.toBe('rgba(0, 0, 0, 0)');
  await expect
    .poll(() => ghost.evaluate((el) => globalThis.getComputedStyle(el).backgroundColor))
    .toBe(elevate);
  // Not for an open DELAY — Tooltip defaults `delay` and `closeDelay` to 0 and neither trigger
  // overrides them. What needs settling is the open animation and the portal's position.
  await expect(openTooltip(page)).toBeVisible();

  await settleBeforeShot(page);
  await expect(page).toHaveScreenshot('player-rail-ghost-hover.png', { fullPage: true });
});

// Tooltip.tsx portals its content to the end of <body> and puts `isolate z-50` on the POSITIONER;
// the `z-50` on the Popup beneath it has never done anything, because Base UI renders that element
// `position: static` and z-index is ignored there. Nothing noticed while no other element claimed a
// layer — then the player header claimed `z-10` and the tooltips went behind it. Storybook cannot
// see this: a Tooltip story has no header to hide behind.
//
// The trigger must be a HEADER button. `z-10` only buries what overlaps the header's top 64 px, so
// a tooltip opening clear of it proves nothing — `back-home` sits inside the header and overlaps by
// construction. Measured: the tooltip flips BELOW its trigger, so only 10 px of its 28 fall inside
// the header's band, and what covers that strip is the header's `border-b` and `shadow-md` (the
// header paints no background). Simulating the regression changed 526 pixels in a 200x100 crop —
// far past the tolerance, so the shot catches it, but expect a sliver rather than a missing tooltip.
test('a portalled tooltip wins the header layer', async ({ page }) => {
  await gotoPlayer(page);
  await awaitPlayerReady(page);

  await page.getByTestId('back-home').hover();
  await expect(openTooltip(page)).toBeVisible();

  await settleBeforeShot(page);
  await expect(page).toHaveScreenshot('player-header-tooltip.png', { fullPage: true });
});

// PlayerShell renders the rail `w-20 shrink-0 … lg:w-24`, so it is 80 px below Tailwind's `lg`
// (1024 px) and 96 px at or above it. The other eight shots are pinned at 1280 px and only ever see
// the wide rail. One shot at 900 px covers the narrow one without shooting every state twice.
//
// test.use() is rejected inside a test() body, and inside an ASYNC describe ("did not expect
// test.use() to be called here"). A titled, SYNC describe is the form that scopes it to one shot —
// measured: the sibling shots keep the project's 1280x900. A second Playwright project would
// instead double every baseline's filename space for the sake of one shot.
//
// Two breakpoints are deliberately NOT covered, both below these two widths: the transport footer's
// second step at 640 px (`sm:gap-6 sm:px-8`), and the header wordmark's `max-md:sr-only` collapse at
// 768 px (PlayerHeader.tsx) — 900 px and 1280 px sit above both. Desktop web is the v0 target and
// ten shots is settled.
test.describe('below the lg breakpoint', () => {
  test.use({ viewport: { width: 900, height: 900 } });

  test('the player with the narrow rail', async ({ page }) => {
    await gotoPlayer(page);
    await awaitPlayerReady(page);
    await settleBeforeShot(page);
    await expect(page).toHaveScreenshot('player-narrow.png', { fullPage: true });
  });
});
