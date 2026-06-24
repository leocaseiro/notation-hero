import { expect, test } from '@playwright/test';

// One visual snapshot per Button story, each loaded in isolation through
// Storybook's iframe. Stories are the single source of truth for both the
// docs (Storybook) and the visual baselines (here).
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

for (const story of stories) {
  test(`Button / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-button--${story}&viewMode=story`);
    const button = page.locator('[data-slot="button"]').first();
    await button.waitFor();
    // Wait for web fonts (incl. Material Symbols) so icon glyphs are rendered
    // before the snapshot — avoids capturing the ligature fallback text.
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(button).toHaveScreenshot(`button-${story}.png`);
  });
}
