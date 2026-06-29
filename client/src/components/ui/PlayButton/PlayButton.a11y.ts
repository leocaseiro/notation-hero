import { expect, test } from '@playwright/test';

import { expectNoA11yViolations } from '../../../a11y-helpers';
import { PLAY_BUTTON_STORY_IDS } from './PlayButton.story-ids';

// axe-core pass per PlayButton story, in BOTH themes and in BOTH the resting and hover
// states. Story IDs come from the shared PlayButton.story-ids list (lockstep with VR +
// PlayButton.stories.tsx). Theme is driven via Storybook's `globals` query param → our
// preview decorator's `.dark` class, so axe sees the real rendered colors. PlayButton
// renders a Button, so the target slot is `button`.
const themes = ['light', 'dark'] as const;

for (const theme of themes) {
  for (const story of PLAY_BUTTON_STORY_IDS) {
    test(`PlayButton / ${story} / ${theme}`, async ({ page }) => {
      await page.goto(
        `/iframe.html?id=ui-playbutton--${story}&viewMode=story&globals=theme:${theme}`,
      );
      await page.locator('#storybook-root').waitFor();
      await page.locator('[data-slot="button"]').first().waitFor();
      if (theme === 'dark') {
        await page.locator('html.dark').waitFor();
      }
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      // PlayButton renders a Material Symbols glyph (play_circle) in EVERY story;
      // fonts.ready resolves even on load FAILURE, which would leave ligature fallback
      // text. Assert the icon font actually loaded so a failed load can't pass.
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

      await page.locator('[data-slot="button"]').first().hover();
      await expectNoA11yViolations(page, `${story}/${theme} hover`);
    });
  }
}
