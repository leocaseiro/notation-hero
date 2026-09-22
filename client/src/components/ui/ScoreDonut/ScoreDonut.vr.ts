import { expect, test } from '@playwright/test';

import { SCORE_DONUT_STORY_IDS } from './ScoreDonut.story-ids';

// One visual snapshot per ScoreDonut story, each loaded in isolation through
// Storybook's iframe. Story IDs come from the shared ScoreDonut.story-ids list, so VR
// and a11y stay in lockstep with ScoreDonut.stories.tsx.
for (const story of SCORE_DONUT_STORY_IDS) {
  test(`ScoreDonut / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-scoredonut--${story}&viewMode=story`);
    const target = page.locator('[data-slot="score-donut"]').first();
    await target.waitFor();
    // Wait for web fonts (incl. Material Symbols) so the trophy glyph is rendered
    // before the snapshot — avoids capturing the ligature fallback text.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(target).toHaveScreenshot(`score-donut-${story}.png`);
  });
}
