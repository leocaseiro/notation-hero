import { expect, test } from '@playwright/test';

import { CHECKBOX_STORY_IDS } from './Checkbox.story-ids';

// One visual snapshot per Checkbox story, each loaded in isolation through
// Storybook's iframe. Story IDs come from the shared Checkbox.story-ids list, so
// VR and a11y stay in lockstep with Checkbox.stories.tsx.
for (const story of CHECKBOX_STORY_IDS) {
  test(`Checkbox / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-checkbox--${story}&viewMode=story`);
    const checkbox = page.locator('[data-slot="checkbox"]').first();
    await checkbox.waitFor();
    // Wait for web fonts (incl. Material Symbols) so the indicator glyph is
    // rendered before the snapshot — avoids capturing the ligature fallback text.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(checkbox).toHaveScreenshot(`checkbox-${story}.png`);
  });
}
