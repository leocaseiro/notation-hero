import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// One axe-core pass per Button story, in BOTH themes. Stories are the single
// source of truth (same list as Button.vr.ts). The theme is driven through
// Storybook's `globals` query param, which our preview decorator turns into the
// real `.dark` class — so axe checks the actual rendered colors.
const stories = [
  'default',
  'secondary',
  'outline',
  'ghost',
  'destructive',
  'link',
  'small',
  'large',
  'disabled',
  'icon',
  'with-icon',
];
const themes = ['light', 'dark'] as const;

for (const theme of themes) {
  for (const story of stories) {
    test(`Button / ${story} / ${theme}`, async ({ page }) => {
      await page.goto(`/iframe.html?id=ui-button--${story}&viewMode=story&globals=theme:${theme}`);
      await page.locator('[data-slot="button"]').first().waitFor();
      // Wait for web fonts so text metrics/colors are final before axe reads them.
      await page.evaluate(async () => {
        await document.fonts.ready;
      });

      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Readable failure: rule + each node's axe summary (includes the measured
      // contrast ratio and the two colors), so CI logs are actionable.
      const report = violations
        .map(
          (v) =>
            `[${v.id}] ${v.help}\n` +
            v.nodes.map((n) => `    ${n.failureSummary?.replace(/\s+/g, ' ').trim()}`).join('\n'),
        )
        .join('\n');

      expect(violations, report).toEqual([]);
    });
  }
}
