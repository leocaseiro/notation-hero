# @notation-hero/client

The Notation Hero web client — a **Vite + React 19 SPA** using **TanStack Router** (file-based routing) and **TanStack Query**, styled with **Tailwind CSS v4** (CSS-first `@theme`). This package also hosts the **design system**: shadcn/ui components, Storybook docs, and Playwright visual-regression (VR) tests.

> Run every command from the **repo root** with a pnpm workspace filter (`--filter @notation-hero/client`). Requires Node >= 24 and pnpm 11.

## Getting started

```bash
pnpm install
pnpm --filter @notation-hero/client dev      # http://localhost:3000
```

## Scripts

| Command (from repo root)                              | What it does                                  |
| ----------------------------------------------------- | --------------------------------------------- |
| `pnpm --filter @notation-hero/client dev`             | Vite dev server (port 3000)                   |
| `pnpm --filter @notation-hero/client build`           | Production build                              |
| `pnpm --filter @notation-hero/client typecheck`       | `tsc --noEmit`                                |
| `pnpm --filter @notation-hero/client test`            | Unit tests (Vitest, run once)                 |
| `pnpm --filter @notation-hero/client test:watch`      | Unit tests (watch)                            |
| `pnpm --filter @notation-hero/client lint`            | ESLint — also fails on formatting drift       |
| `pnpm --filter @notation-hero/client format`          | Auto-fix: Prettier `--write` + `eslint --fix` |
| `pnpm --filter @notation-hero/client storybook`       | Storybook dev (port 6006)                     |
| `pnpm --filter @notation-hero/client build-storybook` | Static Storybook build                        |
| `pnpm --filter @notation-hero/client test:vr`         | Visual-regression tests (Playwright)          |
| `pnpm --filter @notation-hero/client test:vr:update`  | Re-generate VR baselines                      |
| `pnpm --filter @notation-hero/client test:a11y`       | Accessibility tests (axe, both themes)        |
| `pnpm --filter @notation-hero/client test:e2e`        | e2e tests (Playwright vs built app, MSW)      |
| `pnpm --filter @notation-hero/client test:e2e:ui`     | e2e tests, interactive UI mode                |

---

## Design system / component development

### Component structure (folder-per-component)

Each component is a **PascalCase folder** under `src/components/ui/`, with its test, story, and VR spec **co-located**:

```
src/components/ui/Button/
  Button.tsx                 # the component
  Button.test.tsx            # Vitest + Testing Library unit tests
  Button.stories.tsx         # Storybook stories (docs + the source of truth for VR)
  Button.vr.ts               # Playwright visual-regression spec
  Button.vr.ts-snapshots/    # committed baseline PNGs (per-OS)
```

Import via the `@/` alias (maps to `src/`), e.g. `import { Button } from '@/components/ui/Button/Button'`.

> The repo layout guard (`tooling/check-layout.sh`) enforces co-location: no `__tests__/`, `__mocks__/`, or `stories/` directories, and every `*.test.*` / `*.spec.*` must sit next to a same-name source file. That is why the VR spec is named `*.vr.ts` (not `*.spec.ts`) — it sidesteps both that rule and the Vitest matcher.

### Adding a shadcn component

The theme is the shadcn preset **`b5claE9qM`** (teal + Public Sans), already applied to `src/styles.css`. To add a component:

```bash
pnpm dlx shadcn@latest add <component> -c client
```

Then move the generated file into its folder-per-component home (`src/components/ui/<Name>/<Name>.tsx`) and add `<Name>.stories.tsx`, `<Name>.test.tsx`, and `<Name>.vr.ts`. shadcn's generated `@/` imports already match our alias — no import rewrite needed, only the folder move (generators-first).

### Icons — Material Symbols

Icons use **Material Symbols Outlined**, **self-hosted** via `@fontsource-variable/material-symbols-outlined` (`@import`ed in `src/styles.css`, bundled by Vite — CSP-clean + offline/Capacitor-safe, no CDN). Render a glyph with the `.material-symbols-outlined` class — the text content is the ligature name:

