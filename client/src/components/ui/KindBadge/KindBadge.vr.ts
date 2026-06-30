import { expect, test } from '@playwright/test';

import { KIND_BADGE_STORY_IDS } from './KindBadge.story-ids';

// One visual snapshot per KindBadge story, each loaded in isolation through
// Storybook's iframe. Story IDs come from the shared KindBadge.story-ids list, so VR
// and a11y stay in lockstep with KindBadge.stories.tsx.
for (const story of KIND_BADGE_STORY_IDS) {
  test(`KindBadge / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-kindbadge--${story}&viewMode=story`);
    const target = page.locator('[data-slot="kind-badge"]').first();
    await target.waitFor();
    // Wait for web fonts so the badge text renders before the snapshot.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(target).toHaveScreenshot(`kind-badge-${story}.png`);
  });
}
