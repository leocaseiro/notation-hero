---
artifact_contract: 'ce-handoff/v1'
created_at: '2026-09-16T00:00:00Z'
title: 'v0 Plan A — fork-parity triage handoff'
summary: 'Execution of the v0a plan was paused at Task 5 because the plan never ports the rhythm-game fork useAlphaTab pattern, which spec decision D4 mandates. An audit found 15 confirmed divergences; only 2 are forced by D5. This handoff explains each one so they can be triaged.'
keywords: ['nh-291', 'v0a', 'plan-a', 'alphatab', 'fork-parity', 'triage', 'handoff']
cwd: '/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/alphatab-spike'
resume_focus: 'Triage, the plan rewrite, the spec delta and the Jira issues are ALL DONE — see "Triage outcome" and "State after the triage" at the end of this file. Next: leocaseiro reviews PR #157, then regenerate the stale task briefs from the rewritten plan and re-dispatch Task 5.'
repository: 'leocaseiro/notation-hero'
branch: 'spike/alphatab-nextjs-poc'
head: 'f5359efb'
worktree_path: '/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/alphatab-spike'
---

# v0 Plan A — fork-parity triage handoff

## Why this exists

Subagent-driven execution of
[`2026-09-13-v0a-engine-and-first-sound-plan.md`](2026-09-13-v0a-engine-and-first-sound-plan.md)
reached Task 5 and was stopped by leocaseiro, who asked whether the plan uses the same AlphaTab
integration as the `rhythm-game` fork at `~/Sites/alphaTabWebsite`:

```ts
const [api, element] = useAlphaTab((s) => {});
```

It does not. `useAlphaTab` appears **zero times** in the plan's 3,666 lines.

That matters because spec decision **D4** (line 54) mandates the opposite:

> **Port** the `rhythm-game` prototype's patterns, clean-room, rather than only referencing it —
> "The integration was already solved once."

The plan ports **D5** (self-hosted ESM delivery) faithfully but not **D4** (the patterns). The spec
is the binding authority, so this is a plan-versus-spec conflict, not a matter of taste.

**Process miss to record:** the pre-flight scan compared the plan against itself and against the
spec's constraints, but never against the fork — despite a standing rule to check the fork before
any technical decision. Task 5 was already running when this was caught.

## State of the branch

