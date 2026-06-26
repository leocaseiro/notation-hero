import { defineConfig, devices } from '@playwright/test';

// Separate from playwright.config.ts (which boots Storybook for VR/a11y). This lane runs the
// built app via `vite preview`, so trace/HTML reporting is scoped to e2e only.
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.{ts,tsx}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Record a trace on the retry of a first-failed test (D5). With retries:2 in CI a failure
  // produces a replayable trace; the CI upload step uses `if: !cancelled()` so the trace is kept
  // even when the retry passes (a flaky run we still want to debug).
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  reporter: [['html'], ['list']],
  // Serves the production build. MSW intercepts `/api/*` at the browser network layer (Playwright
  // `context.route`) BEFORE the request leaves the page, so it is the source of catalog data — there
  // is no real backend in CI. (`vite preview` DOES honor `server.proxy`, so an unmocked `/api/*`
  // would proxy to the down :3001 and 502 — which is exactly why a mock miss must fail loudly.)
  // `--strictPort` fails loudly on a port collision instead of serving a stale app. The timeout
  // covers a cold `vite build` + preview boot on a CI runner. Playwright runs this command with
  // cwd = the config's directory (client/), so `pnpm build`/`pnpm preview` hit the client package.
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
