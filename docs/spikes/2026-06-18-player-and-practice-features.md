# Player & Practice-Mode Features — Prior Art (drum-tutor-clone)

| | |
|---|---|
| **Date documented** | 2026-06-18 |
| **Origin** | `drum-tutor-clone` (former name of Notation Hero) — early office-hours / scope-doc / plan-review sessions |
| **Status** | **Prior art** — research from the exploration phase. Feature/product spec captured as-is; tooling claims are NOT current decisions. |

---

## TL;DR

The original `scope.md` defines a complete **player layer** (choose song, play/pause/stop, loop, count-in, metronome, tempo, per-instrument volume, A/B section select, repeat, instrument select, back-to-start, 5-star + 0–100% score, streaks) and **two opposed modes**:

- **Game Mode** — *locks* A/B section select, tempo, and repeat. You play the song as written, at written tempo, for a clean score.
- **Practice Mode** — *adds* **auto-speed** (raise BPM when accuracy is high, up to the song's real tempo) and **memory mode** (hide notation; bring it back on a mistake, fade it out again after a few perfect hits).

The **per-stem mixer** (drums / guitar / bass volume, "mute mine / solo mine") was chosen to run on AlphaTab's synth via **`AlphaSynth.applyTrackVolume(trackIndex, gain)`** plus per-track mute/solo. The **A/B loop** sets points by clicking a **small timeline mini-view of the score**, mapping to AlphaTab's native playback-range / loop API. Everything time-related (count-in, metronome, scoring, loop, cursor) rides the **audio clock** (`AlphaSynth.positionChanged` ticks and/or a Web Audio look-ahead scheduler), **never DOM/`requestAnimationFrame`**.

This doc is the **full feature spec** for the player/practice layer. The MIDI input bridge + multi-zone mapping is its own spike (`webmidi-input-ios-bridge`) — cross-referenced, not re-derived here.

---

## 1. The player feature list (from `scope.md`, verbatim intent)

The source lists these under **Player features** (scope lines ~28–51). Reproduced as the canonical feature set:

| # | Feature | Default / detail |
|---|---|---|
| 1 | Choose a song | Upload, or pick a previously loaded one |
| 2 | Play / Pause / Stop | — |
| 3 | **Loop on/off** | **off by default** |
| 4 | **Count-in** | metronome click for **each beat of the measure** (e.g. **4 clicks for 4/4**), at song tempo/time-signature |
| 5 | **Metronome on/off** | **on by default** |
| 6 | **Tempo** | adjustable by **BPM or by percentage** |
| 7 | **Per-instrument volume** | pick volume of each instrument to hear (drums, guitar, bass, …) |
| 7b | **Listen-mode shortcut** | "drums only" / "drums + everything else" / "everything else but my instrument" (mute-mine / solo-mine) |
| 8 | **A/B section select** | choose point A → point B by **clicking on a smaller timeline score view** |
| 9 | **Repeat on/off** | **off by default** (distinct from "loop") |
| 10 | Select instrument to play | drums, keyboard, … — **default drums** |
| 11 | Back to start | stop and return to song start |
| 12 | Score rating | **5-star** + saved **0–100%** per play |
| 13 | Streak | **current** streak of correct hits + **longest** streak |

> Note the **loop (#3) vs repeat (#9)** distinction — both default off and were tracked as separate scope items. "Loop" pairs with the A/B range (loop the A→B segment); "repeat" is whole-song repeat. The original review flagged that **Repeat on/off (scope §38) was never carried into the early Success Criteria** and had to be added back.

---

## 2. Game Mode vs Practice Mode (the two modes)

Explicit, opposed modes — this is the heart of the practice layer.

### Game Mode — *locks* player controls
> *"for game mode, user cannot select: select what part (from point A to point B) of the song to play / tempo / repeat"*

Game Mode **disables** three controls so the score is comparable:
- A/B section select (must play the whole song)
- Tempo (must play at written tempo)
- Repeat

A 2026-era review flagged Game Mode as *"entirely missing from Success Criteria — add Game mode toggle to v1."* So it was a real gap that got re-added; treat the Game-Mode lock list as load-bearing.

### Practice Mode — *adds* assistive features
> *"auto speed based on score accuracy (e.g. every time the hit over 90% accuracy, the speed would increase 5 bpm, until the user reaches the song's original speed)."*

- **Auto-speed / tempo ramp:** start slow; each time a pass clears an accuracy threshold (example: **>90% → +5 BPM**), bump tempo, **capped at the song's original tempo**. Threshold + increment should be user-configurable (the example numbers are illustrative).
- **Memory mode:** *"practice and/or play the song by memory, without displaying the notation. However, if the user makes a mistake, then we display the notation which should fade out after a few perfect hits."* So: notation hidden → mistake → notation reappears → fades out again after N perfect hits.

These two (`auto-speed` and `memory mode`) were called out repeatedly as the **deliberate differentiator** vs the dominant competitor — *"feature flags [it] doesn't have (memory mode, auto-speed practice, hi-hat pedal extra-hit forgiveness)."*

### Game-loop as a state machine
The player lifecycle was identified as a textbook **FSM**:

> **idle → count-in → playing → paused → results**, with a **practice-vs-game** branch.

XState was floated as **OPTIONAL** — *"skip for plumbing; optionally model the one game-mode lifecycle … as an explicit FSM for the rigor + interview story."* Not a requirement; a Context/reducer covers the plumbing. (Tooling choice — prior art only, re-decide under the current rethink.)

---

## 3. Per-stem / per-instrument mixer (chosen approach)

Scope §35–36 demands per-stem volume (drums/guitar/bass) **and** the "listen-mode" shortcuts (drums only / everything-but-mine / only-mine). The chosen implementation, stated explicitly across multiple iterations:

> **Per-instrument volume:** `AlphaSynth.applyTrackVolume(trackIndex, gain)` handles per-stem mixing (drums, guitar, bass) **including "mute mine / solo mine" modes.**

And from the AlphaTab capability table:

> **Per-instrument volume (drums/bass/etc.)** → *Per-track volume + mute/solo on the synth ✅*

So the mixer is **not custom DSP** — it leans on AlphaTab's built-in multi-track synth:
- **Per-track gain** → `AlphaSynth.applyTrackVolume(trackIndex, gain)`.
- **"mute mine"** → mute the track the user is playing (hear the band, not yourself).
- **"solo mine"** → solo the user's track (hear only yourself) — via the synth's per-track mute/solo.

An early review explicitly required this be **stated, not hand-waved**: *"AlphaTab's `AlphaSynth` supports per-track gain — design should explicitly say this is how it'll work."* It was subsequently locked: *"✅ Per-instrument mixer specified via `AlphaSynth.applyTrackVolume`."*

> **Game-Mode interaction with the mixer:** in game mode *"you don't synth the drum track at all (you ARE the drums), so polyphony stays low"* — i.e. the user's own instrument track is muted/unsynthed during scoring; the mixer mainly governs the **other** stems.

---

## 4. A/B loop on the timeline mini-view

Scope §37: *"select what part (from point A to point B) of the song to play (select point A and point B by clicking on a smaller timeline score view)."*

Decisions reached then:
- The A/B markers are set by **clicking a small timeline view of the score** (a mini-map, not the full notation).
- This is a **custom canvas/SVG overlay** on top of AlphaTab, mapping clicks → tick positions.
- It rides AlphaTab's **native playback-range / loop API** — research surfaced `highlightPlaybackRange()` / playback range + loop (`isLooping`) and the **bar-to-bar snapping** behaviour.
- Note geometry (mapping staff position ↔ pixels for the overlay) uses **`Renderer.boundsLookup`** (`api.renderer.boundsLookup.findBeat()`), which is **opt-in** via `core.includeNoteBounds = true` and carries render-time cost on dense scores.

A review noted the A/B-loop-on-timeline was *"not addressed in stack discussion … likely fine (custom canvas/SVG), but worth a sentence"* — so it was an underspecified item that got pinned down.

**⚠ Version caveat (see Re-verify):** a 2026 review found `highlightPlaybackRange()` **was not in AlphaTab v1.7.1** (PR #2418 / issue #2394 — "Loop bar-to-bar snapping fix"). The loop API existed but the snapping helper was unreleased at that pin.

---

## 5. Timing: the audio clock drives everything

The single most important player-layer decision: **all timing rides the audio clock, never the DOM/frame loop.**

> **Hit-detection timing source:** `AlphaSynth.positionChanged` (tick-based, locked to playback) drives the scoring window. **NOT DOM events. NOT `requestAnimationFrame`.** Tick map is extracted once at song load and shared between JS (visual) and native (scoring).

The same clock governs **count-in, metronome, A/B loop boundaries, and the cursor**. The friendly "falling notes" highway view animates with **delta-time** off this clock (correct speed even at 30fps).

### The Tone.js correction (important)
Early drafts said "Tone.js slaved to AlphaSynth's internal clock." A reviewer corrected this as **fanfic**:

> *"AlphaSynth emits `positionChanged` events but provides no sample-accurate clock export, and `Tone.Transport` is the slaver in its own model. … reframe as: **Tone.Transport periodically re-synced from AlphaSynth tick callbacks; metronome ticks scheduled relative to AlphaSynth position, not Tone.Transport time.**"*

Web research confirmed the ambiguity — AlphaTab has an **External Cursor API** (drive the cursor from an external time provider) and translates time → MIDI tick respecting sync points, but **no documented sample-accurate clock export**. Later office-hours leaned toward a plain **Web Audio look-ahead scheduler** (`AudioContext.currentTime`) as *"the standard rhythm-game clock"* for metronome/count-in/scoring, reconciling MIDI hit timestamps against it.

### Count-in / metronome mechanics
- **Count-in** = one **metronome click per beat of the measure** at song tempo (4 clicks in 4/4), using the song's time signature.
- **Metronome** defaults **ON**; loops the click locked to song position. The concern flagged: Tone.js Transport **drifts on backgrounded tabs / throttled iOS AudioContext** over a 4-minute song — hence the look-ahead-scheduler / re-sync-from-ticks approach.

---

## 6. Decisions reached then (labeled prior art)

| Decision | What was chosen | Confidence then |
|---|---|---|
| Player time base | Audio clock (`AlphaSynth.positionChanged` ticks and/or Web Audio look-ahead scheduler); never DOM/rAF | High / load-bearing |
| Per-stem mixer | `AlphaSynth.applyTrackVolume(trackIndex, gain)` + per-track mute/solo for mute-mine/solo-mine | Locked, but API not version-verified |
| A/B loop | Click a small timeline mini-view → AlphaTab playback-range/loop API; custom SVG overlay; `boundsLookup` for geometry | Locked; snapping helper version-fragile |
| Game Mode | Toggle that **locks** A/B select, tempo, repeat | Re-added after review (was a gap) |
| Practice Mode | Auto-speed ( >accuracy% → +N BPM, capped at original tempo) + memory mode (hide notation, reveal on miss, fade after perfects) | Locked; thresholds user-configurable |
| Loop vs Repeat | Two separate controls, both default OFF | From scope; Repeat was nearly dropped |
| Metronome / count-in | Default metronome ON; count-in = one click per beat of measure at song tempo | From scope |
| Game-loop modeling | idle→count-in→playing→paused→results FSM; XState **optional** | Tooling — re-decide |
| Metronome lib | Tone.js (`tone@^15`) early; shifted toward Web Audio look-ahead scheduler | Tooling — re-decide |

---

## 7. Re-verify before building (2026, time-sensitive)

1. **AlphaTab A/B-loop API** — confirm `setPlaybackRange` / `isLooping` / `highlightPlaybackRange()` (and bar-to-bar snapping, PR #2418 / issue #2394) exist and behave in the **current** AlphaTab. They were version-fragile at v1.7.1.
2. **`AlphaSynth.applyTrackVolume(trackIndex, gain)` + mute/solo** — asserted but **never version-pinned to the real JS API** (AlphaSynth is a C#-port; JS surface differs). Verify exact method names/signatures for per-track volume **and** track mute/solo before building the mixer.
3. **`AlphaSynth.positionChanged`** — confirm the event name and that it gives tick positions usable for the scoring window / count-in / metronome in the current version.
4. **Tone.js sync pattern** — "slaved to AlphaSynth clock" is NOT a real capability. Re-verify the correct pattern (periodic re-sync from tick callbacks, or Web Audio look-ahead scheduler) and whether Tone.js is even still wanted.
5. **`boundsLookup` cost** — opt-in via `core.includeNoteBounds = true`; re-measure render cost on dense drum charts (needed for the A/B timeline + feedback overlay).
6. **Stale version pins** — `alphatab @^1.5 / ^1.8.1`, `tone @^15`, `@tonejs/midi @^2`. Re-pin to current.
7. **Tooling-stack context only** — React-vs-Vue, Capacitor/native bridges, Pulumi, RxDB-vs-Legend-State, Cognito tiers, $2 app-store fees, AWS free-tier ceilings appear in the source docs but **conflict with the current clean-slate infra/tooling rethink** — do NOT treat them as decided.

---

## 8. Cross-references

- **MIDI input + multi-zone mapping** → see the `webmidi-input-ios-bridge` spike (the input bridge + per-instrument zone mapping; this doc does not re-derive it).
- **Scoring windows / 5-star / streaks** → see the `game-scoring-engine` round-1 doc (the player surfaces the score; the engine computes it).
- **Audio clock / latency** → see the `audio-engine-and-latency` round-1 doc.
- **AlphaTab rendering** → see the `alphatab-integration` round-1 doc.

---

## 9. Sources / quotes

All from `drum-tutor-clone` sessions (pre-rename). Key files quoted into those sessions: `scope.md`, `design-stack.md` / `spike.md`, plan-review iterations, and `stack-aws-brainstorm.md`.

- **Scope (player features), verbatim:** *"loop on/off (off by default) … count-in which should have the metronome sound for each bit based on the measure (e.g. 4 beats for a 4/4 time signature) … metronome on/off (on by default) … tempo that can be adjusted by bpm or percentage … select what the volume of each instrument to listen to … alternatively … drums only, drums + everything else, just everything else but my instrument … select what part (from point A to point B) … by clicking on a smaller timeline score view … repeat on/off (off by default) … back to start."*
- **Game/Practice modes, verbatim:** *"Game mode — for game mode, user cannot select: … point A to point B … tempo … repeat. Practice mode — auto speed based on score accuracy (e.g. every time the hit over 90% accuracy, the speed would increase 5 bpm, until the user reaches the song's original speed). memory mode … without displaying the notation. However, if the user makes a mistake, then we display the notation which should fade out after a few perfect hits."*
- **Mixer:** *"Per-instrument volume: `AlphaSynth.applyTrackVolume(trackIndex, gain)` handles per-stem mixing (drums, guitar, bass) including 'mute mine / solo mine' modes."* + AlphaTab table: *"Per-instrument volume → Per-track volume + mute/solo on the synth ✅."*
- **Timing:** *"Hit-detection timing source: `AlphaSynth.positionChanged` (tick-based, locked to playback) drives the scoring window. NOT DOM events. NOT `requestAnimationFrame`."*
- **Tone.js correction:** *"'Tone.js slaved to AlphaSynth's internal clock' is fanfic … reframe as 'Tone.Transport periodically re-synced from AlphaSynth tick callbacks; metronome ticks scheduled relative to AlphaSynth position, not Tone.Transport time.'"*
- **A/B-loop version risk:** AlphaTab issue #2394 — *"Loop bar to bar snapping fix - highlightPlaybackRange() not in v1.7.1 - When will PR #2418 be released?"*
- **FSM:** *"a rhythm game's lifecycle (idle → count-in → playing → paused → results; practice vs game mode) is a textbook state machine … Skip for plumbing; optionally use it for the one game-mode machine."*
- **Review gaps:** *"Game mode (scope §44-48: locks tempo/A-B/repeat) is entirely missing from Success Criteria. Fix: add Game mode toggle to v1."* / *"Repeat on/off (scope §38) never mentioned. Fix: add to player feature checklist in v1."*
- **AlphaTab external docs referenced:** alphatab.net/docs/reference/api, AlphaTab `boundsLookup` (`api.renderer.boundsLookup.findBeat()`), External Cursor API, CSS hooks `.at-cursor-bar` / `.at-cursor-beat` / `.at-selection`.

**Session origin (worktrees):** `serene-grothendieck-fb5e67`, `pensive-boyd-6d17e3`, `recursing-feistel-29cb4e` under `~/.claude/projects/-Users-leocaseiro-Sites-drum-tutor-clone-*`.
