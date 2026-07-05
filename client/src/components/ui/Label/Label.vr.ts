import { expect, test } from '@playwright/test';

import { LABEL_STORY_IDS } from './Label.story-ids';

// One visual snapshot per Label story, each loaded in isolation through
// Storybook's iframe. Story IDs come from the shared Label.story-ids list, so VR
// and a11y stay in lockstep with Label.stories.tsx.
for (const story of LABEL_STORY_IDS) {
  test(`Label / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-label--${story}&viewMode=story`);
    const label = page.locator('[data-slot="label"]').first();
    await label.waitFor();
    // Wait for web fonts so the label text renders before the snapshot.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(label).toHaveScreenshot(`label-${story}.png`);
  });
}
