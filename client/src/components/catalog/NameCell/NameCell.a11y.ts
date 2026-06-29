import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from '../../../a11y-helpers';
import { NAME_CELL_STORY_IDS } from './NameCell.story-ids';

// axe-core pass per NameCell story, in BOTH themes and in BOTH the resting and hover
// states. Story IDs come from the shared NameCell.story-ids list (lockstep with VR +
// NameCell.stories.tsx). Theme is driven via Storybook's `globals` query param → our
// preview decorator's `.dark` class, so axe sees the real rendered colors.
const themes = ['light', 'dark'] as const;

for (const theme of themes) {
  for (const story of NAME_CELL_STORY_IDS) {
    test(`NameCell / ${story} / ${theme}`, async ({ page }) => {
      await page.goto(
        `/iframe.html?id=catalog-namecell--${story}&viewMode=story&globals=theme:${theme}`,
      );
      await page.locator('#storybook-root').waitFor();
      await page.locator('[data-slot="name-cell"]').first().waitFor();
      if (theme === 'dark') {
        await page.locator('html.dark').waitFor();
      }
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      // NameCell renders the Cover glyph in EVERY story; fonts.ready resolves even on load
      // FAILURE, which would leave ligature fallback text. Assert the icon font actually
      // loaded so a failed load can't pass as fallback text.
      const iconFontLoaded = await page.evaluate(() =>
        document.fonts.check('1rem "Material Symbols Outlined Variable"'),
      );
      expect(iconFontLoaded, 'Material Symbols font failed to load').toBe(true);
      // Kill CSS transitions/animations so the hover state applies instantly and axe
      // reads a deterministic color, not a mid-`transition-all` frame (else flaky).
      await page.addStyleTag({
        content:
          '*, *::before, *::after { transition: none !important; animation: none !important; }',
      });

      await expectNoA11yViolations(page, `${story}/${theme} resting`);

      await page.locator('[data-slot="name-cell"]').first().hover();
      await expectNoA11yViolations(page, `${story}/${theme} hover`);
    });
  }
}