|                      |                                                               |
| -------------------- | ------------------------------------------------------------- |
| Committed and clean  | Tasks 1-4 (`65107c85`, `f91c4ee5`, `58bbf923`, `f5359efb`)    |
| Reviewed             | All four, spec-compliant and approved, zero blocking findings |
| Stopped, uncommitted | Task 5                                                        |
| Open PR              | [#157](https://github.com/leocaseiro/notation-hero/pull/157)  |

**None of Tasks 1-4 touch the AlphaTab API surface**, so nothing already committed is invalidated.
Task 5 is the cheapest possible place to change shape: Tasks 6, 10, 11, 12 and 13 all consume this
API and **none are written yet**.

Salvaged from the stopped Task 5 (uncommitted, unreviewed, kept only as a starting point):
`web/lib/alphatab/engine.ts` and `web/lib/alphatab/AlphaTabEngineContext.tsx`. The loader looks
sound — type-only import, specifier in a `const`, `turbopackIgnore`, memoised via a module-scope
promise, no font wait. One thing to check against the brief: `resetAlphaTabEngineForTests()` is
marked "Not used in the app" and may be unrequested.

## Decisions already taken

| Decision                          | Answer                                                                                                                  | Date       |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------- |
| Port the fork's hook shape?       | **Yes** — `useAlphaTab` over the engine context: namespace from context, not a static import; `useRef`, not `createRef` | 2026-09-16 |
| Record the shape change?          | **Yes** — Spec Delta plus a `docs/decisions/decision-registry.md` change-log entry                                      | 2026-09-16 |
| Where do deferred divergences go? | **A new Jira issue under epic NH-291**, distinct from the NH-298 v0 deferrals                                           | 2026-09-16 |

## How the audit was run

A 21-agent workflow read the fork, the plan's briefs and the spec in parallel, synthesised a
divergence list, then **adversarially verified each one** — with verifiers instructed to be strict
about the difference between "impossible under D5" and "merely a design choice", because an
over-generous "forced" verdict would misinform this triage.

Result: **16 candidates, 15 confirmed, 1 refuted.** Only **2** are genuinely forced by D5.

The verification also corrected the first-pass claims: the hook is used by **12** fork components
(not 9), and one component (`ExternalMediaSample`) deliberately constructs its API inline — so the
fork itself keeps an escape hatch for the case the plan uses everywhere.

---

# Group A — the plan is already right (no action)

These are recorded so that "port the prototype's patterns" is not misread as porting its warts.

## F-A1 · DIV-16 · `useRef`, not `React.createRef()`

The fork does `const element = React.createRef<HTMLDivElement>()` in a render body
(`hooks.ts:13`), which creates a fresh ref on every render. The plan uses `useRef`. Spec line 228
names this fork behaviour explicitly as one to reject. **Keep the plan's version.**

## F-A2 · DIV-11 · Staged parse, not `api.load(bytes)`

The plan parses with `ScoreLoader.loadScoreFromBytes` off the namespace first, then hands the model
to the live API via `renderScore`. The fork calls `api.load(bytes)`. **Keep the plan's version** —
`api.load()` clears a playing score on a corrupt replacement, which spec section 4 forbids.

## F-A3 · DIV-14 · Namespace via context (forced by D5)

Type-only import plus a context-supplied namespace, every runtime value read off it. This is what
"forced by D5" actually looks like: one mechanism, not a licence to drop the fork's hooks.

## F-A4 · DIV-15 · Vendor-copy script, not a bundler plugin (forced by D5)

The spec mandates this. Worth carrying one piece of fork knowledge forward as a hazard note: the
fork's worker-chunking warning is the same failure class as spec section 5 lines 287-291 — notation
still renders, only playback dies.

---

# Group B — HIGH severity, not forced by D5

## F-B1 · DIV-1 · No mount hook

**What's wrong.** The fork has one hook that is the only way any component creates an API:
`useAlphaTab(settingsInit) -> [api, elementRef]` (`hooks.ts:6-59`). Twelve components use it; each
call site is a single line. The `settingsInit` argument is a **mutator callback** precisely so it
runs inside the mount effect, where refs are non-null.

The plan has no hook. `new engine.AlphaTabApi(host, settings)` and `api?.destroy()` sit inline in
`NotationSurface`'s single `useEffect`, whose body is roughly 85 lines carrying settings
construction, a `document.fonts` listener, focus management, a 60-second timeout, two `.on()`
subscriptions and cleanup.

**Proposed fix.** Add `web/lib/alphatab/useAlphaTab.ts` exporting
`useAlphaTab(settingsInit) -> [api, elementRef]`, which reads `useAlphaTabEngine()` internally and
constructs with `new engine.Settings()` / `new engine.AlphaTabApi(host, settings)`. `NotationSurface`
becomes a consumer of it.

**Why it works.** The tuple return, the mutator callback, and cleanup-on-unmount are all untouched
by D5 — only the namespace's source changes. One adjustment the fork cannot give us: the effect's
deps become `[engine]` rather than `[]`, because the namespace now arrives asynchronously.

**Already decided: yes.** Listed here for completeness.

## F-B2 · DIV-2 · No typed event hook, and no `.off()` anywhere

**What's wrong.** The fork derives event names as a checked literal union from a mapped type
(`hooks.ts:61-67`) and consumes it with `useAlphaTabEvent(api, event, handler, deps?)`, which pairs
every `.on()` with an `.off()` on cleanup (`hooks.ts:69-81`). Handler argument types are inferred;
`api` may be undefined so call sites need no guard.

The plan has no helper and no types. Four hand-written subscriptions across **two different
mechanisms**: `api.error` and `api.renderFinished` inside `NotationSurface`'s mount effect;
`playerStateChanged`, `soundFontLoaded` and later `playerPositionChanged` inside `Player`'s
`handleApiReady`. **Zero `.off()` calls exist in any of the 14 briefs** — teardown relies entirely
on `api.destroy()`.

**Proposed fix.** Port `AlphaTabApiEvents` and `useAlphaTabEvent` alongside the mount hook, and
route all five subscriptions through it.

**Why it works.** Three concrete costs disappear. Event names and handler signatures become
compile-checked, so a misspelled event name stops being a silent runtime `undefined` and a wrong
handler signature stops compiling. Adding a consumer stops meaning "edit another task's effect
body" — Task 10 already reaches into Task 6's `renderFinished` closure. And unsubscribe discipline exists before it is needed: the spec's Tracks
and Settings rows are **conditionally-mounted popovers** whose handlers must unsubscribe on close,
and today there would be no pattern to copy.

## F-B3 · DIV-3 · The `onApiReady` dep list can destroy a loaded score

**What's wrong.** The API handle is stored in **two independent refs** — one in `NotationSurface`,
one in `Player` — kept in sync only by an `onApiReady(api)` callback prop. That callback is in the
mount effect's dependency list:

```ts
}, [engine, onApiReady]);   // task-6-brief.md:258
```

The first consumer whose `handleApiReady` must close over changing state (a track list, the open
notation, a settings object) changes the callback's identity, which re-runs the effect, calls
`api.destroy()` and constructs a fresh `AlphaTabApi` — discarding the loaded score, the downloaded
soundfont and both workers, on a plain state change.

Consumers also hand-roll two different access idioms: `const api = apiRef.current; if (!api …)`
versus `if (wasPlaying) api?.play();`.

**Proposed fix.** Follow the fork: one owner holds the API in `useState` and passes it **down as a
non-optional prop** to conditionally-mounted children. Drop the second ref and the `onApiReady`
callback.

**Why it works.** The undefined window is absorbed once, at the top — in the fork, not a single
child carries `api?.` or a null branch. Removing the callback removes it from the dep list, so the
foot-gun cannot fire. The spec names three API consumers beyond the surface; each one added through
the callback increases the pressure.

---

# Group C — MEDIUM severity, not forced by D5

## F-C1 · DIV-4 · No shared settings-defaults stage

**What's wrong.** The fork has three stages in fixed order: construct `Settings`, apply
`setAlphaTabDefaults(settings, colorMode)`, then the per-call-site `settingsInit`. The defaults
function centralises everything identical across instances — font directory, soundfont, log level,
and the full sans/serif family stack.

The plan has one stage: ten direct assignments inline in the mount effect.

**Proposed fix.** Extract a `setAlphaTabDefaults(settings)` module next to the hook and call it
before `settingsInit`.

**Why it works.** The "shipped defaults" that the spec's localStorage restore merges against (lines
505-507) currently have no home — they are assignments buried in a closure, unreachable both by the
restore code and by the Fonts/Colors groups that need a baseline to reset to. The font-family stack
is also lost today, so AlphaTab's title and marker text renders in whatever family it picks rather
than the product's — a mismatch that only surfaces once real scores with metadata load.

