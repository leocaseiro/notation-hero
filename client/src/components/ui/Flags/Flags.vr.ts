import { expect, test } from '@playwright/test';

import { FLAGS_STORY_IDS } from './Flags.story-ids';

// One visual snapshot per Flags story, each loaded in isolation through Storybook's
// iframe. Story IDs come from the shared Flags.story-ids list, so VR and a11y stay in
// lockstep with Flags.stories.tsx.
for (const story of FLAGS_STORY_IDS) {
  test(`Flags / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-flags--${story}&viewMode=story`);
    const target = page.locator('[data-slot="flags"]').first();
    await target.waitFor();
    // Wait for web fonts (incl. Material Symbols) so the glyphs are rendered before the
    // snapshot — avoids capturing the ligature fallback text.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(target).toHaveScreenshot(`flags-${story}.png`);
  });
}