```tsx
// Icon + text
<Button>
  <span className="material-symbols-outlined" aria-hidden="true">play_arrow</span>
  Play
</Button>

// Icon-only — give it an accessible name with aria-label; mark the glyph aria-hidden
<Button size="icon" aria-label="Play">
  <span className="material-symbols-outlined" aria-hidden="true">play_arrow</span>
</Button>
```

Browse glyph names at <https://fonts.google.com/icons>.

### Storybook

```bash
pnpm --filter @notation-hero/client storybook        # http://localhost:6006
```

Stories are co-located (`Button.stories.tsx`) and use the `@storybook/tanstack-react` framework. Addons: **docs** (autodocs) and **a11y** (accessibility checks). Tailwind + the theme are wired via `.storybook/preview.tsx` (which imports `src/styles.css`) and `viteFinal` in `.storybook/main.ts`.

### PR previews (GitHub Pages)

Every PR that touches `client/**` publishes a live Storybook to GitHub Pages so you can review it in the browser with no local setup. The URL is posted as a sticky comment on the PR:

- **Per-PR:** `https://leocaseiro.github.io/notation-hero/pr/<number>/`
- **Latest `master`:** `https://leocaseiro.github.io/notation-hero/`

The workflow (`.github/workflows/storybook-preview.yml`) auto-builds on `client/**` changes. You can also add the **`preview`** label to any PR, or trigger it from the **Actions** tab (**Run workflow** → PR number). Each push rebuilds the same URL; the preview folder is removed when the PR closes. It is **not** a required check, so it never blocks merge.

The comment shows the commit SHA and the time it was built (Sydney local time, AEST/AEDT) — compare that against the PR's latest commit to tell whether the preview is stale (e.g. a push that didn't touch `client/**` won't rebuild it). The `cleanup` job in the Checks list shows **skipped** on every push while the PR is open — that's expected, it only runs when the PR closes.

`STORYBOOK_BASE_PATH` (set only by that workflow; default `/`) drives the Vite `base` in `.storybook/main.ts` so assets resolve under the subpath — `dev`, `vr`, and `a11y` are unaffected.

> **One-time setup:** enable Pages at **Settings → Pages → Deploy from a branch → `gh-pages` / root**. Until then the workflow still runs and creates the `gh-pages` branch, but the URLs 404.

### Unit tests (Vitest)

```bash
pnpm --filter @notation-hero/client test
```

Vitest runs in jsdom with Testing Library. Tests are `*.test.tsx` beside the component. VR specs (`*.vr.ts`) are excluded from Vitest — they belong to Playwright.

### Visual-regression (VR) tests (Playwright)

VR tests render each Storybook story in isolation and compare a screenshot against a committed baseline.

```bash
pnpm --filter @notation-hero/client test:vr          # compare against committed baselines
pnpm --filter @notation-hero/client test:vr:update   # re-generate baselines after an intended visual change
```

- Playwright auto-starts Storybook as its `webServer` (see `playwright.config.ts`) — you do **not** need Storybook running separately.
- Specs match `**/*.vr.{ts,tsx}`. Each test opens `…/iframe.html?id=<story-id>` and calls `toHaveScreenshot`.
- Baselines live in `<Component>.vr.ts-snapshots/` and are **committed**. They are **OS-specific** (currently `…-chromium-darwin.png`, generated on macOS). Running `test:vr` on Linux will mismatch — CI/Docker-Linux baselines are a deferred follow-up.

**Debugging a failing VR test:**

```bash
# Open the HTML report — Expected / Actual / Diff, side by side
pnpm --filter @notation-hero/client exec playwright show-report

# Interactive UI mode — step through tests, inspect the DOM
pnpm --filter @notation-hero/client exec playwright test --ui

# Headed — watch the real browser render
pnpm --filter @notation-hero/client exec playwright test --headed
```

