import { expect, test } from '@playwright/test';

import { SONNER_STORY_IDS } from './Sonner.story-ids';

// Bespoke VR suite: sonner portals its toast (possibly outside #storybook-root),
// so we snapshot the toast element itself rather than a [data-slot] root. Each
// story auto-fires a persistent (duration: Infinity) toast on mount; we wait for
// it, kill animations, wait for fonts, then snapshot. Story IDs come from the
// shared Sonner.story-ids list so VR and a11y stay in lockstep with the stories.
for (const story of SONNER_STORY_IDS) {
  test(`Sonner / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=ui-sonner--${story}&viewMode=story`);
    const toast = page.locator('[data-sonner-toast]').first();
    await toast.waitFor();
    // Kill sonner's enter animation so the snapshot is a settled, deterministic frame.
    await page.addStyleTag({
      content:
        '*, *::before, *::after { transition: none !important; animation: none !important; }',
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(toast).toHaveScreenshot(`sonner-${story}.png`);
  });
}
