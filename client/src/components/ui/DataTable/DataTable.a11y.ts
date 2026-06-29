import { test } from '@playwright/test';

import { expectNoA11yViolations } from '../../../a11y-helpers';
import { DATA_TABLE_STORY_IDS } from './DataTable.story-ids';

const themes = ['light', 'dark'] as const;

for (const theme of themes) {
  for (const story of DATA_TABLE_STORY_IDS) {
    test(`DataTable / ${story} / ${theme}`, async ({ page }) => {
      await page.goto(
        `/iframe.html?id=ui-datatable--${story}&viewMode=story&globals=theme:${theme}`,
      );
      await page.locator('#storybook-root').waitFor();
      await page.locator('[data-slot="data-table"]').first().waitFor();
      if (theme === 'dark') {
        await page.locator('html.dark').waitFor();
      }
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await page.addStyleTag({
        content:
          '*, *::before, *::after { transition: none !important; animation: none !important; }',
      });

      await expectNoA11yViolations(page, `${story}/${theme} resting`);

      await page.locator('[data-slot="data-table"]').first().hover();
      await expectNoA11yViolations(page, `${story}/${theme} hover`);
    });
  }
}
