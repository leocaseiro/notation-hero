# Design — Design System Foundation

Lean design: only the parts with real architectural decisions. Mechanical steps live
in `tasks.md`.

## A. shadcn on Vite (R1–R3)

- **CLI:** shadcn v4. Existing-project path = `init` (no `--template`, never `--defaults`
  → those imply Next.js) then `apply --preset b5claE9qM`. Verify every command with
  `--help` before running (some post-dates the model's training).
- **components.json reconciliations** (vs shadcn defaults):
  - `tailwind.css` → **`src/styles.css`** (repo uses styles.css, not index.css).
  - `aliases` → **`#/`** prefix (repo uses package.json `imports` subpath, not `@/`).
    Vite + TS resolve `#/` natively. **GA-1 resolved: `#/`.** If the CLI hard-requires
    `@/`, add a `paths` mirror in tsconfig + `resolve.alias` in vite.config — do **not**
    rip out `#/`.
  - `framework` → vite/none; **no** Next.js, **no** `next` dependency.
- **Preset (GA-3, hard gate):** decode `b5claE9qM` first and **show the palette to the
  user** before applying — the only brand guardrail is _teal, no purple_. Apply only
  after confirmation. Using the exact preset (not the mockup palette) is intentional.

## B. Folder-per-component layout (R4)

- Target: `client/src/components/ui/Button/Button.tsx` (+ co-located test/story/vr).
  Compliant with AGENTS.md "co-located, one folder per unit"; PascalCase is allowed in
  `client/` (no kebab rule there; `Home.tsx`/`About.tsx` precedent).
- shadcn emits `ui/button.tsx` (flat, lowercase) → **move + rename** into
  `Button/Button.tsx`. One-time per component.
- **Inter-component imports (future):** shadcn writes sibling imports as
  `@/components/ui/<name>` (flat). When primitives start depending on each other, add a
  thin re-export `ui/<name>.tsx` → `export * from './<Name>/<Name>'`, or keep shadcn
  primitives flat and reserve folders for composed components. Not needed for Button alone.

## C. Storybook v10 + Tailwind v4 (R6–R7)

- `@storybook/react-vite` (auto-detected). Tailwind v4 gotchas:
  1. Merge `@tailwindcss/vite` via `viteFinal` in `.storybook/main.ts`.
  2. Import `src/styles.css` (the `@import "tailwindcss"` + `@theme` entry) at the top of
     `.storybook/preview.ts` so tokens load in stories.
  3. Ensure component sources are within Tailwind's scan paths.
- **Remove Storybook's default `src/stories/` example** — the layout guard bans
  `stories/` directories (hard CI gate).
- Stories glob stays co-located: `**/*.stories.tsx` (never a `stories/` dir).

## D. Playwright VR via Storybook stories (R8–R9)

- **Mechanism:** Playwright opens each Button **story in isolation** (Storybook's
  `iframe.html?id=ui-button--<story>`) and asserts `toHaveScreenshot()`. Stories are the
  single source for both docs and visual baselines.
- **Serving:** Playwright `webServer` builds Storybook to static (`build-storybook` →
  `storybook-static/`) and serves it (deterministic), or runs `storybook dev`. Prefer the
  static build for stability.
- **Config:** `testMatch: '**/*.vr.{ts,tsx}'` so Playwright owns only VR files; Vitest's
  default globs (`*.test.*`/`*.spec.*`) never match `.vr.ts`, so the two runners never
  collide and no config carve-out is needed.
- **GA-2 — cross-platform baselines:** Playwright suffixes snapshots by platform
  (`...-darwin.png` vs `...-linux.png`). Locally we commit **darwin** baselines so
  `pnpm test:vr` is green on this machine. For CI portability the baselines must be
  generated on Linux — via the official `mcr.microsoft.com/playwright` Docker image or a
  CI "update snapshots" job. **This pass commits local baselines + documents the CI/Docker
  path; wiring VR into CI is a deferred follow-up** (out of scope, see spec §3).

## E. Quality gates (R10–R11)

- New client scripts: `storybook`, `build-storybook`, `test:vr`.
- pre-push runs lint + typecheck + test (Vitest) across packages — VR is a separate
  script, intentionally not in `pnpm test` (needs browsers/baselines).
- Commit each green task (baby commits). Never `--no-verify`.
