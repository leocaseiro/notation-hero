---
lap: 3
last_applied: P1
---

# v0 spec review — handoff for lap 4

|              |                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| **Date**     | 2026-09-12                                                                                                   |
| **Artifact** | [`docs/specs/2026-09-10-v0-local-file-player-design.md`](../specs/2026-09-10-v0-local-file-player-design.md) |
| **Worktree** | `.claude/worktrees/alphatab-spike`, branch `spike/alphatab-nextjs-poc` (pushed)                              |
| **Loop**     | `spec-triage-loop` → `doc-review-loop`, review engine `compound-engineering:ce-doc-review`                   |
| **State**    | laps 1–3 reviewed, decided and applied. **Lap 4 is next — full, all six reviewers.** Lap cap 5.              |
| **Epic**     | [NH-291](https://leocaseiro.atlassian.net/browse/NH-291)                                                     |

Supersedes [`2026-09-12-v0-spec-review-lap3-handoff.md`](2026-09-12-v0-spec-review-lap3-handoff.md),
which is kept for reference. Read this file instead.

## 1. How to run lap 4

Identical to lap 3's procedure (§1 of the lap-3 handoff), with §3 and §4 below replacing its primer
and settled list. In short: classify as `plan` with origin `none`; dispatch the six reviewers
(`coherence`, `feasibility`, `product-lens`, `design-lens`, `scope-guardian`, `adversarial`) as
separate read-only subagents built from the skill's own `references/subagent-template.md`; verify
every finding before showing it (section exists · quote verbatim · fix does not contradict another
section); triage three per picker; apply, commit, bump `lap`.

**Why lap 4 runs even though the bound tripped.** The loop halts when a lap's findings are not a
strict subset of the previous lap's, and lap 3's were almost entirely new — the second lap in a row.
leocaseiro chose to continue anyway, for a specific reason: **about a third of the spec's current
text was written during lap 3 and has had zero review passes.** Lap 4 is aimed at that new prose —
the package split, the two loading affordances, the replace flow, criteria 5–7, the fixtures section
— not at re-testing the 46 settled decisions.

There is no cross-model pass: only the `claude` CLI is installed on this machine.

## 2. What the three laps changed

Lap 1 (19 decisions) settled the shape: offline out of v0, catalog paused, clean-room porting,
drum-track selection, accepted formats, failure states, the regression-test lane, the export
prerequisite. Lap 2 (10) trimmed it: no PWA at all, the picker inside the player, two popovers
instead of a modal, AlphaTab-native transport toggles. Lap 3 (17) corrected facts and closed gaps —
the replace flow, the no-drum fallback, a second new component, the package split, settings
persistence, tempo placement, three more acceptance criteria, a shipped sample chart.

## 3. Decision primer for lap 4

Paste verbatim into each reviewer's `{decision_primer}` slot.

```text
<prior-decisions>
Rounds 1-2 — see the lap-3 handoff for the full 29 applied and 3 rejected entries. The settled list
in section 4 below carries their surviving outcomes, which is what matters for review.

Round 3 — applied (17 entries):
- Architecture / Failure states: "Failure-state row sends a bad file back to /" (design-lens + feasibility, 100) — applied as the full replace flow: native window.confirm(), cancel keeps the current chart, confirm stages the load so a corrupt replacement leaves the playing chart intact, and the toast keeps the user on /play.
  Evidence: "Sonner toast; stay on `/`"
- Architecture / Data flow: "Empty drum-track list makes AlphaTab render track 0" (feasibility, 100) — applied INVERTED: the track-0 fallback is wanted, not a bug. No drum staff is not an error, the "no drum track" failure row was deleted, and a guitar or piano chart now opens and plays.
  Evidence: "→ api.renderScore(score, drumTrackIndexes)"
- Component plan: "No single-value Slider exists; Accordion is not the only new component" (feasibility, 100) — applied: Accordion AND a single-value Slider are the new design-system components.
  Evidence: "`Accordion` is the only new design-system component"
- AlphaTab integration / Regression test: "Fallback-logs-nothing claim is false" (adversarial, 75) — applied: the debug line is the discriminator, the before-playing ordering was dropped, Q3 records the spike-probe instrumentation gap.
  Evidence: "The worklet request is the one assertion the ScriptProcessor fallback cannot pass: it logs nothing and never fetches that file."
- AlphaTab integration / Component plan: "Settings rows need AlphaTab enum values the type-only rule forbids" (feasibility + adversarial, 100) — applied: the awaited namespace object is the only runtime source of AlphaTab values, shared with consumers via React context.
  Evidence: "Import `@coderline/alphatab` only with `import type`."
- Component plan / Deferred: "Native range selection is mouse-only on the tablet target" (adversarial, 75) — applied: A-B RANGE repeat is desktop-only in v0, superseding player-app-ui.md D-5. The Loop toggle is unaffected.
  Evidence: "v0 uses AlphaTab's native range selection instead: select bars in the notation"
- Component plan: "New player components have no package home or a11y/VR gate" (design-lens + feasibility, 100) — applied: split by reusability (controls to client/, AlphaTab-aware composition to web/), plus an axe check added to the new web Playwright lane.
  Evidence: "It needs a Storybook story plus the VR and a11y baselines that block merge"
- Component plan: "Settings-row reusable controls duplicate already-built components" (scope-guardian, 75) — applied: the rows compose built Checkbox/Input/NativeSelect/Slider plus Field's horizontal orientation; only the accessor schema is new.
  Evidence: "Build the rows from one small set of reusable controls"
- Component plan: "Settings values have no stated lifetime" (product-lens, 75) — applied: one localStorage key; §4's absolute "nothing is stored" narrowed to the chart.
  Evidence: "**No recent-files list.** You pick a file each time; v0 keeps no history."
- Success criteria: "Half the v0 build has no success criterion" (coherence + product-lens + adversarial, 100) — applied as criteria 5, 6 and 7.
  Evidence: "3. Tempo and per-track mute/solo work."
- Non-goals / Component plan: "Header BPM control conflicts with the transport tempo control" (design-lens, 75) — applied: tempo lives in the HEADER per the mockup and player-app-ui.md; Auto-Speed is v0.2 because it is a practice feature.
  Evidence: "the transport's **tempo control**"
- Architecture / Success criteria: "No chart ships with v0" (product-lens, 75) — applied: web/public/charts/1-beat.gp ships as the sample behind a "Load the sample beat" action, test fixtures live in web/e2e/fixtures/ covering 6 of 9 accepted extensions, and Q6 records the 3 missing.
  Evidence: "4. leocaseiro loads **his own** chart and it plays."
- Failure states: "No loading indicator when replacing an already-open chart" (design-lens, 75) — applied as toast.loading() through the built Sonner, NOT a Skeleton: the staged load keeps the outgoing chart playable, so covering it would hide working content.
  Evidence: "the first visit fetches about 1.6 MB of engine, soundfont and font"
- Failure states / While it loads: "Progress indicator covers the soundfont, not the 1.6 MB load" (feasibility + adversarial, 75) — applied: Skeleton covers the engine import and fonts, the soundFontLoad bar covers the soundfont only (302 KB).
  Evidence: "`/play` shows a progress indicator driven by AlphaTab's `soundFontLoad` event"
- Component plan / Roadmap: "v0.1 reuse claim does not hold for the engine-option settings" (product-lens, 75) — applied NARROWED by user direction: the prototype's groups stay exactly as they are, there is NO Advanced section, and MIDI becomes a new tab in a later version. Also settles S1 in the companion v0.1 design.
  Evidence: "Categories will be drum-specific (audio, MIDI, notation, practice)."
- AGENTS.md snapshot: "Current direction still says v0 installs as a PWA" (orchestrator-verified, 100) — applied outside the spec, in AGENTS.md.
  Evidence: "v0 installs as a PWA but needs a network"
- Failure states: "Engine-load failure path cannot fire as written" (adversarial residual, orchestrator-verified, 100) — applied: the row is now two rows. The engine import is caught by the mount component's own try/catch (api.error cannot see a rejection that precedes AlphaTabApi); the SoundFont comes through AlphaTab's error event.
  Evidence: "Engine or SoundFont download fails | An error message in place of the disabled Play button"

Round 3 — rejected (4 entries):
- Architecture / Accepted files: "Two committed charts were copied from the MPL-2.0 fork, against D4" — Withdrawn because leocaseiro states he authored those charts himself, so there is no licensing issue. Do not re-raise.
  Evidence: "**Test charts** ported from the prototype fork"
- Component plan: "Group the engine settings under an Advanced section" — Dropped: the user directed that the prototype's groups stay exactly as they are.
  Evidence: "Display ▸ General, Colors, Fonts, Paddings, Notation, Player, Stylesheet, Tools."
- Architecture: "Use a styled AlertDialog or Popover for the replace confirmation" — Dropped in favour of the browser's native window.confirm() for v0, explicitly "for now".
  Evidence: "**Two popovers, not modals** — neither blocks the player:"
- Decision registry: "The registry still records the Dialog + Tabs + Accordion popup shape" — Dropped in verification: that bullet is lap 1's record and the lap-2 bullet in the same entry supersedes it, which is correct for a newest-first change log.
  Evidence: "**v0 builds a player-controls popup** (Base UI `Dialog` + `Tabs` + `Accordion`)"

Round 3 — surfaced and deliberately left open (treat as DEFERRED; do not re-raise as fresh):
- The §5 Environment.webPlatform assertion has no named test hook. The player cannot value-import AlphaTab, so the value lives only inside the async closure; the spike exposed it as a data-platform attribute on a debug element.
- The settings popover is v0's largest single unit — the prototype's equivalent is ~1,280 lines, rewritten clean-room. A sizing note against the "smallest complete product" framing, not a scope change.
- D5 records no fallback if a target browser lacks module workers, though Q4 names exactly that risk.
- "BPM = chart tempo × playbackSpeed" uses Score.tempo, which AlphaTab documents as the INITIAL tempo, so the readout disagrees with playback past a tempo automation.
- alphaTab.core.mjs is imported in three contexts (main thread, render worker, audio worklet), so "shipped once" holds only while the HTTP cache serves the worker and worklet fetches.
- The web Playwright config would copy client's 180s webServer.timeout, but web's build runs with reactCompiler: true ("Babel-based, so builds are slower"). Unmeasured.
</prior-decisions>
```

## 4. Settled decisions for lap 4

Paste into `{settled_ktds}`. A preference for a different choice is advisory only (`manual`, anchor 50) unless there is evidence the decision cannot work.

- **D1–D7 as written in the spec.** D4 is a clean-room port (fork open for reference, no files
  copied); D7 means desktop Chrome is the v0 gate while iPad and Android get manual, non-blocking
  checks.
- **No PWA in v0** — no install, no offline. Both are one later milestone.
- **No recent-files list**, no history. **Settings, however, DO persist** — one `localStorage` key.
- **No id in the URL.** Two routes: `/` is a landing Play button, `/play` is the player.
- **Replacing a chart asks first** — the browser's native `window.confirm()` for v0, deliberately
  ("for now"); no `Dialog` or `AlertDialog` is built. Cancel keeps the current chart; confirm stages
  the load, so a corrupt replacement leaves the playing chart intact.
- **A file with no drum staff is NOT an error.** Drums are v0's default, not its requirement: the
  fallback is AlphaTab's default track, so a guitar or piano chart opens and plays.
- **A–B range repeat is AlphaTab's native range selection**, which is mouse-only, so it is
  **desktop-only in v0** and supersedes `player-app-ui.md` D‑5. No marker UI, no selection sync.
- **Accepted formats come from the prototype's picker list**; raw MIDI is a non-goal. Test fixtures
  cover 6 of the 9 extensions; `.gp3`, `.gp4` and `.capx` are recorded as Q6, non-blocking.
- **Two popovers, never modals** for Settings and Tracks. **`Accordion` AND a single-value `Slider`**
  are the new design-system components — `RangeSlider` is dual-thumb only.
- **The settings groups are exactly the prototype's** — Display ▸ General, Colors, Fonts, Paddings,
  Notation, Player, Stylesheet, Tools. **No Advanced section.** MIDI becomes a new tab later.
- **Loop, Metronome and Count-In ship in v0** through AlphaTab's own properties.
- **Tempo lives in the HEADER**, per the mockup and `player-app-ui.md`; `playbackSpeed` shown as BPM,
  floor 12.5%. **Auto-Speed is v0.2** — a practice feature.
- **Build items split by package:** controls to `client/` under the VR + a11y gates, AlphaTab-aware
  composition to `web/`, and v0 adds an **axe check to the new `web` Playwright lane**.
- **One sample chart ships** — `web/public/charts/1-beat.gp`, reachable from the empty state.
- **The awaited namespace object is the only runtime source of AlphaTab values**, shared with
  Settings, Tracks and Open-file through React context.

## 5. Open items — not new findings

Still open on purpose; lap 4 should not re-raise them as fresh. Multi-file drag-and-drop behaviour;
the icon font shrinking by subsetting rather than compression; `web/public/alphatab/**` needing
`git rm --cached` rather than a `.gitignore` line alone; "a pre-step of the `dev` and `build`
scripts" being fragile if it means npm lifecycle scripts; unmeasured cache headers for the vendored
engine files; the nearly-free Q1 listening check (serve the spike route from a production build and
listen); and the spec's own Q1–Q6.

Resolved since the lap-3 handoff: the CI e2e upload paths for `web/playwright-report/` and
`web/test-results/` are now recorded in §5 of the spec.

## 6. Where things are

- Artifact: `docs/specs/2026-09-10-v0-local-file-player-design.md` (frontmatter carries `lap` and
  `last_applied`).
- Companion spec kept in step: `docs/specs/2026-09-11-v01-settings-panel-design.md` (its S1 is now
  settled).
- Decisions recorded: the 2026-09-12 entry in `docs/decisions/decision-registry.md` carries laps 1–3.
- `AGENTS.md`'s "Current direction" snapshot no longer claims v0 installs as a PWA.
- Prior art for technical questions: the `rhythm-game` branch of the local alphaTab fork. Read it
  with `git grep` and `git show`; never copy files (it is MPL-2.0, this repo is not).
