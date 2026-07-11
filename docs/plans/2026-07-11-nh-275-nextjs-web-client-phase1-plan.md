# Next.js 16 web client — Phase 1 (NH-275) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** A booting, workspace-integrated Next.js 16 app at `web/` (`@notation-hero/web`) that
renders the design system's `<Button>` with brand tokens in light and dark, and passes the repo's
`check:all`.

**Architecture:** The app _consumes_ the design system (`@notation-hero/client`) across the
package boundary as raw `.tsx` source via `transpilePackages`; Storybook + VR/a11y stay in
`client/` untouched. Tailwind v4 runs through `@tailwindcss/postcss` (Turbopack-compatible), with
the client package's `styles.css` as the single token source of truth. Only additive changes land
in `client/` (an `exports` map, a Button-only barrel, a `"use client"` directive).

**Tech Stack:** Next.js 16.2.10 (App Router, Turbopack default), React 19.2, React Compiler 1.0,
Tailwind v4 via `@tailwindcss/postcss`, pnpm 11.5.2 workspaces.

**Source spec:** `docs/specs/2026-07-09-nextjs-web-client-design.md` — read it first; this plan
implements its Phase 1. Decision record:
`docs/decisions/2026-07-08-fe-nextjs-vercel-aws-bff-adr.md`.