## F-C2 · DIV-5 · No separate scroll viewport

**What's wrong.** The fork uses two divs, with the scroll viewport **outside** the AlphaTab
container, and points `player.scrollElement` at the outer one. The inner div is entirely
AlphaTab-owned.

The plan uses one div for everything: the AlphaTab render target is also the scroll box, the
`role="region"` landmark, the `tabIndex={0}` focus target and the `focus-visible:ring` host.

**Proposed fix.** Split into an outer viewport div (overflow, height, a11y attributes, focus ring)
and an inner AlphaTab-owned div, with `scrollElement` pointing at the outer.

**Why it works.** AlphaTab owns and rewrites its container's children and sets `position`,
`overflow` and size on its own surface. Coupling app-level a11y markup to that element means any
future AlphaTab styling change lands on the app's scroll box. The fork's `scrollOffsetY = -10` is
also lost, so the playback cursor sits flush against the top edge.

## F-C3 · DIV-6 · No `updateSettings()` funnel

**What's wrong.** The fork has one function owning the mutate then update then render sequence for
every settings control, with the API reaching controls through a settings context.

In the plan, **no `updateSettings()` call exists in any brief**. Settings are constructed and
mutated only inside `NotationSurface`'s mount-effect closure, so no other component can read or
write them.

**Proposed fix.** Establish the funnel when the hook lands, even if v0 has only one caller.

**Why it works.** The spec's tempo control (header) and Player group (Settings popover) must stay in
sync over the same `playbackSpeed`, and Transpose Full must reach
`settings.notation.transpositionPitches` from a Tracks-popover row. Neither can reach `settings`
today. Building them later means either a second sharing mechanism on top of `onApiReady`, or
retrofitting the API into context — a change to `NotationSurface`'s mount contract _after_ Tasks
6-13 are all written.

