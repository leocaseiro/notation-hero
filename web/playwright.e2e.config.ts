import { defineConfig, devices } from '@playwright/test';

// The `web` browser lane: behaviour + accessibility (`*.e2e.ts`) and visual regression
// (`*.vr.ts`), as two projects over ONE webServer — so one `next build` serves both and web's axe
// and web's VR run against the same build in the same browser binary. It mirrors
// client/playwright.e2e.config.ts, but serves a Next.js production build (`next build` then
// `next start`) rather than `vite preview`.
// web/ has no Storybook, which is why the pixel lane shoots the composed PAGE here rather than
// stories: a component can be correct in Storybook and broken in the app, because web/ compiles
// its own Tailwind CSS by scanning client/ SOURCE (the @source globs in web/app/globals.css).
export default defineConfig({
  testDir: './e2e',
  // No top-level `testMatch`: each project declares its own, and a project-level pattern REPLACES
  // the top-level one rather than intersecting with it (measured on 1.61.1). A top-level
  // '**/*.e2e.ts' left here would read as if it excluded the shots while not actually doing so.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:4174',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  projects: [
    { name: 'e2e', testMatch: '**/*.e2e.ts', use: { ...devices['Desktop Chrome'] } },
    // Named `chromium` so baselines read `*-chromium-linux.png`, the same shape as client/'s.
    {
      name: 'chromium',
      testMatch: '**/*.vr.ts',
      // Sized against the LONGEST chain, not readiness alone. Readiness itself is 100 s
      // (30 + 60 + 10), but the transport shot adds pressEveryTransportToggle's own 60 s
      // toBeEnabled BEFORE awaitPlayerReady repeats it (worst chain about 165 s), and the
      // long-score shot adds a 30 s data-file wait plus the 15 s toast wait (about 145 s). At 120 s
      // the CAP fires first on a slow-but-healthy run — measured on 1.61.1, a project cap pre-empts
      // a higher expect ceiling and the headline reads `Test timeout of …ms exceeded`, with
      // `retries: 2` spending that budget three times. The config-wide default is Playwright's
      // 30 s — measured: toBeVisible({ timeout: 60_000 }) under a config with no `timeout` fails at
      // exactly 30.0 s while the call log still reports a 60 000 ms expect ceiling. Scoped to this
      // project so the behaviour lane keeps the budget it runs under today.
      timeout: 180_000,
      // Pinned explicitly rather than inherited from the device definition, so a Playwright
      // upgrade that adjusts `Desktop Chrome` cannot silently invalidate every baseline.
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
  ],
  reporter: [['html'], ['list']],
  webServer: {
    // A different port from client/'s 4173 so both lanes can run side by side.
    command: 'pnpm build && pnpm start --port 4174',
    url: 'http://localhost:4174',
    reuseExistingServer: !process.env.CI,
    // Covers a cold vendor step + Babel-based React Compiler build on a CI runner.
    timeout: 300_000,
    env: {
      // NEXT_PUBLIC_* is inlined at BUILD time, which is why the command above runs `pnpm build`
      // under this env rather than only `pnpm start`. Debug prints the visitor's user agent,
      // window size and screen size, so it is never the shipped default — only this lane's build.
      NEXT_PUBLIC_ALPHATAB_LOG_LEVEL: 'Debug',
    },
  },
});
