# Design — Next.js 16 web client (`@notation-hero/web`)

- **Status:** Draft for review
- **Date:** 2026-07-09
- **Author:** leocaseiro (with Claude)
- **Decision record:** [ADR — FE + hosting: Next.js PWA on Vercel](../decisions/2026-07-08-fe-nextjs-vercel-aws-bff-adr.md) (NH-185)
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

- The design system stays a **Vite-powered library** (Storybook uses Vite under the hood). Every VR (visual-regression) baseline and a11y (accessibility) test stays untouched.
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

- The root workspace enforces `minimumReleaseAge: 10080` (7 days). Confirm Next `16.2.10` and React `19.2.4`/`react-dom 19.2.4` are older than 7 days at install time; if not, add exact `name@version` entries to `minimumReleaseAgeExclude` until the window passes (mirrors the existing Playwright pins).
- Keep versions identical to the scaffold: `next@16.2.10`, `react@19.2.4`, `react-dom@19.2.4`, Tailwind v4, `babel-plugin-react-compiler@1.0.0`.

### 3. Toolchain alignment (per-package, matching repo norm)

The workspace convention is that each package keeps its own toolchain. The app therefore keeps its own config; alignment is light:

- **ESLint:** keep the scaffold's flat config (`eslint-config-next/core-web-vitals` + `/typescript`); set the script to `eslint --max-warnings 0` to match the design system.
- **Prettier:** run `prettier --write` on the app so scaffold double-quotes become the repo style (`singleQuote: true`, `printWidth: 100`, `semi: true`, `trailingComma: 'all'`). Root `format:check` then covers it.
- **TypeScript:** add `typecheck: tsc --noEmit`; keep the scaffold `tsconfig.json` (bundler resolution, `strict`, the `next` plugin).
- **cspell:** add any new identifiers the app introduces (e.g. `Turbopack`) to `cspell.json`.
- The app must pass every relevant gate in `check:all`: `format:check`, `lint`, `typecheck`, and the markdown/spell/yaml linters.

### 4. Tailwind v4 wiring

The app's Tailwind entry (`app/globals.css`) must:

1. Load Tailwind v4 (`@import 'tailwindcss'`).
2. Include the design-system `@theme` tokens (brand teal scale, skeleton animation, etc.). Reuse is preferred (single source of truth); duplicating the `@theme` block into the app is an acceptable Phase-1 fallback, with token extraction into a shared `tokens.css` deferred to Phase 2.
3. `@source` the design-system component source so the utility classes used by imported components are generated (without this, imported components render unstyled).
4. Enable dark mode via the same `@custom-variant dark (&:is(.dark *))` the design system uses.

Fonts are loaded by reusing the design system's `@fontsource-variable/public-sans` and `@fontsource-variable/material-symbols-outlined` CSS imports (per the fonts decision). `next/font` is explicitly **not** used in Phase 1.

### 5. Design-system consumption

- Add the design system as a dependency: `"@notation-hero/client": "workspace:*"`.
- Add a minimal, forward-compatible `exports` to `client/package.json` plus a barrel `client/src/index.ts` that re-exports the `ui/` components, enabling `import { Button } from '@notation-hero/client'`. This is **additive only** and carries into Phase 2. Also expose the tokens entry (`./styles.css` or a dedicated `tokens.css`) for the Tailwind wiring above.
- **`"use client"`:** interactive Base UI components need a client boundary under the App Router's default Server Components. In Phase 1 the proof page carries a single `"use client"` directive. Systematic per-component `"use client"` placement in the library is a Phase-2 packaging task.

### 6. Proof page

- `app/page.tsx` renders a design-system component (a `<Button>` with its variants) plus a brand-token swatch, shown in light **and** dark, replacing the Geist boilerplate.
- `app/layout.tsx` imports `globals.css`, sets `<html lang="en">`, applies Public Sans to the body, and removes the Geist `next/font` setup.

### 7. Next.js config

- `next.config.ts` keeps `reactCompiler: true`; no `webpack` config (Turbopack default). Scripts stay `next dev` / `next build` / `next start`.

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

1. **`minimumReleaseAge` gate** may reject `next@16.2.10` / `react@19.2.4` if freshly published — temp-exclude by exact version until the 7-day window passes.
2. **Tailwind `@source`** must point at the design-system source, or imported components render unstyled.
3. **`"use client"` boundary** required for interactive design-system components under React Server Components.
4. **`sharp` build approval** needed for `next/image`.
5. **Lint gates on new files** — Prettier / cspell / markdownlint must pass before commit (lefthook runs them).
6. **Dev-server ports** — the app defaults to `:3000`, the same port the design system's Vite `dev` uses; only a concern if both run at once (Storybook is on `:6006`).
7. **React Compiler** raises build times (accepted trade-off for the portfolio signal).

---

## Open questions

- Whether to open a dedicated NH Jira ticket for this work (the ADR notes "New ticket TBD"). Offered, not blocking.
