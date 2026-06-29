import { expect, test } from '@playwright/test';

import { BADGE_STORY_IDS } from './Badge.story-ids';

// One visual snapshot per Badge story, each loaded in isolation through Storybook's
// iframe. Story IDs come from the shared Badge.story-ids list, so VR and a11y stay in
// lockstep with Badge.stories.tsx.
for (const story of BADGE_STORY_IDS) {
  test(`Badge / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-badge--${story}&viewMode=story`);
    const target = page.locator('[data-slot="badge"]').first();
    await target.waitFor();
    // Wait for web fonts so the badge text renders before the snapshot.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(target).toHaveScreenshot(`badge-${story}.png`);
  });
}
