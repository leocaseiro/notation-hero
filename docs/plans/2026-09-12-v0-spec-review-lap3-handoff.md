---
lap: 2
last_applied: P1
---

# v0 spec review — handoff for lap 3

|              |                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| **Date**     | 2026-09-12                                                                                                   |
| **Artifact** | [`docs/specs/2026-09-10-v0-local-file-player-design.md`](../specs/2026-09-10-v0-local-file-player-design.md) |
| **Worktree** | `.claude/worktrees/alphatab-spike`, branch `spike/alphatab-nextjs-poc` (nothing pushed)                      |
| **Loop**     | `spec-triage-loop` → `doc-review-loop`, review engine `compound-engineering:ce-doc-review`                   |
| **State**    | laps 1 and 2 reviewed, decided and applied. **Lap 3 is next.** Lap cap 5.                                    |
| **Epic**     | [NH-291](https://leocaseiro.atlassian.net/browse/NH-291)                                                     |

Laps 1 and 2 ran in one session. This file carries everything lap 3 needs, so the new session does
not re-litigate settled questions.

## 1. How to run lap 3

1. Read `/Users/leocaseiro/Sites/spec-triage-loop/skills/_shared/review-loop.md` (loop shape) and
   `/Users/leocaseiro/Sites/spec-triage-loop/skills/triage/SKILL.md` (how to ask). The person decides
   every finding through a picker, three per round, with chunks written in the same message.
2. **Review.** Classify the artifact as `plan` with origin `none`. Dispatch the six reviewers
   (`coherence`, `feasibility`, `product-lens`, `design-lens`, `scope-guardian`, `adversarial`) as
   separate read-only subagents. Build each prompt from the skill's own template — read
   `references/subagent-template.md`, take the block between its fence markers, and fill the slots
   `{persona_file}` (from `references/personas/<name>.md`), `{schema}`
   (`references/findings-schema.json`), `{document_type}` = `plan`, `{document_path}`,
   `{origin_path}` = `none`, `{settled_ktds}` = section 4 below, `{decision_primer}` = section 3
   below, `{document_content}` = the whole artifact. Tell each reviewer the worktree root, so it
   checks this checkout and not the primary one. Model tiering: cheapest tier for coherence,
   mid-tier for design-lens and scope-guardian, inherit for the rest.
3. **Verify before showing anything:** the finding cites a section that exists, every quote is
   verbatim, and the proposed fix does not contradict another section. Drop what fails and say why.
4. **Triage, apply, commit** each round, then update `lap` / `last_applied` in the artifact
   frontmatter.
5. **Bound:** halt and hand back at lap 5, or when a lap's findings are not a strict subset of the
   previous lap's. Lap 2 already hit that second condition, and the person chose to continue.

There is no cross-model pass: only the `claude` CLI is installed on this machine.

## 2. What the two laps changed

Lap 1 (19 decisions) settled the shape: offline out of v0, catalog paused and recorded in the
decision registry, clean-room porting, drum-track selection, accepted formats from the prototype,
failure states, the regression-test lane, the export prerequisite, the payload correction. Lap 2 (10
decisions) trimmed it further: no PWA at all, the file picker inside the player, two popovers instead
of a modal, AlphaTab-native transport toggles, and two corrections to review output from lap 1.

## 3. Decision primer for lap 3

Paste verbatim into each reviewer's `{decision_primer}` slot.

```text
<prior-decisions>
Round 1 — applied (19 entries):
- Success criteria: "Offline criterion has no design" (feasibility, 100) — applied as: offline moved out of v0.
  Evidence: "The app installs as a PWA and the player works offline."
- Decisions D4: "Port conflicts with the recorded clean-room license rule" (adversarial, 75)
  Evidence: "**Port** the `rhythm-game` prototype rather than only referencing it"
- Architecture: "Failure paths for bad files and unknown ids undefined" (feasibility, 100)
  Evidence: "On open, the buffer is written to IndexedDB under a generated id"
- Data flow: "Multi-track charts render track 0, not the drums" (feasibility, 100)
  Evidence: "→ alphaTab api.load(buffer)"
- Regression test: "Worker-path test has no harness in web/" (coherence, 100)
  Evidence: "v0 must carry a test that asserts the worker path is live"
- Component plan: "Listed components are not importable from web/" (feasibility, 100)
  Evidence: "The design system is already wired in and working"
- Component plan: "Criterion 3 controls missing (tempo, mixer)" (coherence, 100)
  Evidence: "Tempo and per-track mute/solo work."
- Non-goals / Roadmap: "Catalog-first order reversed without a record" (product-lens, 75)
  Evidence: "**No catalog.** Nothing to browse — you bring the file."
- Mounting AlphaTab: "Lifecycle proof measured on variant A only" (adversarial, 75)
  Evidence: "Verified against React 19 strict mode"
- Component plan / Roadmap: "The practice work has no roadmap slot" (product-lens, 75) — applied as: v0 uses AlphaTab's native A-B repeat.
  Evidence: "the markers land with the practice work"
- Architecture: "Accepted file formats unstated" (product-lens, 100) — applied as: the prototype's exact picker list.
  Evidence: "A `.gp5` drum chart opened from local disk renders as standard drum notation."
- Payload budget: "Budget omits the icon font" (adversarial, 100)
  Evidence: "PWA precache floor ≈ 870 KB compressed."
- Non-goals: "Settings gear and MIDI icon not hidden" (design-lens, 75) — later partly reversed: the gear is visible again and opens the settings popover.
  Evidence: "The mockup's **scoring HUD** and **practice/game rail** render hidden"
- AlphaTab integration: "A value import re-bundles the library" (feasibility, 75)
  Evidence: "option A (the `@coderline/alphatab-webpack` plugin, as the prototype used)"
- Decisions D7 / Success criteria: "Android is a ship target but never tested" (adversarial, 75) — applied as: desktop Chrome is the gate, devices are non-blocking.
  Evidence: "Chrome and Android are enough for a first ship."
- Architecture: "No screen-size target named" (design-lens, 75) — applied as: tablet landscape per player-app-ui.md.
  Evidence: "Chrome and Android are enough for a first ship."
- AlphaTab integration: "Vendoring skips dev; committed copies conflict" (feasibility, 75)
  Evidence: "Vendoring runs as a prebuild step so it is never a manual chore:"
- Architecture: "Route handoff replaced - no id" (user-directed)
  Evidence: "then `/` navigates to `/play?id=<id>`"
- v0.1 settings doc: "Stale after the popup decision" (orchestrator)
  Evidence: "v0 ships with **no settings dialog** — only a theme toggle"

Round 1 — rejected (2 entries):
- Component plan: "Recent-files list missing from the plan" — Skipped because recent files are out of v0 ("select file and load file, nothing else"); the doc lists it as a non-goal.
  Evidence: "the same IndexedDB write already backs the recent-files list."
- Architecture: "Reading ?id= needs a Suspense boundary" — Withdrawn because the id was removed entirely.
  Evidence: "then `/` navigates to `/play?id=<id>`"

Round 2 — applied (11 entries):
- Success criteria / Component plan: "PWA install has no v0 work item" (feasibility, 100) — applied as: PWA removed from v0 completely (criterion, non-goal wording, title, precache framing); install and offline are one later milestone.
  Evidence: "4. The app installs as a PWA."
- AlphaTab integration: "Claimed lint guard against value imports does not exist" (feasibility, 100)
  Evidence: "`web/eslint.config.mjs` enforces this with `@typescript-eslint/no-restricted-imports`"
- Regression test: "Test cannot distinguish worklet audio from fallback" (adversarial, 75)
  Evidence: "It asserts that `Environment.webPlatform` is `BrowserModule`"
- Non-goals / Architecture: "No way to open a different file from /play" (design-lens, 75) — applied as: the picker lives in the player and replaces the loaded chart in place.
  Evidence: "A reload on `/play` has nothing to load, so it redirects to `/`"
- Architecture: "No visual design reference for the drop-zone screen" (design-lens, 75) — resolved by making `/` a landing Play button, so there is no drop-zone screen.
  Evidence: "**Design mockup** | [`docs/mockups/player-flatrow-teal.html`]"
- Component plan: "Dialog and Accordion do not exist in the design system" (feasibility, 75) — superseded the same lap: popovers reuse the existing `Popover`, so only `Accordion` is new.
  Evidence: "a **player-controls popup** — Base UI `Dialog` + `Tabs` + `Accordion`"
- Failure states: "No loading state for /play's initial engine load" (design-lens, 75) — applied with a progress indicator driven by the soundFontLoad event.
  Evidence: "Engine or SoundFont download fails | An error message in place of the disabled Play button"
- Non-goals / Component plan: "Metronome, Count-In and Loop have no v0 disposition" (scope-guardian + design-lens, 100) — applied as: all three ship through AlphaTab's own properties; the A-B marker UI and its sync are not planned.
  Evidence: "the transport row layout, a playback scrubber"
- Component plan: "Tempo slider's 1% floor is below AlphaTab's supported range" (feasibility, 75)
  Evidence: "a 1–200% slider that snaps to 100%"
- Component plan: "Player-controls popup's default active tab is unspecified" (design-lens, 75) — applied as: two popovers, no tabs; Settings on the header gear with the prototype's full option set, Tracks on the transport button.
  Evidence: "opened from the mockup's \"Tracks / mixer\" button"
- Architecture: "What /play shows before a file is open" (orchestrator question) — applied as: empty notation area, large Open-file action, drag-and-drop anywhere, transport disabled.
  Evidence: "| `/play` open with no file yet |"

Round 2 — rejected (1 entry):
- Architecture / Accepted files: "Drum detection verified only on Guitar Pro formats" — Skipped because AlphaTab is trusted here; a real bug would be raised upstream instead.
  Evidence: "→ pick the drum tracks (any staff with isPercussion)"
</prior-decisions>
```

## 4. Settled decisions for lap 3

Paste into `{settled_ktds}`. A preference for a different choice is advisory only (`manual`, anchor 50) unless there is evidence the decision cannot work.

- **D1–D7 as written in the spec**, with two clarifications already applied: D4 is a clean-room port
  (fork open for reference, no files copied), and D7 means desktop Chrome is the v0 gate while iPad
  and Android get manual, non-blocking checks.
- **No PWA in v0** — no install, no offline. Both are one later milestone.
- **No recent-files list**, no history, nothing stored on disk.
- **No id in the URL.** Two routes stay: `/` is a landing Play button, `/play` is the player. The
  file is opened inside the player and replaces the loaded chart in place.
- **A–B repeat is AlphaTab's native range selection** plus the transport's Loop toggle. No custom
  marker UI, no marker/selection sync.
- **Accepted formats come from the prototype's picker list** (`.gp,.gp3,.gp4,.gp5,.gpx,.musicxml,`
  `.mxml,.xml,.capx`); raw MIDI is a non-goal.
