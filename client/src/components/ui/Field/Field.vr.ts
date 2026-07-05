import { expect, test } from '@playwright/test';

import { FIELD_STORY_IDS } from './Field.story-ids';

// One visual snapshot per Field story, each loaded in isolation through
// Storybook's iframe. Story IDs come from the shared Field.story-ids list, so VR
// and a11y stay in lockstep with Field.stories.tsx.
for (const story of FIELD_STORY_IDS) {
  test(`Field / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-field--${story}&viewMode=story`);
    const field = page.locator('[data-slot="field"]').first();
    await field.waitFor();
    // Wait for web fonts so the field text renders before the snapshot.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(field).toHaveScreenshot(`field-${story}.png`);
  });
}
