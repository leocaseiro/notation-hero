---
artifact_contract: 'ce-handoff/v1'
created_at: '2026-09-16T12:00:00Z'
title: 'v0 Plan A review, lap 3 — triage handoff'
summary: 'Lap 2 finished (6 findings) and lap 3 ran (7 personas, 18 findings). Five decisions and four mechanical fixes are applied across 5 commits; 6 findings are still to triage, then lap 4.'
keywords: ['nh-291', 'v0a', 'plan-a', 'ce-doc-review', 'triage', 'alphatab', 'handoff']
cwd: '/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/alphatab-spike'
resume_focus: 'Triage the 6 open lap-3 findings with the spec-triage-loop triage skill, then run lap 4. Two decisions outside the plan also wait: the deps-cve advisories blocking PR #154, and merging PR #154 itself.'
repository: 'leocaseiro/notation-hero'
repo_root_sha: '2a593aa2d597'
branch: 'spike/alphatab-nextjs-poc'
head: '426167a7'
worktree_path: '/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/alphatab-spike'
---

# v0 Plan A review, lap 3 — triage handoff

**Session objective.** Finish lap 2's open findings, then run lap 3 of the review loop over
[`docs/plans/2026-09-13-v0a-engine-and-first-sound-plan.md`](2026-09-13-v0a-engine-and-first-sound-plan.md)
— `spec-triage-loop` `doc-review-loop`, which runs `compound-engineering:ce-doc-review` in headless
mode and triages what survives verification.

**Outcome.** Lap 2's six open findings are decided and applied. Lap 3 ran with the same seven
personas, primed with every lap-1 and lap-2 decision, and produced 18 findings: **4 mechanical fixes
applied without a decision, 5 decisions applied, 6 still to triage, 8 FYI**. Everything is committed
and pushed. The plan's frontmatter records `lap: 3`, `last_applied: P1`, so the loop's re-lap trigger
is armed: **lap 4 is due** (the cap is lap 5).

---

## What landed

| Commit     | What                                                                                           |
| ---------- | ---------------------------------------------------------------------------------------------- |
| `7fbc493f` | Lap 2 batch 6 — notation host becomes a named region, `globalThis`, the `client/` import fence |
| `7a0f8ad0` | Lap 2 batch 7 — first-open Skeleton, three spec corrections, the committed fence test          |
| `100b24b3` | Lap 2 batch 8 — one failure message per reason, and error numbers E101-E901                    |
| `8430cf77` | Lap 3 batch 1 — backing tracks documented, PR-checklist resync, a sixth axe case, 2 fixes      |
| `426167a7` | Lap 3 batch 2 — focus moves into the score on open; the mockup's header names the open score   |

Each commit message itemises its changes and the reason for each; this handoff does not repeat them.
Every decision is also recorded in `docs/decisions/decision-registry.md` under the two 2026-09-16
entries.

### Lap 3 — applied

| ID   | Severity | Decision                                                                                                                                                                                                                                                                                                   |
| ---- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —    | P1       | Task 3's commit named paths its own `git rm` had removed: `git add` aborts and stages **nothing** (reproduced). Path list corrected.                                                                                                                                                                       |
| —    | P2       | The File Structure tables were missing 8 files the tasks touch (generator, AGENTS.md, globals.css, both Sonner files, workflow guard, spec, registry).                                                                                                                                                     |
| —    | P3       | `Card.tsx` was missing from Task 4's `git add`; fixed while adding `Tooltip.tsx` there.                                                                                                                                                                                                                    |
| L3-A | P1       | **Keep `EnabledAutomatic`** — a file with an embedded audio track keeps playing that recording. The cost is written down instead: spec §4/§7 now require mute, solo, volume, metronome and count-in to render **disabled with a tooltip** in Plans B and C. A recording/synth toggle is deferred (NH-298). |
| L3-B | P1       | Task 14 re-runs `pr-checklist-sync` by hand after `gh pr edit --body`, which wipes the checklist the required job needs.                                                                                                                                                                                   |
| L3-C | P1       | A sixth axe case covers the engine-error screen.                                                                                                                                                                                                                                                           |
| L3-D | P1       | `host.focus()` on mount, so opening a score does not drop keyboard focus to `<body>`.                                                                                                                                                                                                                      |
| L3-E | P1       | The mockup's header lands in v0a: wordmark, then the score **title**, with the **file name** in a `Tooltip`. `Tooltip` joins the client barrel; the replace tests read `data-file`.                                                                                                                        |

---

## Still open — triage these next (6)

Each is verified against the plan, the installed packages, or a reproduction — the verification is
named per item. Present each with a Before → After, per the `triage` skill.

