import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { A11Y_TAGS } from './a11y-tags';
import type { Page } from '@playwright/test';

const THEMES = ['light', 'dark'] as const;
// `document.fonts.ready` resolves even when the icon font FAILS to load (leaving ligature
// fallback text), so stories that render a glyph assert this font actually loaded.
const ICON_FONT = '1rem "Material Symbols Outlined Variable"';

// Scope axe to the story root (so global Storybook chrome can't inject unrelated violations),
// run the shared WCAG tag set, and fail with a per-node summary — the rule plus each node's
// measured contrast ratio and the two colors — so CI logs are actionable.
async function expectNoA11yViolations(page: Page, label: string): Promise<void> {
  const { violations } = await new AxeBuilder({ page })
    .include('#storybook-root')
    .withTags([...A11Y_TAGS])
    .analyze();

  const report = violations
    .map(
      (v) =>
        `[${v.id}] ${v.help}\n` +
        v.nodes.map((n) => `    ${n.failureSummary?.replaceAll(/\s+/g, ' ').trim()}`).join('\n'),
    )
    .join('\n');

  expect(violations, `${label}\n${report}`).toEqual([]);
}

export interface A11yStoriesConfig {
  /** Component label for the test title: `${name} / ${story} / ${theme}`. */
  name: string;
  /** Storybook iframe id prefix, e.g. 'ui-badge' or 'catalog-namecell'. */
  storyPrefix: string;
  /** Shared story-id list (lockstep with VR + the component's *.stories.tsx). */
  storyIds: readonly string[];
  /** CSS selector for the component root, e.g. '[data-slot="badge"]'. */
  slotSelector: string;
  /**
   * Stories that render a Material Symbols glyph — assert the icon font loaded for these so a
   * failed load can't silently pass as ligature fallback text. Defaults to none.
   */
  iconFontStory?: (story: string) => boolean;
  /** Stories to run the hover axe pass for; defaults to all. */
  hoverStory?: (story: string) => boolean;
}

// Generate the standard a11y suite for a component: one axe pass per story x {light, dark} x
// {resting, hover}. Story IDs come from the shared *.story-ids list so VR and a11y stay in
// lockstep with the *.stories.tsx file. Theme is driven via Storybook's `globals` query param
// -> the preview decorator's `.dark` class, so axe sees the real rendered colors.
export function runA11yStories({
  name,
  storyPrefix,
  storyIds,
  slotSelector,
  iconFontStory = () => false,
  hoverStory = () => true,
}: Readonly<A11yStoriesConfig>): void {
  for (const theme of THEMES) {
    for (const story of storyIds) {
      test(`${name} / ${story} / ${theme}`, async ({ page }) => {
        await page.goto(
          `/iframe.html?id=${storyPrefix}--${story}&viewMode=story&globals=theme:${theme}`,
        );
        await page.locator('#storybook-root').waitFor();
        await page.locator(slotSelector).first().waitFor();
        if (theme === 'dark') {
          await page.locator('html.dark').waitFor();
        }
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        if (iconFontStory(story)) {
          const iconFontLoaded = await page.evaluate(
            (font) => document.fonts.check(font),
            ICON_FONT,
          );
          expect(iconFontLoaded, 'Material Symbols font failed to load').toBe(true);
        }
        // Kill CSS transitions/animations so the hover state applies instantly and axe reads a
        // deterministic color, not a mid-`transition-all` frame (else flaky).
        await page.addStyleTag({
          content:
            '*, *::before, *::after { transition: none !important; animation: none !important; }',
        });

        await expectNoA11yViolations(page, `${story}/${theme} resting`);

        if (hoverStory(story)) {
          await page.locator(slotSelector).first().hover();
          await expectNoA11yViolations(page, `${story}/${theme} hover`);
        }
      });
    }
  }
}
