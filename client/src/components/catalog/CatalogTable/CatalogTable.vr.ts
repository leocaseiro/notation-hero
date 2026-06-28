import { expect, test } from '@playwright/test';

import { CATALOG_TABLE_STORY_IDS } from './CatalogTable.story-ids';

// One visual snapshot per CatalogTable story, each loaded in isolation through Storybook's
// iframe. Story IDs come from the shared CatalogTable.story-ids list, so VR and a11y stay in
// lockstep with CatalogTable.stories.tsx. The rendered DataTable root is
// `data-slot="data-table"`.
for (const story of CATALOG_TABLE_STORY_IDS) {
  test(`CatalogTable / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=catalog-catalogtable--${story}&viewMode=story`);
    const target = page.locator('[data-slot="data-table"]').first();
    await target.waitFor();
    // Wait for web fonts so the Cover + play_circle glyphs render before the snapshot.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(target).toHaveScreenshot(`catalog-table-${story}.png`);
  });
}
