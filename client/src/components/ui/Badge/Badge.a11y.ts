import { test } from '@playwright/test';

import { expectNoA11yViolations } from '../../../a11y-helpers';
import { BADGE_STORY_IDS } from './Badge.story-ids';

// axe-core pass per Badge story, in BOTH themes and in BOTH the resting and hover states.
// Story IDs come from the shared Badge.story-ids list (lockstep with VR + Badge.stories.tsx).
// Theme is driven via Storybook's `globals` query param → our preview decorator's `.dark`
// class, so axe sees the real rendered colors. This run is the AA validation gate for the four
// badge variants — in particular the `default` bright-fill pairing (bg-primary +
// text-primary-foreground), which was previously only exercised indirectly through Button.
const themes = ['light', 'dark'] as const;

for (const theme of themes) {
  for (const story of BADGE_STORY_IDS) {
    test(`Badge / ${story} / ${theme}`, async ({ page }) => {
      await page.goto(`/iframe.html?id=ui-badge--${story}&viewMode=story&globals=theme:${theme}`);
      await page.locator('#storybook-root').waitFor();
      await page.locator('[data-slot="badge"]').first().waitFor();
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

      await page.locator('[data-slot="badge"]').first().hover();
      await expectNoA11yViolations(page, `${story}/${theme} hover`);
    });
  }
}
