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
  // A failing VR (or a11y) run produces a full HTML report — the image-diff viewer with the
  // Diff / Side-by-side / Slider modes — plus a trace (the timeline/filmstrip). The `vr` CI job
  // uploads both as an artifact so a red PR can be inspected via `npx playwright show-report`.
  // Mirrors playwright.e2e.config.ts.
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:6006',
    // Record a trace on the retry of a first-failed test (retries:2 in CI). `on-first-retry`
    // keeps it cheap — nothing recorded on green runs. Same choice as playwright.e2e.config.ts.
    trace: 'on-first-retry',
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
    // CI always boots a fresh Storybook, so the env below is applied and the addon auto-run is off.
    // Locally, an already-running `pnpm storybook` on :6006 is reused WITHOUT this env block — the
    // addon auto-run stays on and the axe race can resurface. To reproduce CI's gated behavior
    // locally, run `test:a11y` with no separate dev Storybook up (or stop it first).
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Disable the a11y addon's automatic axe run for this served Storybook: each *.a11y.ts spec
    // runs its own scoped AxeBuilder sweep, and the addon's auto-run would race it on the same
    // iframe (axe-core is non-reentrant → "Axe is already running"). Read in .storybook/preview.tsx.
    env: { STORYBOOK_DISABLE_A11Y_AUTORUN: '1' },
  },
});
