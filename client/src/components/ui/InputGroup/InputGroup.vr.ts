import { expect, test } from '@playwright/test';

import { INPUT_GROUP_STORY_IDS } from './InputGroup.story-ids';

// One visual snapshot per InputGroup story, each loaded in isolation through
// Storybook's iframe. Story IDs come from the shared InputGroup.story-ids list, so
// VR and a11y stay in lockstep with InputGroup.stories.tsx.
for (const story of INPUT_GROUP_STORY_IDS) {
  test(`InputGroup / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-inputgroup--${story}&viewMode=story`);
    const inputGroup = page.locator('[data-slot="input-group"]').first();
    await inputGroup.waitFor();
    // Wait for web fonts (incl. Material Symbols) so icon glyphs are rendered
    // before the snapshot — avoids capturing the ligature fallback text.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(inputGroup).toHaveScreenshot(`input-group-${story}.png`);
  });
}
