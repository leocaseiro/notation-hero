# VR + a11y + e2e testing — runbook (`client/`)

**Extracted from:** `AGENTS.md` on 2026-07-15 during the docs-cleanup trim.
**Full guide:** [`client/README.md`](../../client/README.md).

## Four test layers in `client/`

- **Unit** — Vitest + Testing Library (`*.test.tsx`); runs in the `quality` CI job.
- **a11y** — axe-core over every Storybook story in light + dark, resting + hover (`*.a11y.ts`); the `a11y` CI job, **blocks merge**. OS-independent.
- **VR** — Playwright `toHaveScreenshot` over the stories (`*.vr.ts`); the `vr` CI job, **blocks merge**. Pixel-exact, so baselines are **Linux-only** (committed `-linux`; CI and the local `test:vr:docker` script both render in the Playwright container).
- **e2e** — Playwright against the built SPA (`vite preview`, **not** Storybook), with `/api/*` mocked by MSW (`*.e2e.ts`, separate `playwright.e2e.config.ts`); the `e2e` CI job, **blocks merge**. On failure it uploads traces + the HTML report (D5: `if: !cancelled()`) so a CI failure is replayable locally via `npx playwright show-trace`.

## VR baselines are Linux-only — regenerate them with Docker

Playwright embeds the platform in each snapshot filename, but we commit **only the Linux set** (`button-default-chromium-linux.png`). macOS and Linux rasterize fonts differently (subpixel vs grayscale antialiasing, different glyph metrics), so one OS is the source of truth; darwin shots (`*-chromium-darwin.png`) are git-ignored. **CI compares against `-linux`** in the official Playwright container — never run VR natively on a Mac against these baselines.

Docker Desktop must be running first — on macOS, start it with `open -a Docker` (no need to open the app by hand). Then run VR locally through that same container from the repo root:

```bash
pnpm test:vr:docker            # compare against the committed Linux baselines
pnpm test:vr:docker:update     # regenerate them after an intended visual change, then commit
```

Both wrap the Playwright image matching `@playwright/test` (v1.61.1). The anonymous `-v` volumes shadow node_modules so the local (darwin) install is untouched; `--ignore-scripts` skips the lefthook `prepare` (its git call can't resolve a worktree's `.git` inside the container). The `:update` variant expands to:

```bash
docker run --rm \
  -v "$PWD":/work \
  -v /work/node_modules -v /work/client/node_modules -v /work/server/node_modules \
  -v /work/shared/node_modules -v /work/infra/node_modules -v /work/.pnpm-store \
  -w /work mcr.microsoft.com/playwright:v1.61.1-noble \
  bash -c "corepack enable && pnpm install --frozen-lockfile --ignore-scripts && \
    pnpm --filter @notation-hero/client exec playwright test --project=chromium --update-snapshots"
```

The `vr` CI job pins `container: mcr.microsoft.com/playwright:v1.61.1-noble`, so its rendering matches the Docker-generated `-linux` baselines exactly. Bump that image tag in lockstep with `@playwright/test`, and regenerate baselines on the bump.

**One-time cleanup:** `tooling/sweep-darwin-vr-baselines.sh` removes any legacy `*-chromium-darwin.png` baselines still tracked in git (committed before the Linux-only switch) and opens a PR. Safe + re-runnable — tracked files only, no-op when none remain.

## e2e tests (Playwright vs the built app)

The e2e lane has its own config (`client/playwright.e2e.config.ts`) and runs against the production build served by `vite preview` — a different server from the Storybook one VR/a11y use. MSW intercepts `/api/*` at the browser network layer (Playwright `context.route`) and is the source of catalog data (`client/e2e/mocks/handlers.ts`); there is no real backend in CI. The fixture's `onUnhandledRequest` errors on any unmocked `/api/*` call, so a mock miss fails loudly at the network layer instead of silently falling back to the app's "Could not reach the API" state.

```bash
pnpm --filter @notation-hero/client test:e2e       # build -> preview -> run the smoke test
pnpm --filter @notation-hero/client test:e2e:ui    # interactive UI mode
```

**Debugging a CI failure (traces):** the `e2e` job uploads a `playwright-e2e-report` artifact on every non-cancelled run (so flaky-then-passed traces are kept too). Download it from the run's **Artifacts** section, unzip, then open the trace timeline (DOM snapshots, network, console, action-by-action):

```bash
npx playwright show-trace path/to/test-results/<test>/trace.zip
```
