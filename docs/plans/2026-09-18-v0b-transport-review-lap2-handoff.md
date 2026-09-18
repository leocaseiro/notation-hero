---
artifact_contract: 'ce-handoff/v1'
created_at: '2026-09-18T00:00:00Z'
title: 'v0b transport plan review — lap 2 handoff'
summary: 'Lap 2 of the doc-review loop on Plan B: 47 raw findings from six personas merged to 29 + 6 FYI, all verified. 8 applied, 5 parked, 16 open. Halted by the maintainer while Plan A is rewritten.'
keywords:
  ['nh-291', 'v0-transport', 'plan-b', 'doc-review-loop', 'alphatab', 'use-alphatab', 'handoff']
cwd: '/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/transport-plan-review-cabd55'
resume_focus: 'Do NOT resume triage cold. Plan A was rewritten after every lap-2 finding was verified against it — re-verify the eleven Plan-A-dependent findings first, starting with L2-04, which is applied and probably now wrong.'
repository: 'leocaseiro/notation-hero'
branch: 'claude/transport-plan-review-cabd55'
worktree_path: '/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/transport-plan-review-cabd55'
---

<!-- cspell:ignore cabd -->

# v0b transport plan review — lap 2 handoff

Lap 1 (2026-09-14) applied 23 findings and is recorded in
[`2026-09-14-v0b-transport-review-handoff.md`](2026-09-14-v0b-transport-review-handoff.md). This is
lap 2. It is **halted, not closed** — the maintainer paused it on 2026-09-18 while Plan A is being
rewritten, and asked that every open question and finding be saved for a fresh session.

## Read this first — lap 2 is stale against Plan A

Every lap-2 finding was verified against **Plan A at `1a24a40e`**. Plan A has since been **rewritten**
through `eaa8834c` — 17 commits. The ones that matter:

| Commit     | What changed in Plan A                                                     |
| ---------- | -------------------------------------------------------------------------- |
| `9d2f75ef` | Task 5 now lands **the fork's hook**, its event helper and shared defaults |
| `e4d8f8bb` | Task 6 rebuilt around the hook and an always-mounted box                   |
| `e0c42a44` | The empty state is dropped — the player always has a score                 |
| `dae8e730` | That always-open score carried through Tasks 12, 13, 14                    |
| `38779781` | A fork-parity triage: 15 divergences, 2 forced                             |
| `f91c4ee5` | `web/public/alphatab` replaced by `web/scripts/vendor-alphatab.mjs`        |

**This is not a detail — it inverts one of the findings already applied.** Re-verify before doing
anything else. The full list, with per-finding risk, is in the artifact under
`triage.STALE_WARNING.must_reverify_before_next_lap`.

### Filed against Plan B by the v0a review as a P1 — the React playhead state is gone

Reported to this session on 2026-09-18, after the lap-2 edits below were applied. Source of truth: the
**2026-09-18 entry in [`docs/decisions/decision-registry.md`](../decisions/decision-registry.md)** and
the "Triage outcome" section of `docs/plans/2026-09-16-v0a-fork-parity-triage-handoff.md`, on
`spike/alphatab-nextjs-poc`.

**There is no playhead position state in React any more.** The old shape put
`const [positionMs, setPositionMs] = useState(0)` in the outermost `Player`, fed by
`playerPositionChanged`. It was removed. AlphaTab moves its own cursor through its own DOM writes;
React is not involved in playback position at all. `Player` renders both the notation surface and the
transport, so every position event re-rendered the whole player subtree — the upstream fork measured
this and abandoned it, noting that keeping tick-driven logic in the event callback rather than in
React effects "eliminates ~60 React re-renders/second".

**This makes L2-03 an active liability, not just stale.** L2-03 is applied, and its edit _rewrote and
preserved_ the very handler body that is now removed:

```tsx
setPositionMs(args.currentTime);
setDurationMs(args.endTime);
```

Treat L2-03 as **revert-or-rewrite**, not re-verify. L2-04 (also applied), L2-15 (parked) and the open
L2-20, L2-23, L2-24 and L2-29 all touch the same handler or the state it fed.

Two further constraints from the same triage that bind the transport:

- **Test-only instrumentation must never ship to production.** The v0a regression test now reads
  AlphaTab's own cursor element (`.at-cursor-beat`) instead of an attribute the app maintains. The one
  sanctioned exception is a zero-cost DevTools handle (`host.at = api`), deliberately kept in
  production builds. Plan B currently renders `data-looping`, `data-metronome`, `data-countin` and
  `data-speed` on its status element purely for e2e — re-check all four against this rule. L2-15 already
  observed that those attributes mirror React state rather than the api, so every e2e assertion can pass
  while the audio disagrees; that observation now has a second reason behind it.
- **Do not port upstream's whole-second position throttle as written.** It is defeated by a stale
  closure (`player-controls-group.tsx:184-199`, after commit `a614efdb` dropped `handler` from its
  dependency list), so it fires on every event anyway. Port it only with that fixed.

## Where everything is saved

`.spec-triage-loop/2026-09-13-v0b-transport-plan/lap-2/findings.json` — the single source of truth. It
carries all 35 findings with a **verbatim `Before → After` for each**, every reviewer's attribution,
the verifier's note per finding, the applied/parked/open status, the open questions, and the stale
warning. A resuming session needs that file and this handoff; it does not need to re-read the review.

Plan B also now carries `lap: 2` / `last_applied: P0` frontmatter pointing here, matching Plan A's
shape.

## What lap 2 did

Six personas (coherence, feasibility, design-lens, scope-guardian, product-lens, adversarial) produced
**47 raw findings**. Synthesis merged them to **29 actionable + 6 FYI**; two dispatched verifiers
checked every cited section, every evidence quote character-for-character, and every fix against the
rest of the document — **0 failed verification**.

`security-lens` was not activated (no auth, endpoints, PII or payments). **No cross-model pass ran** —
no non-Claude CLI is installed. Same gap as lap 1.

### Applied (8)

| ID    | What                                                                                          |
| ----- | --------------------------------------------------------------------------------------------- |
| L2-18 | `useRef()` with no argument — a typecheck error under `@types/react` 19.2.17. Auto-applied    |
| L2-01 | `TransportRow` read `hasRange` without declaring, destructuring or receiving it (4 reviewers) |
| L2-03 | Task 6 called `setScoreTempo` a whole task before Task 7 declares it                          |
| L2-04 | The new api subscriptions had no stated home                                                  |
| L2-05 | `applySpeed` was unexported, so Plan C's speed row could not call it                          |
| L2-08 | Task 7 Step 3 hung `onScoreLoaded` off a parse `NotationSurface` no longer performs           |
| L2-10 | The File Structure row still credited `NotationSurface` with reporting tempo                  |
| L2-06 | Base UI `Progress` does not clamp — two Task 2 tests could never pass                         |
| L2-11 | The VR focus story tabbed onto `NumberField.Decrement`, not the input                         |

L2-06 and L2-11 were applied without a picker under the maintainer's standing test/VR authorization.

### Parked for the Plan A rewrite (5)

L2-02 (backing-track disabled state) · L2-07 (`showFailureToast`) · L2-12 (duplicate header —
**resolves NH-296**) · L2-15 (state re-applied to a rebuilt api) · L2-28 (header empty state).

### Open (16)

Nine are `client/`-only and structurally insulated from the Plan A rewrite, because nothing in
`client/` imports alphaTab: L2-13, L2-16, L2-17, L2-19, L2-22, L2-23, L2-30 (plus applied L2-06,
L2-11). The rest: L2-09, L2-14, L2-20, L2-21, L2-24, L2-25, L2-26, L2-27, L2-29.

## Open questions, verbatim

1. **L2-16 — presented, undecided.** Which fix for the flooding tempo live region?
   **1️⃣ Trailing 500 ms debounce (recommended)** — fixes hold, drag **and** wheel, and follows a new
   score; costs a second timer and narrates score-driven tempo changes.
   **2️⃣ `onValueCommitted` as drafted** — no timer, but `@base-ui/react` 1.6.0 fires it
   _simultaneously with `onValueChange`_ on the mouse wheel, so wheel-scrub still floods, and the
   region goes stale after a new score loads.
2. **L2-13 — presented, undecided.** Drop `inputSurfaceClasses` from Task 5's Interfaces "Consumes"
   line, which Step 3 deliberately does not import? (Recommended: yes.)
