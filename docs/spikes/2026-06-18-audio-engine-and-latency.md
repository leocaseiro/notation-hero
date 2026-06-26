# Audio engine + timing/latency budget

> **Date documented:** 2026-06-18
> **Origin:** drum-tutor-clone phase (re-consolidated)
> **Status:** prior-art research — feature/engineering FACTS, not a current tooling decision

> ⚠️ **Read this first.** This is research harvested from the early "drum-tutor-clone" office-hours / plan-review sessions (the app is now **Notation Hero**). It captures what was found and decided THEN about the audio engine and timing budget. Two cautions:
>
> 1. **Latency numbers here are estimates, not measurements.** Almost every ms figure is an educated office-hours guess. The plan itself said: measure end-to-end with a slow-motion camera in Phase 0. Re-verify before trusting any number.
> 2. **The surrounding tooling picks (Capacitor, AlphaTab versions, Vue-or-React, Amplify-vs-CDK, Pulumi, RxDB) are NOT current.** Notation Hero is mid clean-slate tooling rethink (NestJS, pnpm workspaces, Vite SPA, Cognito). The reusable part of this doc is the **audio/timing engineering facts**, not the stack list.

---

## TL;DR / verdict

For a drum rhythm game the **audio clock is the authoritative timeline**, and timing must be **decoupled from rendering** (dropped frames must never mean wrong scoring). The early design settled on:

- **AlphaTab / AlphaSynth** as the music-core anchor — Guitar Pro + drum notation parsing, plus a SoundFont synth player with a tick-based playback clock.
- **Tone.js** for the **metronome, count-in, and backing tracks**, **drift-corrected** from AlphaSynth's clock (not "slaved" — see below).
- **Web Audio look-ahead scheduler** as the game/scoring clock; MIDI hit timestamps are compared against `AudioContext.currentTime`.
- **PixiJS/WebGL** for the friendly "falling notes" highway (timing rides the audio clock, not frame rate).

The single biggest constraint is the **<20ms perceived latency** target on the primary platforms. The honest conclusion reached: **<20ms is realistic for the _verdict event_ (visual hit feedback) only if hit-scoring runs native-side**; the _audio output_ (metronome click / sampled drum sound) still goes through Web Audio in the WebView and stays at ~15-30ms on iOS. That's acceptable **only because the drummer hears their own e-drum acoustically** — it's a practice tool, not a "play along to a sampled kit" tool.

---

## Findings

### F1 — The latency budget and how it _feels_

From the office-hours latency-tolerance question (ELI10 framing, prior art):

- **~10ms** round-trip — feels "right", like a real instrument.
- **~20ms** — "slightly mushy".
- **~40ms** — "broken"; the visual feedback visibly lags the stick.
- **Web tech** ≈ 20-40ms in practice; **native** ≈ 5-15ms. _(estimates)_

Leo explicitly chose **"<20ms required"** ("it has to feel like a real instrument"). This is the constraint that splits web-vs-native and forced the hybrid (Capacitor + native MIDI bridge) direction.

The locked scope phrasing became: _"<20ms perceived round-trip on iPad/Android/Mac. Windows v1 may run at ~10-20ms via PWA; pro-grade Windows latency is out of scope for v1."_

### F2 — Per-platform latency table (PRIOR-ART ESTIMATES — re-measure)

> None of these were bench-measured. They are office-hours guesses. The Phase-0 plan was to verify with a slow-mo camera.

**Windows MIDI paths:**

| Path                          | Est. latency           | Notes                                                                                                |
| ----------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Web MIDI in Chrome/Edge (PWA) | ~10-20ms               | Uses **WinMM** under the hood. "Feels okay" but a serious drummer notices it's not as tight as iPad. |
| Tauri + WebView2              | ~10-20ms (same as PWA) | WebView2 → same Web MIDI → same WinMM. **No latency win from Tauri.**                                |
| Native Win + WinMM (direct)   | ~8-15ms                | Slight win — no browser sandbox.                                                                     |
| Native Win + **ASIO** drivers | ~3-8ms                 | What native e-drum tutor apps use. Needs ASIO4ALL / FlexASIO; native code only.                      |

