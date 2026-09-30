# VR + a11y + e2e testing — runbook

**Extracted from:** `AGENTS.md` on 2026-07-15 during the docs-cleanup trim.
**Full guide:** [`client/README.md`](../../client/README.md).

## Four test layers in `client/`

- **Unit** — Vitest + Testing Library (`*.test.tsx`); runs in the `quality` CI job.
- **a11y** — axe-core over every Storybook story in light + dark, resting + hover (`*.a11y.ts`); the `a11y` CI job, **blocks merge**. OS-independent.
- **VR** — Playwright `toHaveScreenshot` over the stories (`*.vr.ts`); the `vr` CI job, **blocks merge**. Pixel-exact, so baselines are **Linux-only** (committed `-linux`; CI and the local `test:client:docker` script both render in the Playwright container).
- **e2e** — Playwright against the built SPA (`vite preview`, **not** Storybook), with `/api/*` mocked by MSW (`*.e2e.ts`, separate `playwright.e2e.config.ts`); the `e2e` CI job, **blocks merge**. On failure it uploads traces + the HTML report (D5: `if: !cancelled()`) so a CI failure is replayable locally via `npx playwright show-trace`.

`web/` has no Storybook, so none of the four layers above covers it. Its own lane — behaviour, accessibility and ten page screenshots, all in one CI job — is described under "`web/`'s VR lane" below.

## VR baselines are Linux-only — regenerate them with Docker

Playwright embeds the platform in each snapshot filename, but we commit **only the Linux set** (`button-default-chromium-linux.png`). macOS and Linux rasterize fonts differently (subpixel vs grayscale antialiasing, different glyph metrics), so one OS is the source of truth; darwin shots (`*-chromium-darwin.png`) are git-ignored. **CI compares against `-linux`** in the official Playwright container — never run VR natively on a Mac against these baselines.

Docker Desktop must be running first — on macOS, start it with `open -a Docker` (no need to open the app by hand). Then run VR locally through that same container from the repo root:

```bash
pnpm test:client:docker        # client/: compare against the committed Linux baselines
pnpm test:client:docker:update # client/: regenerate them after an intended visual change
pnpm test:web:docker           # web/:    compare against the committed Linux baselines
pnpm test:web:docker:update    # web/:    regenerate them after an intended visual change
```

All four call one helper, so the volume list and the image tag live in a single place:

```bash
bash tooling/docker-playwright.sh <pnpm-filter> <script>
```

It shadows every package's `node_modules` plus `web/.next` and `web/public/alphatab` with anonymous volumes, so a container run cannot clobber the local dev build (both are git-ignored, so nothing could reach a commit — this is about the working tree). `web/test-results/` and the `*-snapshots/` folders are deliberately **not** shadowed: those are the results you need to read afterwards. `--ignore-scripts` skips the lefthook `prepare` (its git call can't resolve a worktree's `.git` inside the container) and keeps dependency lifecycle scripts from running as root over a bind-mounted tree. `tooling/workflow-guards.test.mjs` asserts the helper's image tag and both CI jobs' `container:` lines agree with the installed `@playwright/test` AND carry one shared `@sha256:` digest, so a partial bump fails CI rather than silently comparing baselines under the wrong renderer.

Both pixel CI jobs pin `container: mcr.microsoft.com/playwright:v1.61.1-noble@sha256:5b8f294aff9041b7191c34a4bab3ac270157a28774d4b0660e9743297b697e48` — by digest, because a tag can be re-pushed — so their rendering matches the Docker-generated `-linux` baselines exactly. Bump the tag in lockstep with `@playwright/test`, RE-TAKE the digest with `docker buildx imagetools inspect <tag> --format '{{.Manifest.Digest}}'` (NOT `docker manifest inspect --verbose`, whose reported digest does not resolve as a pin), and regenerate baselines on the bump.

## `web/`'s VR lane — ten page shots of the real app

`web/` has no Storybook, so its pixel gate shoots the composed pages: `landing`, `player-bundled-beat`, `player-long-score`, `player-skeleton`, `player-engine-error`, `player-transport-pressed`, `player-rail-ghost-hover`, `player-header-tooltip`, `player-drop-overlay` (a file held over the player, mid-gesture) and `player-narrow` (900 px, below the `lg` breakpoint). They live in `web/e2e/pages.vr.ts`, with baselines in `web/e2e/pages.vr.ts-snapshots/` — **Linux-only**, same rule as `client/`.

All three `web/` lanes run in ONE CI job (`web`) and ONE `playwright test` invocation, so a single `next build` serves behaviour, axe and pixels. That is why every LOCAL invocation must name its project (`--project=e2e` or `--project=chromium`): both lanes live in one config, so an unscoped local run would compare Linux baselines on your Mac.

```bash
pnpm --filter @notation-hero/web run test:e2e   # behaviour + axe, natively (not pixel-exact)
pnpm test:web:docker                            # the ten shots, in the container
pnpm test:web:docker:update                     # regenerate them, then commit
```

**Three shots carry four assertions over a surface the comparator cannot see.** Playwright's per-pixel cutoff is `1408.6` at the default threshold, and this app's surface steps score 5, 20, 80 and 173 — under it. Those shots each read a computed `background-color` alongside the picture; the picture proves the state rendered, the assertion proves the surface is right. Do not remove one — and if you ADD one, score its step against that same cutoff first (above it, the picture already covers it), then add its anchor to the list in `tooling/workflow-guards.test.mjs`, which counts them and fails if you do not.

**Debugging a red run:** `web/` has **no** hosted diff page (unlike `client/`'s `vr-report` GitHub Pages publish). Download `playwright-web-report` from the run's **Artifacts**, then:

```bash
npx playwright show-report path/to/playwright-report
```

Look at the diff before regenerating anything. A red VR run whose quickest route to green is a baseline refresh is exactly how a page nobody looked at gets blessed.

**One-time cleanup:** `tooling/sweep-darwin-vr-baselines.sh` removes any legacy `*-chromium-darwin.png` baselines still tracked in git (committed before the Linux-only switch) and opens a PR. Safe + re-runnable — tracked files only, no-op when none remain.

## e2e tests (Playwright vs the built app)

The e2e lane has its own config (`client/playwright.e2e.config.ts`) and runs against the production build served by `vite preview` — a different server from the Storybook one VR/a11y use. MSW intercepts `/api/*` at the browser network layer (Playwright `context.route`) and is the source of catalog data (`client/e2e/mocks/handlers.ts`); there is no real backend in CI. The fixture's `onUnhandledRequest` errors on any unmocked `/api/*` call, so a mock miss fails loudly at the network layer instead of silently falling back to the app's "Could not reach the API" state.

```bash
pnpm --filter @notation-hero/client test:e2e       # build -> preview -> run the smoke test
pnpm --filter @notation-hero/client test:e2e:ui    # interactive UI mode
```

**Debugging a CI failure (traces):** the `e2e` job uploads a `playwright-client-e2e-report` artifact on every non-cancelled run (so flaky-then-passed traces are kept too). Download it from the run's **Artifacts** section, unzip, then open the trace timeline (DOM snapshots, network, console, action-by-action):

```bash
npx playwright show-trace path/to/test-results/<test>/trace.zip
```
