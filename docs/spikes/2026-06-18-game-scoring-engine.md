# Spike — Game / scoring engine (hit-detection, native-side scoring, rendering split, feedback)

> **Date documented:** 2026-06-18 · **Origin:** drum-tutor-clone phase (re-consolidated) · **Status:** prior-art research
>
> **What this is:** product/engineering FACTS and decisions reached during the early "drum-tutor-clone" exploration (office-hours brainstorm + design-stack doc + plan-eng-review + spec review). It captures the gameplay/scoring engine thinking so future sessions don't re-derive it. It is **feature/engineering research, not a tooling-stack decision** — where it names a tooling choice (Capacitor, Pulumi vs CDK, Vue vs React, etc.) that is _context only_ and must defer to the current clean-slate infra/tooling rethink.
>
> **Multi-zone MIDI mapping is covered in the WebMIDI spike** — only cross-referenced here.
>
> **Sources:** `drum-tutor-clone` sessions — design-stack doc + its plan-eng-review/spec-review subagents (`53466813…`, subagents `agent-a4…`, `agent-ad…`), client brainstorm (`c9615811…`), and the original `scope.md`. The working prior-art is the `rhythm-game` branch of `~/Sites/alphaTabWebsite` (live demo existed; MPL-2.0).

---

## 0. TL;DR — verdict

1. **Hit scoring runs NATIVE-SIDE (the load-bearing decision).** In the Capacitor shells, a native plugin loads a per-song **tick map** at song start, captures MIDI directly from CoreMIDI / `android.media.midi`, scores each event against the tick map, and sends **only verdict events** `{noteId, verdict, ts, velocity}` across the JS bridge for rendering. Everything else in the stack hangs on this. On desktop PWA (no native bridge) scoring runs in JS via Web MIDI against the audio clock — looser budget, fine for v1.

2. **Timing comes from the playback tick stream, not the DOM.** Scoring windows are driven by `AlphaSynth.positionChanged` (tick-based, locked to playback) — **NOT** DOM events, **NOT** `requestAnimationFrame`. Timing is **decoupled from rendering**, so dropped frames never cause wrong scoring.

