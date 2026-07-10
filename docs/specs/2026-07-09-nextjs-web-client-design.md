# Design — Next.js 16 web client (`@notation-hero/web`)

- **Status:** Reviewed (ce-doc-review, 2026-07-10) — Phase 1 build on hold
- **Date:** 2026-07-09
- **Author:** leocaseiro (with Claude)
- **Decision record:** [ADR — FE + hosting: Next.js PWA on Vercel](../decisions/2026-07-08-fe-nextjs-vercel-aws-bff-adr.md) (NH-185)
- **Tracking:** [NH-275](https://leocaseiro.atlassian.net/browse/NH-275)
- **Scope:** Stand up a working Next.js 16 app as the product client, integrated into the pnpm workspace, that consumes the existing design system. Rename of the design-system package is sequenced as a separate follow-up.

---

## Context

The [ADR](../decisions/2026-07-08-fe-nextjs-vercel-aws-bff-adr.md) adopts a **Next.js App Router PWA on Vercel** as the product front end. The design system "carries over untouched" and only 3 stub routes exist, so switch cost is near its minimum.

A first `create-next-app` scaffold was started at `notation-hero-client/` but does not run. Two causes:

1. **Nested pnpm workspace** — the scaffold has its own `pnpm-workspace.yaml` **and** `pnpm-lock.yaml` nested inside the repo, and is not registered in the root workspace `packages:` list.
2. **Invalid placeholder config** — that nested `pnpm-workspace.yaml` still contains literal placeholder text (`sharp: set this to true or false`). On boot, Next.js 16 runs a `pnpm install` dependency check that exits non-zero (`ERR_PNPM_IGNORED_BUILDS` for `sharp` + `unrs-resolver`), so `next dev` dies before the server starts.

The decision is to **redo the scaffold cleanly**, integrated into the root workspace.

### Next.js 16 facts that shape this design

Confirmed from the installed docs (`next/dist/docs`):

- **Turbopack is the default** for `next dev` and `next build` — no `--turbopack` flag; a custom `webpack` config would fail the build (we have none).
- **`next lint` is removed** — run ESLint directly; `next build` no longer lints.
- **ESLint flat config** is the default for `@next/eslint-plugin-next`.
- **React 19.2 + React Compiler 1.0** — `reactCompiler` is now a stable top-level option (Babel-based, so slower builds).
- Async request APIs (`cookies`, `headers`, `params`, `searchParams`), `middleware` → `proxy`, and `next/image` config changes apply to later data/BFF work, not to this static-proof phase.
- Node.js ≥ 20.9 required; the repo pins Node ≥ 24, so this is satisfied.

---

## Locked decisions

| Topic                          | Decision                                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| App ↔ design system            | **Option A** — the app _consumes_ the design system; Storybook + VR/a11y stay where they are. |
| Design-system folder (Phase 2) | `design-system/`, package `@notation-hero/design-system`.                                     |
| Packaging                      | **Single package**, with `exports` + `sideEffects` so the app tree-shakes.                    |
| Storybook                      | Stays in the design-system package, **separate** from the app.                                |
| Sequencing                     | **App first**, rename after.                                                                  |
| App folder / package           | `web/` / `@notation-hero/web`.                                                                |
| Fonts                          | **Reuse** the design system's `@fontsource` Public Sans + Material Symbols.                   |
| React Compiler                 | **On** (`reactCompiler: true`).                                                               |

---

## Target architecture (Option A)

```text
notation-hero/
  design-system/   (was client/)   @notation-hero/design-system   components + Storybook + VR/a11y + tokens
  web/             (new)            @notation-hero/web             Next.js 16 App Router, imports the design system
  server/  shared/  infra/
```

- The design system stays a **Vite-powered library** (Storybook uses Vite under the hood). Its components, stories, and VR (visual-regression) + a11y (accessibility) tests are **not rewritten**; Phase 1 makes only additive changes to the package (an `exports` map, a `Button` barrel, a tokens entry — see §5) and re-runs the design system's own checks afterward to confirm no regression.
- The app is **Next.js 16 / Turbopack**. It imports components across the package boundary; it does not host Storybook.
- During Phase 1 the design-system package is still named `@notation-hero/client` (dir `client/`). The rename to `@notation-hero/design-system` is Phase 2.

---

## Phase 1 — working app on the workspace (this plan)

**Goal:** a booting, workspace-integrated Next.js app that renders a real design-system component with brand tokens, in light and dark, and passes the repo's `check:all`.

### 1. Workspace integration

- Create the app at `web/` as `@notation-hero/web` (private). **No nested `pnpm-workspace.yaml` or `pnpm-lock.yaml`** — the app joins the root workspace and the single root lockfile.
- Register `web` in the root `pnpm-workspace.yaml` `packages:` list.
- Root `allowBuilds`: add `sharp: true` (native dependency of `next/image`). `unrs-resolver` already has an entry.

### 2. Supply-chain / build hygiene

- **Match `client/`'s shared-dep ranges, not the scaffold's exact pins.** `check:all` runs `syncpack lint`, which fails on any cross-package version mismatch — so `web` declares `react`/`react-dom` as `^19.2.7` and `babel-plugin-react-compiler` as `^1.0.0` (the ranges `client/` already uses) and reuses `client/`'s `tailwindcss` `^4.3.1`. The scaffold's exact `19.2.4` pins would turn `check:all` red.
- `next@16.2.10` is the one genuinely new-to-the-workspace package. The root workspace enforces `minimumReleaseAge: 10080` (7 days); if `next@16.2.10` is younger than 7 days at install time, add it to `minimumReleaseAgeExclude` until the window passes (mirrors the existing Playwright pins). Aligning React to the already-installed `^19.2.7` removes any freshness concern there.

### 3. Toolchain alignment (per-package, matching repo norm)

The workspace convention is that each package keeps its own toolchain. The app therefore keeps its own config; alignment is light:

- **ESLint:** keep the scaffold's flat config (`eslint-config-next/core-web-vitals` + `/typescript`); set the script to `eslint --max-warnings 0` to match the design system.
- **Prettier:** run `prettier --write` on the app so scaffold double-quotes become the repo style (`singleQuote: true`, `printWidth: 100`, `semi: true`, `trailingComma: 'all'`). Root `format:check` then covers it.
- **TypeScript:** add `typecheck: tsc --noEmit`; keep the scaffold `tsconfig.json` (bundler resolution, `strict`, the `next` plugin).
- **cspell:** add any new identifiers the app introduces (e.g. `Turbopack`) to `cspell.json`.
- The app must pass every relevant gate in `check:all`: `format:check`, `lint`, `typecheck`, `syncpack`, and the markdown/spell/yaml linters.

### 4. Tailwind v4 wiring

The app runs Tailwind v4 through **`@tailwindcss/postcss`** (the Turbopack-compatible plugin the scaffold already ships) — **not** the client package's `@tailwindcss/vite` plugin, which cannot run under Next. The app's Tailwind entry (`app/globals.css`) must:

1. Load Tailwind v4 (`@import 'tailwindcss'`).
2. Bring in the client package's **full token surface**, not just its `@theme {}` block. `<Button>` styles with `bg-primary`, but `--primary` and the light/dark values live in the `:root`, `.dark`, and `@theme inline` blocks of `client/src/styles.css` — so `bg-primary` won't resolve from `@theme` alone. Prefer `@import`-ing the client package's exposed `styles.css` (single source of truth); if instead duplicating, copy `@theme` **plus `@theme inline`, `:root`, `.dark`, and the `@custom-variant dark` line**. (When reusing `styles.css` wholesale, drop the app's own `@import 'tailwindcss'` + font imports to avoid double-inclusion.) A Tailwind-free shared `tokens.css` extraction is deferred to Phase 2.
3. `@source` the client package component source so the utility classes used by imported components are generated (without this they render unstyled). Treat the cross-package scan as an **unverified bet** — confirm it works under `@tailwindcss/postcss` at build time (see Risks).
4. Enable dark mode via the same `@custom-variant dark (&:is(.dark *))` the client package uses.

