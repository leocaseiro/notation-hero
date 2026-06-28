import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { A11Y_TAGS } from '../../../a11y-tags';
import { COVER_STORY_IDS } from './Cover.story-ids';
import type { Page } from '@playwright/test';

// axe-core pass per Cover story, in BOTH themes and in BOTH the resting and hover
// states. Story IDs come from the shared Cover.story-ids list (lockstep with VR +
// Cover.stories.tsx). Theme is driven via Storybook's `globals` query param → our
// preview decorator's `.dark` class, so axe sees the real rendered colors.
const themes = ['light', 'dark'] as const;

async function expectNoA11yViolations(page: Page, label: string) {
  // Scope axe to the story root so future global Storybook chrome can't inject
  // unrelated violations into a component's result.
  const { violations } = await new AxeBuilder({ page })
    .include('#storybook-root')
    .withTags([...A11Y_TAGS])
    .analyze();

  // Readable failure: state label + rule + each node's axe summary (the measured
  // contrast ratio and the two colors), so CI logs are actionable.
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
  for (const story of COVER_STORY_IDS) {
    test(`Cover / ${story} / ${theme}`, async ({ page }) => {
      await page.goto(`/iframe.html?id=ui-cover--${story}&viewMode=story&globals=theme:${theme}`);
      await page.locator('#storybook-root').waitFor();
      await page.locator('[data-slot="cover"]').first().waitFor();
      if (theme === 'dark') {
        await page.locator('html.dark').waitFor();
      }
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      // Cover renders a Material Symbols glyph in EVERY story; fonts.ready resolves even
      // on load FAILURE, which would leave ligature fallback text. Assert the icon font
      // actually loaded so a failed load can't pass as fallback text.
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

      await page.locator('[data-slot="cover"]').first().hover();
      await expectNoA11yViolations(page, `${story}/${theme} hover`);
    });
  }
}