**Jira:** [NH-275](https://leocaseiro.atlassian.net/browse/NH-275)

**Base branch:** `nextjs-web-setup` (carries the spec + this plan). If that branch has merged to
`master` by execution time, branch from `master` instead. Execute in a fresh worktree
(superpowers:using-git-worktrees); after `pnpm install`, verify hooks fire
(`git config --get core.hooksPath` → empty; see AGENTS.md worktree rules).

## Global Constraints

- **Node ≥ 24** (`.nvmrc` — run `nvm use` first), **pnpm 11.5.2** (`packageManager` pin).
- **No nested workspace files:** `web/` must never contain `pnpm-workspace.yaml` or
  `pnpm-lock.yaml` — one root lockfile only. (This is exactly what killed the first scaffold.)
- **Do NOT run `create-next-app`.** All files are hand-created from the verbatim contents below
  (deterministic; avoids wrong pins, a nested lockfile, and Geist boilerplate).
- **Shared-dep specifiers must match `client/` exactly** (root `syncpack lint` fails on ANY
  cross-package specifier difference, even when versions resolve the same):
  - `react` / `react-dom` → `^19.2.7` · `tailwindcss` → `^4.3.1` · `typescript` → `^5.7.3`
  - `@types/node` → `^24.0.0` · `@types/react` / `@types/react-dom` → `^19.2.0`
  - `eslint` → `^9.20.0` · `babel-plugin-react-compiler` → `^1.0.0`
  - `@fontsource-variable/public-sans` → `^5.2.7` ·
    `@fontsource-variable/material-symbols-outlined` → `^5.2.45`
  - New-to-workspace (no syncpack peer, exact pins mirroring the create-next-app scaffold):
    `next` → `16.2.10`, `eslint-config-next` → `16.2.10`. Web-only range:
    `@tailwindcss/postcss` → `^4.3.1`.
- **Repo formatting:** Prettier `singleQuote: true`, `printWidth: 100`, `semi: true`,
  `trailingComma: 'all'` — the file contents below are already in this style; run
  `pnpm exec prettier --check` before each commit anyway.
- **Layout guard:** no `__tests__/`, `__mocks__/`, or `stories/` directories anywhere (CI
  `check:layout`). Role suffixes apply to `server/src/` only — `web/` is exempt.
- **Commits:** conventional-commit subjects (commitlint gates local commits AND the PR title),
  baby commit per task, never `--no-verify`. End every commit message with
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- **No invented scope:** no unit-test harness for `web/` in Phase 1 (success criteria are
  boot/build/gates/visual — the spec defines no web tests; `pnpm -r --if-present run test` skips
  packages without a `test` script). No theme toggle, no PWA, no Vercel deploy.
- **Ports:** `next dev` defaults to `:3000`, same as the client Vite dev script — a collision
  only if both run at once (Storybook is `:6006`). Leave defaults; stop one before starting the
  other.

## Key design decisions

| #   | Decision                                                                                                           | Why                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Hand-create all `web/` files; never run `create-next-app`                                                          | Deterministic content, repo-style quotes, correct dep ranges from the start; the scaffold's exact `19.2.4` React pins and nested lockfile were the original failure.                                                                                                                                                                                                                                                |
| D2  | `web/tsconfig.json` maps `"@/*"` → `["../client/src/*"]`; app code uses **relative imports only**                  | Turbopack resolves path aliases inside `transpilePackages` source against the **app's** tsconfig, never the package's own (verified in Next 16.2.10 source: `TsConfigHandling::Fixed(<app>/tsconfig.json)` in both `next_client` and `next_server` contexts). `Button.tsx` imports `'@/lib/utils'`, so the app's `@/*` must point at `client/src`. One alias, one target — the app cedes `@/` to the design system. |
| D3  | `client/src/index.ts` barrel uses a **relative** import                                                            | The barrel must not depend on any alias mapping — it resolves identically under Vite, tsc, and Turbopack.                                                                                                                                                                                                                                                                                                           |
| D4  | `web/app/globals.css` = `@import '@notation-hero/client/styles.css'` + `@source '../../client/src'` — nothing else | Spec §4: the client `styles.css` already carries `@import 'tailwindcss'`, both `@fontsource-variable` imports, `@custom-variant dark`, and the full `:root`/`.dark`/`@theme` token surface. Re-importing any of those here would double-include.                                                                                                                                                                    |
| D5  | `next` + `eslint-config-next` pinned exact `16.2.10`                                                               | Mirrors the scaffold convention; published 2026-07-01, so the 7-day `minimumReleaseAge` gate passes with **no** `minimumReleaseAgeExclude` entry (Task 1 re-verifies).                                                                                                                                                                                                                                              |
| D6  | Add `'web/**'` to the `code:` filter in `.github/workflows/ci.yml`                                                 | Not in the spec, but without it a web-only PR silently skips the `quality`/`build`/`sast`/`deps-cve` CI jobs (ci-green would still pass). The filter's own comment says to add new paths.                                                                                                                                                                                                                           |
| D7  | Add an `eslint-web` pre-commit block to `lefthook.yml`                                                             | The eslint hooks are hard-coded per package (`client/`, `server/`); without a `web/` block, web files get no ESLint autofix pre-commit (pre-push and CI still gate). Matches the CI ↔ local parity convention.                                                                                                                                                                                                      |
| D8  | Update README Layout/Stack + AGENTS.md package list + stale "FE = Vite SPA" snapshot line                          | Adding a workspace package makes those lines false; AGENTS.md's own rule is that stale snapshot lines get fixed by the PR that outdates them. The decision registry already has the 2026-07-08 FE-pivot entry — no registry edit needed.                                                                                                                                                                            |

## File structure

| Path                                         | Action | Responsibility                                             | Task |
| -------------------------------------------- | ------ | ---------------------------------------------------------- | ---- |
| `web/package.json`                           | Create | Package identity, deps (Task 1), scripts (Task 2)          | 1, 2 |
| `web/.gitignore`                             | Create | Ignore `.next/`, `out/`, `next-env.d.ts`                   | 1    |
| `pnpm-workspace.yaml`                        | Modify | Register `web`; `allowBuilds: sharp: true`                 | 1    |
| `.prettierignore`                            | Modify | Keep Prettier out of `.next/` (it doesn't read .gitignore) | 1    |
| `.stylelintignore`                           | Modify | Keep stylelint's `**/*.css` out of `.next/`                | 1    |
| `.markdownlint-cli2.yaml`                    | Modify | Keep `lint:md`'s `**/*.md` out of `.next/`                 | 1    |
| `web/next.config.ts`                         | Create | `reactCompiler` + `transpilePackages`                      | 2    |
| `web/tsconfig.json`                          | Create | Scaffold options + the D2 `@/*` mapping                    | 2    |
| `web/postcss.config.mjs`                     | Create | `@tailwindcss/postcss` plugin                              | 2    |
| `web/eslint.config.mjs`                      | Create | `eslint-config-next` flat config                           | 2    |
| `web/app/layout.tsx`                         | Create | Root layout, imports `globals.css`, `lang="en"`, no Geist  | 2    |
| `web/app/globals.css`                        | Create | Tailwind entry (Task 2) → client tokens + `@source` (4)    | 2, 4 |
| `web/app/page.tsx`                           | Create | Boot placeholder (Task 2) → Server-Component proof (4)     | 2, 4 |
| `client/package.json`                        | Modify | Additive `exports` map                                     | 3    |
| `client/src/index.ts`                        | Create | Button-only barrel                                         | 3    |
| `client/src/components/ui/Button/Button.tsx` | Modify | Add `'use client'` directive (line 1)                      | 3    |
| `.github/workflows/ci.yml`                   | Modify | `'web/**'` in the `code:` changes filter                   | 5    |
| `lefthook.yml`                               | Modify | `eslint-web` pre-commit block                              | 5    |
| `README.md`                                  | Modify | Stack line + Layout table row                              | 5    |
| `AGENTS.md`                                  | Modify | Package list + stale FE snapshot line                      | 5    |

Everything runs from the worktree root unless a step says otherwise.

---

### Task 1: Register `web/` in the workspace (deps only — no scripts yet)

The package joins the workspace with its dependencies but **without scripts**, so every
`pnpm -r --if-present run <target>` gate (lint/typecheck/test/build) skips it until the app files
exist in Task 2. Each commit stays green.

**Files:**

- Create: `web/package.json`
- Create: `web/.gitignore`
- Modify: `pnpm-workspace.yaml`
- Modify: `.prettierignore`
- Modify: `.stylelintignore`
- Modify: `.markdownlint-cli2.yaml`

**Interfaces:**

- Consumes: nothing (first task).
- Produces: workspace member `@notation-hero/web` at `web/` with all deps installed; later tasks
  add files under `web/` and scripts to `web/package.json`.

- [ ] **Step 1: Pre-flight — confirm the release-age gate passes for the exact pins**

Run: `npm view next@16.2.10 time --json | grep '"16.2.10"'`
Expected: a publish timestamp of `2026-07-01T20:13…Z` (or otherwise ≥ 7 days old at execution
time). Repeat for `eslint-config-next@16.2.10`.

Contingency (only if a pin is younger than 7 days — e.g. this plan was retargeted to a newer
patch): add the exact `name@version` under `minimumReleaseAgeExclude:` in `pnpm-workspace.yaml`,
mirroring the existing `playwright@1.61.1` entries, and remove it after the window passes.

- [ ] **Step 2: Create `web/package.json`** (no `scripts` key yet — added in Task 2; key order is
      sort-package-json-clean)

```json
{
  "name": "@notation-hero/web",
  "version": "0.0.1",
  "private": true,
  "dependencies": {
    "@fontsource-variable/material-symbols-outlined": "^5.2.45",
    "@fontsource-variable/public-sans": "^5.2.7",
    "@notation-hero/client": "workspace:*",
    "next": "16.2.10",
    "react": "^19.2.7",
    "react-dom": "^19.2.7"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.3.1",
    "@types/node": "^24.0.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "babel-plugin-react-compiler": "^1.0.0",
    "eslint": "^9.20.0",
    "eslint-config-next": "16.2.10",
    "tailwindcss": "^4.3.1",
    "typescript": "^5.7.3"
  }
}
```

Both `@fontsource-variable/*` packages are declared here even though the CSS `@import`s live in
the client package's `styles.css` — spec §4: pnpm's strict `node_modules` must not be relied on
to resolve them transitively from `web/`.

- [ ] **Step 3: Create `web/.gitignore`**

```gitignore
# Next.js build output (root .gitignore already covers node_modules/, env files, *.tsbuildinfo)
/.next/
/out/

# Generated by `next dev`/`next build`; not committed — CI typecheck passes without it
next-env.d.ts
```

- [ ] **Step 4: Register the package and the `sharp` build approval in `pnpm-workspace.yaml`**

In the `packages:` list, append `- web` as the last entry (the list is not alphabetical today;
appending is the smallest diff):

```yaml
packages:
  - client
  - server
  - shared
  - infra
  - web
```

In the `allowBuilds:` map, add one entry (keep the existing comment style):

```yaml
allowBuilds:
  lefthook: true
  '@swc/core': true
  esbuild: true
  protobufjs: true # @pulumi/pulumi gRPC runtime (infra/)
  sharp: true # next/image native dependency (web/)
  unrs-resolver: false # import-x native resolver not needed yet
  msw: false # @msw/playwright intercepts via Playwright's context.route — MSW's service-worker postinstall is not needed
```

- [ ] **Step 5: Keep repo-wide linters out of `.next/`** (none of them read `.gitignore`)

Append to `.prettierignore`:

```gitignore
# Next.js build output (web/) — Prettier doesn't read .gitignore.
.next/
```

Append to `.stylelintignore` (currently `dist/`, `storybook-static/`, `.claude/worktrees/`):

```gitignore
.next/
```

Add to the `ignores:` list in `.markdownlint-cli2.yaml`:

```yaml
- '**/.next/**'
```

(cspell has `useGitignore: true` and editorconfig-checker scans tracked files only — no changes
needed there. No cspell words are needed either: `Turbopack` is already in `cspell.json`, and
`Vercel`/`fontsource`/`nextjs` pass via cspell's bundled dictionaries — verified 2026-07-11.)

- [ ] **Step 6: Install**

Run: `pnpm install`
Expected: exit 0; **no** `ERR_PNPM_IGNORED_BUILDS`; root `pnpm-lock.yaml` updated. Then confirm
no nested workspace artifacts:

Run: `ls web/pnpm-lock.yaml web/pnpm-workspace.yaml 2>&1`
Expected: `No such file or directory` for both.

Run: `pnpm --filter @notation-hero/web exec pwd`
Expected: prints the absolute path of `web/` (proves workspace membership).

- [ ] **Step 7: Targeted gates**

Run: `pnpm run syncpack && pnpm run lint:sort-pkg && pnpm run lint:yaml && pnpm exec prettier --check web/package.json .markdownlint-cli2.yaml`
Expected: all pass. (`syncpack lint` proves the shared-dep specifiers match `client/`.)

- [ ] **Step 8: Commit**

```bash
git add web/package.json web/.gitignore pnpm-workspace.yaml pnpm-lock.yaml .prettierignore .stylelintignore .markdownlint-cli2.yaml
git commit -m "chore(web): register @notation-hero/web in the pnpm workspace (NH-275)

Deps only, no scripts yet — recursive gates skip the package until the app
files land. allowBuilds: sharp (next/image); .next/ excluded from Prettier,
stylelint, and markdownlint (they don't read .gitignore).

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Boot the Next.js app skeleton (Turbopack + React Compiler)

A plain-Tailwind, no-design-system app first — so a boot failure here can only be Next/Turbopack/
PostCSS/React-Compiler wiring, not cross-package resolution.

**Files:**

- Create: `web/next.config.ts`
- Create: `web/tsconfig.json`
- Create: `web/postcss.config.mjs`
- Create: `web/eslint.config.mjs`
- Create: `web/app/layout.tsx`
- Create: `web/app/globals.css` (interim content — replaced in Task 4)
- Create: `web/app/page.tsx` (interim content — replaced in Task 4)
- Modify: `web/package.json` (add the `scripts` block)

**Interfaces:**

- Consumes: the installed workspace package from Task 1.
- Produces: `pnpm --filter @notation-hero/web run dev|build|lint|typecheck` all work; scripts
  `dev`, `build`, `start`, `lint`, `typecheck` exist. `web/app/layout.tsx` stays as written here
  for the rest of the plan.

- [ ] **Step 1: Create `web/next.config.ts`**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // React Compiler 1.0 — stable top-level option; Babel-based, so builds are slower (accepted).
  reactCompiler: true,
  // The app imports @notation-hero/client as raw .tsx source. Next doesn't transpile
  // node_modules (a workspace package is symlinked there), so the JSX won't parse without this.
  transpilePackages: ['@notation-hero/client'],
};

export default nextConfig;
```

- [ ] **Step 2: Create `web/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    // '@/*' points at the DESIGN SYSTEM's src, not this app: Turbopack resolves the '@/lib/utils'
    // imports inside transpiled @notation-hero/client source against THIS tsconfig (the app's),
    // never the package's own. The app's own code therefore uses relative imports only.
    "paths": {
      "@/*": ["../client/src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create `web/postcss.config.mjs`**

```js
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
```

- [ ] **Step 4: Create `web/eslint.config.mjs`**

```js
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
```

- [ ] **Step 5: Create `web/app/layout.tsx`** (no Geist / `next/font` — fonts come from the
      design system's `@fontsource` imports in Task 4; spec §4 forbids `next/font` in Phase 1)

```tsx
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Notation Hero',
  description: 'Learn an instrument by playing real notation.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

(Public Sans lands on `<body>` via the design system's `@layer base` rule `html { @apply
font-sans }` once Task 4 imports `styles.css` — no explicit font class needed here.)

- [ ] **Step 6: Create interim `web/app/globals.css`**

```css
@import 'tailwindcss';
```

- [ ] **Step 7: Create interim `web/app/page.tsx`**

```tsx
export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Notation Hero</h1>
      <p>Next.js 16 boot proof — design-system wiring lands in the next task.</p>
    </main>
  );
}
```

- [ ] **Step 8: Add the `scripts` block to `web/package.json`** (between `"private"` and
      `"dependencies"` — sort-package-json order)

```json
  "scripts": {
    "build": "next build",
    "dev": "next dev",
    "lint": "eslint . --max-warnings 0",
    "start": "next start",
    "typecheck": "tsc --noEmit"
  },
```

(`lint` matches the design system's `--max-warnings 0` policy. No `test` script — see Global
Constraints.)

- [ ] **Step 9: Lint + typecheck**

Run: `pnpm --filter @notation-hero/web run lint`
Expected: exit 0, no output.

Run: `pnpm --filter @notation-hero/web run typecheck`
Expected: exit 0. (`next-env.d.ts` doesn't exist yet — the `include` entry is skipped silently;
this is exactly the CI situation, where typecheck runs without a prior build.)

- [ ] **Step 10: Production build**

Run: `pnpm --filter @notation-hero/web build`
Expected: "Compiled successfully" (Turbopack; React Compiler makes it slower than a stock
scaffold). `web/next-env.d.ts` now exists and `git status` does NOT show it (gitignored).

- [ ] **Step 11: Dev boot proof**

Run:

```bash
pnpm --filter @notation-hero/web dev &
DEV_PID=$!
sleep 8
curl -sf http://localhost:3000 | grep -c 'Notation Hero'
kill "$DEV_PID"
```

Expected: `grep` prints a count ≥ 1 (page served). If `curl` fails, the dev server may still be
compiling the first request — retry after a few seconds before diagnosing. No port clash: stop
the client Vite dev server first if it is running (both prefer `:3000`).

- [ ] **Step 12: Format check + commit**

Run: `pnpm exec prettier --check web/`
Expected: all files pass.

```bash
git add web/
git commit -m "feat(web): boot Next.js 16 app skeleton on Turbopack (NH-275)

Hand-created scaffold (no create-next-app): App Router, React Compiler on,
transpilePackages for the design system, Tailwind v4 via @tailwindcss/postcss,
eslint-config-next flat config at --max-warnings 0. '@/*' maps to client/src —
Turbopack resolves aliases in transpiled packages against the app tsconfig.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Design-system additive exports (`client/` mutation + re-validation)

Everything here is additive (spec §5): an `exports` map, a Button-only barrel, and the
`"use client"` directive. Then the design system's own checks re-run to prove no regression.

**Files:**

- Create: `client/src/index.ts`
- Modify: `client/package.json` (add `exports` — no `main`/`module`/`types`/`sideEffects` exist
  today and none are added; `sideEffects: false` + the full barrel are Phase 2)
- Modify: `client/src/components/ui/Button/Button.tsx` (directive only)

**Interfaces:**

- Consumes: nothing from earlier tasks (independent of `web/`).
- Produces (Task 4 relies on these exact names):
  - `import { Button, buttonVariants } from '@notation-hero/client';`
  - `@import '@notation-hero/client/styles.css';`
  - `Button` accepts `variant` (`'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link'`)
    and `size` props and renders a `<button data-slot="button">`.

- [ ] **Step 1: Create `client/src/index.ts`** (relative import — must not depend on any alias;
      `index.ts` is exempt from the layout guard's suffix rule)

```ts
// Phase 1 public surface of the design system: ONLY Button (NH-275 one-component proof).
// The full barrel over all ui/ components is Phase 2 (design-system rename) work.
export { Button, buttonVariants } from './components/ui/Button/Button';
```

- [ ] **Step 2: Add the `exports` map to `client/package.json`** (lefthook's sort-package-json
      hook auto-places the key; `pnpm run lint:sort-pkg` verifies):

```json
  "exports": {
    ".": "./src/index.ts",
    "./package.json": "./package.json",
    "./styles.css": "./src/styles.css"
  },
```

This is additive: nothing inside `client/` imports the package by its own name (Storybook, Vite,
and tests all use relative/`@/` paths), so closing implicit subpath resolution breaks no
existing consumer.

- [ ] **Step 3: Add `'use client'` to `Button.tsx`** — insert as the very first line of
      `client/src/components/ui/Button/Button.tsx` (before the imports), followed by a blank
      line:

```tsx
'use client';

import { mergeProps } from '@base-ui/react/merge-props';
```

(The rest of the file is untouched. `Button` calls the `useRender` hook, so it needs a client
boundary under React Server Components; the directive is inert for Vite/Storybook — at worst
Rollup logs a benign "Module level directives cause errors when bundled … was ignored" warning
during `build`/`build-storybook`.)

- [ ] **Step 4: Re-validate the design system** (spec §5 requires this after mutating the shared
      package)

Run: `pnpm --filter @notation-hero/client run lint && pnpm --filter @notation-hero/client run typecheck && pnpm --filter @notation-hero/client run test`
Expected: all green (vitest suite unchanged).

Run: `pnpm --filter @notation-hero/client run build-storybook`
Expected: exit 0 (the `"use client"` warning noted above is acceptable; errors are not).

- [ ] **Step 5: a11y sweep** (Playwright drives a fresh Storybook; kill any stale `:6006` server
      first — a stale server serves desynced stories and produces false results)

Run:

```bash
lsof -ti:6006 | xargs -r kill
pnpm --filter @notation-hero/client run test:a11y
```

Expected: all a11y checks pass (Button stories unchanged visually/semantically).

- [ ] **Step 6: VR (Docker) — run if Docker is available, otherwise CI's `vr` job gates it**

Run: `pnpm run test:vr:docker`
Expected: no diffs (the directive changes no pixels). If Docker is unavailable locally, state so
in the PR and let CI's `vr` job verify.

- [ ] **Step 7: Commit**

```bash
git add client/src/index.ts client/package.json client/src/components/ui/Button/Button.tsx
git commit -m "feat(client): additive exports map + Button barrel + use-client (NH-275)

Exposes '.' (Button-only barrel), './styles.css' (token source of truth) and
'./package.json' for the web app. 'use client' on Button — it calls useRender,
so it needs a client boundary under RSC. Full barrel + sideEffects are Phase 2.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Wire tokens + Button into the proof page (cross-package Tailwind proof)

The spec calls the cross-package `@source` scan an **unverified bet** — so this task proves it
red→green: build once without `@source` (the probe class must be absent), add `@source`, build
again (present).

**Files:**

- Modify: `web/app/globals.css` (replace interim content)
- Modify: `web/app/page.tsx` (replace interim content)

**Interfaces:**

- Consumes: `Button` from `@notation-hero/client` and `@notation-hero/client/styles.css`
  (Task 3), the booting app (Task 2).
- Produces: the Phase 1 proof page — a **Server Component** rendering the client-boundary
  `<Button>` in six variants + a brand-token swatch, in light and in a `.dark`-wrapped section.

- [ ] **Step 1: Replace `web/app/globals.css` — WITHOUT `@source` yet (the red half of the bet)**

```css
/* The design system's styles.css is the single token source of truth: it already includes
   Tailwind v4 itself, the @fontsource-variable font imports (Public Sans + Material Symbols),
   the `@custom-variant dark` line, and the full :root/.dark/@theme token surface — so this file
   adds NO tailwind/font imports of its own (spec §4: avoid double-inclusion). */
@import '@notation-hero/client/styles.css';
```

- [ ] **Step 2: Replace `web/app/page.tsx` with the proof page** (Server Component — no
      `'use client'` here; that boundary lives on `Button` itself, spec §5)

```tsx
import { Button } from '@notation-hero/client';

const swatches = [
  ['--color-brand-400', 'bg-brand-400'],
  ['--color-brand-600', 'bg-brand-600'],
  ['--color-brand-700', 'bg-brand-700'],
  ['--primary', 'bg-primary'],
  ['--secondary', 'bg-secondary'],
] as const;

function ProofSection({ heading }: { heading: string }) {
  return (
    <section className="rounded-lg border border-border bg-background p-6 text-foreground">
      <h2 className="mb-4 text-lg font-semibold">{heading}</h2>
      <div className="mb-6 flex flex-wrap gap-2">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="link">Link</Button>
      </div>
      <div className="flex flex-wrap gap-3">
        {swatches.map(([token, cls]) => (
          <figure key={token} className="text-center">
            <div className={`size-12 rounded-md border border-border ${cls}`} />
            <figcaption className="mt-1 font-mono text-xs">{token}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <h1 className="text-2xl font-bold">Notation Hero — design-system proof</h1>
      <p className="text-muted-foreground">
        A Server Component rendering the client-boundary Button from the design system with brand
        tokens, in light and dark.
      </p>
      <ProofSection heading="Light" />
      <div className="dark">
        <ProofSection heading="Dark" />
      </div>
    </main>
  );
}
```

(The page has no theme toggle — the second section is wrapped in a `.dark` container, which the
`@custom-variant dark (&:is(.dark *))` variant and the `.dark { … }` token block both key off.
The swatch class names are literal strings in this file, so Tailwind's auto-detection of the app
source generates them regardless of `@source`.)

- [ ] **Step 3: Build and prove the probe is RED without `@source`**

Run:

```bash
pnpm --filter @notation-hero/web build
grep -rl 'group/button' web/.next/static/
```

Expected: the build succeeds, but `grep` finds **nothing** among the emitted CSS (exit 1) —
`group/button` appears only inside `Button.tsx`'s cva string in the client package, which
Tailwind is not yet scanning. (The recursive grep is deliberate: Turbopack's CSS output location
under `.next/static/` differs from webpack's `static/css/`. If grep DOES match here, the probe is
broken — stop and investigate before trusting Step 5.)

- [ ] **Step 4: Add the `@source` directive — the green half**

Append to `web/app/globals.css` (final content of the file):

```css
/* The design system's styles.css is the single token source of truth: it already includes
   Tailwind v4 itself, the @fontsource-variable font imports (Public Sans + Material Symbols),
   the `@custom-variant dark` line, and the full :root/.dark/@theme token surface — so this file
   adds NO tailwind/font imports of its own (spec §4: avoid double-inclusion). */
@import '@notation-hero/client/styles.css';

/* Generate utilities for the classes used INSIDE the design-system source — without this,
   imported components render unstyled (spec §4 calls this cross-package scan an unverified bet;
   the build-time probe for `group/button` in the plan verifies it). Path is relative to this
   file: web/app/ → ../../client/src. */
@source '../../client/src';
```

- [ ] **Step 5: Re-build and prove GREEN**

Run:

```bash
pnpm --filter @notation-hero/web build
grep -rl 'group/button' web/.next/static/
grep -rl 'Public Sans Variable' web/.next/static/
find web/.next/static -name '*.woff2' -print -quit
```

Expected: both `grep -rl` calls print at least one file (Button utilities generated; font-face
CSS bundled), and `find` prints at least one `.woff2` path (self-hosted font assets copied).

Fallback if the bare directory `@source` does not register under `@tailwindcss/postcss`: use the
glob form `@source '../../client/src/**/*.tsx';` — same location, same probe. If THAT also fails,
stop and surface it (the spec names this as the risk that would force a rethink; do not paper
over it with copied styles).

- [ ] **Step 6: Server-render proof over dev**

Run:

```bash
pnpm --filter @notation-hero/web dev &
DEV_PID=$!
sleep 8
curl -s http://localhost:3000 | grep -o 'data-slot="button"' | wc -l
curl -s http://localhost:3000 | grep -c 'class="dark"'
kill "$DEV_PID"
```

Expected: `12` (six Button variants × two sections, all server-rendered — proving the real
server/client boundary rather than a fully client-rendered page) and `1` (the dark section).

- [ ] **Step 7: Gates + commit**

Run: `pnpm --filter @notation-hero/web run lint && pnpm --filter @notation-hero/web run typecheck && pnpm exec prettier --check web/`
Expected: all pass.

```bash
git add web/app/globals.css web/app/page.tsx
git commit -m "feat(web): design-system Button + brand tokens on the proof page (NH-275)

Server Component page renders the client-boundary <Button> (6 variants) plus a
token swatch in light and a .dark-wrapped section. globals.css imports the
client styles.css wholesale (tokens + fonts + dark variant) and @source-scans
client/src — the cross-package bet verified by the group/button CSS probe.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Visual eyeball (for the PR)**

Open `http://localhost:3000` in a browser: teal `default` Button in both sections
(light: deep teal `--primary`; dark: bright `#2dd4bf`-ish teal), correct swatch colours, Public
Sans everywhere. Screenshot both sections for the PR description. This is the spec's "shows the
Button with teal brand tokens correctly in both light and dark" criterion — a human (Leo) makes
the final call on the PR.

---

### Task 5: CI filter, lefthook parity, docs alignment

**Files:**

- Modify: `.github/workflows/ci.yml`
- Modify: `lefthook.yml`
- Modify: `README.md`
- Modify: `AGENTS.md`

**Interfaces:**

- Consumes: nothing (config/docs only).
- Produces: web-only PRs trigger the `quality`/`lint`/`build`/`sast`/`deps-cve` CI jobs; web
  files get pre-commit ESLint autofix; README/AGENTS.md describe the 5-package workspace.

- [ ] **Step 1: Add `'web/**'`to the`code:`filter in`.github/workflows/ci.yml`\*\*

In the `changes` job's `filters:` block (around line 41), the `code:` list currently starts:

```yaml
code:
  - 'client/**'
  - 'server/**'
  - 'shared/**'
  - 'infra/**'
```

Add `- 'web/**'` directly after `- 'client/**'`. Do **not** touch the client-only jobs (`a11y`,
`vr`, `vr-report*`, `e2e` — all `--filter @notation-hero/client`) or `storybook-preview.yml`;
they are Storybook-specific and stay client-scoped in Phase 1. The recursive jobs (`quality`,
`lint`, `build`) pick web up automatically via `pnpm -r --if-present`.

- [ ] **Step 2: Add the `eslint-web` block to `lefthook.yml`**, directly after the
      `eslint-server` command (mirrors its shape — flat config resolves from CWD, hence `root:`):

```yaml
eslint-web:
  root: 'web/'
  glob: '*.{ts,tsx,js,jsx,mjs,cjs}'
  run: pnpm exec eslint --fix {staged_files}
  stage_fixed: true
  skip: [merge, rebase]
```

- [ ] **Step 3: README.md** — two edits:

In `## Stack`, change the line:

```markdown
- **Client:** Vite + React, TanStack Router/Query, Tailwind (the PWA)
```

to:

```markdown
- **Client:** Vite + React, TanStack Router/Query, Tailwind (design system + Storybook)
- **Web:** Next.js 16 App Router on Turbopack (the product PWA — consumes the design system)
```

In the `## Layout` table, change the `client/` row's Role to `Vite React SPA (design system +
Storybook)` and add a `web/` row after it:

```markdown
| `web/` | `@notation-hero/web` | Next.js 16 App Router (the product PWA) |
```

(Let Prettier re-pad the table columns: `pnpm exec prettier --write README.md`.)

- [ ] **Step 4: AGENTS.md** — two edits:

Line 12's stale FE snapshot fragment:

```markdown
One **NestJS** app (hexagon inside); FE = **Vite SPA** (Next.js DROPPED 2026-06-18).
```

becomes:

```markdown
One **NestJS** app (hexagon inside); FE = **Next.js 16 App Router on Vercel** (re-adopted, ADR 2026-07-08 — supersedes the 2026-06-18 Vite-SPA decision), consuming the `client/` design system.
```

And the workspace sentence:

```markdown
Four packages: `client/` (Vite + TanStack), `server/` (NestJS), `shared/` (cross-cutting types/contracts), `infra/` (Pulumi IaC).
```

becomes:

```markdown
Five packages: `client/` (Vite + TanStack — design system + Storybook), `web/` (Next.js 16 App Router — the product client), `server/` (NestJS), `shared/` (cross-cutting types/contracts), `infra/` (Pulumi IaC).
```

(No decision-registry edit: the 2026-07-08 FE-pivot change-log entry already records the
decision; this PR implements it without flipping any registered status.)

- [ ] **Step 5: Gates + commit**

Run: `pnpm run lint:yaml && pnpm run lint:actions && pnpm run lint:md && pnpm run lint:spell && pnpm exec prettier --check .github/workflows/ci.yml lefthook.yml README.md AGENTS.md`
Expected: all pass.

```bash
git add .github/workflows/ci.yml lefthook.yml README.md AGENTS.md
git commit -m "chore(ci): cover web/ in CI filter + lefthook; refresh workspace docs (NH-275)

web/** joins the ci.yml code filter (else web-only PRs silently skip quality/
build/sast/deps-cve — ci-green would still pass). eslint-web pre-commit block
for local parity. README + AGENTS.md now describe the 5-package workspace and
drop the stale 'Next.js DROPPED' snapshot line.

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Full verification sweep + PR

**Files:** none (verification + PR only).

**Interfaces:**

- Consumes: everything above.
- Produces: a green PR implementing spec Phase 1, verified against every spec success criterion.

- [ ] **Step 1: Spec success criteria, one by one**

| #   | Criterion (spec §Success)                      | Command                                  | Expected                             |
| --- | ---------------------------------------------- | ---------------------------------------- | ------------------------------------ |
| 1   | Root install, single lockfile, no nested WS    | `pnpm install && git status --short`     | exit 0; no new/changed files         |
| 2   | Dev boots and serves the proof page            | Task 4 Step 6 commands                   | `12` / `1`                           |
| 3   | Turbopack production build succeeds            | `pnpm --filter @notation-hero/web build` | "Compiled successfully"              |
| 4   | Root `check:all` green                         | `pnpm run check:all`                     | exit 0 (slow — runs every repo gate) |
| 5   | Button + teal tokens correct in light AND dark | Task 4 Step 8 (browser)                  | Leo's eyeball on the PR screenshots  |

- [ ] **Step 2: Push** (pre-push hooks re-run format/lint/typecheck/test across the repo — do not
      bypass them)

```bash
git push -u origin HEAD
```

- [ ] **Step 3: Open the PR**

```bash
gh pr create --title "feat(web): Next.js 16 web client — Phase 1 (NH-275)" --body "$(cat <<'EOF'
Implements Phase 1 of the web-client design spec (`docs/specs/2026-07-09-nextjs-web-client-design.md`): a workspace-integrated Next.js 16 app (`web/`, `@notation-hero/web`) that consumes the design system across the package boundary and renders the proof page (Button variants + brand-token swatch, light + dark).

Plan: `docs/plans/2026-07-11-nh-275-nextjs-web-client-phase1-plan.md` (task-per-commit).

Key mechanics:
- `transpilePackages: ['@notation-hero/client']` + app-tsconfig `@/*` → `client/src/*` (Turbopack resolves aliases in transpiled packages against the app tsconfig only).
- `globals.css` imports the client `styles.css` wholesale (tokens + fonts + dark variant) and `@source`-scans `client/src` — verified by a `group/button` CSS probe (red without, green with).
- Additive-only client changes: `exports` map, Button-only barrel, `'use client'` on Button; client lint/typecheck/test/build-storybook/a11y re-run green.
- CI `changes` filter gains `web/**`; lefthook gains `eslint-web`.

Screenshots: light + dark proof sections (attached).

Refs [NH-275](https://leocaseiro.atlassian.net/browse/NH-275).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Then attach the Task 4 Step 8 screenshots to the PR description, let the `pr-checklist-sync`
workflow append any missing checklist items, and tick each box **only if its claim is true**
(NH-16: every box ticked, no N/A, false ticks are false claims). Never delete the remote branch
after merge.

- [ ] **Step 4: Watch CI to green**

Run: `gh pr checks --watch`
Expected: `ci-green` passes — including the client-only `vr`/`a11y` jobs (they re-validate the
Task 3 client mutation) and the `quality`/`lint`/`build` jobs now covering `web/`.

---

## Out of scope (do not build any of this)

- Phase 2: `client/` → `design-system/` rename, full ~41-component barrel, `sideEffects: false`,
  repointing CI/deploy references, stripping the Vite SPA shell.
- Vercel deploy + custom domain · PWA/offline · hybrid BFF · `"use cache"` catalog caching ·
  Postgres FTS · R2 blobs (ADR later milestones).
- A `web/` unit-test harness, theme toggle, extra routes/pages, `next/font`, favicon polish.
- Deleting the leftover `notation-hero-client/node_modules/` in the **primary checkout**
  (`/Users/leocaseiro/Sites/notation-hero/notation-hero-client/` — untracked, git-invisible).
  That path is outside any worktree an executor should touch; Leo can remove it manually with
  `rm -rf /Users/leocaseiro/Sites/notation-hero/notation-hero-client` whenever convenient.

## Risks & contingencies

1. **Cross-package `@source` bet** — probed red→green in Task 4; glob-form fallback named there.
   If both forms fail, stop and surface (spec-level rethink, not a workaround).
2. **`minimumReleaseAge`** — `next@16.2.10` published 2026-07-01 (> 7 days old); Task 1 Step 1
   re-verifies at execution time and names the exact-version exclude recipe.
3. **Alias resolution** — D2 is source-verified for 16.2.10 but not yet empirically executed;
   Task 4's typecheck + build + server-render checks are the empirical proof. If `@/lib/utils`
   fails to resolve at build, `turbopack.resolveAlias` is the documented fallback (same
   single-target caveat).
4. **React Compiler build time** — accepted trade-off (spec locked it on).
5. **Port 3000 collision** with the client Vite dev server — only when both run; stop one.
6. **`pnpm run build` at root now builds `web/` too** (CI `build` job) — expected; `next build`
   needs no network (fonts self-hosted, no Geist).

## Spec coverage (self-review traceability)

| Spec section                    | Where in this plan                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| §1 Workspace integration        | Task 1 (register, no nested WS, `allowBuilds: sharp`)                                               |
| §2 Supply-chain / build hygiene | Global Constraints (ranges), Task 1 Step 1 (release age)                                            |
| §3 Toolchain alignment          | Task 2 Steps 4/8/9 (ESLint, scripts), Task 1 Step 5 + repo-linter ignores; cspell verified as no-op |
| §4 Tailwind v4 wiring           | Task 4 (wholesale `styles.css` import, `@source` probe, dark variant, fonts as own deps in Task 1)  |
| §5 Design-system consumption    | Task 3 (exports/barrel/`use client` + re-validation), Task 2 (`transpilePackages`), D2/D3 (alias)   |
| §6 Proof page                   | Task 4 Steps 2/6/8 (Server Component, `.dark` section, layout without Geist in Task 2)              |
| §7 Next.js config               | Task 2 Step 1 (`reactCompiler`, `transpilePackages`, no webpack)                                    |
| §Success criteria               | Task 6 Step 1 table                                                                                 |
| §Risks 1–7                      | Risks & contingencies above (1:1)                                                                   |
| Locked decisions table          | D1–D5 + Global Constraints (folder `web/`, fonts reuse, React Compiler on, app-first sequencing)    |

Beyond-spec additions (each justified in Key design decisions): D6 (CI filter), D7 (lefthook),
D8 (README/AGENTS.md refresh).
