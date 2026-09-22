import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { A11Y_TAGS } from '../../../a11y-tags';
import { SONNER_STORY_IDS } from './Sonner.story-ids';

const THEMES = ['light', 'dark'] as const;

// Bespoke a11y suite (does NOT use runA11yStories): sonner renders its toasts in
// a portal that can live OUTSIDE #storybook-root, so axe must scan the WHOLE page
// rather than the story root. Each story auto-fires a persistent (duration:
// Infinity) toast on mount, so we wait for the toast element, then run one axe
// pass per story x {light, dark}. See client/src/a11y-helpers.ts for the shared
// (scoped) variant this deviates from.
for (const theme of THEMES) {
  for (const story of SONNER_STORY_IDS) {
    test(`Sonner / ${story} / ${theme}`, async ({ page }) => {
      await page.goto(`/iframe.html?id=ui-sonner--${story}&viewMode=story&globals=theme:${theme}`);
      await page.locator('[data-sonner-toast]').first().waitFor();
      if (theme === 'dark') {
        await page.locator('html.dark').waitFor();
      }
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      // Kill transitions/animations so axe reads a deterministic color, not a
      // mid-transition frame (sonner animates toasts in) — else flaky.
      await page.addStyleTag({
        content:
          '*, *::before, *::after { transition: none !important; animation: none !important; }',
      });

      const { violations } = await new AxeBuilder({ page }).withTags([...A11Y_TAGS]).analyze();

      const report = violations
        .map(
          (v) =>
            `[${v.id}] ${v.help}\n` +
            v.nodes
              .map((n) => `    ${n.failureSummary?.replaceAll(/\s+/g, ' ').trim()}`)
              .join('\n'),
        )
        .join('\n');

      expect(violations, `${story}/${theme}\n${report}`).toEqual([]);
    });
  }
}
