# NH-264 Forms — Merge + Dogfood Execution Brief

Self-contained handoff. Assume you (the executing agent) have no prior context —
everything you need is in this file. Written 2026-07-08.

## 0 · Background

Notation Hero is migrating its shadcn/ui form components from `radix-ui` to
`@base-ui/react` (epic NH-264), one component per PR. A parallel epic NH-262 migrates
overlay/primitive components (breadcrumb, dropdown, scroll-area, tooltip). Both epics add
the same shared Playwright visual-regression helper `client/src/vr-helpers.ts`.

Already merged to `master`: PR #116 (RadioGroup baseline-jitter fix), PR #118 (Button and
Badge to Base UI; also brightened the `link` variant's dark-mode colour), PR #104
(Checkbox to Base UI). So `master` currently has Button, Badge, and Checkbox on Base UI;
`"@base-ui/react": "^1.6.0"` in `client/package.json` and `pnpm-lock.yaml`;
`client/src/vr-helpers.ts` at blob `8ca863fa`; and the word `baselining` in `cspell.json`.

Open NH-264 PRs this brief covers:

| PR  | Branch                            | Component                  | Kind                    | Adds `@base-ui/react`?  |
| --- | --------------------------------- | -------------------------- | ----------------------- | ----------------------- |
| 120 | `feat/nh-264-base-ui-radio-group` | RadioGroup                 | Base UI swap            | yes (lockfile conflict) |
| 102 | `feat/nh-264-input`               | Input                      | native input            | no                      |
| 110 | `feat/nh-264-native-select`       | NativeSelect               | native select + chevron | no                      |
| 121 | `feat/nh-264-textarea-vr`         | Textarea (stories/VR only) | test-only               | no                      |
| 119 | `feat/nh-264-base-ui-label`       | Label                      | native label            | no                      |
| 111 | `feat/nh-264-input-group`         | InputGroup                 | compound (native)       | no                      |

