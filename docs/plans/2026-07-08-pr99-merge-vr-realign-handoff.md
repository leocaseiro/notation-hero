# Handoff — finish the PR #99 merge (VR re-align to master's new system, then merge)

## Mission

Complete an **in-progress `git merge origin/master`** on PR #99 (NH-254 — Base UI catalog filter
components), then get it green and **merge PR #99 into `master`** (squash). The merge conflicts are
already resolved and staged; the only remaining work is re-aligning 9 `*.vr.ts` files to master's
rewritten VR helper and regenerating their Linux baselines.

## Where you are

- **Worktree (work here, never touch master):** `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/base-ui-migration-nh254`
- **Local branch:** `base-ui-migration` → pushes to `origin/claude/keen-nash-31b894`
- **PR:** #99 "feat(catalog): search + filter-row UI components (NH-254)", base `master`
- **Git state:** MID-MERGE, uncommitted. `git status` says _"All conflicts fixed but you are still
  merging"_. `MERGE_HEAD` = `8a211f6` (master tip at merge time). ~728 files staged. **Do NOT abort
  the merge.** You conclude it with a single `git commit` once the tree is green.

## What's already done (this session)

- **All 7 content conflicts resolved & staged:** `client/vitest.setup.ts` (merged master's typed
  `ResizeObserver` guard + kept the pointer-capture/scrollIntoView polyfills Base UI Slider/Combobox
  need), `client/src/dark-contrast.ts` (took master's superset — `.dark`-scoped reader + `mixWithBlack`),
  `client/src/dark-contrast.test.ts` (kept "combobox" wording), `client/src/vr-helpers.ts` (took
  master's NEW API), `client/package.json` (`@base-ui/react ^1.6.0`), `cspell.json` (superset word
  list), `pnpm-lock.yaml` (took master's, reconciled with `pnpm install --lockfile-only`).
- **All 462 darwin VR baselines deleted** (repo is Linux-only now, matching master #123). Leo is also
  removing darwin from master in parallel.
- **cmdk fully gone** (no dep, no imports, `Command/` folder deleted, absent from lockfile).
- **Merged code is healthy:** `pnpm --filter @notation-hero/client test` → **253 unit tests pass**
  (my components render fine against master's new `useRender` Button — `buttonVariants` still
  exported). `tsc --noEmit` is clean **EXCEPT** the 9 `.vr.ts` files below.

## The remaining task: re-align 9 `*.vr.ts` to master's new `runVrStories`

Master's `runVrStories` (in `client/src/vr-helpers.ts`) was rewritten (NH-262 overlay work + #123
Linux-only). Old→new API mapping:

| OLD (my files)                                                | NEW (master)                                                                                                      |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `filePrefix: 'searchinput'`                                   | `snapshotSlug: 'searchinput'`                                                                                     |
| `stateStory: (story, state) => bool`                          | `statesForStory: (story) => VrState[]`                                                                            |
| `focusSelector` + `.focus()`                                  | `focusExpect` (selector asserted focused) + `focusTabs` (Tab count) — keyboard focus, so `:focus-visible` matches |
| `readySelector`                                               | (gone — waits `#storybook-root` + `slotSelector`)                                                                 |
| `slotSelector: '#storybook-root'` (overlay)                   | `captureSelectors: [trigger, panel]` (padded-clip union) + a first-class `'open'` state                           |
| filename `slug-story-theme.png` (resting has no state suffix) | filename ALWAYS `slug-story-theme-state.png` (incl. `-resting`)                                                   |

**Reference examples on master:**

- Simple: `client/src/components/ui/Badge/Badge.vr.ts` (`snapshotSlug` + `statesForStory`).
- Overlay: `client/src/components/ui/Tooltip/Tooltip.vr.ts` — uses
  `captureSelectors: [trigger, content]`, `states: ['resting', 'open']`, `openWaitSelector`. The
  `'open'` state appends `&args=open:!true` to the story URL, so the story must expose an `open`
  control wired to the component's `open` prop. Also see `DropdownMenu`/`Menubar`/`HoverCard` `.vr.ts`.

**The 9 files (all under `client/src/components/ui/<Name>/<Name>.vr.ts`):**

- **5 simple (mechanical rewrite):** `Tabs`, `RangeSlider`, `ToggleChipGroup`, `SearchInput`,
  `Pagination`. Just rename `filePrefix→snapshotSlug`, `stateStory→statesForStory`,
  `focusSelector→focusExpect`/`focusTabs`, drop `readySelector`. Keep `slotSelector` at the component
  root (`[data-slot="…"]`).
- **4 overlay (need judgment):** `FacetFilter`, `TokenPicker`, `LevelFilter`, `Popover`. Their old
  `.vr.ts` snapshot `#storybook-root` to catch the open panel. Convert to `captureSelectors: [trigger,
panel]` + the `'open'` state (Tooltip pattern). CHECK each component's `*.stories.tsx`: they
  currently use `defaultOpen`; you likely need to add an `open` arg control (see how master's overlay
  stories + this repo's control-driven story pattern do it — `useArgs`), OR keep an already-open story
  and capture trigger+panel with `states:['resting']`. Pick whichever matches master's convention;
  Tooltip's `open`-state approach is preferred for consistency.
  - `data-slot` roots to target: `facet-filter`, `token-picker`, `level-filter`, `popover-content`
    (the open panel for Popover). Confirm the panel `data-slot`s by reading each `.tsx`.

## Then: regenerate Linux baselines + finish

1. **Delete the old-convention Linux baselines** for these 9 components (they use the old
   `slug-story-theme.png` naming; the new API writes `slug-story-theme-state.png`, so stale files
   would linger). Simplest: `git rm` each of the 9 components' `*.vr.ts-snapshots/*.png`, then regen.
2. **Regenerate via the Playwright container** (Docker must be running — AGENTS.md note #127). Kill
   any Storybook on :6006 first. From the worktree root:

   ```bash
   docker run --rm -v "$PWD":/work \
     -v /work/node_modules -v /work/client/node_modules -v /work/server/node_modules \
     -v /work/shared/node_modules -v /work/infra/node_modules -v /work/.pnpm-store \
     -w /work mcr.microsoft.com/playwright:v1.61.1-noble \
     bash -c "corepack enable && pnpm install --frozen-lockfile --ignore-scripts && \
       pnpm --filter @notation-hero/client exec playwright test --project=chromium --update-snapshots \
       -g 'Tabs|RangeSlider|ToggleChipGroup|SearchInput|Pagination|FacetFilter|TokenPicker|LevelFilter|Popover'"
   ```

   (This takes >2 min — run it backgrounded.) Inspect a few regenerated PNGs to confirm correct render.

3. **Gates (all must pass):** from `client/`: `npx tsc --noEmit`, `npx eslint . --max-warnings 0`,
   `npx vitest run`, `npx playwright test --project=a11y`, `npx playwright test --project=chromium`
   (VR), `npm run build`; from root: `cspell`. Kill any manual Storybook on :6006 before a11y/VR so
   Playwright boots its own (stale :6006 = false failures — known gotcha).
4. **Conclude the merge:** `git add -A && git commit` (no message edit needed — it's a merge commit;
   NEVER `--no-verify`). Then `git push origin base-ui-migration:claude/keen-nash-31b894`.
5. **Re-check master hasn't moved** (Leo is editing it): `git fetch origin master`; if it advanced,
   merge again + re-resolve/regen as needed.
6. **Merge PR #99:** once green, `gh pr merge 99 --squash`. **Do NOT pass `--delete-branch`** (standing
   rule: never delete a remote branch). Confirm mergeable first (`gh pr view 99 --json mergeable,mergeStateStatus`).

## Standing rules (Leo)

- Work only in the worktree; **never commit on / check out master**. The final `gh pr merge` is the
  only master-touching step and Leo asked for it.
- **Never delete a remote branch** (no `--delete-branch`, no `push --delete`).
- **Never** `git commit`/`push --no-verify`.
- Full absolute paths in all references. Commit green checkpoints. Decisions to Leo go via the
  desktop question picker, not prose.

## Context refs

- Base UI migration ADR: `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/base-ui-migration-nh254/docs/decisions/2026-07-07-radix-to-base-ui-migration.md`
- Button/input token-reuse convention (memory): buttons → `buttonVariants`/`<Button>`; input
  surfaces → `inputSurfaceClasses` (`@/lib/utils`). Don't hand-copy token strings.
- Follow-up ticket already filed: NH-272 (TokenPicker creatable) — not part of this merge.
