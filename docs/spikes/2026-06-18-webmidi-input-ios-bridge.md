# Spike: Web MIDI input + the iOS bridge/shim (e-drum input)

- **Date documented:** 2026-06-18
- **Origin:** prior research from the **`drum-tutor-clone`** phase (the project's former name), consolidated here + **re-verified** against current 2026 sources (caniuse, WebKit, npm).
- **Status:** Architecture-shaping FACTS (verified). The MIDI *feature* is later, but the **port seam + native-plugin capability must be designed in from the start**.
- **Why it matters:** Notation Hero is a drum tutor — **electronic-drum (MIDI) input** is core to gameplay. The platform support for the Web MIDI API is uneven, and **iOS has none**, which directly shapes the Capacitor/PWA mobile architecture.

---

## TL;DR

- **Web MIDI works** on desktop **Chrome/Edge/Firefox**, **Android Chrome**, and the **Capacitor Android WebView**.
- **Web MIDI does NOT work anywhere on iOS** — Safari, **WKWebView** (Capacitor's iOS engine), **and installed PWAs** are all WebKit; Apple declined it in 2020 (fingerprinting/privacy) and it's still absent in Safari 26 (2026). It is not coming.
- **Desktop Safari (Mac) also lacks it**, and **Tauri uses WKWebView on Mac → no Web MIDI** ⇒ **Tauri is ruled out**. **Electron** (Chromium) works on Win/Mac/Linux and is the desktop-v2 option.
- ⇒ iOS (and a tighter Android path) needs a **native MIDI bridge plugin**; the app must **abstract MIDI behind a port** with swappable adapters. **Never call `navigator.requestMIDIAccess` directly in app code.**
- **🍎 v1 UPDATE (2026-06-19)** (see the Decision section below): because the **web PWA ships first** and Capacitor iOS takes time, **iOS v1 ships on the *shim* (web), not native.** The "dead end" framing below is **outdated**: the real shim blocker was the `Array.from` MIDI-enumeration bug (fixed by a **manual `iter.next()` loop**, no `Array.from`), and AlphaTab audio is **validated** on the shim — so the shim is a viable v1 path. (Tone.js was never the blocker; see the 2026-06-19 correction in the Gotcha.) Native Capacitor + CoreMIDI = **fast-follow**, not the v1 gate.

## Verified platform matrix (2026)

| Platform | Web MIDI? | Path |
|---|---|---|
| Desktop Chrome / Edge / Firefox | ✅ | Web MIDI (WinMM on Win, CoreMIDI on Mac) |
| Desktop **Safari** (Mac) | ❌ | never shipped → use Chrome/Edge, or Electron |
| **Android** Chrome + Capacitor Android WebView | ✅ | Web MIDI works (native `android.media.midi` bridge optional for tighter latency) |
| **iOS** Safari / **WKWebView (Capacitor)** / installed PWA | ❌ | **native CoreMIDI bridge required** (all WebKit; Apple declined since 2020, absent in Safari 26) |

Sources: [caniuse.com/midi](https://caniuse.com/midi) · [MDN MIDIAccess](https://developer.mozilla.org/en-US/docs/Web/API/MIDIAccess) (Limited availability) · [WebKit Safari 26 beta notes](https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/) (no Web MIDI) · [HN: Apple declined 16 Web APIs (2020)](https://news.ycombinator.com/item?id=23676109).

## Latency budget (the dealbreaker)

Drum hits feel "right" under ~10ms round-trip; ~20ms is mushy; ~40ms is broken. **Target: <20ms perceived on the primary platforms (iPad / Android / Mac).**

| Path | Round-trip | Notes |
|---|---|---|
| iPad **CoreMIDI** (native bridge) | ~5–10ms | gold standard — primary target |
| Android `android.media.midi` (native bridge) | ~10–15ms | very close to iPad |
| Desktop PWA **Web MIDI** (Chrome/Edge, WinMM) | ~10–20ms | "playable" for casual practice, not pro-grade |
| Native Win + **ASIO** | ~3–8ms | what Roland DT-1 / Melodics use; needs ASIO4ALL/FlexASIO; **v3 only** (likely never) |

> **JS-bridge overhead is tens of ms per call.** Sending *every* MIDI event across the native↔JS bridge would blow the budget.

## Architecture — MIDI behind a port + **native-side scoring**

1. **`MidiInputPort` (hexagon port)** with swappable adapters:
   - **Web MIDI adapter** — desktop PWA (Win/Mac via Chrome/Edge) + Android web/WebView.
   - **iOS CoreMIDI bridge adapter** — small **Swift** Capacitor plugin → CoreMIDI.
   - **Android `android.media.midi` bridge adapter** — small **Kotlin** Capacitor plugin (for tighter latency than Web MIDI; USB-MIDI + BLE-MIDI).
2. **🔑 Hit-scoring runs NATIVE-SIDE; only *verdict* events cross the JS bridge.** Because per-call bridge overhead is tens of ms, the native plugin must do hit-detection/scoring against the expected note window and emit only a small "score event" (hit/miss/early/late) to JS — *not* marshal every raw MIDI message. (Open: confirm the exact split when the player lands.)

## The iOS shim / plugin options

- **`WebMIDIAPIShimForiOS`** ([mizuhiki](https://github.com/mizuhiki/WebMIDIAPIShimForiOS)) — a polyfill used by the third-party **"Web MIDI Browser"** iOS app to expose the Web MIDI API shape on iOS. It actually **works** — Leo got it running (AlphaTab drum render + Web MIDI scoring) even on a **2016 iPad mini in 2026**. **→ For v1 this IS our iOS path** (decision 2026-06-19 below) — held together by two hard constraints (a **manual-loop MIDI adapter**, not `Array.from`; + smoke-testing any lib on the shim). The "dead end" framing in the Gotcha below was a conflation (corrected 2026-06-19); native Capacitor is the post-v1 upgrade, not a v1 requirement.
- **`capacitor-musetrainer-midi`** ([npm](https://registry.npmjs.org/capacitor-musetrainer-midi)) — the only community **Capacitor** MIDI plugin: wraps the `webmidi` JS lib on web, bridges **CoreMIDI** on iOS. **Stale:** v0.2.3 (2023), Capacitor 4, **iOS + Web only, NO Android**. Exposes `listDevices()`, `sendCommand()`, `addListener('deviceChange'|'commandReceive'|'connectError')`. → realistically **fork it or write a custom native plugin** (and add the Android side).

### ⚠️ Gotcha — why a *naive* shim PWA breaks, and the 2 constraints that fix it

The "Web MIDI Browser" app + `WebMIDIAPIShimForiOS` runs an **ancient JS engine** (that's *why* it still runs on a 2016 iPad mini). **The precise bug (re-verified empirically 2026-06-19):** `Array.from(midiAccess.inputs.values())` **silently returns `[]`** even though the inputs are there. Root cause — the `.values()` **iterator** isn't recognized as iterable on that engine (missing/old `Symbol.iterator`), so `Array.from` skips its iterator path and falls back to **array-like** reading; an iterator has no `.length`, so the result is empty (no error thrown). A real array (`Array.from(['a','b'])`) works (it's array-like); a **manual `iter.next()` / `!done` loop works** (it never needs `Symbol.iterator`). Leo filed it — **[mizuhiki/WebMIDIAPIShimForiOS#11](https://github.com/mizuhiki/WebMIDIAPIShimForiOS/issues/11)** (open since 2023-04-12). **⚠️ WebMIDI.js (webmidijs.org) v3.x uses the breaking `Array.from(interface.inputs.values())` internally** (verified in source) → `WebMidi.inputs` is empty on the shim; wrap `requestMIDIAccess` with a manual-loop adapter.

- **⚠️ CORRECTION (2026-06-19):** an earlier draft said *Tone.js* broke on the shim and that "even polyfilling Array.from wouldn't save you." That **conflated two unrelated things.** The `Array.from` failure is the **MIDI-enumeration** issue above and **is fixable** with a manual-loop adapter. **Tone.js was never used in the prototype** (not a dependency of any drum repo) and **doesn't touch the Web MIDI API**, so it cannot cause an `inputs.values()` failure. Whether Tone.js *independently* runs on the ancient engine (it's Web-Audio/ES2015+ on `standardized-audio-context`) is **plausible but UNVERIFIED** — untested. The one real residual caveat: the shim needs a third-party browser-app install (not a true installable PWA).
- **Two ways forward; v1 takes the cheap one.** (a) **Stay on the shim for v1** — the MIDI bug is fixed by the manual-loop adapter (no `Array.from`) and AlphaTab audio is validated. (b) **Outgrow it later** — native Capacitor (modern WKWebView) gives a modern JS engine + CoreMIDI bridge, removing the constraint entirely; that's the post-v1 upgrade, not a v1 requirement.
- **Therefore:** iOS v1 ships on the shim (decision below) via a **manual-loop MIDI adapter** (no `Array.from`) + AlphaTab's **validated** synth. Tone.js isn't part of this path — it's only a question *if* a future waterfall-view player chooses it (smoke-test then). Native Capacitor = fast-follow, not the v1 gate.
- Prior art from the old repo: a real commit `fix iOS support with navigator.requestMIDIAccess, removing .catch` — there *was* a working iOS Web-MIDI workaround in the earlier codebase worth digging up.
- File parsing (not input): **`@tonejs/midi`** for `.mid` files; **AlphaTab** for `.gp/.gpx`.

## ✅ Decision (2026-06-19): iOS v1 ships on the shim (web); native is a fast-follow

**Context:** limited solo-dev time, and Capacitor iOS done properly takes a while. v1 goal = **web PWA** (offline grows in over time). iOS will not be at v1 but **very soon after** — so the job is **not** to rush Capacitor iOS, it's to let the **web app load on iOS via the shim**. Decision: **every MIDI feature must stay shim-compatible**, and iOS users get a friendly **nudge** to the "Web MIDI Browser" app.

**Two hard constraints (the shim path only works if BOTH hold):**
1. **Shim-safe MIDI enumeration** — `Array.from(midiAccess.inputs.values())` silently returns `[]` on the ancient engine (the `.values()` iterator isn't seen as iterable → `Array.from` falls back to array-like → no `.length` → empty; [mizuhiki#11](https://github.com/mizuhiki/WebMIDIAPIShimForiOS/issues/11)). **Enumerate with a manual `iter.next()` loop** (verified working 2026-06-19). ⚠️ **WebMIDI.js v3.x uses the breaking `Array.from` form internally** → don't rely on `WebMidi.inputs` on the shim; wrap `requestMIDIAccess` with the manual loop. The old repo's `fix iOS support with navigator.requestMIDIAccess, removing .catch` commit is the reference.
2. **Smoke-test every JS library on the iOS-shim WebView before depending on it** — the ancient engine breaks some modern libs. **AlphaTab is already validated on the shim:** notation render + its **synth** + Web MIDI scoring all run on Leo's working JS-PWA prototype (iOS-shim + Android), so the **notation player + audio are proven**. ⚠️ **Not yet validated:** a future **waterfall-view player** (a separate new UI, not the notation view) — it may need **Tone.js** or another audio/timing lib. Tone.js is **untested on the shim** (Web-Audio/ES2015+, so it *may* not run on the ancient engine — verify, don't assume); AlphaTab's own **backing-track / external-media** player modes are a Tone-free option worth trying first.

**iOS nudge (intent only — NOT final copy):** when an iOS user opens the web app, show a short, friendly notice — Apple blocks Web MIDI in Safari, so to play with e-drums they install the free third-party **"Web MIDI Browser"** app and reopen the page there. Be transparent (no affiliate / commission relationship) and add a "native iOS app coming later" line. Small UX string — final wording TBD when the feature lands.

**Native fast-follow (post-v1):** Capacitor + CoreMIDI bridge (fork `capacitor-musetrainer-midi` or custom) for lower latency + a real App Store install — but it does **not** block v1.

## Distribution implication (from prior premises)

- **App Store:** iPad — Capacitor + native **CoreMIDI** bridge.
- **Play Store:** Android tablet — Capacitor + native **`android.media.midi`** bridge.
- **PWA:** Windows + Mac via **Chrome/Edge** (Web MIDI, ~10–20ms). *(PWA on iOS can't do MIDI → iOS needs the native build.)*
- **Electron** desktop installer = **v2** (Chromium, one codebase). **Tauri ruled out** (WKWebView, no Web MIDI). Native Win ASIO = v3-or-never.

## Related feature (out of scope to build now, but on record): multi-zone MIDI mapping

E-drum pads send different MIDI notes per zone (ride bell/edge/bow = 51/52/53/59/93…), but notation uses one note per instrument. Plan: **map multiple MIDI inputs → a single target note** (`MidiMappingContext`), with **presets** (Roland TD / Yamaha DTX) + **custom** + **persistent** (LocalStorage → user profile in DynamoDB), plus a **per-device latency-offset slider**. Any Web MIDI / CoreMIDI / `android.media.midi` input device is selectable (e-drums *and* keyboards).

## What to carry into the clean-slate build

- Treat the **`MidiInputPort` + adapters** as a first-class architectural seam (fits DDD/Hexagon).
- Keep **gameplay (Web MIDI, scoring, AlphaTab, canvas/PixiJS) client/native-side**; AWS is backend only (sync/auth/analytics).
- Plan the **iOS CoreMIDI Capacitor plugin** as a known build task (fork musetrainer or custom). Smoke-test **Web MIDI inside the Capacitor Android WebView** with real hardware before relying on it (inferred, not hardware-verified).
- The **native-side scoring** decision is the one to validate early — it gates the latency target.
