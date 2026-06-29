import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from '../../../a11y-helpers';
import { SCORE_DONUT_STORY_IDS } from './ScoreDonut.story-ids';

// axe-core pass per ScoreDonut story, in BOTH themes and in BOTH the resting and hover
// states. Story IDs come from the shared ScoreDonut.story-ids list (lockstep with VR +
// ScoreDonut.stories.tsx). Theme is driven via Storybook's `globals` query param → our
// preview decorator's `.dark` class, so axe sees the real rendered colors.
const themes = ['light', 'dark'] as const;

for (const theme of themes) {
  for (const story of SCORE_DONUT_STORY_IDS) {
    test(`ScoreDonut / ${story} / ${theme}`, async ({ page }) => {
      await page.goto(
        `/iframe.html?id=ui-scoredonut--${story}&viewMode=story&globals=theme:${theme}`,
      );
      await page.locator('#storybook-root').waitFor();
      await page.locator('[data-slot="score-donut"]').first().waitFor();
      if (theme === 'dark') {
        await page.locator('html.dark').waitFor();
      }
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      // Only the Mastered (100) story renders a Material Symbols glyph (the trophy);
      // verify the icon font actually loaded there — fonts.ready resolves even on load
      // FAILURE, which would leave ligature fallback text. (Other stories never request
      // the font, so checking there would false-fail on lazy @font-face.)
      if (story === 'mastered') {
        const iconFontLoaded = await page.evaluate(() =>
          document.fonts.check('1rem "Material Symbols Outlined Variable"'),
        );
        expect(iconFontLoaded, 'Material Symbols font failed to load').toBe(true);
      }
      // Kill CSS transitions/animations so the hover state applies instantly and axe
      // reads a deterministic color, not a mid-`transition-all` frame (else flaky).
      await page.addStyleTag({
        content:
          '*, *::before, *::after { transition: none !important; animation: none !important; }',
      });

      await expectNoA11yViolations(page, `${story}/${theme} resting`);

      await page.locator('[data-slot="score-donut"]').first().hover();
      await expectNoA11yViolations(page, `${story}/${theme} hover`);
    });
  }
}
