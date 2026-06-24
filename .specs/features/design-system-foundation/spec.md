# Spec — Design System Foundation

**Folder:** `.specs/features/design-system-foundation/`
**Created:** 2026-06-24 · **Scope:** Large (all 4 phases) · **Worktree:** `design-system-foundation`

## 1. Goal

Stand up the component foundation using **shadcn/ui** (preset `b5claE9qM`) on the
existing **Vite SPA**, proven end-to-end by **one** example component — **Button** —
wired with a unit test, a Storybook story, and a Playwright visual-regression (VR)
test, all co-located. Future components then follow this exact, verified pattern.

## 2. In scope

- shadcn initialized + preset applied to `client/` (Vite, **not** Next.js).
- One Button component from shadcn.
- Co-located `button.test.tsx` (Vitest), `button.stories.tsx` (Storybook v10),
  `button.vr.ts` (Playwright VR).
- Storybook v10 + Playwright tooling installed and runnable.
- Quality gates green (lint, typecheck, test, build, storybook build).

## 3. Out of scope (non-goals)

- Any component other than Button (Input/Card/etc. come later).
- Redesigning existing routes/pages.
- Full CI wiring of VR snapshots (cross-platform baseline strategy is **documented**;
  the CI job is an optional follow-up).
- Mockup-derived custom palette — we use the **exact preset** for now (per user).

## 4. Requirements (traceable)

| ID      | Requirement                                                                                                                                                                                                                     | Verify (Done when)                                                                                    |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **R1**  | shadcn initialized in `client/` as a **Vite** project; `components.json` present; **no** Next.js, **no** `--defaults`.                                                                                                          | `components.json` exists; no `next` dep; app still builds.                                            |
| **R2**  | shadcn config matches repo conventions: `tailwind.css` → `src/styles.css`; aliases use existing `#/` prefix (add a tsconfig `paths` mirror only if the CLI forces it).                                                          | `components.json` shows `src/styles.css` + `#/` aliases; generated imports resolve; typecheck passes. |
| **R3**  | Preset `b5claE9qM` **decoded and reviewed** (esp. teal/purple brand guardrail), then applied via `shadcn apply`.                                                                                                                | Decode output captured; user confirms palette; tokens land in `src/styles.css`.                       |
| **R4**  | Button component added via shadcn; renders all preset variants + sizes.                                                                                                                                                         | Button visible on a demo route/story in both themes.                                                  |
| **R5**  | `button.test.tsx` (Vitest + Testing Library), co-located: renders, variant/size props, disabled, onClick.                                                                                                                       | `pnpm --filter @notation-hero/client test` green; Button covered.                                     |
| **R6**  | `button.stories.tsx` (Storybook v10, CSF), co-located: variants, sizes, disabled, with-icon.                                                                                                                                    | Stories render in Storybook dev.                                                                      |
| **R7**  | Storybook v10 + `@storybook/react-vite` installed; Tailwind v4 wired (`viteFinal` + `src/styles.css` imported in preview). Default `src/stories/` example **removed**.                                                          | `pnpm storybook` serves; `pnpm build-storybook` succeeds; tokens visible; no `stories/` dir.          |
| **R8**  | Playwright installed; co-located **`button.vr.ts`** (no `.spec`/`.test` — layout-guard + Vitest safe). `testMatch: **/*.vr.{ts,tsx}`; Vitest excludes `**/*.vr.*`. Opens the Button story, `toHaveScreenshot()` for key states. | `pnpm test:vr` green vs committed baselines.                                                          |
| **R9**  | Cross-platform VR baseline strategy documented (Mac vs CI-Linux divergence).                                                                                                                                                    | `design.md` records the approach; baselines reproducible.                                             |
| **R10** | Quality gates green; new scripts wired (`storybook`, `build-storybook`, `test:vr`); no scope creep.                                                                                                                             | `pnpm lint && pnpm typecheck && pnpm test && pnpm build` pass at root.                                |
| **R11** | Co-location passes the layout guard (no banned dirs; VR not matched by Vitest; no orphan tests).                                                                                                                                | `bash tooling/check-layout.sh` passes; pre-commit clean.                                              |

## 5. Gray areas (resolved in Design)

- **GA-1 — alias prefix:** keep `#/` (repo convention) vs add `@/` (shadcn default).
  Lean: `#/`; flip only if the CLI hard-requires `@/`.
- **GA-2 — VR baselines cross-platform:** local baselines first; document a
  Docker/CI-generated approach for portability.
- **GA-3 — preset palette vs brand:** confirm `b5claE9qM` colors against the
  teal/purple guardrail after decode (R3) — show the user before applying.

## 6. Verification commands

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build   # root gates
pnpm --filter @notation-hero/client storybook            # Storybook dev
pnpm --filter @notation-hero/client build-storybook      # Storybook build
pnpm --filter @notation-hero/client test:vr              # Playwright VR
bash tooling/check-layout.sh                             # layout guard
```