## F-C4 · DIV-7 · Playback position is state on the topmost component

**What's wrong.** The plan puts `const [positionMs, setPositionMs] = useState(0)` in `Player`, the
outermost client component, fed by `playerPositionChanged`. Nothing is memoised, and `Player`
renders both `NotationSurface` and the transport — so **every position event re-renders the entire
player subtree**.

The fork keeps transport state in a leaf component with a second-granularity throttle. Its source
carries the lesson as a comment: tick-driven logic runs inside the event callback, **not** in React
effects triggered by state, which "eliminates ~60 React re-renders/second".

**Proposed fix.** Move `positionMs` into the transport leaf, or mirror it into a ref and update the
DOM attribute directly.

**Why it works.** This is precisely the shape the fork measured and abandoned. At first sound it
costs only reconciliation — but notation-hero **is** a rhythm game, and the spec's scrubber plus any
tick-driven overlay attach to this same state. Retrofitting later means moving `positionMs` out of
`Player`, which changes the `player-status` contract that Tasks 7, 10, 11 and 13 all assert against.

## F-C5 · DIV-8 · No theme path for dark mode

**What's wrong.** The fork bakes the theme listener into the creation hook, so no component has to
remember it: on colour-mode change it re-applies colours, calls `updateSettings()` and re-renders.
Light mode restores from a snapshot of AlphaTab's own defaults, so it tracks upstream.

The plan sets no colours at all and pins the surface to a literal `bg-white`. The brief is candid
about it: "deliberately NOT a token … this is the one place in the player that pins a literal
colour; it stops being correct the moment the glyph colour becomes themeable".

**Proposed fix.** Port the colour-application effect into the hook, with the fork's snapshot idiom
for light mode.

**Why it works.** A hard-coded white panel in a themed app is a visible seam in dark mode, and the
spec's Colors group makes themeable glyphs inevitable. The snapshot idiom — restore from
`new Settings().display.resources` rather than hard-coded hex values — is also the natural reset
behaviour that Colors group will need.

---

# Group D — LOW severity, not forced by D5

## F-D1 · DIV-10 · Only the boolean `soundFontLoaded`, not `soundFontLoad` progress

The plan subscribes completion only, feeding a boolean that gates the Play button. Spec section 4
describes a progress indicator with two numeric edge cases (`total === 0` when there is no
`Content-Length`; `loaded > total` under compression). Wiring it later means another edit to
`handleApiReady`. Low now because the progress bar is a later plan and it is a short wait.

## F-D2 · DIV-12 · No debug handle on the DOM node

The fork sets `element.at = api` for console and test access. The plan routes all debuggability
through `data-` attributes, of which it already has four, each needing its own task edit. One
`host.at = api` would let Playwright and the console read anything on the API directly.

## F-D3 · DIV-13 · No asset-path helper

Three bare absolute literals (`/alphatab/font/`, `/alphatab/soundfont/sonivox.sf3`,
`/notation/1-beat.gp`) plus the loader's URL. Genuinely low: Next.js on Vercel serves from the
domain root, so the fork's `basePath` problem does not exist here. The residual cost is that these
paths are duplicated between `scripts/vendor-alphatab.mjs`, which writes them, and the mount effect
plus loader, which read them.

---

# Refuted

## DIV-9 · No `useEffectNoMount` / seed-from-model idiom

Raised in the first pass and **refuted** under adversarial verification. No action.

---

# What to decide

For each finding in Groups B, C and D: **apply in the Task 5/6 rewrite**, **defer to the new Jira
issue under NH-291**, or **drop**.

Group A needs no decision — it records where the plan is already correct.

Suggested starting point, offered as a recommendation and not a decision:

- **Group B (F-B1, F-B2, F-B3)** — apply. All three live in the same code, and F-B3 is a latent bug
  that discards a loaded score on an ordinary state change.
- **Group C** — F-C2 and F-C4 have the strongest v0 arguments (an a11y coupling, and a re-render
  shape the fork measured and abandoned in exactly this kind of app). F-C1, F-C3 and F-C5 are mostly
  about what Plans B and C will need.
