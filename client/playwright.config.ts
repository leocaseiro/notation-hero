import { defineConfig, devices } from '@playwright/test';

// Playwright drives two suites against Storybook stories, sharing one webServer:
//  • *.vr.ts   — visual regression (toHaveScreenshot)
//  • *.a11y.ts — accessibility (axe-core), deterministic, no snapshots
// Vitest owns *.test.* (unit, jsdom); these globs never overlap.
export default defineConfig({
  testDir: './src',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:6006',
  },
  projects: [
    // VR baselines embed the project name (button-…-chromium-darwin.png), so keep
    // it "chromium" to avoid orphaning the committed snapshots.
    {
      name: 'chromium',
      testMatch: '**/*.vr.{ts,tsx}',
      use: { ...devices['Desktop Chrome'] },
    },
    // Accessibility — deterministic across OSes (no pixel baselines), so this one
    // is safe to gate in CI.
    {
      name: 'a11y',
      testMatch: '**/*.a11y.{ts,tsx}',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Serve Storybook for the tests. Reused if already running locally.
  webServer: {
    command: 'pnpm exec storybook dev -p 6006 --ci',
    url: 'http://localhost:6006',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
