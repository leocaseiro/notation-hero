import { expect } from '@playwright/test';

import type { Page } from '@playwright/test';

// The navigation that REACHES each state the two web/ browser lanes share — the goto, the clicks
// and the file-picks, and nothing else. Readiness and settling waits deliberately stay in each
// lane: the accessibility lane and the pixel lane genuinely disagree about them (the pixel lane
// needs the stalled engine to never resume, and needs the load toast GONE where axe needs it
// PAINTED). A shared module is what makes a test-id rename land once instead of twice, and the
// lane that would otherwise drift is the pixel one — whose failure mode is a red VR run whose
// quickest route to green is regenerating the baselines.

/** The vendored engine module both deliberately-broken states intercept. */
const ENGINE_MODULE = '**/alphatab/esm/alphaTab.mjs';

export async function gotoLanding(page: Page): Promise<void> {
  await page.goto('/');
}

export async function gotoPlayer(page: Page): Promise<void> {
  await page.goto('/play');
}

/** `/play`, then Punk.gp picked through the file input — two drum tracks, long enough to scroll. */
export async function openLongScore(page: Page): Promise<void> {
  await page.goto('/play');
  await page.getByTestId('open-file-input').setInputFiles('e2e/fixtures/Punk.gp');
}

/**
 * Stall the engine module so the first-visit Skeleton stays up.
 *
 * `stallMs` is the lanes' one genuine disagreement about this state. The accessibility lane resumes
 * after 5 000 ms — one axe sweep is all it needs. A screenshot needs the state to hold across
 * `toHaveScreenshot`'s two consecutive samples, and on a baseline-generation run across the write
 * as well, so the pixel lane passes `Infinity` and the request never resumes.
 *
 * The branch is not cosmetic: `setTimeout(fn, Infinity)` coerces the delay to 0 and fires
 * IMMEDIATELY, so a single setTimeout path would resume the engine at once and the Skeleton would
 * vanish before the first sample.
 */
export async function stallEngine(page: Page, stallMs: number): Promise<void> {
  await page.route(ENGINE_MODULE, async (route) => {
    // Returning WITHOUT continuing, fulfilling or aborting leaves the request pending for the life
    // of the test, which is exactly what holds the Skeleton up.
    if (stallMs === Infinity) return;
    await new Promise((resolve) => setTimeout(resolve, stallMs));
    await route.continue();
  });
  await page.goto('/play');
}

/** Abort the engine module, so the destructive error panel is up and permanent. */
export async function abortEngine(page: Page): Promise<void> {
  await page.route(ENGINE_MODULE, (route) => route.abort());
  await page.goto('/play');
}

/**
 * Loop, metronome and count-in pressed, and the tempo nudged up one step.
 *
 * The `toBeEnabled` wait is part of REACHING this state, not of settling it: the clicks cannot
 * happen before the engine and the soundfont are up. Each lane still adds its own settling waits
 * after — the accessibility lane waits for the tempo percentage's fade, and so does the shot.
 */
export async function pressEveryTransportToggle(page: Page): Promise<void> {
  await page.goto('/play');
  await expect(page.getByTestId('transport-play')).toBeEnabled({ timeout: 60_000 });

  await page.getByTestId('toggle-loop').click();
  await page.getByTestId('toggle-metronome').click();
  await page.getByTestId('toggle-countin').click();
  await page.getByRole('button', { name: 'Increase tempo' }).click();
}