### L3-F · P2 · Both import fences miss a dynamic `import()`

- **What:** Task 3's fences use `no-restricted-imports`, which only sees `import`/`export`
  declarations. `const mod = await import('@coderline/alphatab')` passes both fences **and** the
  committed fence test, so the second bundled copy the whole delivery decision exists to prevent can
  come back with lint green.
- **Verified 2026-09-16:** with Task 3's exact rule in `web/eslint.config.mjs`, a probe holding that
  dynamic import linted clean (exit 0). Adding
  `'no-restricted-syntax': ['error', { selector: "ImportExpression[source.value=/^@coderline.alphatab/]", message: … }]`
  made the same probe fail (exit 1).
- **Proposed:** add that selector to `web/`'s fence block; **append** it to the existing
  `no-restricted-syntax` array in `client/eslint.config.js` (a separate block would replace that
  array's inline-colour rule — flat config replaces rule options, proven in lap 2); and add a
  dynamic-import probe to `tooling/alphatab-import-fence.test.sh`.
- **Note:** `loadAlphaTabEngine()`'s own dynamic import holds its URL in a `const`, so it has no
  `source.value` and the selector cannot match it.

### L3-G · P2 · `rendered-track-count` reports what was requested, not what rendered

- **What:** Task 10's score effect sets the count from the same `drumIndexes` array it passes to
  `renderScore`, and the no-percussion branch hard-codes `1`. The three `Punk` cases and criterion 9
  would pass even if AlphaTab drew only track 0 — including the Track-objects-instead-of-indexes
  mistake the plan warns about twice.
- **Verified:** `AlphaTabApi` exposes a `tracks` getter (`alphaTab.core.mjs:45504`) — AlphaTab's own
  resolved list.
- **Proposed:** set `setRenderedTrackCount(api.tracks.length)` inside the existing `renderFinished`
  handler and delete the line from the score effect.

### L3-H · P2 · Task 11's cancel test can fail on a good build, and passes on a restart

- **What:** the test reads `data-position` as soon as `data-playing` turns true, but AlphaSynth
  enters `Playing` before the worklet has played a sample, so `before` is 0 and the non-retrying
  `expect(before).toBeGreaterThan(0)` fails. Even once that is fixed, the closing poll still passes
  if cancel restarts playback from bar 1 — the position climbs past `before` either way. Two
  reviewers raised it.
- **Proposed:** poll until the position is above 0, then capture `before`; take the prompt through
  `page.waitForEvent('dialog')` and dismiss it there; assert the first position read afterwards is at
  least `before`; only then poll for a larger value.

### L3-I · P2 · `.gpx` is BCFZ, not ZIP — the deferred bound names the wrong mechanism

- **What:** three places (the 25 MB Global Constraint, the `MAX_NOTATION` comment in Task 10 Step 3,
  and the PR body's Known limitations) say `.gpx` is a ZIP container AlphaTab inflates. The deferred
  NH-298 item inherits that. Whoever builds the bound would target ZIP inflation, which AlphaTab
  already limits per entry.
- **Verified:** both `.gpx` fixtures begin with the bytes `BCFZ`, and AlphaTab's `GpxFileSystem`
  expands a BCFZ payload to the length its own header declares, with no limit. The real ZIP formats
  (`.gp`, `.mxl`, `.capx`) go through `ZipReader`, capped per entry by
  `settings.importer.maxDecodingBufferSize` (128 MB default). The security reviewer measured a 215 KB
  input reaching 4.6 GB inside `loadScoreFromBytes`.
- **Proposed:** replace the wording in those three places, and rename the deferred item to "a
  decompressed-size bound (the BCFZ header length, and the ZIP total across entries)".

### L3-J · P2 · The plan's own code fails `web/`'s lint in three files

- **What:** two steps promise "Expected: PASS" for `pnpm --filter @notation-hero/web run lint`
  (Task 5 Step 6, Task 6 Step 9) that the snippets as written cannot meet.
- **Verified 2026-09-16** by writing each snippet into `web/` and running
  `eslint --max-warnings 0`:
  - `AlphaTabEngineContext.tsx` — `import/order` (the `react` type import sits before the local one),
    a missing return type on `AlphaTabEngineProvider` (a warning, and the lane runs
    `--max-warnings 0`), `promise/always-return` (the `.then` callback returns nothing), and
    `unicorn/catch-error-name` (`cause` must be `error`).
  - `NotationSurface.tsx` — `renderedTrackCount` / `setRenderedTrackCount` are declared in Task 6 but
    only used in Task 10: six errors (`@typescript-eslint/no-unused-vars`, `sonarjs/no-unused-vars`,
    `sonarjs/no-dead-store`, twice each). Plus `let api` → `prefer-const`.
  - `PlayerShell.tsx` — `useEffect` imported and never used (two errors), and `import/order` on the
    type import.
- **Proposed:** fix each snippet in place (move the `renderedTrackCount` state to Task 10, `const api`
  at the construction site, return `engine` from the `.then`, rename the catch parameter, order the
  imports, drop the unused import, add the provider's return type).

### L3-K · P3 · Drill 1 predicts a failure an empty worklet cannot cause

- **What:** Task 7 Step 8's Drill 1 expects a FAIL on assertion 3's content check and/or the
  "Audio Worklet creation failed" absence check. Two reviewers independently found that an empty
  worklet file is still served as HTTP 200 with a JavaScript content type, and `addModule` resolves
  for an empty module — the `new AudioWorkletNode(...)` that then throws sits in the success handler,
  so AlphaTab's failure log never runs. The real failure is assertion 2's position poll, after 20 s.
- **Proposed:** rename the drill "the worklet is served but broken" and change its Expected line to a
  FAIL at assertion 2, stating that assertions 3 and 4 stay green on an empty module and that the
  MIME risk is covered by the Vercel `curl` checks in Tasks 1, 2 and 14.

---

## FYI — surfaced, no decision required (8)

- `resetAlphaTabEngineForTests` is exported in Task 5 and nothing in the plan calls it.
- The empty state never lists the accepted formats; that line appears only during a drag.
- The 25 MB gate does not bound parse memory for text scores: a generated 6 MB alphaTex reached
  3.1 GB in Node. Real files are kilobytes; it widens the already-deferred bound.
- The E204 60 s backstop starts when the API is constructed. A hidden tab runs no animation frames,
  so a user who opens a file and switches tabs can return to a false "engine could not start" that
  never clears. Arming the timer at the first `renderScore` would fix it.
- Criterion 9 says a percussion-free score "opens and plays", but nothing verifies the playing half.
- `tooling/make-percussion-free-fixture.mjs` calls `AlphaTexImporter.importFromString`, which does not
  exist in 1.8.4; the instance form (`initFromString` + `readScore`) works and was run.
- Task 10 Step 5 says to add the score effect "beside the mount effect". Placed **before** it, the
  effect reads a null `apiRef` and never renders — its only dependency is `notation`.
- `api.play()` on Task 11's cancel and parse-failure paths is a no-op in 1.8.4: `AlphaSynthBase.play()`
  returns early unless the state is `Paused`, and nothing pauses during `confirm`. Playback resumes on
  its own, so the tests pass, but the comments describe a mechanism that never runs.

---

## Verified facts — do not re-derive

Lap 2's list still holds (see [`2026-09-15-v0a-plan-review-lap2-handoff.md`](2026-09-15-v0a-plan-review-lap2-handoff.md)).
Added on 2026-09-16:

- **Parse time follows score length, not file size.** AlphaTab 1.8.4 `loadScoreFromBytes`, median of
  5 runs on an Apple M5 Pro: `1-beat.gp` 2 ms; `Punk.gp` 4 ms; `Punk.gp` plus a 7.5 MB embedded asset
  **9 ms**; 500 bars of 16ths 115 ms; 2,000 bars **382 ms**.
- **Render height.** At the lane's width (974 px) `Punk.gp` renders 1,026 px tall with both drum
  tracks — it scrolls in the 420 px box; the sample renders 185 px and does not.
- **axe-core 4.12.1 with the plan's tags:** `aria-label` on a role-less `div` fails
  `aria-prohibited-attr` in every state; a scrollable box with nothing focusable inside fails
  `scrollable-region-focusable` under **every** role; `tabIndex={0}` clears it. The `region` rule is
  not in the plan's tag set.
- **`web/` lint facts:** `no-alert` is **not** enabled (a directive naming it is an unused-directive
  warning, and the lane runs `--max-warnings 0`); `unicorn/prefer-global-this` is an error, so
  `window.*` fails and `globalThis.*` passes; `sonarjs/todo-tag` is an error, so a `TODO` comment or a
  JSDoc `@todo` fails lint — **being fixed in PR #154**.
- **Flat config replaces rule options.** A later block naming the same rule drops the earlier block's
  options entirely; reproduced with two blocks, and again against the real `web/` config, where a
  later `no-restricted-imports` block silently disabled the AlphaTab fence.
- **AlphaTab player mode.** `EnabledAutomatic` resolves to `EnabledBackingTrack` whenever
  `score.backingTrack.rawAudioFile` exists (`alphaTab.core.mjs:46685`); that player's
  `channelSetMute`, `channelSetSolo`, `channelSetMixVolume` and `setupMetronomeChannel` are empty
  methods. `AlphaTabApi` exposes a `tracks` getter (`:45504`). `score.title` is a plain string field.
- **`.gpx` is BCFZ.** Both fixtures start with those four bytes; `GpxFileSystem` reads a
  header-declared length, `ZipReader` caps each entry at `maxDecodingBufferSize`.
- **`pr-checklist-sync` triggers** on `opened`, `workflow_dispatch` and template pushes to master —
  never on `edited`.
- **`git add` aborts on a missing pathspec.** With one valid and one already-removed path it prints
  `fatal: pathspec … did not match any files` and stages **nothing** (reproduced in a scratch repo).
- **Tooltip API** (`client/src/components/ui/Tooltip/Tooltip.tsx`): `Tooltip` / `TooltipTrigger`
  (takes `render`, not `asChild`) / `TooltipContent` / `TooltipProvider`; the file has no
  `'use client'` yet.

---

## Two decisions outside the plan

1. **PR [#154](https://github.com/leocaseiro/notation-hero/pull/154)** (NH-299, allow `TODO` comments;
   carries NH-293's editorconfig hook fix) is open and cannot go green: the required `deps-cve` job
   reports **74 advisories from `pnpm-lock.yaml`** — all pre-existing, none from that PR, and the
   lockfile is byte-identical to `master`. A read-only triage produced the numbers below; the
   fix-versus-allowlist call is leocaseiro's, per his standing rule.
   - **57 of 74 rows close with no version decision at all** — they float inside ranges the repo
     already declares (`@pulumi/pulumi ^3.247.0` → 3.261.0 alone clears the OpenTelemetry and js-yaml
     v3 rows; `vitest ^4.1.9` → 4.1.11 clears the 9.4 Critical). The lockfile is simply ~2.5 months
     stale.
   - **4 rows** need two `overrides` edits (`js-yaml@4` is pinned exact at 4.2.0, which is what blocks
     it; `smol-toml` needs a new entry).
   - **13 rows** need a real decision: `next` is pinned exact at 16.2.10, and the two Critical advisories need
     16.3.3+. Taking 16.3.5 also clears both `sharp` rows. The risk is the 16.2 → 16.3 minor against
     React Compiler plus `transpilePackages`.
   - **Reachability:** only `qs` (Express's query parser in the deployed Lambda) is reachable by an
     anonymous request today, and only at Medium. The two Critical advisories in the "free" bucket (`tar` via
     Pulumi, `@vitest/browser`) are not reachable here at all.
   - **Hold `@playwright/test` at 1.61.1** during any refresh: a float to 1.63.0 breaks the
     `check:supply-chain-pins` gate (NH-259) and breaks the match with the visual-regression container image.
   - `osv-scanner.toml`'s ignore for `GHSA-8988-4f7v-96qf` **expired at midnight today** and its stated
     reason is obsolete (Pulumi moved to OpenTelemetry v2 upstream). Dropping the block is correct;
     it is noise, not the cause of the failure.
   - The triage recommends one dependency PR that takes the scan to zero, with the `next` bump as the
     only judgement call, and splitting `next` out behind a 30-day ignore if it breaks the build.
2. **PR #154 itself** still needs review and merge once `deps-cve` is resolved. Its other jobs pass;
   any red "CI Green" from an earlier cancelled run is superseded.

---

## How to resume

1. Work in the worktree above, on `spike/alphatab-nextjs-poc`. The tree is clean and pushed.
2. Triage the six open findings with the `spec-triage-loop` `triage` skill: a chunk per finding with
   a Before → After, then one picker in the same turn, at most 3 findings plus the catcher. Verify
   each against the plan, the spec and the installed packages first — this session's verification
   overturned three reviewer fixes that would themselves have failed.
3. Commit each green batch before presenting the next, and push.
4. Then run **lap 4**: re-review with `spec-triage-loop` `doc-review-loop`, which runs
   `compound-engineering:ce-doc-review` in `mode:headless`. Build the prior-decision primer from this
   handoff's tables plus the lap-2 one, so settled alternatives are not raised again. The loop halts
   at lap 5, or earlier if a lap adds no new P0/P1.
5. Record the remaining approvals in `docs/decisions/decision-registry.md`, beside the two 2026-09-16
   entries.

The lap-3 reviewer prompts and the primer used for them are outside the repo, in the session
scratchpad:

```text
/private/tmp/claude-501/-Users-leocaseiro-Sites-notation-hero/d29c3304-5265-46cb-a317-37a89e194b9e/scratchpad/lap3/
```
