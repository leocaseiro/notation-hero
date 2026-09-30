import { expect, test } from '@playwright/test';

import { failOnUnexpectedPageErrors } from './page-errors';
import { gotoLanding } from './player-states';

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
