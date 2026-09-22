import { expect, test } from '@playwright/test';

import { LEVEL_PILL_STORY_IDS } from './LevelPill.story-ids';

// One visual snapshot per LevelPill story, each loaded in isolation through
// Storybook's iframe. Story IDs come from the shared LevelPill.story-ids list, so VR
// and a11y stay in lockstep with LevelPill.stories.tsx.
for (const story of LEVEL_PILL_STORY_IDS) {
  test(`LevelPill / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-levelpill--${story}&viewMode=story`);
    const target = page.locator('[data-slot="level-pill"]').first();
    await target.waitFor();
    // Wait for web fonts so the mono digits render before the snapshot.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(target).toHaveScreenshot(`level-pill-${story}.png`);
  });
}
