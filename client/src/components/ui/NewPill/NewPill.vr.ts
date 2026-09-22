import { expect, test } from '@playwright/test';

import { NEW_PILL_STORY_IDS } from './NewPill.story-ids';

// One visual snapshot per NewPill story, each loaded in isolation through Storybook's
// iframe. Story IDs come from the shared NewPill.story-ids list, so VR and a11y stay in
// lockstep with NewPill.stories.tsx.
for (const story of NEW_PILL_STORY_IDS) {
  test(`NewPill / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-newpill--${story}&viewMode=story`);
    const target = page.locator('[data-slot="new-pill"]').first();
    await target.waitFor();
    // Wait for web fonts so the pill text renders before the snapshot.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(target).toHaveScreenshot(`new-pill-${story}.png`);
  });
}
