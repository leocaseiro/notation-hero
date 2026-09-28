---
artifact_contract: 'ce-handoff/v1'
created_at: '2026-09-27T00:00:00Z'
title: 'v0c popovers — code review lap 4 handoff'
summary: 'Lap 4 reviewed the WHOLE of PR #176 for the first time (earlier laps each saw a slice) and produced 12 findings. All 12 are now triaged and applied or dropped, plus one regression that only appeared when master was merged in. The pull request is green on every check. This file records what lap 4 decided, what it corrected about earlier laps, and what is deliberately left open.'
keywords: ['nh-291', 'v0c', 'popovers', 'code-review', 'lap-4', 'triage', 'handoff']
repository: 'leocaseiro/notation-hero'
branch: 'claude/plan-c-implementation-fa4ebf'
pull_request: 176
resume_focus: 'Lap 4 is CLOSED — no lap 5. PR #176 is green and ready for the maintainer to merge; PR #182 (the useSliderDraft extraction) is stacked on it and merges after. Open items are NH-338, the repo-wide machine-path scrub, and the upstream alphaTab report.'
---

# v0c popovers — code review lap 4 handoff

## Why this exists

Lap 4 was the first lap to review the **whole** pull request. Laps 2 and 3 each saw a
slice, so several things that only show up across the full diff had never been looked at:
the maintainer's own pull-request note (23 checkable claims, never examined by any lap),
the build guard's watch list, and the interaction between the e2e lane's new page-error
gate and the rest of the suite.

It also ran against a **red** baseline, which the lap-3 handoff did not mention. That is
recorded below because it changed what lap 4 spent its time on.

## State of the branch

|                   |                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------ |
| Pull request      | #176 — `feat: v0 settings and tracks popovers (NH-291)`                                    |
| Base              | `master`                                                                                   |
| Reviewed at       | base `9e367f69`, head `62b664f8` — 242 files, 9,285 executable changed lines               |
| Triaged at        | head had moved to `040762c1`; every finding's anchor was re-checked and still held         |
| Checks            | `CI Green`, `e2e`, `a11y`, `vr`, `quality`, `lint`, `build`, `pr-checklist` — all **pass** |
| Stacked follow-up | PR #182 — `useSliderDraft` extraction, based on this branch, 19 checks pass                |

Lap 4 added 11 commits, plus a merge of `master`.

## What lap 4 corrected about earlier laps

These matter more than the findings themselves, because each one had been believed and
acted on.

- **CI was red for a reason nobody had checked.** The lap-4 review recorded "the `e2e`
  job fails, and those two failures are findings #1 and #2". By the time triage ran, `e2e`
  passed and the only red was **one unticked checkbox** in the pull-request description —
  an item `master`'s template had gained when the error-code work merged. The claim behind
  it was verified true (`node tooling/check-error-codes.mjs` reports 19 codes live and all
  documented) before it was ticked.

- **The flaky drag failure was blamed on the wrong function, twice.** Two laps attributed
  it to `dropPlaybackSelection`. Both explanations were refuted independently — the engine
  guards on `_selectionStart`, the very field that branch clears. `playback-selection.ts`
  is correct and was left alone. The real cause is a different hole in the same engine
  state; see "Applied" below.

- **The metronome is incidental to the play/pause throw.** Two reviewers framed it as
  "metronome on, then play/pause". Measured: metronome **off** fails 7/10, **on** 3/10, and
  a ~700 ms gap clears it entirely (0/20). The immediacy causes it, not the metronome.

- **The toast close button IS covered now.** Finding #4 said an accessibility comment made
  a false claim about the design system's Sonner stories gating the close button's hit area.
  It was false when written and became TRUE while this pull request was open: the error
  toast wrapper forces `closeButton: true`, so every error story renders it and eight visual
  baselines pin it. The comment was rewritten to say that, and to say what a baseline match
  does _not_ buy — it is not a target-size assertion, and the accessibility tag set has no
  target-size rule.

- **"One test file" was three.** The pull-request note said a single scoped lint exemption
  was needed. The identical exemption sits on three test files. The architectural point the
  note makes — that the project-wide AlphaTab import fence was not widened — is correct;
  only the count was wrong, and it has been corrected in place.

## The regression that only appeared on merge

Not a review finding: nothing in the reviewed diff was wrong. It appeared when `master`
came in, and it is the most user-visible thing lap 4 touched.

`master` moved the design system's toaster to top-right with a measured 88px top offset so
a persistent error can never sit on the header. This app was still overriding `offset` with
`{ bottom: 96 }`, written when the toaster was bottom-right — and `Toaster` spreads caller
props **last**, so the override won. The result kept the new top-right position but lost its
top offset and landed on the header.

Measured with `master`'s own gate, which uses `document.elementFromPoint` and is the only
check that can see occlusion at all. Controls a person could not click, before → after:

| Width  | Blocked before                                                                                                       | After |
| ------ | -------------------------------------------------------------------------------------------------------------------- | ----- |
| 1280px | `settings-trigger`                                                                                                   | 0     |
| 700px  | `Tempo`, `Increase tempo`, `settings-trigger`                                                                        | 0     |
| 375px  | `back-home`, `app-wordmark`, `loaded-notation-name`, `Decrease tempo`, `Tempo`, `Increase tempo`, `settings-trigger` | 0     |

