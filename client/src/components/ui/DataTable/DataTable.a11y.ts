import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { A11Y_TAGS } from '../../../a11y-tags';
import { DATA_TABLE_STORY_IDS } from './DataTable.story-ids';
import type { Page } from '@playwright/test';

const themes = ['light', 'dark'] as const;

async function expectNoA11yViolations(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page })
    .include('#storybook-root')
    .withTags([...A11Y_TAGS])
    .analyze();

  const report = violations
    .map(
      (v) =>
        `[${v.id}] ${v.help}\n` +
        v.nodes.map((n) => `    ${n.failureSummary?.replaceAll(/\s+/g, ' ').trim()}`).join('\n'),
    )
    .join('\n');

  expect(violations, `${label}\n${report}`).toEqual([]);
}

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