Fonts reuse the client package's `@fontsource-variable/public-sans` and `@fontsource-variable/material-symbols-outlined` CSS imports (per the fonts decision) — but `web` must declare both `@fontsource-variable/*` packages as its **own** dependencies, since pnpm's strict `node_modules` won't resolve them transitively. `next/font` is explicitly **not** used in Phase 1.

### 5. Design-system consumption

- Add the design system as a dependency: `"@notation-hero/client": "workspace:*"`.
- Add a minimal, **additive** `exports` map to `client/package.json` — `"."` (a small `client/src/index.ts` re-exporting **only `Button`** for the proof), `"./package.json"`, and the tokens entry `"./styles.css"`. Scoping the barrel to `Button` keeps Phase 1 a one-component proof; the **full** barrel over all ~40 `ui/` components is Phase 2 work. The map must stay additive — do not close off the implicit resolution the design system's own build/Storybook already rely on.
- **Re-validate the shared package after mutating it:** once the `exports` map + barrel + tokens entry are in, re-run the design system's own `check:all` + `build-storybook` to confirm no regression (it gates CI via VR + a11y).
- **`"use client"`:** interactive components need a client boundary under the App Router's default Server Components. Put `"use client"` on `Button` (the interactive component being imported), and keep the proof `app/page.tsx` a **Server Component** rendering the client `<Button>` — so Phase 1 validates the real server/client boundary, not a fully client-rendered page. Systematic per-component `"use client"` across the library is a Phase-2 packaging task.