3. **Three rendering layers, three roles.** AlphaTab SVG = standard notation + per-note feedback overlay; **PixiJS/WebGL** = the "friendly" falling-notes highway (60fps; drum charts are sparse so it's cheap); **Web Audio clock** = metronome/count-in/scheduling. Final review settled the friendly-view primitive as **Canvas 2D first, PixiJS as the fallback**.

4. **Feedback is colour + shape + position.** Green ring = perfect, orange = early, purple = late, **miss = no feedback**, extra/wrong hit = **red cross at the staff position you actually hit** (snare line if you hit snare instead of kick). Plus a tendency meter and combo glow.

5. **The engine was already proven in a fork.** The `alphaTabWebsite` `rhythm-game` branch already had AlphaTab drum rendering + Web MIDI scoring + **auto-BPM** + **accuracy-coloured score** + an iOS Web MIDI shim working in-browser with acceptable latency. This is demonstrated prior art, not speculation — clean-room re-implement it (MPL-2.0 boundary).

6. **Open before building:** the scoring-window numbers (perfect/early/late/missed) were only ever _proposed_ at ±25/50/75ms and never locked; the AlphaTab/AlphaSynth JS API surface was asserted but never version-pinned; the "Tone.js slaved to AlphaSynth's clock" idea was **retracted as fanfic**.

---

## 1. The load-bearing decision — where hit scoring lives

**Decision (prior art): hit scoring runs NATIVE-SIDE in the Capacitor MIDI bridge.**

> "The native plugin loads a per-song tick map at song start, captures MIDI events directly from CoreMIDI / `android.media.midi`, scores each event against the tick map, and only sends `{noteId, verdict, ts, velocity}` events across the JS bridge to React/Vue for rendering."

**Why:**

- Every MIDI event that must cross the JS bridge _for scoring_ eats **~1-5ms** bridge overhead **plus** Web Audio output scheduling latency.
- Scoring in native code keeps the **perceived correctness** of the hit **under ~10ms**.
- The **visual** feedback can lag the actual hit by **15-30ms and still feel right** — because the human **ear** catches the timing, not the eye.

**Per-surface split:**

- **iPad shell** — custom Swift Capacitor plugin wrapping CoreMIDI. Scores native-side against the pre-loaded tick map; emits verdict events to JS.
- **Android shell** — custom Kotlin Capacitor plugin wrapping `android.media.midi`. Same architecture.
- **Desktop PWA** — Web MIDI API directly in JS; **scoring runs in JS**. Latency budget is looser (10-25ms) and acceptable for v1.

**Two latencies the design conflated (reviewer correction):** _scoring latency_ (native, ~5ms) is NOT _audio-output latency_ (still Web Audio through the WebView, 15-30ms on iOS). Only the **verdict event** is fast; metronome/backing audio still routes through Web Audio. For practice this is fine — you hear your own acoustic e-drum hit.

> ⚠️ **2026-context, conflicts with current direction:** This native-bridge architecture was for a Capacitor app. The current Notation Hero direction is a **Vite SPA** (Next.js rejected; native shells not currently in scope). Re-confirm which client surfaces exist before committing to the native-bridge path. The _principle_ (score where the events arrive; send only verdicts across any expensive boundary) is the durable takeaway; the specific Swift/Kotlin/Capacitor plumbing is context.

---

## 2. Timing source & the tick map

- **Scoring clock = `AlphaSynth.positionChanged`** (tick-based, locked to playback). **NOT** DOM events. **NOT** `requestAnimationFrame`.
- The **tick map is extracted once at song load** and **shared** between JS (visual) and native (scoring).
- Proposed cross-bridge contract (review fix, not implemented): a concrete JSON format **`[{tick, midiNote, windowMs}]`**, crossing the bridge via a one-shot `loadSong()` call that returns an ack.
- An alternate framing in the client brainstorm scores in JS by reconciling **MIDI hit timestamps against `AudioContext.currentTime`** with a look-ahead scheduler (sample-accurate; "timing rides this clock, not frame rate"). The two framings (AlphaSynth ticks vs Web Audio clock) were never fully reconciled — pick one source of truth before building.

**Retracted claim (do not carry forward):** the design once said Tone.js would be **"slaved to AlphaSynth's internal clock."** The spec review called this **fanfic** — AlphaSynth emits `positionChanged` events but exposes **no sample-accurate clock export**, and Tone.Transport is the slaver in its own model. v3 of the doc explicitly walked it back.

---

## 3. Rendering split (decoupled from timing)

| Layer                                | Tech                                                                  | Role                                                                                                                         |
| ------------------------------------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Standard notation + feedback overlay | **AlphaTab** (SVG)                                                    | Primary view; engraving-level feedback; per-note rings + red cross drawn on a **separate absolutely-positioned SVG overlay** |
| Friendly "falling notes" highway     | **Canvas 2D first → PixiJS/WebGL fallback**                           | 60fps sprite/gem animation; drum charts are sparse so it's cheap; keep it OFF the DOM/React                                  |
| Game clock                           | **Web Audio API** (`AudioContext.currentTime` + look-ahead scheduler) | metronome, count-in, scheduling; (PWA) scoring reconciliation                                                                |

- **Performance principle:** timing is decoupled from rendering — the audio/tick clock is authoritative, so **dropped frames ≠ wrong scoring**. Keep the highway on WebGL (PixiJS) not DOM, consider rendering notation in a Web Worker, pool objects, keep the soundfont small. _Cheap Android is the real test target._
- **Friendly-view primitive decision:** the spec review flagged this as a load-bearing UX element left "TBD." It was resolved to **Canvas 2D first, Pixi.js fallback** (review checklist item 16). Earlier brainstorm material treats PixiJS/WebGL as the default for the highway.
- **Friendly highway design (preserved from brainstorm):** a horizontal highway, lanes mirror the kit, **gem shape encodes articulation** (normal note vs X = cymbals, halo = accent, small/dim = ghost note), a **translucent band at the now-line shows the hit window**, velocity → brightness/size.

---

## 4. Per-note feedback semantics (from scope.md)

| Event                 | Standard notation                            | Friendly view                                                     |
| --------------------- | -------------------------------------------- | ----------------------------------------------------------------- |
| **Perfect**           | green ring on the notehead                   | green burst + "PERFECT" + combo tick                              |
| **Early**             | orange ring                                  | orange flash + "EARLY ←"                                          |
| **Late**              | purple ring                                  | purple flash + "LATE →"                                           |
| **Miss**              | _(nothing)_                                  | gem quietly greys + slides past (gentle)                          |
| **Wrong / extra hit** | **red ✗ at the staff position actually hit** | red flash in the wrongly-hit lane (**suppress for pedal hi-hat**) |

- The **red cross goes where you actually hit**, not where the note was expected: "if the user hits the snare instead of the kick, display a red cross in the snare position, not the kick." This needs a **custom rendering layer on top of AlphaTab** — its render hooks aren't suited to it. Hit-position lookup uses **`Renderer.boundsLookup`** (init with **`core.includeNoteBounds = true`**) to map staff lines/spaces (snare line, ride space) to pixel coordinates.
- **Accessibility:** always pair colour with **shape + text + position** (green/orange/purple/red is a lot of hue to lean on).
- Add a **tendency meter** (an "early ←|→ late" needle so users learn if they rush) and a **combo/streak glow**.
- **Hi-hat pedal "ignore extra-hits" toggle** so the foot pedal doesn't fire red crosses.

> 🎨 **2026 brand note (project-level, not from this phase):** the colour roles above predate the brand palette. Current Notation Hero guidance avoids purple/violet **as the brand** but **purple is fine as a functional/score colour** (Okabe-Ito #CC79A7). The "late = purple" role is compatible with that; just confirm against the current design system.

---

## 5. Scoring, modes, and progression

- **Score rating:** 5-star rating **and** a 0-100 percentage saved each time the song is played.
- **Streak — TWO distinct concepts (keep named apart):** in-session **current + longest** streak of correct hits, vs **cross-session daily-streak history** (a v1.5 DynamoDB write). The review flagged that conflating them confuses readers.
- **Game mode = the locked mode:** the user **cannot** change A→B section, tempo, or repeat. (Modelled as an explicit FSM was suggested: `idle → count-in → playing → paused → results`.)
- **Practice mode:**
  - **Auto-speed:** e.g. every time accuracy goes over 90%, bump tempo +5 BPM until reaching the song's original speed.
  - **Memory mode:** practice/play with the notation hidden; on a mistake, the notation fades back in, then fades out again after a few perfect hits.
- **Player transport:** play/pause/stop, back-to-start, loop on/off (off by default), **count-in** (metronome click per beat per the measure, e.g. 4 clicks for 4/4), metronome on/off (on by default), **tempo by BPM or percentage**, per-instrument volume / mute-mine / solo-mine (`AlphaSynth.applyTrackVolume(trackIndex, gain)`), instrument-to-play selector (drums default), **A/B loop set by clicking a smaller timeline-view of the score**.
- **Auto-BPM:** auto-detect/track tempo — already implemented in the fork.

---

## 6. Proven-in-the-fork prior art (demonstrated, not speculated)

The `rhythm-game` branch of `~/Sites/alphaTabWebsite` (`@coderline/alphatab@^1.8.1`, MPL-2.0) already had, working in-browser with acceptable latency:

- AlphaTab drum rendering
- **Web MIDI scoring**
- **Auto-BPM** (commit `deaaaee4 auto-bpm feature implemented`)
- **Accuracy-coloured score** (commits `d3ddda16 score color based on accuracy`, `492d118a default score color`, `3a441e77 allow bpm and game score in the same UI`)
- iOS Web MIDI shim (`navigator.requestMIDIAccess`, `.catch` removed for iOS)
- Green/orange/purple ring overlay positioned via `boundsLookup`

**License boundary (prior decision):** AlphaTab is **MPL-2.0** (App-Store-fine). The production repo starts clean, depends on `@coderline/alphatab` as a normal npm package, and **clean-room re-implements** the fork's logic patterns (open the fork in another window for reference; don't copy files).

---

## 7. Latency facts captured (all 2026-time-sensitive → re-verify)

| Path                                         | Round-trip latency (as stated then) | Note                                                       |
| -------------------------------------------- | ----------------------------------- | ---------------------------------------------------------- |
| iPad CoreMIDI (native bridge)                | ~5-10ms                             | "gold standard" target                                     |
| Android `android.media.midi` (native bridge) | ~10-15ms                            | close to iPad                                              |
| Web MIDI on Win Chrome/Edge (PWA)            | ~10-20ms                            | WinMM under the hood; "playable, not pro-grade"            |
| Tauri / WebView2 on Windows                  | same as PWA (~10-20ms)              | WebView sandbox                                            |
| Native Windows + ASIO                        | ~3-8ms                              | what native e-drum tutor apps use; needs ASIO4ALL/FlexASIO |
| JS bridge overhead (iOS WKWebView)           | ~5-15ms                             | the reason scoring is native-side                          |
| Web Audio output (iOS)                       | ~10-30ms                            | only verdict is fast; audio still routes here              |

The spec calls for measuring real latency in **Phase 0 with a slow-mo camera** before paying the Capacitor/native-bridge cost.

---

## 8. Reviewer-flagged gaps that were never fully resolved

- **Scoring-window thresholds** (perfect / early / late / missed) — only ever **proposed at ±25/50/75ms**; never numerically locked. Tune empirically on real e-drums.
- **AlphaTab/AlphaSynth JS API surface** — `positionChanged`, `boundsLookup`, `applyTrackVolume` were asserted but **not version-pinned** to the real 1.8.x JavaScript API (the repo is C#-ported; the JS surface differs).
- **Tick-map cross-bridge format** — hand-waved as "extracted once and shared"; concrete `[{tick, midiNote, windowMs}]` + `loadSong()` ack was a _proposed fix_, not built.
- **AlphaTab drum glyph completeness** (cymbal stems, ghost-note parens) — historically thin; verify against the current version for the notation feedback layer.
- **Latency compensation / calibration** — listed in scope ("a constant offset calibrates out, so latency hurts _feel_, not _fairness_") but never spec'd; surfaces as a Latency Compensation slider in the feature buildout.

---

## 9. Re-verify before building (2026)

- Scoring windows ±25/50/75ms — **proposed only**; tune on hardware.
- AlphaTab/AlphaSynth JS API (`positionChanged`, `boundsLookup` + `core.includeNoteBounds=true`, `applyTrackVolume`) — confirm against current AlphaTab docs/source.
- All latency numbers (§7) — re-measure on current OS/browser/hardware; Web MIDI browser support + the iOS shim are version-sensitive (cross-ref the WebMIDI spike).
- Scoring location (native-side vs Web-Audio-clock-in-JS) — depends on which client surfaces actually exist now (current direction = Vite SPA); the native-bridge plumbing may not apply.
- "Tone.js slaved to AlphaSynth's clock" — **retracted**; do not carry forward.
- AlphaTab drum-glyph completeness — verify for the notation feedback layer.

---

## 10. Sources / quotes

- **Native-side scoring decision** (design-stack subagent `agent-ad…`): _"hit scoring runs NATIVE-SIDE in the Capacitor MIDI bridge … only sends `{noteId, verdict, ts, velocity}` events across the JS bridge … keeps the perceived correctness of the hit under 10ms; the visual feedback can lag the actual hit by 15-30ms and still feel right because the human ear catches the timing, not the eye."_
- **Bridge-overhead reasoning** (plan-eng-review `agent-ad…`): _"If every MIDI event crosses to JS for scoring, the bridge overhead alone (5-15ms on iOS WKWebView in 2026 benchmarks) plus Web Audio output latency (~10-20ms) blows the budget … native captures MIDI + scores against a pre-loaded tick map; JS only receives `{noteId, verdict, ts}` events for rendering."_
- **Timing source** (`agent-ad…`): _"`AlphaSynth.positionChanged` (tick-based, locked to playback) drives the scoring window. NOT DOM events. NOT `requestAnimationFrame`. Tick map is extracted once at song load and shared between JS (visual) and native (scoring)."_
- **Rendering split** (client brainstorm `53466813…`): _"AlphaTab → standard-notation view … PixiJS/WebGL → the friendly 'falling notes' highway (60fps sprite animation; drum charts are sparse, so it's cheap) … Web Audio clock → metronome, count-in, scheduling, and scoring (MIDI hit timestamps compared against `AudioContext.currentTime`)."_
- **Canvas-2D-first decision** (review checklist): _"16. ✅ Friendly notation view rendering primitive specified (Canvas 2D first, Pixi.js fallback)."_
- **Feedback table & red cross** (`scope.md`, `agent-a4…`): _"green circle on perfect hit … orange when too early … purple when too late … missed notes shouldn't have any visual feedback … extra hits should display a red cross in the correct time and line/space position of the staff (e.g. if the user hits the snare instead of the kick, display a red cross in the snare position, not the kick)."_
- **Game/practice modes** (`scope.md`): _"Game mode — user cannot select … A to B … tempo … repeat. Practice mode — auto speed based on score accuracy (e.g. every time the hit over 90% accuracy, the speed increase 5 bpm …) … memory mode … if the user makes a mistake, display the notation which should fade out after a few perfect hits."_
- **5-star + streak** (`scope.md`): _"5 star rating system … save a percentage from 0 to 100 … streak: current streak of correct hits and the longest streak."_
- **Proven fork** (handoff, `53466813…`): _"Confirmed: AlphaTab drum rendering + Web MIDI scoring + auto-BPM + accuracy-coloured score + iOS Web MIDI shim all working in browser with acceptable latency."_ Fork commits: `deaaaee4 auto-bpm feature implemented`, `d3ddda16 score color based on accuracy`, `3a441e77 allow bpm and game score in the same UI`.
- **Retracted Tone.js claim** (spec review): _"Tone.js 'slaved to AlphaSynth's internal clock' is fanfic. AlphaSynth emits `positionChanged` events but provides no sample-accurate clock export."_
- **Window/API gaps** (spec review): _"Scoring window thresholds (perfect / early / late / missed) have no numeric definition. Fix: name initial ms windows (e.g., ±25/50/75ms)."_ and _"`applyTrackVolume`, `positionChanged` are asserted but not version-pinned to AlphaTab 1.5's actual API."_
- **Cross-reference:** multi-zone MIDI mapping (51/52/53 → 51, Yamaha DTX / Roland TD-50 presets) lives in the **WebMIDI spike** — the scoring flow there is: `MIDI Input (52) → Check Mapping (52→51) → Match Notation (51) → Green Circle + Score`.
