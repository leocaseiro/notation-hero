import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { BUTTON_STORY_IDS } from './Button.story-ids';

// axe-core pass per Button story, in BOTH themes and in BOTH the resting and hover
// states (hover changes bg/text colors, which must also meet AA). Story IDs come from
// the shared Button.story-ids list (lockstep with VR + Button.stories.tsx). Theme is
// driven via Storybook's `globals` query param → our preview decorator's `.dark` class,
// so axe sees the real rendered colors.
const themes = ['light', 'dark'] as const;

async function expectNoA11yViolations(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  // Readable failure: state label + rule + each node's axe summary (the measured
  // contrast ratio and the two colors), so CI logs are actionable.
  const report = violations
    .map(
      (v) =>
        `[${v.id}] ${v.help}\n` +
        v.nodes.map((n) => `    ${n.failureSummary?.replace(/\s+/g, ' ').trim()}`).join('\n'),
    )
    .join('\n');

  expect(violations, `${label}\n${report}`).toEqual([]);
}

for (const theme of themes) {
  for (const story of BUTTON_STORY_IDS) {
    test(`Button / ${story} / ${theme}`, async ({ page }) => {
      await page.goto(`/iframe.html?id=ui-button--${story}&viewMode=story&globals=theme:${theme}`);
      const button = page.locator('[data-slot="button"]').first();
      await button.waitFor();
      // Wait for web fonts so text metrics/colors are final before axe reads them.
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

      // Disabled buttons set pointer-events:none (correctly un-hoverable), so the
      // hover state doesn't apply — skip it. axe also exempts disabled from contrast.
      if (story !== 'disabled') {
        await button.hover();
        await expectNoA11yViolations(page, `${story}/${theme} hover`);
      }
    });
  }
}
