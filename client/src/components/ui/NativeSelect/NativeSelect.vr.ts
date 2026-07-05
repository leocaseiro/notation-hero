import { expect, test } from '@playwright/test';

import { NATIVE_SELECT_STORY_IDS } from './NativeSelect.story-ids';

// One visual snapshot per NativeSelect story, each loaded in isolation through
// Storybook's iframe. Story IDs come from the shared NativeSelect.story-ids
// list, so VR and a11y stay in lockstep with NativeSelect.stories.tsx.
for (const story of NATIVE_SELECT_STORY_IDS) {
  test(`NativeSelect / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-nativeselect--${story}&viewMode=story`);
    const select = page.locator('[data-slot="native-select"]').first();
    await select.waitFor();
    // Wait for web fonts so the chevron glyph renders before the snapshot.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(select).toHaveScreenshot(`native-select-${story}.png`);
  });
}
