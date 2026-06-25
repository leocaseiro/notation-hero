# STATE — persistent memory

## Decisions (2026-06-24)

- **D1** — Apply shadcn preset `b5claE9qM` to the **existing Vite app** via
  `shadcn apply` (NOT `--template next`). Next.js stays rejected. _(User pick, Q-template.)_
- **D2** — `tlc-spec-driven` Setup is **lean** — `.specs/project/*` point to existing
  docs; no 7-doc brownfield map. _(Q-setup.)_
- **D3** — Visual-regression (VR) via **Playwright → Storybook stories**, co-located. _(Q-vr.)_
- **D4** — Start with **Button only**; expand after the pipeline is green. _(Q-add.)_
- **D5** — shadcn CLI is **v4**; `apply` is the existing-project path; Storybook is
  **v10**; `--pointer` is a real flag (kept). Verify each command with `--help` before running.
- **D6** — Icons are **Material Symbols Outlined** (Google Fonts CDN + `.material-symbols-outlined`
  class), NOT the preset's Remix Icon. _(User pick, Q-icons: "I wanted material icons" — the UI
  uses Material icons widely.)_ Removed `@remixicon/react`.
- **D7** — **Folder-per-component, PascalCase**: `components/ui/Button/Button.{tsx,test.tsx,stories.tsx,vr.ts}`.
  Supersedes the kebab/lowercase assumption below. _(User pick, Q-structure.)_
- **D8** — VR filename marker is **`.vr.ts`** (e.g. `Button.vr.ts`), not `.vr.spec.ts`/`.spec.ts` —
  avoids the Vitest collision and the layout-guard same-name-sibling rule. _(User pick, Q-vr-name.)_
- **D9** — Client **formatting matches the server + is ESLint-enforced**: Prettier `semi: true`
  - `printWidth: 100`; `eslint-plugin-prettier` makes `pnpm lint` (a CI gate) fail on format
    drift (mirrors `server/eslint.config.mjs`). _(User pick, Q-semi/Q-align 2026-06-25.)_ The
    TanStack ESLint base (client) and the hand-rolled typed base (server) stay separate by design —
    only the Prettier formatting is aligned.
- **D10** — **Accessibility is a required CI gate**: axe-core (WCAG 2 A+AA) runs over every
  Storybook story in light + dark via Playwright (`*.a11y.ts`, `test:a11y`); the `a11y` CI job is
  in the `ci-green` aggregate. Storybook gets a real `.dark` theme toggle so a11y reflects the
  actual rendered colors. Two preset contrast fixes followed (2026-06-25): light `--destructive`
  darkened (soft destructive → 5.15:1) and dark-mode links use the mockup teal `#0D9488`
  (brand-600 → 5.27:1). _(User: "enable a11y tests"; minimal change + mockup colors.)_

## Constraints carried in (from repo guards + memory)

- **Brand = teal** (`#2DD4BF` / `#0F766E`); **purple avoided as the brand**.
  Decode the preset before apply; flag any palette conflict (show, don't tell).
- **Repo alias is `#/`** (package.json `imports` subpath), not `@/`. Prefer
  configuring shadcn to `#/`; only add a tsconfig `paths` mirror if the CLI requires it.
- **CSS file is `src/styles.css`** (not `index.css`). Point shadcn `tailwind.css` at it.
- **Layout guard (`tooling/check-layout.sh`, pre-commit + CI):**
  - No `stories/` / `__tests__/` / `__mocks__/` directories → delete Storybook's
    default `src/stories/` example.
  - Any `*.test.*` / `*.spec.*` must have a same-name source sibling → **VR test must
    NOT use `.spec`/`.test`**. Use `button.vr.ts`; Playwright `testMatch: **/*.vr.{ts,tsx}`;
    Vitest excludes `**/*.vr.*`.
  - Role-suffix rule is **server-only**; client components are exempt.
- **Filenames:** ~~kebab/lowercase~~ → **PascalCase folder-per-component** per **D7**
  (`Button/Button.tsx`). Client ESLint has no casing rule that blocks this; verified during Execute.
- **Commit gates:** commitlint (conventional); pre-commit (layout + gitleaks + semgrep +
  prettier); pre-push (lint + typecheck + test, all packages). Never `--no-verify`.

## Blockers

- None.

## Todos / deferred

- Cross-platform VR baseline strategy (Mac vs CI-Linux) — document in design; local
  baselines first, Docker/CI-generated for portability.
- Wire VR into CI (out of scope this pass; documented follow-up).
- Expand component set beyond Button (post-foundation).
- Jira: link/create an `NH-NN` issue for this feature before opening the PR (CI gate
  requires a Jira key in the PR).

## Preferences

- Lightweight steps here (state updates, validation reports, doc edits) run fine on a
  faster/cheaper model; reserve the strong model for design + implementation.
