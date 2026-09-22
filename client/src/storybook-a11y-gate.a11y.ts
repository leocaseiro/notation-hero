import { expect, test } from '@playwright/test';

// Regression guard for the addon-a11y auto-run gate, end-to-end.
//
// playwright.config.ts sets STORYBOOK_DISABLE_A11Y_AUTORUN on the Storybook webServer, and
// .storybook/preview.tsx reads it to set `parameters.a11y.test` to 'off' — so the addon's
// automatic axe run does not race each *.a11y.ts spec's own scoped AxeBuilder sweep (axe-core is
// non-reentrant: overlapping runs throw "Axe is already running" and flake the suite under
// parallel workers; CI masks it with retries: 2).
//
// This asserts the RESOLVED parameter, read from the running preview store, so it fails loudly if
// any link in that chain regresses: the env var dropped from playwright.config.ts, Storybook's
// import.meta.env exposure changing on an upgrade, or the preview.tsx ternary being altered. A
// unit test could not catch the first two — they only exist in the actually-served bundle.
test('addon-a11y auto-run is gated off for the Playwright-served Storybook', async ({ page }) => {
  await page.goto('/iframe.html?id=ui-button--default&viewMode=story');
  await page.locator('#storybook-root').waitFor();
  await page.locator('[data-slot="button"]').first().waitFor();

  const a11yTest = await page.evaluate(async () => {
    const preview = (
      globalThis as unknown as {
        __STORYBOOK_PREVIEW__?: {
          storyStore?: {
            loadStory?: (arg: {
              storyId: string;
            }) => Promise<{ parameters?: { a11y?: { test?: string } } }>;
          };
        };
      }
    ).__STORYBOOK_PREVIEW__;
    const story = await preview?.storyStore?.loadStory?.({ storyId: 'ui-button--default' });
    return story?.parameters?.a11y?.test;
  });

  expect(
    a11yTest,
    'parameters.a11y.test must resolve to "off" under the Playwright-served Storybook so the addon ' +
      "auto-run cannot race the specs' AxeBuilder sweeps. Check STORYBOOK_DISABLE_A11Y_AUTORUN in " +
      'client/playwright.config.ts and the ternary in client/.storybook/preview.tsx.',
  ).toBe('off');
});
