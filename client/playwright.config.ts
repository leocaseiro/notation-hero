import { defineConfig, devices } from '@playwright/test';

// Visual-regression tests run against Storybook stories (the *.vr.ts files).
// Split of ownership: Vitest runs *.test.* (unit, jsdom); Playwright runs
// *.vr.* (visual, real browser) — the globs never overlap.
export default defineConfig({
  testDir: './src',
  testMatch: '**/*.vr.{ts,tsx}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:6006',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Serve Storybook for the tests. Reused if already running locally.
  webServer: {
    command: 'pnpm exec storybook dev -p 6006 --ci',
    url: 'http://localhost:6006',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
