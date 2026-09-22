import { expect, test } from '@playwright/test';

import { BPM_STORY_IDS } from './Bpm.story-ids';

// One visual snapshot per Bpm story, each loaded in isolation through Storybook's iframe.
// Story IDs come from the shared Bpm.story-ids list, so VR and a11y stay in lockstep with
// Bpm.stories.tsx.
for (const story of BPM_STORY_IDS) {
  test(`Bpm / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-bpm--${story}&viewMode=story`);
    const target = page.locator('[data-slot="bpm"]').first();
    await target.waitFor();
    // Wait for web fonts (incl. Material Symbols) so the ramp arrow glyph is rendered
    // before the snapshot — avoids capturing the ligature fallback text.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(target).toHaveScreenshot(`bpm-${story}.png`);
  });
}