Cross-epic awareness (NH-262 — not this brief's job, but do not break it): PR #112
(scroll-area) carries the canonical `vr-helpers.ts` (`8ca863fa`, identical to the NH-264
group). PR #101 (breadcrumb, `7dc2a78e`) and PR #109 (dropdown, `0fb9d7f5`) carry an older
divergent copy — a cross-epic merge with them conflicts on that file and must be
reconciled to `8ca863fa` (then regenerate their baselines) whenever NH-262 lands.

Decided merge order — leaf controls first, compositional last:

1. PR #120 RadioGroup (resolve conflict), then PR #102 Input, PR #110 NativeSelect,
   PR #121 Textarea (order among these three is free — trivial `cspell` only).
2. Then PR #119 Label and PR #111 InputGroup — they receive dogfood changes first
   (Tasks C and D) so they showcase the real components.

Rationale: Label and InputGroup are compositional; their stories and VR are most
meaningful once the leaf controls exist. PR #120 is the only remaining PR that adds
`@base-ui/react` to `package.json` and `pnpm-lock.yaml`, so it is the only lockfile
conflict now that PR #118 and PR #104 are in. The rest are native (no new dependency), so
at worst a one-line `cspell.json` dedupe of `baselining`, which usually auto-merges.

## 1 · Standing rules (apply to every task)

- Worktrees only. Never commit on `master` or the primary checkout. Use
  `git worktree add ../rev-<pr> <branch>`. If lefthook's hooks path blocks the first
  commit, run `node_modules/.bin/lefthook install --reset-hooks-path` inside the worktree
  (run the binary directly, not via `pnpm exec`).
- Never use `--no-verify`. Never delete a remote branch — push only; the human does the
  GitHub merge.
- Commits: conventional-commit format (commitlint-enforced); keep the subject under ~70
  chars; end the body with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- The pre-push hook runs the full gate (format, all linters, `test`, `typecheck`) but not
  VR. VR runs only in CI (the `vr` job, blocks merge) against per-OS baselines. So any
  intended visual change needs regenerated baselines committed, or CI goes red.
- Cheap Tailwind-compile check (confirm an arbitrary variant compiles without a full VR
  run): run `pnpm --filter @notation-hero/client build`, then grep
  `client/dist/assets/*.css` for the compiled selector (Tailwind's JIT emits only used
  classes). Pixel-identity of a scoping-only selector change is then guaranteed by
  same-element matching.
- zsh gotcha: in git ref specs use braces — `"${REF}:refs/..."`, not `"$REF:refs/..."`
  (zsh treats `:r` as a modifier and mangles the ref).

### Regenerating VR baselines (after any intended visual change)

First kill any stale Storybook (`lsof -ti:6006 | xargs kill -9 2>/dev/null`) — a reused
server serves out-of-sync stories and blesses wrong baselines. Then regenerate both
platforms and commit them.

darwin (local mac):

```bash
pnpm --filter @notation-hero/client test:vr:update
```

linux (what CI compares against) — the pinned Playwright container, run from the worktree
root (so `$PWD` is the worktree):

```bash
docker run --rm -v "$PWD":/work \
  -v /work/node_modules -v /work/client/node_modules -v /work/server/node_modules \
  -v /work/shared/node_modules -v /work/infra/node_modules -v /work/.pnpm-store \
  -w /work mcr.microsoft.com/playwright:v1.61.1-noble \
  bash -c 'corepack enable && pnpm install --frozen-lockfile --ignore-scripts && \
    pnpm --filter @notation-hero/client exec playwright test --project=chromium \
    --update-snapshots -g "Component / story / "'
```

The anonymous `-v /work/**/node_modules` volumes shadow the host install, so the darwin
`node_modules` survives untouched. `--ignore-scripts` skips lefthook's git-touching
prepare (its git call cannot resolve a worktree `.git` inside the container). The `-g`
filter regenerates only the changed story's baselines — the VR test title is
`name / story / theme / state`, so keep the trailing space-then-slash (for example
`-g "Button / link / "` must not also match `as-link`).

## 2 · Task A — resolve PR #120 (RadioGroup) conflicts

Set up a worktree and merge master in to surface the conflicts:

```bash
git fetch origin
git worktree add ../rev-120 feat/nh-264-base-ui-radio-group
cd ../rev-120
git merge origin/master
```

Resolve each conflicted file (ours is PR #120, theirs is master):

- `pnpm-lock.yaml` — never hand-merge a lockfile. Take master's and regenerate with the
  block below (`@base-ui/react` is already on master, so `pnpm install` reconciles
  cleanly).
- `client/package.json` — the only change is the identical `"@base-ui/react": "^1.6.0"`
  line (already on master). Keep it once:
  `git checkout --theirs client/package.json && git add client/package.json`.
- `cspell.json` — keep the shared `baselining` once (it is on master) plus any
  RadioGroup-specific words PR #120 added; resolve to the union, no duplicates; `git add`.
- `client/src/vr-helpers.ts` — PR #120's copy is byte-identical to master's (blob
  `8ca863fa`); git usually auto-resolves it. If flagged, either side is identical:
  `git checkout --theirs client/src/vr-helpers.ts && git add`.
- RadioGroup's own files and VR baselines should not conflict — master's RadioGroup is
  PR #116's version, which is PR #120's merge base, so PR #120's Base-UI changes apply
  cleanly.

Lockfile resolution:

```bash
git checkout --theirs pnpm-lock.yaml
pnpm install
git add pnpm-lock.yaml
```

Finish and verify (the push hook re-runs the full gate; never `--no-verify`):

```bash
git commit --no-edit
pnpm --filter @notation-hero/client run lint
pnpm --filter @notation-hero/client run test
pnpm --filter @notation-hero/client run typecheck
git push origin feat/nh-264-base-ui-radio-group
```

The RadioGroup VR baselines were regenerated during review against the same
`vr-helpers.ts` that is on master, so no VR regeneration is expected. If CI's `vr` job
flags a RadioGroup baseline, regenerate per section 1 (`-g "RadioGroup / story / "`). Then
the human merges PR #120.

## 3 · Task B — merge the remaining leaf controls (PR #102, #110, #121)

After PR #120 is on master, these three add no dependency, so no lockfile conflict. For
each: if GitHub shows a conflict it is the trivial `cspell.json` dedupe — rebase or merge
master, resolve `cspell.json` to the union of words (no duplicate `baselining`), push.
Order among them is free. The human merges each.

## 4 · Task C — dogfood Label (PR #119) before merging it

Goal: Label's stories and VR should wrap the real `Checkbox` (now on master), not a raw
checkbox input. This also fixes a real guard bug.

Work in a worktree on `feat/nh-264-base-ui-label`, rebased on master first. Then:

1. Fix the guard selector. `client/src/components/ui/Label/Label.tsx`'s mouse-down handler
   skips wrapped controls with `closest('button, input, select, textarea')`. Base UI's
   Checkbox, Radio, and Switch render a `span` with `role="checkbox|radio|switch"` — not
   an `input` — so they slip past it: a double-click on a Label-wrapped real Checkbox would
   call preventDefault on its selection and skip the consumer's handler. Extend the
   selector to the version below, keep the existing `eslint-disable` comment, and update
   the adjacent JSDoc to mention role-based controls.
2. Dogfood the story. In `Label.stories.tsx`, convert the wrapped-control story to use the
   real `Checkbox` (`import { Checkbox } from '@/components/ui/Checkbox/Checkbox'`),
   associated via `htmlFor`/`id`. Ensure its id is in `Label.story-ids.ts` (VR and a11y
   consume that shared list, so they stay in lockstep). Optionally also pair Label with
   Input, RadioGroup, or NativeSelect once those merge — but Checkbox is the primary case.
3. Add a unit test mirroring the existing "leaves mouse-down on a wrapped form control
   untouched" test but with the real Checkbox: render `<Label onMouseDown={spy}>` wrapping
   a `<Checkbox />`, fire a `detail: 2` mouse-down on the checkbox, and assert
   `event.defaultPrevented === false` and that the spy was not called.
4. Regenerate VR baselines for the changed Label story (darwin and linux, per section 1;
   `-g "Label / story / "`) — a real Checkbox renders differently from a raw input.
5. Verify, commit (`feat(ui): dogfood real Checkbox in Label + guard span-role controls`),
   push. Then PR #119 is ready to merge.

Extended guard selector:

```ts
if (
  target.closest(
    'button, input, select, textarea, [role="checkbox"], [role="radio"], [role="switch"]',
  )
)
  return;
```

## 5 · Task D — optional dogfood of InputGroup (PR #111): compose the real Button

`InputGroupButton` hand-copies Button's `ghost` variant and `xs` size, and already drifts
(`rounded-sm` versus Button-xs's radius; `text-sm` versus `text-xs`). To dogfood and stop
the drift, render the real `Button` instead of the hand-rolled button:

- Import it (`import { Button } from '@/components/ui/Button/Button'`) and render
  `<Button variant="ghost" size="xs" ... />` inside `InputGroupButton`.
- Gotchas to preserve: the addon sets `pointer-events-none`, so keep `pointer-events-auto`
  on the button; keep `data-slot="input-group-button"` for the VR and a11y selectors
  (Button's `mergeProps` lets a caller override `data-slot`); Base UI's Button already
  injects `type="button"` (good — a trailing action will not submit a form). Verify the
  exact prop/render API against `Button.tsx` (it is a Base UI `useRender` component).
- This is a visual change (radius and text-size shift to match Button-xs), so regenerate
  the InputGroup VR baselines for stories showing the button
  (`-g "InputGroup / story / "`, darwin and linux). Update the `InputGroupButton` unit
  test if it asserted the old classes.
- Commit (`refactor(ui): compose Button in InputGroupButton to stop style drift`), push.

If you would rather not change InputGroup's look, skip this — InputGroup is self-contained
and merges fine as-is; just leave a note in the PR about the drift risk.

## 6 · Task E — merge the compositional tier

After Task C (and optionally Task D), merge PR #119 Label then PR #111 InputGroup. Each
may need a rebase on master plus a trivial `cspell` resolution; push; the human merges.

## 7 · Done criteria

- All six open NH-264 PRs merged in tier order, each CI-green (lint, test, typecheck, vr,
  a11y, e2e).
- No `--no-verify`; no deleted remote branches.
- Label wraps a real Checkbox in its stories, and its guard covers role-based controls.
- If Task D is done, `InputGroupButton` is the real `Button`.
- Follow-up (separate): reconcile the NH-262 `vr-helpers.ts` divergence (PR #101 and #109
  to the canonical `8ca863fa`, regenerate their baselines) before merging across epics.
