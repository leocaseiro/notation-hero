import { expect, test } from '@playwright/test';

import { CARD_STORY_IDS } from './Card.story-ids';

// One visual snapshot per Card story, each loaded in isolation through
// Storybook's iframe. Story IDs come from the shared Card.story-ids list, so VR
// and a11y stay in lockstep with Card.stories.tsx.
for (const story of CARD_STORY_IDS) {
  test(`Card / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-card--${story}&viewMode=story`);
    const card = page.locator('[data-slot="card"]').first();
    await card.waitFor();
    // Wait for web fonts (incl. Material Symbols) so icon glyphs are rendered
    // before the snapshot — avoids capturing the ligature fallback text.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(card).toHaveScreenshot(`card-${story}.png`);
  });
}
