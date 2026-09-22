import { expect, test } from '@playwright/test';

import { COVER_STORY_IDS } from './Cover.story-ids';

// One visual snapshot per Cover story, each loaded in isolation through Storybook's
// iframe. Story IDs come from the shared Cover.story-ids list, so VR and a11y stay in
// lockstep with Cover.stories.tsx.
for (const story of COVER_STORY_IDS) {
  test(`Cover / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-cover--${story}&viewMode=story`);
    const target = page.locator('[data-slot="cover"]').first();
    await target.waitFor();
    // Wait for web fonts (incl. Material Symbols) so the glyph is rendered before the
    // snapshot — avoids capturing the ligature fallback text.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(target).toHaveScreenshot(`cover-${story}.png`);
  });
}
