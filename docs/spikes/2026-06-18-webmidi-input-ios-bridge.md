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

- **`WebMIDIAPIShimForiOS`** ([mizuhiki](https://github.com/mizuhiki/WebMIDIAPIShimForiOS)) — a native-bridge **polyfill** that exposes the Web MIDI API *shape* backed by CoreMIDI inside a WebView. Proves the pattern; old/reference.
- **`capacitor-musetrainer-midi`** ([npm](https://registry.npmjs.org/capacitor-musetrainer-midi)) — the only community **Capacitor** MIDI plugin: wraps the `webmidi` JS lib on web, bridges **CoreMIDI** on iOS. **Stale:** v0.2.3 (2023), Capacitor 4, **iOS + Web only, NO Android**. Exposes `listDevices()`, `sendCommand()`, `addListener('deviceChange'|'commandReceive'|'connectError')`. → realistically **fork it or write a custom native plugin** (and add the Android side).
- Prior art from the old repo: a real commit `fix iOS support with navigator.requestMIDIAccess, removing .catch` — there *was* a working iOS Web-MIDI workaround in the earlier codebase worth digging up.
- File parsing (not input): **`@tonejs/midi`** for `.mid` files; **AlphaTab** for `.gp/.gpx`.

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