Placement now belongs to the design system, which measured it, and the comment in
`web/app/layout.tsx` says so — so the override is not reintroduced.

## Applied

Each landed as its own commit with its evidence in the message.

- **A redraw during a bar-selection drag no longer throws.** AlphaTab's `_onBeatMouseDown`
  sets `_selectionStart` and leaves `_selectionEnd` undefined, and `_onPostRenderFinished`
  then reads `_selectionEnd.beat` with no guard — the only unguarded read of that field in
  the bundle. A `beatMouseDown` subscription seeds a same-beat pair, which paints nothing.
  Measured with a control: 20/20 fail → 20/20 pass, full e2e 88/88, and reverting put it
  back to 20/20 fail.

- **The page-error gate can no longer miss a late throw.** Its `afterEach` asserted
  synchronously, so an error raised at the tail of a test arrived after the check had
  passed — the test went green on a build that threw. It is now async and drains the
  protocol with one round trip before asserting.

- **The engine-noise allowance is scoped by ORIGIN, not by message or test name.** This one
  was got wrong first and fixed after CI disagreed; see "What went wrong in this lap" below.

- **The build guard no longer arms its own canaries.** Three of its ten entries were plain
  text, so the build tool could extract them from the guard's own source and generate them —
  the canary then reports present on exactly the broken build the guard exists to catch. A
  comment elsewhere in the same file named two of them literally, which would have re-armed
  both regardless. Both are now written so they cannot be extracted, and a new tooling test
  asserts the `@source` exclusion that the escaped entries still depend on. Measured: with
  the design-system scan broken, 9 of 10 report missing with that line and 6 of 10 without.

- **A font typed with a tab is no longer accepted and then silently ignored.** The validator
  split on any whitespace; the engine splits on the literal space only, so it swallowed the
  whole string as the size and threw. The row now normalizes once and validates and commits
  that same string — which is what the restore path already did.

- **`setStaffDisplay` has tests**, including both guard branches. Proven to bite: removing
  the guard fails two of the three, and ignoring the staff index fails one.

- **The untick regression test asserts its outcome**, not just that the interaction happened.

- **Machine-local paths this pull request added are gone**, and the comments that were stale
  or false are accurate.

## What went wrong in this lap, and how it was caught

Worth reading, because the mistake was invisible locally and only CI disagreed.

The over-broad allowance was first narrowed to **two named tests**, on the strength of an
existing comment claiming one hand-written fixture was the only thing that reached the
throw. A local run then showed five failures, which were dismissed as environment flakes —
wrongly, on the basis of a log that had been **truncated to its last 60 lines**, so the grep
that looked for gate failures found nothing and the absence was read as evidence.

CI's full log showed those five failing on the gate. The fixture claim was false: ordinary
exported Guitar Pro files reach it too, seven throws in a single case. The stack settled it —
every frame of every occurrence sits inside the vendored engine bundle, inside a worker, with
no application frame at all. The allowance now requires that, so the same words thrown from
application code still fail the gate everywhere. Full local e2e afterwards: 91 passed, 0
failed, including the two cases the allowance exists for and the five the first attempt broke.

Two lessons worth keeping: a truncated log is not evidence of absence, and when a comment
asserts "X is the only case", that claim is worth measuring before a gate is built on it.

## Deliberately open

- **NH-338** — Play then an immediate Pause throws out of AlphaTab's worklet output, because
  `pause()` calls `stop` unconditionally while `play()` defers `start` into a promise. Every
  visitor is on the racy path. The only remedy that helps a real person is to withhold the
  pause until the output has started, which costs transport responsiveness the maintainer has
  judged by hand — so it is a product call, not a mechanical fix. The e2e lane tolerates the
  message meanwhile, scoped by origin, and NH-338 carries the acceptance criteria including
  removing that entry. Linked to NH-312.

- **A repo-wide machine-path scrub.** This pull request's own additions are clean, but a full
  sweep found the class is widespread in tracked documentation. Being handled in its own
  session and its own pull request; the archive files need care, because the maintainer
  re-reads archives.

- **An upstream report to AlphaTab.** Six defects in 1.8.4 have accumulated across this
  project, each measured and each costing a permanent workaround here. NH-312 already
  proposes one bundled report rather than six.

- **Both human gates stay open**, as every lap has said: the mix judged by ear, and a visual
  walk through every settings group. An agent must not self-certify either.

- **Two pre-existing races carried, not promoted** — a same-score `scoreLoaded` re-fire can
  wipe the mixer's solo/mute/volume/transpose, and one popover lacks the score-identity guard
  its siblings have.

## Why there is no lap 5

The loop's rule is that a P0 or P1 applied in a lap means re-lap. The maintainer stopped at
lap 4 instead, and the reasoning is recorded here rather than left implicit: lap 4 was the
first lap to see the whole diff, its findings are applied, every check is green, and the two
things a lap cannot settle are the two human gates above. A fifth full review of a pull
request that has had four would re-read the same code to answer questions that now belong to
a person, not a reviewer.