- **Group D** — defer.

## After triage

1. Rewrite the Task 5 brief, and the affected parts of Task 6, around whatever is approved.
2. Write the Spec Delta plus the `decision-registry.md` change-log entry (already approved).
3. File the new Jira issue under epic **NH-291** for everything deferred, with enough context on each
   item to act without this document.
4. Re-dispatch Task 5, then continue the task loop from Task 6.

The ledger at
`.superpowers/sdd/2026-09-13-v0a-engine-and-first-sound-plan/progress.md` carries the full execution
record, including every ruling made so far.

---

# Triage outcome — decided 2026-09-18 (NH-291)

Every finding above is now triaged. Two decisions taken during the triage change the plan's shape
beyond the finding list, so read those first — several findings only make sense in their light.

## The dispositions

| Finding                                  | Disposition                     | Note                                                       |
| ---------------------------------------- | ------------------------------- | ---------------------------------------------------------- |
| F-B1 · DIV-1 mount hook                  | **Apply**                       | Decided 2026-09-16, before this triage                     |
| F-B2 · DIV-2 typed event hook + `.off()` | **Apply**                       | All five subscriptions route through it                    |
| F-B3 · DIV-3 one API owner, passed down  | **Apply**                       | Both `apiRef`s and `onApiReady` are deleted                |
| F-B3a mount shape (new question)         | **Upstream's shape**            | Host always mounted; API built once per page visit         |
| F-C1 · DIV-4 shared defaults stage       | **Apply**                       | Structure only; the 16-line font-family stack → Jira       |
| F-C2 · DIV-5 separate scroll viewport    | **Apply**                       | Outer viewport owns a11y + scroll; inner div is AlphaTab's |
| F-C3 · DIV-6 `updateSettings()` funnel   | **Defer → Jira**                | No caller in Plan A; F-B3 removes the retrofit cost        |
| F-C4 · DIV-7 playback position state     | **Superseded**                  | No playhead state anywhere — see below                     |
| F-C5 · DIV-8 dark-mode colour path       | **Defer → Jira**                | `web/` has no theme source; v0 renders light only          |
| F-D1 · DIV-10 `soundFontLoad` progress   | **Defer → Jira**                | The progress bar is Plan B; two lines then                 |
| F-D2 · DIV-12 debug handle on the host   | **Apply, including production** | leocaseiro wants to inspect a live player in DevTools      |
| F-D3 · DIV-13 asset-path helper          | **Defer → Jira**                | The new playback test catches a wrong path in CI           |
| Group A (F-A1 … F-A4)                    | No action                       | Records where the plan was already right                   |

## Two shape changes that came out of the triage

### 1. The player always loads a score — the empty state is gone

leocaseiro: _"We don't have to hide alphaTab at all."_ The product rule is now: **always load
something.** The bundled beat in the app's own resources when nothing is cached; the last song
played when there is one; later, the score named by an id on the `/play` route, once the catalog
serves it.

Consequences for the plan:

- **Task 10's empty state disappears.** The notation box is on the page from the first paint.
- Opening another file stays `ScoreLoader.loadScoreFromBytes` + `renderScore` on the **live** engine,
  never `api.load(bytes)` (F-A2). The engine is
  never destroyed and rebuilt to show a different score (the cost of that is in the evidence below).
- The engine-import error message must be rendered **on top of** the box, never in place of it.

### 2. "Remember the last song" is its own ticket, with its own spec

Caching the last song writes the person's file bytes into browser storage. Task 6 currently promises
the opposite — _"A score held in memory. The bytes never touch disk and never cross a route."_ That
is a real feature with real questions (which store, a size cap, an eviction rule, how someone clears
it, and what the spec now promises), so it does not ride along inside a plan about first sound. Only
**"load the bundled beat when nothing is cached"** lands in Plan A, and that removes code.

## Why the always-mounted shape, in evidence

Three parallel investigations were run: the upstream site plus the installed AlphaTab 1.8.4 source,
the author's earlier `alpha-drums` attempt, and React 19 lifecycle semantics against this repo's own
lint configuration.

- **Upstream never hides the host.** All 12 components on AlphaTab's own website render it
  unconditionally; loading states are absolutely-positioned overlays
  (`AlphaTabRhythmGame/index.tsx:417` and `:376-382`).
