import { expect, test } from '@playwright/test';

import { TEXTAREA_STORY_IDS } from './Textarea.story-ids';

// One visual snapshot per Textarea story, each loaded in isolation through
// Storybook's iframe. Story IDs come from the shared Textarea.story-ids list, so
// VR and a11y stay in lockstep with Textarea.stories.tsx.
for (const story of TEXTAREA_STORY_IDS) {
  test(`Textarea / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-textarea--${story}&viewMode=story`);
    const textarea = page.locator('[data-slot="textarea"]').first();
    await textarea.waitFor();
    // Wait for web fonts so the textarea text renders before the snapshot.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(textarea).toHaveScreenshot(`textarea-${story}.png`);
  });
}