**Other platforms:**

- **iPad (CoreMIDI)** ≈ 5-10ms — hits the gold-standard target.
- **Android (`android.media.midi`)** ≈ 10-15ms native; **Android Chrome PWA** ≈ 15-25ms.
- **Mac Chrome/Edge PWA** ≈ 10-20ms (same as Windows PWA). **Safari does NOT support Web MIDI** — PWA on Safari is half-broken. **Tauri on Mac uses WKWebView (Safari engine) → no Web MIDI**, which ruled Tauri out for this product.

**Key derived facts:**

- Browsers and Electron **cannot use ASIO** — Web Audio routes through WASAPI. Electron does not improve audio latency (same Chromium audio stack).
- Native ASIO was parked as a **v3 / maybe-never** concern, since iPad is primary.

### F3 — The audio engine stack and the _clock hierarchy_

The decided architecture (prior art):

| Concern                               | Pick                                     | Why                                                                        |
| ------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------- |
| Notation + playback                   | **AlphaTab** (+ AlphaSynth)              | Guitar Pro + drum notation + SoundFont synth + synced cursor — the anchor. |
| Game clock / metronome / scoring      | **Web Audio API + look-ahead scheduler** | Sample-accurate; timing rides this clock, not frame rate.                  |
| Metronome / count-in / backing tracks | **Tone.js**                              | Convenient scheduling on top of Web Audio.                                 |
| Falling-notes view                    | **PixiJS (WebGL)**                       | Game-quality 2D without a game engine; drum charts are sparse → cheap.     |

The clean separation that was articulated:

- **AlphaTab** → standard-notation view (engraving-level feedback).
- **PixiJS/WebGL** → friendly highway (60fps sprites).
- **Web Audio clock** → metronome, count-in, scheduling, and scoring (`AudioContext.currentTime`).

### F4 — Hit-detection timing source: AlphaSynth ticks, NOT the DOM

The critical correctness rule:

- **Hit scoring runs off `AlphaSynth.positionChanged` (tick-based, locked to playback).** _Not_ DOM events, _not_ `requestAnimationFrame`.
- A **tick map** is extracted **once at song load** and shared between JS (visual) and native (scoring). Proposed concrete format: `[{tick, midiNote, windowMs}]`, crossing the bridge via a one-shot `loadSong()` call.
- Notation overlay (hit rings) positioned via AlphaTab `Renderer.boundsLookup` — which is **opt-in and performance-costly**: requires `core.includeNoteBounds = true`, and is expensive to render on dense drum scores.
- Per-stem mixing via `AlphaSynth.applyTrackVolume(trackIndex, gain)`.

> ⚠️ The AlphaSynth JS API surface (`positionChanged`, `applyTrackVolume`, `boundsLookup`) was **asserted but never version-pinned**. AlphaSynth is a C#-ported repo and the JS surface differs. Re-verify against the current AlphaTab version.

### F5 — "Tone.js slaved to AlphaSynth" was _fanfic_ — it's drift-correction

This is the single most important correction the reviews surfaced, and it flipped twice across iterations:

- **First framing (wrong):** "Use AlphaSynth's internal clock as the source of truth and slave Tone.js to it." Reason given: Tone.Transport drifts on backgrounded tabs and on iOS where AudioContext gets throttled, so over a 4-minute song the metronome drifts.
- **Correction (FEASIBILITY review):** _"Tone.js 'slaved to AlphaSynth's internal clock' is fanfic."_ AlphaSynth emits `positionChanged` events but **exposes no sample-accurate clock export**, and `Tone.Transport` is the slaver in its own model. You can poll `positionChanged` and set `Tone.Transport.seconds = x`, but **that is drift-correction, not slaving.**
- **Final landed phrasing:** _"Tone.Transport is periodically re-synced from AlphaSynth tick callbacks; metronome ticks are scheduled relative to AlphaSynth position, not Tone.Transport time."_ And the honest disclosure: _"`Tone.js` is NOT slaved to AlphaSynth — it's drift-corrected from `positionChanged` callbacks."_