- **Two popovers, never modals:** Settings on the header gear (accordion sections, the prototype's
  full option set, colors as text inputs for now) and Tracks on the transport button. `Popover`
  already exists; `Accordion` is the only new design-system component.
- **Loop, Metronome and Count-In ship in v0** through AlphaTab's own `isLooping`, `metronomeVolume`
  and `countInVolume`.
- **Tempo** is `playbackSpeed` shown as BPM, floor 12.5% (AlphaTab's documented minimum).
- **Drum-track rule:** render only staves reporting `isPercussion`; every track stays audible.

## 5. Open items — not new findings

Already surfaced and left open on purpose. Lap 3 should not re-raise them as if fresh:

- Multi-file drag-and-drop behaviour is unspecified.
- The icon font shrinks by subsetting, not compression.
- When the web test lands, add `web/playwright-report/` and `web/test-results/` to the CI e2e upload
  paths.
- `web/public/alphatab/**` is git-tracked: a `.gitignore` line alone will not untrack it, so the
  switch to generated output needs `git rm --cached`.
- "A pre-step of the `dev` and `build` scripts" is fragile if it means npm lifecycle scripts; an
  explicit chain inside each script sidesteps the question.
- Cache headers for the vendored engine files are unmeasured.
- The Q1 listening check is nearly free today: serve the spike route with a production build and
  listen.
- Open questions the spec itself records: Q1 (nobody has heard the audio), Q2 (Vercel compression and
  MIME types), Q3 (worklet versus fallback, now due at v0 acceptance), Q4 (untested browsers), Q5
  (drum tablature).
- Unanswered from the reviewers: does `playbackSpeed` clamp out-of-range values; should the web test
  lane share the client's browser cache; what format is the acceptance chart in criterion 5.

## 6. Corrections already made to review output

So lap 3 does not "discover" them as new:

- The spec briefly claimed an ESLint guard that does not exist. It now reads as v0 work on the
  `@typescript-eslint` extension rule, with the existing `@/*` group folded in.
- The regression test's first specification passed even on the silent fallback path. It now asserts
  the audio-worklet file is requested before playback.
- A lap-1 finding assumed Android meant phone-width layouts. The project's player design doc sets
  tablet-first landscape, so the fix was narrowed to naming that target.

## 7. Where things are

- Artifact: `docs/specs/2026-09-10-v0-local-file-player-design.md` (frontmatter carries `lap` and
  `last_applied`).
- Companion spec kept in step: `docs/specs/2026-09-11-v01-settings-panel-design.md`.
- Decisions recorded: the 2026-09-12 entry in `docs/decisions/decision-registry.md`, plus the
  refreshed "Current direction" snapshot in `AGENTS.md`.
- Prior art for technical questions: the `rhythm-game` branch of the local alphaTab fork. Read it
  with `git grep` and `git show`; never copy files (it is MPL-2.0, this repo is not).
