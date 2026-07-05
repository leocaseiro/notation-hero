import { expect, test } from '@playwright/test';

import { RADIO_GROUP_STORY_IDS } from './RadioGroup.story-ids';

// One visual snapshot per RadioGroup story, each loaded in isolation through
// Storybook's iframe. Story IDs come from the shared RadioGroup.story-ids list,
// so VR and a11y stay in lockstep with RadioGroup.stories.tsx.
for (const story of RADIO_GROUP_STORY_IDS) {
  test(`RadioGroup / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-radiogroup--${story}&viewMode=story`);
    const radioGroup = page.locator('[data-slot="radio-group"]').first();
    await radioGroup.waitFor();
    // Wait for web fonts so the option labels render before the snapshot.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(radioGroup).toHaveScreenshot(`radio-group-${story}.png`);
  });
}
