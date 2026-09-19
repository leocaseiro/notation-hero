import { expect, test } from '@playwright/test';

test('renders the bundled sample score as notation', async ({ page }) => {
  await page.goto('/play');

  // AlphaTab renders notation as SVG inside its host element.
  const surface = page.getByTestId('notation-surface');
  await expect(surface.locator('svg').first()).toBeVisible({ timeout: 30_000 });

  // The Skeleton must be gone once notation is up — if it is still there, it was never lifted.
  await expect(page.getByTestId('notation-skeleton')).toHaveCount(0);
});
