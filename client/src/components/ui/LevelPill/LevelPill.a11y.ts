import { test } from '@playwright/test';

import { expectNoA11yViolations } from '../../../a11y-helpers';
import { LEVEL_PILL_STORY_IDS } from './LevelPill.story-ids';

// axe-core pass per LevelPill story, in BOTH themes and in BOTH the resting and hover
// states. Story IDs come from the shared LevelPill.story-ids list (lockstep with VR +
// LevelPill.stories.tsx). Theme is driven via Storybook's `globals` query param → our
// preview decorator's `.dark` class, so axe sees the real rendered colors.
const themes = ['light', 'dark'] as const;

for (const theme of themes) {
  for (const story of LEVEL_PILL_STORY_IDS) {
    test(`LevelPill / ${story} / ${theme}`, async ({ page }) => {
      await page.goto(
        `/iframe.html?id=ui-levelpill--${story}&viewMode=story&globals=theme:${theme}`,
      );
      await page.locator('#storybook-root').waitFor();
      await page.locator('[data-slot="level-pill"]').first().waitFor();
      if (theme === 'dark') {
        await page.locator('html.dark').waitFor();
      }
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      // Kill CSS transitions/animations so the hover state applies instantly and axe
      // reads a deterministic color, not a mid-`transition-all` frame (else flaky).
      await page.addStyleTag({
        content:
          '*, *::before, *::after { transition: none !important; animation: none !important; }',
      });

      await expectNoA11yViolations(page, `${story}/${theme} resting`);

      await page.locator('[data-slot="level-pill"]').first().hover();
      await expectNoA11yViolations(page, `${story}/${theme} hover`);
    });
  }
}