- **AlphaTab is built for a covered container.** `initialRender()` defers the whole first render —
  including the score fetch — until the container becomes visible, then re-reads the width
  (`alphaTab.core.mjs:41006-41027`). `display:none` defers everything and renders at zero width, so
  the box must be covered, never hidden.
- **An empty box is cheap.** With `PlayerMode.EnabledAutomatic` and no score, no player is created at
  all — no `AudioContext`, no synth worker, no soundfont (`:46680-46685`). The cost is one layout
  worker and the music font.
- **Destroying and rebuilding is not cheap:** a fresh 956 KB soundfont fetch and parse with no cache
  of any kind (`:49227-49249`), two workers each re-parsing the ~1 MB core module, a new
  `AudioContext` whose predecessor closes asynchronously, a re-registered `@font-face`, and a full
  re-layout. On a slow device that is a stall of a second or more with no sound.
- **Playback itself is identical under every option** — the synthesizer runs in a worker, audio in an
  audio worklet, and the cursor is moved by AlphaTab's own DOM writes. React renders zero times per
  frame either way. Every difference is at mount and unmount.
- **`web/`'s own lint gate rejects the alternative.** `react-hooks/set-state-in-effect` is an error
  and `web/` runs `eslint . --max-warnings 0`; the callback-ref shape fails it and the always-mounted
  shape passes (verified by running the repo's resolved config).

Because a score now always loads, the two alternatives — a conditionally-mounted host with a callback
ref, and an always-mounted host with a "build on first open" latch — lose their only advantage.

### Hazards to carry into the rewrite

- Never let the error state (or anything else) **replace** the host. A swapped host leaves the engine
  drawing into a detached node, silently: notation vanishes while audio keeps playing.
- `host.focus()` must fire when a score **opens**, not when the engine is built, or it steals focus
  on page load.
- Reset `scrollTop` when a new score loads — the viewport now survives score changes.
- Wrap the per-call-site `settingsInit` in `useEffectEvent` inside the hook, so it can never enter a
  dependency list. That is F-B3's foot-gun in another costume. React 19.2.7 exports it (verified).
- Port the fork's whole-second position throttle **only with a fix**: upstream's is defeated by a
  stale closure (`player-controls-group.tsx:184-199`, after commit `a614efdb` dropped `handler` from
  the dependency list), so it fires on every event anyway.
- `api.destroy()` in 1.8.4 leaves an `IntersectionObserver` connected and a resize subscription
  registered. Harmless when destroy happens once per page; a leak if anything ever rebuilds in a loop.
- The lesson from `alpha-drums`: AlphaTab re-fires some events on subscribe
  (`alphaTab.core.mjs:24721-24727`), so a subscription that re-attaches on every render is a feedback
  loop, not merely waste. `useAlphaTabEvent` is what prevents it.

## What replaced F-C4

There is **no playhead state in React at all**. AlphaTab moves its own cursor; React is not involved.
The only reason the plan tracked the position was Task 7's regression test, which exists to catch one
specific failure: if the self-hosted worker or audio worklet is mis-delivered, **the notation renders
perfectly and there is simply no sound.**

That test stays — a mocked engine would replace the very thing that breaks — but it now reads
**AlphaTab's own cursor element** (`.at-cursor-beat` moves after Play, with `data-playing` as the
first gate) instead of an attribute the app maintains. Nothing test-only ships.

leocaseiro's standing rule, recorded here because it governs future plans too: **test-only
instrumentation must never ship to production, especially when it can cost performance.** The
zero-cost debug handle of F-D2 is the deliberate exception he asked for.

## State after the triage (2026-09-18)

