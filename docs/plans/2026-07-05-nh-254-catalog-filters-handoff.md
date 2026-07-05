# Handoff — Catalog search + filter components (PR #99, NH-254/253/255)

**PR:** [#99](https://github.com/leocaseiro/notation-hero/pull/99) · **Branch:** `claude/keen-nash-31b894` · **Status:** CI green (incl. Storybook preview) · **Date:** 2026-07-05

Design-system components for the catalog **search + filter row** (the table itself shipped in NH-210). Ten reusable, presentational ("dumb") components + a plan doc, built in two rounds (initial build, then a full rework from Leo's feedback) plus a two-agent code review.

## TL;DR — what to do next

1. **Review via Storybook.** #113 (NH-266) added a Storybook-preview workflow; this branch merged it, so the PR builds a Storybook you can browse (`UI/*`). Also `pnpm --filter @notation-hero/client storybook` locally.
2. **⚠️ Reconcile the NH-262 overlap before merge** — see [§ Overlap](#-overlap-with-nh-262-must-reconcile-before-merge). Both this PR and NH-262 PR #101 introduce `client/src/vr-helpers.ts`.
3. **Decide the deferred follow-ups** — see [§ Deferred](#deferred--follow-ups).

## Components delivered

All under `client/src/components/ui/<Name>/`, each with the 6-file set (`.tsx`, `.test.tsx`, `.stories.tsx`, `.story-ids.ts`, `.vr.ts`, `.a11y.ts`) + committed VR baselines (macOS `-darwin` + CI `-linux`).

| Component         | Serves                                  | Notes                                                                                          |
| ----------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `SearchInput`     | search box                              | `onSubmit` on Enter; clear button                                                              |
| `Tabs`            | Song \| Lessons toggle (NH-255)         | Radix Tabs, roving focus                                                                       |
| `Pagination`      | list paging (NH-253)                    | numbered pages **+ ellipsis**, teal active page, TanStack-agnostic props                       |
| `FacetFilter`     | genre/kind (multi), instrument (single) | **cmdk combobox** — keyboard-accessible, teal checkmarks; keeps the trigger/count-badge layout |
| `TokenPicker`     | tags/pattern/key                        | shadcn **multiple-combobox** — removable gray badges + cmdk list                               |
| `LevelFilter`     | level                                   | **Min/Max range** dropdown (Debut..10), per the wireframe                                      |
| `RangeSlider`     | tempo (BPM)                             | dual-thumb Radix Slider, hover + focus states                                                  |
| `ToggleChipGroup` | skill + time-signature                  | toggle chips; selected = solid teal, unselected = gray                                         |
| `Command`         | primitive                               | cmdk wrapper (the combobox engine)                                                             |
| `Popover`         | primitive                               | Radix Popover, **inline (no Portal)** so open panels stay in the a11y/VR scope                 |

Shared: `client/src/vr-helpers.ts` (`runVrStories` — light/dark + hover/focus/open VR), and a `ResizeObserver`/pointer-capture/`scrollIntoView` polyfill added to `client/vitest.setup.ts` (cmdk + Radix Slider need it in jsdom).

## Key decisions (locked)

- **cmdk + Radix, no other combobox lib.** Leo required real keyboard a11y ("can't select via Enter"); the first hand-rolled native-checkbox dropdown was rejected. cmdk gives arrow-keys + Enter for free.
- **Fetch-agnostic contract.** Every searchable component takes static `options` + `value`/`onChange` + `shouldFilter` + `onQueryChange` + `loading`. Frontend-only = `shouldFilter` on; fetch = `shouldFilter={false}` + drive `options` from `onQueryChange`. Both shown in stories.
- **Token language (Leo, "see the Button"):** selected/active = solid teal (`bg-primary` + `text-primary-foreground`, like `Button` default); unselected/neutral chips + badges = gray (`bg-secondary`, like `Button` secondary). No faint `bg-primary/10` tints.
- **Self-hosted Material Symbols** (not the `components.json` lucide default).
- **Wireframe over the stale mockup:** instrument = single-select v1; Key filter conditional on a pitched instrument (container concern); genre slot swaps to Kind on the Lessons tab.
- **Story-per-state** (repo convention — `Default` + one named story per state), not the base-skill single-`Playground` pattern.

## Review outcome (2 agents)

Core keyboard-a11y verified working. Fixed before merge:

- **HIGH — Pagination** showed an ellipsis in place of a **single** hidden page → now shows the page; ellipsis only collapses gaps of 2+. Test added.
- **HIGH — combobox loading/empty** were silent to screen readers (cmdk pins `aria-expanded=true` over an empty listbox) → added `role="status"`; the two transient stories are excluded from the axe scan (still VR-covered).
- **MEDIUM** — `sr-only ", selected"` collided with cmdk's highlight-`aria-selected` → reworded to `", checked"`; **LevelFilter** inverted range now displays ascending; **Popover** overflow-clipping constraint documented.
- **LOW** (deferred, cosmetic): `pageCount=0` disabled "1" chip; out-of-range `pageIndex`; highlight-jump when toggling with an active query.

Clean, no changes: `ToggleChipGroup` tokens, `RangeSlider` hover, `SearchInput` submit, the fetch contract, single/multi logic, `TokenPicker` badge structure, jsdom polyfills.

## ⚠️ Overlap with NH-262 (must reconcile before merge)

This PR and **NH-262 PR #101** (`feat/nh-262-ui-primitives-breadcrumb-skeleton-tooltip`, still **OPEN**) both introduce **`client/src/vr-helpers.ts`** (`runVrStories`), and both modify **`client/vitest.setup.ts`** and **`cspell.json`**; #101 also touches `client/src/a11y-helpers.ts`.

- **Component folders do NOT collide.** This PR adds Command/Popover/Tabs/FacetFilter/TokenPicker/LevelFilter/Pagination/RangeSlider/ToggleChipGroup/SearchInput; NH-262 (#101/#109/#112) adds breadcrumb/skeleton/tooltip/dropdown-menu/menubar/hover-card/scroll-area/separator/input/sheet/sidebar; #102 (NH-264) adds Input. No shared component name.
- **Only the shared helper + config collide.** Whichever merges **second** must unify `vr-helpers.ts` (this PR's version adds `readySelector` + a `VrState` union with hover/focus states), `vitest.setup.ts` (the polyfills), and the `cspell.json` additions.
- **Recommendation:** pick a merge order; the second PR rebases and keeps one canonical `runVrStories`. If NH-262 lands first, drop this PR's `vr-helpers.ts` and adopt theirs **only if** it already supports `readySelector` + hover/focus states (the filter dropdowns rely on both).

## Testing / gates

All green locally and in CI (unit, a11y light/dark, VR macOS + Linux, lint, build, e2e).

```bash
# from repo root
pnpm --filter @notation-hero/client test          # Vitest unit
pnpm --filter @notation-hero/client test:a11y      # axe, light + dark
pnpm --filter @notation-hero/client test:vr        # VR vs committed baselines
pnpm --filter @notation-hero/client storybook      # browse the components
```

**Regenerating VR baselines** (after an intended visual change) — **kill any stale Storybook first**:

```bash
lsof -ti :6006 | xargs -r kill -9        # stale :6006 serves desynced stories -> false failures
pnpm --filter @notation-hero/client test:vr:update            # macOS (-darwin) baselines
# Linux (-linux) baselines via the Playwright container (matches CI); see AGENTS.md "VR baselines":
docker run --rm -v "$PWD":/work \
  -v /work/node_modules -v /work/client/node_modules -v /work/server/node_modules \
  -v /work/shared/node_modules -v /work/infra/node_modules -v /work/.pnpm-store \
  -w /work mcr.microsoft.com/playwright:v1.61.1-noble \
  bash -c "corepack enable && pnpm install --frozen-lockfile --ignore-scripts && \
    pnpm --filter @notation-hero/client exec playwright test --project=chromium --update-snapshots=all"
```

## Gotchas worth remembering

- **Stale Storybook on :6006** — `playwright.config.ts` `reuseExistingServer:!CI` reuses a lingering (HMR-desynced) Storybook → false a11y failures + wrong VR baselines. Always kill + boot fresh.
- **cmdk combobox-empty a11y** — cmdk pins `aria-expanded=true`; a filtered-empty listbox trips axe. Pattern: always render `CommandList`; loading/empty rows get `role="status"`; exclude those transient stories from `runA11yStories`.
- **`exactOptionalPropertyTypes: true`** — never pass explicit `undefined` to an optional Radix/cmdk prop (`disabled={x ?? false}` or spread conditionally).
- **commitlint** — subject must not be sentence/pascal-case; start it lowercase (`rebuild level filter…`, not `LevelFilter…`).

## Deferred / follow-ups

- `useFilterOptions` container hook (debounced fetch wiring). The components are already fetch-agnostic; the hook is convenience sugar. Noted in the plan doc's "Out of scope".
- **Search input has no Jira ticket** (search was deferred to NH-123) — committed under NH-254; file a dedicated Design-system ticket if wanted.
- Live filter-row assembly wired to `/api/catalog` + the relevance/newest/curated **sort dropdown** (overlaps NH-123).
- The LOW review items above (cosmetic guardrails).

## File map

- Components: `client/src/components/ui/{SearchInput,Tabs,Pagination,FacetFilter,TokenPicker,LevelFilter,RangeSlider,ToggleChipGroup,Command,Popover}/`
- Shared: `client/src/vr-helpers.ts`, `client/vitest.setup.ts`, `client/src/a11y-helpers.ts` (unchanged, reused)
- Plan/spec: `docs/plans/2026-07-05-nh-254-catalog-filter-components-plan.md`
- Wireframe source of truth: `docs/wireframe/filter-review.md`, `docs/wireframe/index.html` (`#lvlPop` for the level range)
