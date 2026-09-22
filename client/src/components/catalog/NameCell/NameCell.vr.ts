import { expect, test } from '@playwright/test';

import { NAME_CELL_STORY_IDS } from './NameCell.story-ids';

// One visual snapshot per NameCell story, each loaded in isolation through Storybook's
// iframe. Story IDs come from the shared NameCell.story-ids list, so VR and a11y stay in
// lockstep with NameCell.stories.tsx.
for (const story of NAME_CELL_STORY_IDS) {
  test(`NameCell / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=catalog-namecell--${story}&viewMode=story`);
    const target = page.locator('[data-slot="name-cell"]').first();
    await target.waitFor();
    // Wait for web fonts (incl. Material Symbols) so the glyph is rendered before the
    // snapshot — avoids capturing the ligature fallback text.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(target).toHaveScreenshot(`name-cell-${story}.png`);
  });
}
