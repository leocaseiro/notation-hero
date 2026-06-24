# Tasks — Design System Foundation

Atomic tasks. Each ends green + commits (baby commits). `→ verify` is the gate.
Status: ☐ todo · ◐ in progress · ☒ done.

| #      | Task                                                                                                                                                                     | Verify (gate)                                                                                          | Status |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ------ |
| **T1** | Verify CLIs: `shadcn@latest --help` / `init --help` / `apply --help` / `add --help`; `create-storybook`/`storybook --help`; `playwright --help`. Capture flags.          | Commands exist; flags confirmed (no guessing).                                                         | ☐      |
| **T2** | **Decode preset** `b5claE9qM` (read-only) → show palette/fonts/icons to user → confirm vs teal/no-purple (GA-3 **hard gate**).                                           | User confirms palette before any mutation.                                                             | ☐      |
| **T3** | `shadcn init` (Vite, no template/defaults). Configure `components.json`: `tailwind.css=src/styles.css`, aliases `#/`, framework vite.                                    | `components.json` present; no `next` dep; `pnpm --filter client build` + typecheck pass. → commit      |
| **T4** | `shadcn apply --preset b5claE9qM`. Tokens land in `src/styles.css`.                                                                                                      | styles.css has preset tokens; build + typecheck pass; matches decode. → commit                         |
| **T5** | `shadcn add button` → move/rename to `components/ui/Button/Button.tsx`; fix imports. Render it on the existing `/design-system` route (or a temp mount).                 | Button renders both themes; typecheck + lint pass; layout-guard ok. → commit                           |
| **T6** | `Button.test.tsx` (Vitest + Testing Library): render, variants, sizes, disabled, onClick.                                                                                | `pnpm --filter client test` green. → commit                                                            | ☐      |
| **T7** | Storybook v10 init + `@storybook/react-vite`; Tailwind v4 wiring (viteFinal + preview imports styles.css); **delete `src/stories/` example**; `Button.stories.tsx`.      | `storybook` serves; `build-storybook` ok; tokens visible; no `stories/` dir; layout-guard ok. → commit |
| **T8** | Playwright init + config (`testMatch **/*.vr.{ts,tsx}`, webServer = storybook static); `Button.vr.ts` (toHaveScreenshot per variant/theme); generate + commit baselines. | `pnpm test:vr` green vs committed baselines. → commit                                                  | ☐      |
| **T9** | Wire client scripts (`storybook`, `build-storybook`, `test:vr`); run all root gates; finalize `design.md` baseline note; final layout-guard.                             | `pnpm lint && typecheck && test && build` all green; `check-layout.sh` ok. → commit                    |

## Notes

- T3–T5, T7, T8 each touch deps/config — commit per green step so any one is one
  `git revert` away.
- VR baselines: commit local (darwin) now; CI/Docker Linux baselines are a deferred
  follow-up (design.md §D, spec §3).
- Before PR: link/create an `NH-NN` Jira issue (CI gate needs a key in the PR).
