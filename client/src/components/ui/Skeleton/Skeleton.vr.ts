import { expect, test } from '@playwright/test';
import { runVrStories } from '../../../vr-helpers';
import { SKELETON_STORY_IDS } from './Skeleton.story-ids';

// Skeletons are static (no hover/focus). The shared helper's global `animation: none !important`
// freeze reverts the skeleton-pulse animation to the element's base background — the --skeleton
// (peak) token, the brightest frame of the cycle. `resting` here captures that.
runVrStories({
  name: 'Skeleton',
  storyPrefix: 'ui-skeleton',
  snapshotSlug: 'skeleton',
  storyIds: SKELETON_STORY_IDS,
  slotSelector: '[data-slot^="skeleton"]',
  states: ['resting'],
});

// The skeleton-pulse keyframe dips to the --skeleton-pulse token at its 50% trough — the other
// extreme of the color cycle (see styles.css). The shared helper can't capture it (its freeze
// always reverts to the base background), so set that color directly here on the single
// `default` story after freezing animations, guarding both ends of the pulse in both themes.
const THEMES = ['light', 'dark'] as const;
for (const theme of THEMES) {
  test(`Skeleton / default / ${theme} / faded-out`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-skeleton--default&viewMode=story&globals=theme:${theme}`);
    await page.locator('#storybook-root').waitFor();
    const skeleton = page.locator('[data-slot="skeleton"]').first();
    await skeleton.waitFor();
    if (theme === 'dark') {
      await page.locator('html.dark').waitFor();
    }
    await page.addStyleTag({
      content:
        '*, *::before, *::after { transition: none !important; animation: none !important; }',
    });
    await skeleton.evaluate((el) => {
      (el as HTMLElement).style.backgroundColor = 'var(--skeleton-pulse)';
    });
    await expect(skeleton).toHaveScreenshot(`skeleton-default-${theme}-faded-out.png`);
  });
}
