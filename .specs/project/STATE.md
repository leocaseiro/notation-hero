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
- **Filenames:** kebab/lowercase per repo + shadcn output (`button.tsx`, not `Button.tsx`)
  — verify the client ESLint casing rule during Execute.
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
