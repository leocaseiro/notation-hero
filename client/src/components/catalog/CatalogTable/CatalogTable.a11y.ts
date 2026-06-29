import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from '../../../a11y-helpers';
import { CATALOG_TABLE_STORY_IDS } from './CatalogTable.story-ids';

// Full-table integration a11y gate: axe over every CatalogTable story, in BOTH themes and
// in BOTH the resting and hover states — exercising every cell (NameCell, LevelPill, Bpm,
// ScoreDonut, PlayButton). Story IDs come from the shared CatalogTable.story-ids list
// (lockstep with VR + CatalogTable.stories.tsx). The rendered DataTable root is
// `data-slot="data-table"`.
const themes = ['light', 'dark'] as const;

for (const theme of themes) {
  for (const story of CATALOG_TABLE_STORY_IDS) {
    test(`CatalogTable / ${story} / ${theme}`, async ({ page }) => {
      await page.goto(
        `/iframe.html?id=catalog-catalogtable--${story}&viewMode=story&globals=theme:${theme}`,
      );
      await page.locator('#storybook-root').waitFor();
      await page.locator('[data-slot="data-table"]').first().waitFor();
      if (theme === 'dark') {
        await page.locator('html.dark').waitFor();
      }
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      // Cover + PlayButton render Material Symbols glyphs; fonts.ready resolves even on load
      // FAILURE, which would leave ligature fallback text. Assert the icon font actually
      // loaded so a failed load can't pass. The Empty story renders no glyph — skip it.
      if (story !== 'empty') {
        const iconFontLoaded = await page.evaluate(() =>
          document.fonts.check('1rem "Material Symbols Outlined Variable"'),
        );
        expect(iconFontLoaded, 'Material Symbols font failed to load').toBe(true);
      }
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