A web search at the time found alphaTab translates time position into MIDI tick position respecting sync-point info (so some external-sync infrastructure exists), but **no documented sample-accurate clock export and no documented Tone.js integration**. The "External Audio Cursor API" was an open alphaTab issue (#1961) — re-check whether it has since landed.

### F6 — Tone.js scheduling internals (from web search, prior art)

- Default **`lookAhead` = 0.1s** — Tone schedules events `context.currentTime + context.lookAhead` ahead.
- **`latencyHint`** values: `"interactive"` (default — prioritizes low latency), `"playback"` (sustained playback), `"balanced"`.
- **Clock source**: `"worker"` (default), `"timeout"`, or `"offline"`. The worker-based clock is what keeps scheduling alive when the tab is backgrounded (vs naive `setTimeout`).
- Scheduling events farther in advance is easier for the audio thread and can improve performance (at the cost of responsiveness).

### F7 — Verdict latency vs audio-output latency are DIFFERENT budgets

The design conflated two things; the review split them:

- **Scoring latency** (native): MIDI captured in Swift/Kotlin, scored against the pre-loaded tick map, only `{noteId, verdict, ts}` crosses the JS bridge → **~5ms achievable.**
- **Audio output latency**: metronome click / sampled drum sound still goes through **Web Audio inside the WebView** → **~15-30ms on iOS.**

Consequence captured as an honest disclosure: the "<20ms perceived" target applies to the **verdict event** (visual feedback). Audio playback stays at WebView latency. This is fine **because the user hears their own e-drum acoustically**; it is NOT fine for "play along to a sampled drum sound."

### F8 — Windows / weak-hardware mitigations without native code

For Windows (can't use ASIO from the browser) the real fixes that keep it shippable:

- **Latency-calibration slider** (in scope) — a per-device offset persisted (originally to DynamoDB/local).
- **Audio-clock scoring** — score against the audio clock with a **constant offset that calibrates out**, so latency hurts the _feel_ but **not the fairness** of scoring.
- `new AudioContext({ latencyHint: 'interactive' })`.
- A short "Windows audio tips" note.

And the rendering/timing discipline that makes weak Android / old iPads viable: **timing is decoupled from rendering — the audio clock is authoritative, so dropped frames ≠ wrong scoring.** Keep the highway on **WebGL (PixiJS), not DOM**; render notation in a **Web Worker**; pool objects (zero-alloc render loop to avoid GC stutter); keep the SoundFont small. The genuine performance floor is **cheap Android** (weak GPU, 2-3GB RAM, throttling, GC pauses) — _"get a ~$150 Android and test early; that's your canary, not the iPad."_

### F9 — "Designed for iPad on Mac" is a trap for audio+MIDI

Triggered by Leo's observation that InstaDrum had _more_ latency on his M5 Mac than on his iPad. The runtime layer ("iOSMac", Catalyst-adjacent) is notorious for audio+MIDI apps:

- **Higher audio buffer sizes by default** on the Mac runtime (= more latency).
- MIDI device enumeration quirks (some hardware shows up, some doesn't).
- Sample-rate negotiation issues with external interfaces.
- Several pro music apps **uncheck "Make App Available on Mac"** for exactly this reason.

**Decision:** don't bet the Mac strategy on iPad-on-Mac; treat it as an experimental bonus. Mac ships via **PWA (Chrome/Edge)**.

### F10 — Scoring windows + Phase-0 measurement plan

- **Scoring window thresholds** (perfect / early / late / missed) had **no numeric definition** in the design. Reviewer proposed initial windows like **±25 / 50 / 75 ms** as a spike target. These are placeholders, never validated against real drummers.
- **Phase 0 (1-2 weekends)** plan, kept deliberately minimal ("no DB schema, no UI, no Lambda until this feels right"):
  1. Vite + AlphaTab + load a `.gp` file with a drum track; confirm it renders.
  2. Web MIDI listener on **Mac Chrome** to the e-drums.
  3. Use `AlphaSynth.positionChanged` to compute expected-note-at-now.
  4. On MIDI input, light the matching note with a green ring overlay.
  5. **Measure end-to-end latency with a slow-motion camera against e-drum stick contact.**
  - **Decision gate:** if Mac Chrome end-to-end is **under ~25ms** and AlphaTab feels right → proceed to the Capacitor phase.

---

## Prior decisions reached THEN (labeled prior art — re-confirm, do not treat as current)

These were "locked" in the drum-tutor-clone design docs. They are recorded for context; several touch the tooling rethink and should NOT be re-enforced as-is.

- **Music core:** AlphaTab (Guitar Pro + drum notation + AlphaSynth SoundFont playback) as the anchor. License: AlphaTab **MPL-2.0** → App-Store fine.
- **Audio scheduling:** Tone.js for metronome/count-in/backing tracks, **drift-corrected from AlphaSynth's clock** (NOT slaved).
- **Game clock:** Web Audio look-ahead scheduler is authoritative; scoring compares MIDI timestamps to `AudioContext.currentTime`; timing decoupled from rendering.
- **Falling-notes view:** PixiJS/WebGL (horizontal-highway primary; vertical-waterfall optional).
- **Hit scoring runs native-side**; only verdict events cross the JS bridge. Native MIDI via custom Swift (iPad/CoreMIDI) + Kotlin (Android/`android.media.midi`) bridges, written from scratch (no mature `@capacitor-community/midi` existed). Desktop = Web MIDI directly.
- **Latency:** <20ms on iPad/Android/Mac primary; Windows v1 ~10-20ms PWA acceptable; native ASIO = v3/never. `latencyHint:'interactive'` + calibration slider + audio-clock scoring as the mitigations.
- **Distribution:** App Store (iPad/Capacitor) + Play Store (Android/Capacitor) + PWA (Win/Mac via Chrome/Edge). Tauri **rejected** (WKWebView lacks Web MIDI). Electron deferred to a possible v2.
- **Version pins drifted** across iterations — recorded only to show movement, not as current truth: `alphatab` ^1.5 → ^1.8.1; `tone` ^15; `@tonejs/midi` ^2; `@capacitor/core` ^6. The FE framework flip-flopped Vue 3 ↔ React 18 ↔ React 19; sync layer flip-flopped RxDB ↔ Legend-State. **All of this is superseded by the current tooling rethink — ignore the specific picks.**

> **Time-stretch note (backing tracks):** slowing the _synth_ for tempo change is trivial (it's a sequencer). Slowing an _MP3 backing track_ without chipmunk pitch needs a time-stretch lib (SoundTouch / Rubber Band / `signalsmith-stretch` via WASM). Only relevant for the "background audio" nice-to-have.

---

## Re-verify before building (2026)

Everything here is from the drum-tutor-clone phase. Before building the audio engine, re-confirm:

1. **All latency numbers** (iPad 5-10ms, Android 10-15ms, Win 10-20ms, ASIO 3-8ms, iOS Web Audio output 15-30ms) — these are **estimates, not measurements**. Re-measure on real hardware via the slow-mo-camera method.
2. **Tone.js current version + behaviour** — confirm default `lookAhead` (0.1s), `latencyHint` values, and clock-source options; check whether AudioWorklet-based scheduling now mitigates background-tab / iOS throttling drift (issues #1221 multi-device sync, #performance wiki).
3. **AlphaTab/AlphaSynth current version + API** — re-pin (drifted ^1.5→^1.8.1) and re-verify `positionChanged`, `applyTrackVolume`, `boundsLookup`, `core.includeNoteBounds`. The JS surface differs from the C#-ported repo and was never version-confirmed.
4. **Whether AlphaSynth now exposes a sample-accurate clock / external cursor sync** (alphaTab issue #1961 "External Audio Cursor API" was open then). If it landed, the Tone.js drift-correction workaround may be replaceable.
5. **iPad Safari Web MIDI support** and **"Designed for iPad on Mac" audio/MIDI behaviour** — OS-release-sensitive; re-verify on current iPadOS/macOS.
6. **Scoring-window ms thresholds** (±25/50/75 placeholder) — tune empirically with real drummers.
7. **The whole stack premise** (Capacitor, native bridges, FE framework, sync layer) overlaps the ongoing clean-slate tooling rethink (NestJS, pnpm, Vite SPA, Cognito). Treat only the **audio/timing facts** as reusable; re-decide the tooling fresh.

---

## Sources / quotes

Direct from the drum-tutor-clone sessions (office-hours + plan reviews):

- **Latency feel ELI10:** _"Drum hits feel 'right' under ~10ms of round-trip latency. ~20ms feels slightly mushy. ~40ms feels broken… Web tech is roughly 20-40ms in practice. Native is 5-15ms. This is the single biggest constraint that splits web-vs-native."_
- **Windows table:** _"Web MIDI in Chrome/Edge (PWA) ~10-20ms total round-trip … Uses WinMM under the hood. … Native Win + ASIO drivers ~3-8ms … What native e-drum tutor apps use. Requires bundling/asking users to install ASIO4ALL or FlexASIO."_
- **Tauri:** _"Tauri uses Edge WebView2 → same Web MIDI → same WinMM. No latency win from Tauri itself."_ and _"Tauri on Mac uses WKWebView (Safari engine), which doesn't support Web MIDI."_
- **Clock hierarchy:** _"Web Audio clock → metronome, count-in, scheduling, and scoring (MIDI hit timestamps compared against `AudioContext.currentTime`)."_
- **Fanfic correction:** _"Tone.js 'slaved to AlphaSynth's internal clock' is fanfic. AlphaSynth emits `positionChanged` events but provides no sample-accurate clock export… that's drift-correcting, not slaving."_
- **Verdict vs output:** _"the design conflates scoring latency (native, ~5ms) with audio output latency (still Web Audio through the WebView, 15-30ms on iOS) … only the verdict event is fast."_
- **Windows mitigations:** _"latency calibration (in scope) + audio-clock scoring (a constant offset calibrates out, so latency hurts feel, not fairness) + `new AudioContext({ latencyHint: 'interactive' })`."_
- **Decoupling:** _"timing is decoupled from rendering — the audio clock is authoritative, so dropped frames ≠ wrong scoring."_
- **iPad-on-Mac:** _"Higher audio buffer sizes by default on the Mac runtime (= more latency) … don't bet your Mac strategy on the iPad-on-Mac path."_

Reference links cited in those sessions:

- alphaTab API docs — <https://alphatab.net/docs/reference/api>
- alphaTab GitHub — <https://github.com/CoderLine/alphaTab> ; alphaSynth — <https://github.com/CoderLine/alphaSynth>
- External Audio Cursor API issue — <https://github.com/CoderLine/alphaTab/issues/1961>
- Tone.js Transport docs — <https://tonejs.github.io/> ; Performance wiki — <https://github.com/Tonejs/Tone.js/wiki/Performance> ; multi-device sync #1221 — <https://github.com/Tonejs/Tone.js/issues/1221>
- Apple CoreMIDI — <https://developer.apple.com/documentation/coremidi/>
- Round-trip audio latency meter — <https://onyx3.com/LatencyMeter/>
- Audio latency iOS vs OSX (Loopy Pro) — <https://forum.loopypro.com/discussion/38870/audio-latency-ios-vs-osx>
- Reference fork (prior art, MPL-2.0): `~/Sites/alphaTabWebsite` `rhythm-game` branch — AlphaTab init with `includeNoteBounds`, Web MIDI listener, scoring against `AlphaSynth.positionChanged`, ring overlay via `boundsLookup`.