3. **L2-14 — held back, never presented.** Its drafted fix is wrong on the facts: it assumes a 302 KB
   soundfont (the vendored `sonivox.sf3` is 954 KB) and throttles the **whole page** before
   navigation, so `alphaTab.core.mjs` (1092 KB) and `Bravura.woff2` (306 KB) crawl too — roughly 20 s
   of alphaTab assets against a 30 s default timeout. Needs a throughput sized to the real bytes
   (~300 KB/s), or a throttle applied only after the engine has loaded.
4. **L2-NEW-1 — overtaken.** "Record why the plans hand-roll the React wiring." The research stands as
   the record of why it _was_ blocked; the maintainer has since adopted the fork hook. **The next lap
   should check how the adopted hook coexists with Plan A Task 4's import fence**, since the fork's
   original uses a static value import the fence rejects.
5. **L2-NEW-2 — raised as FYI, never carded.** The fork's own
   `player-controls-group.tsx` has zero `mediaType` / `actualPlayerMode` / `backingTrack` references,
   so `MediaType.Audio` leaves the metronome and count-in buttons live and silent. NH-297-shaped fork
   ticket if wanted.

## Two corrections the maintainer made in triage — keep both

1. **The backing-track signal (L2-02).** Reviewers gated on the score _carrying_ a backing track. The
   maintainer pointed out that is not the same as _playing_ it, and he is right: alphaTab consults
   `score.backingTrack.rawAudioFile` **only** under `PlayerMode.EnabledAutomatic`
   (`_setupOrDestroyPlayer`, `alphaTab.core.mjs:52336`). The correct signal is
   `api.actualPlayerMode === alphaTab.PlayerMode.EnabledBackingTrack`, read on **`playerReady`** —
   `_onScoreLoaded` fires `scoreLoaded` _before_ the mode is resolved. There is no `playerModeChanged`
   event. **This conclusion is independent of the Plan A rewrite and still holds**; only the state's
   home was open.
   Two supporting facts worth keeping: `BackingTrackPlayer` uses a stub synthesizer whose
   `setupMetronomeChannel` is an **empty method** (`alphaTab.core.mjs:50665`), and count-in is worse
   than silent — it still runs `sequencer.startCountIn()` and a real seek, so you get a dead pause
   with no click.
2. **`useAlphaTab` (L2-NEW-1).** The hook is **not** a package export — `@coderline/alphatab` 1.8.4
   and the 1.9.0 alpha ship no React integration (`exports`: `.` `./webpack` `./vite`
   `./soundfont/*` `./font/*`; `@coderline/alphatab-react` is E404). It is the fork's own
   `~/Sites/alphaTabWebsite/src/hooks.ts`, written by alphaTab's author for the docs site. Its
   settings callback receives `alphaTab.Settings`, **not** the api.

## Verification notes for the next lap

- **Re-verify AlphaTab claims against 1.8.4.** Lap 2's reviewers used the 1.8.1 copy in the fork; this
  repo pins 1.8.4 (`web/package.json:13`), installed at
  `node_modules/.pnpm/@coderline+alphatab@1.8.4`. Everything the verifiers re-checked held against
  1.8.4, but the general gap is open.
- **Both flags the plan left open resolved in favour of the written plan**, no finding emitted:
  `NumberField.Input` does report `role="textbox"` to Testing Library, and the doubled
  `group-data-[…]` variant does compile under the installed `tailwindcss` 4.3.1. The plan's
  conditional fallbacks for both are now dead prose and can be deleted.

## State of this branch

`claude/transport-plan-review-cabd55`, branched from `spike/alphatab-nextjs-poc` at `1a24a40e`, in its
own worktree so it stops sharing one with other sessions — the collision the lap-1 handoff documented
twice. Committed, lefthook green, pushed. **It is now behind `origin/spike/alphatab-nextjs-poc`
(`eaa8834c`) by 17 commits** — merge or rebase before the next lap, and re-run the stale check above.

## How to resume

1. Merge `origin/spike/alphatab-nextjs-poc` into this branch.
2. Read `triage.STALE_WARNING` in the findings artifact and re-verify the eleven Plan-A-dependent
   findings — **start with L2-04**, which is applied and probably now wrong.
3. Then either continue the triage half on the `client/`-only findings, which need no re-verification,
   or run a fresh lap-3 review half now that Plan A has settled.
