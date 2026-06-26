import { test as testBase, expect } from '@playwright/test';
import { defineNetworkFixture } from '@msw/playwright';
import type { NetworkFixture } from '@msw/playwright';
import { handlers } from './mocks/handlers';

interface Fixtures {
  network: NetworkFixture;
}

// MSW intercepts via Playwright's network layer (context.route). `auto: true` enables the mock for
// every test without naming the fixture. The custom `onUnhandledRequest` fails loudly ONLY when an
// /api/* call escapes the mock (the design intent: a mock miss must not silently fall back to the
// app's "Could not reach the API" state). Everything else — the `GET /` document, hashed JS/CSS
// assets, favicon — passes through to `vite preview` so the real built app loads. (A bare
// `onUnhandledRequest: 'error'` would also error on the document load, since `/` is extensionless
// and so is not skipped by `skipAssetRequests`.)
const test = testBase.extend<Fixtures>({
  network: [
    async ({ context }, use) => {
      const network = defineNetworkFixture({
        context,
        handlers,
        onUnhandledRequest(request, print) {
          if (new URL(request.url).pathname.startsWith('/api/')) {
            print.error();
          }
        },
      });
      await network.enable();
      await use(network);
      await network.disable();
    },
    { auto: true },
  ],
});

test('home → about via in-app link: mocked catalog renders, clean boot', async ({ page }) => {
  // Register console/page-error capture BEFORE navigation so boot-time failures are caught.
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(err.message));

  // 1. Load home and assert it renders.
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Notation Hero', exact: true })).toBeVisible();
  await expect(page.getByText('Skeleton ready.')).toBeVisible();

  // 2. Navigate to /about by clicking the in-app <Link> (exercises client-side routing —
  //    the e2e-only value jsdom unit tests cannot see).
  await page.getByRole('link', { name: 'About', exact: true }).click();

  // 3. About heading + the MSW-mocked catalog item render (page -> mocked API -> rendered data).
  await expect(
    page.getByRole('heading', { name: 'About Notation Hero', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Single Stroke Roll')).toBeVisible();

  // 4. The production build booted clean — no console errors during the journey.
  expect(consoleErrors).toEqual([]);
});
