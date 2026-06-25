import { expect, test } from '@playwright/test';

import { BUTTON_STORY_IDS } from './Button.story-ids';

// One visual snapshot per Button story, each loaded in isolation through
// Storybook's iframe. Story IDs come from the shared Button.story-ids list, so VR
// and a11y stay in lockstep with Button.stories.tsx.
for (const story of BUTTON_STORY_IDS) {
  test(`Button / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-button--${story}&viewMode=story`);
    const button = page.locator('[data-slot="button"]').first();
    await button.waitFor();
    // Wait for web fonts (incl. Material Symbols) so icon glyphs are rendered
    // before the snapshot — avoids capturing the ligature fallback text.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(button).toHaveScreenshot(`button-${story}.png`);
  });
}
