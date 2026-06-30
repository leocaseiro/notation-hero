import { expect, test } from '@playwright/test';

import { DATA_TABLE_STORY_IDS } from './DataTable.story-ids';

for (const story of DATA_TABLE_STORY_IDS) {
  test(`DataTable / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-datatable--${story}&viewMode=story`);
    const target = page.locator('[data-slot="data-table"]').first();
    await target.waitFor();
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(target).toHaveScreenshot(`data-table-${story}.png`);
  });
}