Steps 1-3 below are **done and pushed** to `spike/alphatab-nextjs-poc` (PR #157). Only step 4 is left.

1. ✅ **The plan is rewritten** —
   [`2026-09-13-v0a-engine-and-first-sound-plan.md`](2026-09-13-v0a-engine-and-first-sound-plan.md).
   Task 5 gains the hook, the event helper and the shared defaults; Task 6 is rebuilt around one api
   owner and an always-mounted box with a split viewport; Task 7 proves playback from AlphaTab's own
   cursor; Task 10 loses the empty state (−81 lines); Task 11 asks only about scores the person
   opened; Tasks 12, 13, 14 and the appendix follow.
2. ✅ **Spec delta applied** — `docs/specs/2026-09-10-v0-local-file-player-design.md` gains **D8**
   (the player always has a score open) and rewritten §4 mounting, §4 failure states, §5 regression
   test, §7 and criterion 8. The `decision-registry.md` change-log entry is in the same branch.
3. ✅ **Jira filed under NH-291** — **NH-302** carries the five deferred findings as a Smart
   Checklist (F-C3, F-C5, F-D1, F-D3 and F-C1's font stack), and **NH-303** is the song cache,
   marked "needs a small spec before any code".
4. ⬜ **Review the rewritten plan** before any code is written against it — leocaseiro asked for
   this explicitly on 2026-09-18, in a fresh session. The plan changed in nine commits without a
   review pass of its own.
5. ⬜ **Merge PR #157 once the review passes** — decided by leocaseiro on 2026-09-18. It carries
   Tasks 1-4 (the vendored AlphaTab assets, the lint fences, the design-system exports) and every
   document, with no `/play` route, so nothing half-built reaches master. Tasks 5-14 then start on a
   fresh branch, which keeps each PR small instead of growing this 97-commit one.
6. ⬜ **Re-dispatch Task 5**, then continue the task loop from Task 6.

### Starting the review in a new session

The work to review is the branch `spike/alphatab-nextjs-poc` on PR
[#157](https://github.com/leocaseiro/notation-hero/pull/157), commits `36f6a899..4c98dcf3` — ten
commits, documents only, no product code. Worth reading in this order:

```text
docs/plans/2026-09-16-v0a-fork-parity-triage-handoff.md   ← the decisions and their evidence (this file)
docs/specs/2026-09-10-v0-local-file-player-design.md       ← D8 + the rewritten §4 and §5
docs/plans/2026-09-13-v0a-engine-and-first-sound-plan.md   ← Tasks 5, 6, 7, 10, 11, 12, 13, 14
docs/decisions/decision-registry.md                        ← the 2026-09-18 change-log entry
```

Use the `doc-review-loop` skill on the plan. Things worth an adversarial eye, because they were
written in one pass and only the first was verified by running anything:

- The `useAlphaTabEvent` mapped type uses `IEventEmitterOfT<never>` because
  `@typescript-eslint/no-explicit-any` is an error in `web/`, where the fork writes `any`. Nobody has
  compiled it. Task 5 carries the fallback (`unknown`) and the five event names to check.
- `useEffectEvent` is exported by the installed React 19.2.7 (verified by running `node -p`), but the
  hook's exact shape has not been type-checked or linted.
- `react-hooks/set-state-in-effect` is an error under `--max-warnings 0`. The `useRef`-host shape was
  linted clean against the real config on 2026-09-18; the final hook as written in Task 5 was not.
- Task 7's cursor assertion (`.at-cursor-beat` moves after Play) has never been run. If it is flaky
  in CI, the fallback is a probe component behind a build flag — never an always-on subscription.
- Task 11's `positionMs` helper reads the DevTools handle through `page.evaluate`. It assumes the
  host is the first child div of `[data-testid="notation-surface"]`, which is how Task 6 renders it.

> **Before re-dispatching: the task briefs under
> `.superpowers/sdd/2026-09-13-v0a-engine-and-first-sound-plan/` are STALE.** They were generated
> from the old plan and are not tracked by git, so nothing in this branch updated them. Regenerate
> them from the rewritten plan — at minimum for Tasks 5, 6, 7, 10, 11 — or delete them so they are
> rebuilt. An agent that reads `task-6-brief.md` as it stands will build the shape this triage
> removed.

### For whoever picks this up

- **The api is never rebuilt to change a score.** Opening a file is `renderScore` on the live
  engine. A destroy-and-rebuild costs a fresh 956 KB sound-bank fetch and parse (AlphaTab caches it
  nowhere), two workers re-parsing the ~1 MB core module, and a new `AudioContext`.
- **Nothing may replace the notation box.** Error and loading states are overlays. Unmounting it
  while the api is alive leaves AlphaTab rendering into a detached node, silently.
- **No test-only code in production.** The one deliberate exception is the DevTools handle
  (`host.at = api`), which leocaseiro asked to keep in production builds.
