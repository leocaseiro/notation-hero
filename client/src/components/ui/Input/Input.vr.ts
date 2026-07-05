import { expect, test } from '@playwright/test';

import { INPUT_STORY_IDS } from './Input.story-ids';

// One visual snapshot per Input story, each loaded in isolation through
// Storybook's iframe. Story IDs come from the shared Input.story-ids list, so VR
// and a11y stay in lockstep with Input.stories.tsx.
for (const story of INPUT_STORY_IDS) {
  test(`Input / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-input--${story}&viewMode=story`);
    const input = page.locator('[data-slot="input"]').first();
    await input.waitFor();
    // Wait for web fonts so the input text renders before the snapshot.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(input).toHaveScreenshot(`input-${story}.png`);
  });
}