- On failure Playwright writes `*-actual.png`, `*-expected.png`, and `*-diff.png` under `test-results/`. Open the `-diff` to see exactly which pixels changed.
- **Change was intentional?** Re-run `test:vr:update` and commit the new baselines.
- **Looks like a flake?** The usual cause is web fonts not being ready. Specs already `await document.fonts.ready` before snapshotting (so Material Symbols render as glyphs, not the ligature fallback text) — if you introduce a new font/icon, load it the same way.
- `test-results/`, `playwright-report/`, and `storybook-static/` are git-ignored.

### Accessibility (a11y) tests

Every Storybook story is checked with **axe-core** (WCAG 2 A + AA) in **both light and dark themes** — a required CI gate.

```bash
pnpm --filter @notation-hero/client test:a11y
```

- Driven by `@axe-core/playwright` over the stories (`*.a11y.ts`, the `a11y` Playwright project). Like VR, it auto-starts Storybook.
- Each story is loaded twice — `?globals=theme:light` and `:dark` — so contrast is checked against the real rendered colors (the preview decorator applies the `.dark` class; the Storybook "dark background" addon is intentionally disabled because it only paints the canvas without switching the theme).
- On a violation the test prints the rule, the element, and the **measured contrast ratio + the two colors** — the same detail as the Storybook a11y panel, readable straight from the CI job log.
- While building a component, the **a11y addon panel** in `pnpm storybook` shows the same checks live.

### End-to-end (e2e) tests

Unlike VR/a11y (which run against Storybook), e2e runs against the **built app** served by
`vite preview`, with a **separate config** (`playwright.e2e.config.ts`) and test dir (`e2e/`).

```bash
pnpm --filter @notation-hero/client test:e2e          # build -> preview (:4173) -> smoke test
pnpm --filter @notation-hero/client test:e2e:ui       # interactive UI mode
```

- MSW intercepts `/api/*` at the browser network layer (Playwright `context.route`), so it is the
  source of catalog data — handlers live in `e2e/mocks/handlers.ts`; there is no real backend in CI.
  The fixture's `onUnhandledRequest` errors on an unmocked `/api/*` call so a mock miss fails at the
  network layer (not as a vague "Could not reach the API").
- The smoke test (`e2e/smoke.e2e.ts`) is the **reusable template**: load a page → navigate via an
  in-app link → assert the MSW-mocked data renders → assert a clean console boot. Copy it for
  future feature tests.

**Debugging a failing e2e (traces):** `trace: 'on-first-retry'` records a replayable timeline. CI
uploads it as the `playwright-e2e-report` artifact (kept even on flaky-then-passed runs). Download,
unzip, then:

```bash
pnpm --filter @notation-hero/client exec playwright show-trace test-results/<test>/trace.zip
```

### Formatting & linting

Prettier (`prettier.config.js`): **semicolons**, single quotes, trailing commas, **`printWidth: 100`** — matching `server/`. **ESLint enforces formatting** via `eslint-plugin-prettier`, so `pnpm lint` (a CI gate) fails on a missing semicolon or an over-long line, not just `prettier --check`.

```bash
pnpm --filter @notation-hero/client lint     # check (CI gate) — fails on format drift
pnpm --filter @notation-hero/client format   # auto-fix formatting + lint
```

The ESLint base is `@tanstack/eslint-config` plus React-hooks/Compiler and Storybook rules. (`server/` uses a separate hand-rolled typed config — only the Prettier formatting is shared between the two packages.)

---

## Styling (Tailwind CSS v4)

Tailwind v4 is configured CSS-first in `src/styles.css` (no `tailwind.config.js`). The teal theme tokens + Public Sans font come from the shadcn preset; dark mode is the `.dark` class variant.

## Routing (TanStack Router)

File-based routing under `src/routes/`. Add a route by adding a file there; the route tree is generated into `src/routeTree.gen.ts` (`pnpm --filter @notation-hero/client generate-routes`) and is **not** hand-edited (it is prettier-ignored). The root layout lives in `src/routes/__root.tsx`.

```tsx
import { Link } from '@tanstack/react-router';

<Link to="/about">About</Link>;
```
