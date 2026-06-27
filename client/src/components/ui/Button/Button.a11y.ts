import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { A11Y_TAGS } from '../../../a11y-tags';
import { BUTTON_STORY_IDS } from './Button.story-ids';
import type { Page } from '@playwright/test';

// axe-core pass per Button story, in BOTH themes and in BOTH the resting and hover
// states (hover changes bg/text colors, which must also meet AA). Story IDs come from
// the shared Button.story-ids list (lockstep with VR + Button.stories.tsx). Theme is
// driven via Storybook's `globals` query param → our preview decorator's `.dark` class,
// so axe sees the real rendered colors.
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
  for (const story of BUTTON_STORY_IDS) {
    test(`Button / ${story} / ${theme}`, async ({ page }) => {
      await page.goto(`/iframe.html?id=ui-button--${story}&viewMode=story&globals=theme:${theme}`);
      await page.locator('#storybook-root').waitFor();
      const button = page.locator('[data-slot="button"]').first();
      await button.waitFor();
      // Dark theme: confirm the decorator applied `.dark` before axe reads colors, so
      // the dark pass can't accidentally sample light colors.
      if (theme === 'dark') {
        await page.locator('html.dark').waitFor();
      }
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      // For stories that render a Material Symbols glyph, verify the icon font actually
      // loaded — fonts.ready resolves even on load FAILURE, which would leave ligature
      // fallback text. (Non-icon stories never request the font, so the browser, which
      // lazy-loads @font-face, won't have it loaded — checking there would false-fail.)
      if (story.includes('icon')) {
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

      // Disabled buttons set pointer-events:none (correctly un-hoverable), so the
      // hover state doesn't apply — skip it. axe also exempts disabled from contrast.
      if (story !== 'disabled') {
        await button.hover();
        await expectNoA11yViolations(page, `${story}/${theme} hover`);
      }
    });
  }
}