### 6. Proof page

- `app/page.tsx` is a **Server Component** that renders the client `<Button>` (with its variants) plus a brand-token swatch in light **and** dark — wrap one section in a `.dark` container, since the app has no theme toggle yet — replacing the Geist boilerplate.
- `app/layout.tsx` imports `globals.css`, sets `<html lang="en">`, applies Public Sans to the body, and removes the Geist `next/font` setup.

### 7. Next.js config

- `next.config.ts` keeps `reactCompiler: true` and adds **`transpilePackages: ['@notation-hero/client']`** — the app imports the client package as raw `.tsx` source, and Next doesn't transpile `node_modules` (a workspace package is symlinked there), so the JSX won't parse without it. No `webpack` config (Turbopack default). Scripts stay `next dev` / `next build` / `next start`.

### Success criteria (verification)

- Root `pnpm install` resolves with a single lockfile and no nested workspace.
- `pnpm --filter @notation-hero/web dev` boots and serves the proof page.
- `pnpm --filter @notation-hero/web build` (Turbopack) succeeds.
- Root `pnpm run check:all` is green.
- The proof page shows the `<Button>` with teal brand tokens correctly in both light and dark.

---

## Phase 2 — design-system rename (separate follow-up plan)

Mechanical but touches CI and deploy, so it is verified in isolation:

- `git mv client design-system`; package `@notation-hero/client` → `@notation-hero/design-system`.
- Full barrel `exports` + `sideEffects: false`; repoint the app's imports.
- Repoint the ~8 functional references (3 CI workflows, root `package.json`, `pnpm-workspace.yaml`, `infra/index.ts`, one tooling test) and ~4 living docs (`README`, `AGENTS.md`, 2 specs). Dated historical plans stay as point-in-time records.
- Optionally strip the leftover Vite SPA shell (`src/routes/`, `src/main.tsx`, `index.html`) now that the app lives in `web/`.
- Note: `infra/index.ts` + `deploy.yml` currently deploy the Vite client to S3/CloudFront; that path is superseded by the Vercel hosting work, so the rename overlaps the deploy rewire.

---

## Out of scope (later milestones, from the ADR)

Vercel deploy + custom domain · PWA · hybrid BFF (`api.notationhero.com` → CloudFront → Lambda) · `"use cache"` catalog caching · Postgres full-text search · Cloudflare R2 blobs.

---

## Risks / watch-outs

1. **`minimumReleaseAge` gate** may reject `next@16.2.10` if freshly published — temp-exclude by exact version until the 7-day window passes. (React aligns to the already-installed `^19.2.7`, so it is not a fresh install.)
2. **Tailwind `@source`** must point at the client package source, or imported components render unstyled — and the cross-package scan under `@tailwindcss/postcss` is an unverified bet that would surface only at build time.
3. **`"use client"` boundary** required for interactive design-system components under React Server Components.
4. **`sharp` build approval** needed for `next/image`.
5. **Lint gates on new files** — Prettier / cspell / markdownlint must pass before commit (lefthook runs them).
6. **Dev-server ports** — the app defaults to `:3000`, the same port the design system's Vite `dev` uses; only a concern if both run at once (Storybook is on `:6006`).
7. **React Compiler** raises build times (accepted trade-off for the portfolio signal).

---

## Open questions

- None outstanding. Reviewed 2026-07-10 (4-persona ce-doc-review): 7 findings applied, React Compiler kept on per decision. Tracked as [NH-275](https://leocaseiro.atlassian.net/browse/NH-275); Phase 1 build on hold pending your go-ahead.
