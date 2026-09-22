# Cross-platform shell + distribution

> **Date documented:** 2026-06-18
> **Origin:** drum-tutor-clone phase (re-consolidated from early office-hours / brainstorm sessions)
> **Status:** prior-art research — feature/engineering facts + reasoning, NOT a current tooling decision

---

## TL;DR / Verdict

During the early "drum-tutor-clone" office-hours sessions, the cross-platform question was worked through a multi-round premise process and landed on:

**Capacitor + AlphaTab + PWA** (called "Approach A") — **one TypeScript codebase, three distribution channels**:

- **App Store** → iPad (Capacitor shell + native CoreMIDI bridge)
- **Play Store** → Android tablet (Capacitor shell + native `android.media.midi` bridge)
- **PWA via Chrome/Edge** → Windows + Mac (Web MIDI, ~10-20ms)

This won over **Flutter** (Approach B, rejected: Dart learning curve + AlphaTab-in-WebView friction) and **pure-web PWA only** (Approach C, kept as a possible "Phase 0 spike" but rejected as the destination because iPad Safari lacks Web MIDI and it kills the App Store path).

Two shell technologies were explicitly handled:

- **Tauri — RULED OUT.** Tauri's Mac shell is WKWebView (Safari engine) → **no Web MIDI on Mac**. Tauri's Windows shell is Edge WebView2 → **same Web MIDI as a PWA, zero latency win**. So Tauri gives nothing over a PWA and breaks MIDI on Mac.
- **Electron — DEFERRED to v2.** Electron is Chromium-based, so Web MIDI works on Win + Mac + Linux from one codebase, but it doubles build/distribution work. PWA is the v1 desktop move; add Electron later only if users want a "real" installer.

**Why this shape:** web/TypeScript is the user's strongest skill, the AWS-learning goal lives in the backend (not the shell), iPad is the daily-driving device, and there is a concrete competitor gap (the horizontal-highway drum app's gap) that the custom-song-upload feature directly attacks.

> ⚠️ This is **prior-art** from the drum-tutor-clone phase. The shell/distribution _reasoning_ still holds, but treat the specific tool picks (Capacitor, version pins) as inputs to a decision, not as a locked stack — the project's tooling foundation has since been reopened.

---

## The decision arc (how it was reached)

The premises were revised **three times** as the user pushed back. Capturing the arc shows _why_ each constraint landed where it did.

### User's stated goals (verbatim)

When asked what kind of project this is:

> _"A bit of each. I might release open source, but not sure. For now, I want for myself and some friends, but it would be nice to release a $2 tablet app or something like that too, not gonna lie. I also want to use to level up my aws/cloud skills."_

And on the platform / competitor landscape:

> _"I like to play my drums with my iPad, more than my mac. If we manage to release to iPad, we could support M1+ from App Store, right? The heavier competitor from Drum Tutor is called the horizontal-highway drum app, which actually partnered with Roland, but they are lacking of 2 things: 1. no custom songs (upload my own midi or guitar pro file for example) — its users are asking 2. no Android app (its users are also asking). I am not sure how windows users would work if we go with the tablet iPad/Android option."_

These three goals — **iPad daily-driver**, **$2 app stretch**, **AWS-skills learning** — plus the horizontal-highway drum app's gap drove every premise.

### Premise evolution (P1–P6)

**Round 1 (initial):**

- **P1.** iPad is primary; Mac M1+ comes free via App Store toggle. Windows v1 = PWA, v2 = Tauri.
- **P2.** <20ms perceived latency forces a hybrid (Capacitor) or native (Flutter / Swift+Kotlin) stack — NOT pure web.
- **P3.** Web background is the biggest accelerator. Learning Dart (Flutter) or Swift+Kotlin from scratch adds 3-6 months before shipping anything playable. Stack should lean TypeScript-heavy.
- **P4.** Custom song upload (MIDI + Guitar Pro) is the wedge that beats the competitor; AlphaTab (MIT) solves Guitar Pro parsing + notation rendering + audio synthesis in one library (load-bearing dependency).
- **P5.** The AWS-skills goal is satisfied by the **cloud layer** (song library, accounts, score history, leaderboards, user-uploaded file storage) — not the core product, but real.
- **P6.** Distribution: App Store (iPad + M-Mac), Play Store (Android), PWA (Win v1) → Tauri (Win v2). Three channels max.

**User push-back #1 — "where does Android come in?"** → P1 had buried Android.

- **P1 (revised).** iPad + Android tablet are **co-primary** (both "I play drums here" devices). The Capacitor path treats iOS and Android equally — one TS codebase, two native shells, both get the same native MIDI bridge plugin. Android USB MIDI works through `android.media.midi`; BLE MIDI also works. The Android effort is mostly "test on real hardware," not "rewrite."

**User push-back #2 — Windows MIDI latency via PWA/Tauri?** → led to the honest latency table (below) and a softer P2.

- **P2 (revised).** <20ms feel is the dealbreaker on the **primary** platforms (iPad, Android, Mac). Windows v1 accepts ~10-20ms via Web MIDI (good enough for casual practice, not pro-grade). A native ASIO/WinMM bridge inside an Electron/native layer is a v3 idea if Windows ever becomes serious.

**User push-back #3 — observed an existing iPad app ("InstaDrum") behaving badly on an M-series Mac** → killed "iPad-on-Mac" as the Mac strategy and exposed the Tauri/WKWebView gap.

- **P1 (third revision).** Three distribution channels:
  - App Store: iPad (Capacitor + native CoreMIDI bridge)
  - Play Store: Android tablet (Capacitor + native `android.media.midi` bridge)
  - PWA: Windows + Mac via Chrome/Edge (Web MIDI, ~10-20ms)
  - "Designed for iPad on Mac" is an **experimental bonus, NOT the Mac strategy**.
- **P6 (revised).** Distribution: App Store + Play Store + PWA. **Electron desktop wrapper deferred to v2. Tauri ruled out (WKWebView lacks Web MIDI).**

---

## Why web-TypeScript + Capacitor (over Flutter / React Native / native Swift+Kotlin)

The three approaches were laid out with real effort + risk estimates:

### Approach A — Capacitor + AlphaTab + PWA _(chosen)_

- **Frontend:** TypeScript + Vue 3 or React + Tailwind
- **Music core:** AlphaTab (Guitar Pro parser + notation renderer + audio synth, all one TS library, MIT)
- **Audio:** Tone.js (metronome, count-in, backing tracks)
- **MIDI:** desktop PWA → Web MIDI API directly; iPad → small Swift bridge → CoreMIDI; Android → small Kotlin bridge → `android.media.midi`
- **Build:** Vite + Capacitor CLI
- **Effort:** M (3-6 months solo, weekend pace, to first playable). **Risk:** Medium (Capacitor MIDI bridge maturity is the main unknown).
- **Pros:** maps to strongest skill (web TS); one codebase → three channels; AlphaTab is a 50%+ product head-start; AWS layer naturally hits the cloud-skills goal; easy graduation path (add Electron v2 from same code); iPad latency (~5-10ms via CoreMIDI) hits the gold-standard target.
- **Cons:** must write small Swift + Kotlin MIDI bridge plugins; Mac users get PWA only (no native installer in v1); Web Audio latency varies by OS (Win PWA ~10-20ms, acceptable).

### Approach B — Flutter cross-platform _(rejected)_

- **Frontend:** Dart + Flutter. **Music core:** AlphaTab **inside an embedded WebView** (Flutter lacks a native notation library). MIDI via `flutter_midi_command` (iOS/Android/macOS) + a smaller-community native Windows MIDI plugin.
- **Effort:** L (6-9 months solo; learning Dart + WebView marshalling). **Risk:** Medium-High.
- **Pros:** native MIDI on all 4 platforms (Windows ~5-10ms, golden); native Mac installer; fast hot reload.
- **Cons:** **don't know Dart (1-2 months to feel productive)**; WebView-for-notation = worst-of-both-worlds (layout drift, event marshalling, scroll-sync); Flutter Desktop binaries 40-80MB; AWS Amplify Dart support lags JS; `flutter_midi_command` Windows support is community-maintained.

> Same reasoning that sank Flutter applies to **native Swift+Kotlin** and **React Native**: notation rendering libraries are weak/absent on native (you end up porting a JS notation lib via WebView anyway), and learning a new language from scratch adds 3-6 months before anything is playable. The early stack-expertise question explicitly noted: _"Notation rendering libraries are weaker on native; you may end up porting a JS lib via WebView."_

### Approach C — Pure web PWA, ship-this-weekend _(kept as Phase-0 spike, rejected as destination)_

- Approach A's web layer **minus Capacitor**. Deploy as PWA (CloudFront + S3).
- Win/Mac/Android Chrome: works fully (~10-25ms). **iPad Safari: visual play-along only (no Web MIDI).**
- **Effort:** S (4-8 weekends to first playable). **Risk:** Low to ship, High to satisfy the iPad-MIDI promise.
- **Pros:** fastest possible demo; zero installer/App-Store/review overhead; easy upgrade ("wrap this in Capacitor").
- **Cons:** iPad (the daily driver) gets a crippled experience; kills the $2-app stretch goal; weaker AWS-learning vector.

### The decisive trade-off

Approach A is **"the only one that simultaneously hits iPad daily driver + Android + web background + AWS skills + $2-app stretch + the market-gap wedge."** A graduation path exists: ship C first to learn, then "add Capacitor shell + MIDI bridge plugin" to become A.

---

## Why Tauri was ruled out (and Electron only deferred)

The native-desktop wrapper choices were narrowed to:

| Wrapper                  | Web engine                                   | Web MIDI?                                 | Verdict                                                          |
| ------------------------ | -------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| **PWA** (Chrome/Edge)    | Chromium/Blink                               | ✅ Win + Mac                              | **v1 desktop choice** — no installer, but works                  |
| **Tauri**                | Mac = **WKWebView**, Win = Edge **WebView2** | ❌ Mac (WKWebView), ✅ Win (=same as PWA) | **Ruled out** — breaks Mac MIDI, no Win win                      |
| **Electron**             | Chromium (bundled)                           | ✅ Win + Mac + Linux                      | **Deferred to v2** — real installer, but doubles build/dist work |
| **Native Mac (SwiftUI)** | n/a                                          | n/a                                       | rejected — would have to learn Swift                             |

Key quote:

> _"There's a gotcha worth knowing now: **Tauri on Mac uses WKWebView (Safari engine), which doesn't support Web MIDI.** So you can't use Tauri to wrap your web app on Mac and expect MIDI… Tauri is out for this product because of the WKWebView gap."_

And on Windows specifically:

> _"Tauri uses Edge WebView2 → same Web MIDI → same WinMM. No latency win from Tauri itself."_

So the refined desktop play became: **PWA v1 for Win + Mac → Electron v2 if a "real" desktop installer is wanted.**

### Windows MIDI latency table (the honest breakdown)

| Path                          | Windows MIDI latency   | Notes                                                                                                                |
| ----------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Web MIDI in Chrome/Edge (PWA) | ~10-20ms round-trip    | Uses WinMM under the hood. "Feels okay" but a serious drummer notices it's not as tight as iPad.                     |
| Tauri with WebView2           | ~10-20ms (same as PWA) | Same Web MIDI / WinMM. No latency win from Tauri.                                                                    |
| Native Win + WinMM (direct)   | ~8-15ms                | Slight win — no browser sandbox.                                                                                     |
| Native Win + ASIO drivers     | ~3-8ms                 | What native e-drum tutor apps use. Requires bundling/asking users to install ASIO4ALL or FlexASIO. Native code only. |

Conclusion: PWA/Tauri Windows = ~10-20ms — perceptibly worse than iPad (~5-10ms via CoreMIDI) but still "playable, fun, can practice." Pro-grade Windows needs a native ASIO/WinMM layer (v3, "likely never, given iPad is primary").

---

## The three distribution channels (final shape)

1. **App Store → iPad** (primary). Capacitor shell + native CoreMIDI bridge. ~5-10ms latency (gold standard). Built via Xcode. Intended as a **$2** paid app.
2. **Play Store → Android tablet** (co-primary). Same TS codebase, Capacitor shell + native `android.media.midi` (Kotlin bridge). ~10-15ms latency (very close to iPad). Built via Android Studio. Also intended **$2**.
3. **PWA via Chrome/Edge → Windows + Mac** (free, no App Store fee/review). Web MIDI, ~10-20ms. **Mac Safari does NOT support Web MIDI**, so the PWA must be opened in Chrome/Edge — a PWA on Mac Safari is "half-broken."

> **"Designed for iPad on Mac"** is a **bonus toggle, not the Mac strategy.** Checking _"Make App Available on Mac"_ in App Store Connect publishes the iPad app to **Apple Silicon Macs only (M1, M2, M3, M4+)** — one iPad build also serves M-series Macs (and iPhone), zero extra effort. **BUT** the user observed an existing drum app ("InstaDrum") misbehaving on an M-series Mac, and that tracks with known issues: the iOS-on-Mac runtime layer (formerly "iOSMac"/Catalyst-adjacent) gives audio+MIDI apps **higher default audio buffers (more latency)**, **MIDI device-enumeration quirks** (some hardware shows up, some doesn't), and **sample-rate negotiation issues**. **Plan against relying on iPad-on-Mac MIDI** — Mac is served by the PWA instead.

---

## "Web is your strongest skill" + AWS-learning reasoning

Two threads underpin the whole stack choice:

1. **Strongest-skill lever (P3).** The user's web/TypeScript background is "the biggest accelerator." Choosing Dart or Swift+Kotlin would front-load 1-6 months of language learning before anything is playable. The recommended stack therefore stays TypeScript-dominant; the only non-TS code is **small Swift + Kotlin bridge plugins for MIDI** (P3: _"No Dart, no Swift, no Kotlin for the app proper. Small Kotlin + Swift bridge plugins only for MIDI."_).

2. **AWS goal lives in the backend, not the shell (P5).** The cloud-skills goal is satisfied by the server layer — song library + search, user accounts + score history, leaderboards, user-uploaded MIDI/GP file storage. _"Not the core product, but real."_ A doc-review note flagged that for a _cloud-learning_ goal, raw Lambda + DynamoDB + S3 + Cognito (via IaC) is a better learning vector than Amplify, because "Amplify hides the parts the user wants to learn." (This aligns with the project's later auth/backend decisions — kept here only as the original reasoning.)

---

## The market-gap insight

This was flagged as the strategic core of the whole thing:

> _"You just told me something important without flagging it: 'The horizontal-highway drum app's users are asking for custom song uploads and Android support.' That's not 'I think there's a market.' That's evidence of demand from a paying user base at a partner-of-Roland competitor. Two specific gaps, two specific complaints, one specific competitor. That's a wedge."_

- **Gap 1 — custom song upload** (own MIDI / Guitar Pro file). Directly carried by **AlphaTab** (parses `.gp/.gpx/.gpx5`; `@tonejs/midi` for `.mid`). This is the **wedge feature** (P4).
- **Gap 2 — no Android app.** Capacitor covers Android as a co-primary target at no extra codebase cost.

The conclusion: _"you have a real path to a $2 app that beats [the competitor] on the two things their own users want."_

> **Note on competitor naming:** project convention (see project memory "No competitor names in docs") is to use generic feature names in durable docs. The competitor name appears here only because it is load-bearing to the _prior-art quote_. When this insight is carried into current docs, refer to it as "the dominant drum-trainer's two gaps" rather than by brand.

---

## Decisions reached then (prior art — confirm before treating as current)

| #   | Decision                                                                              | Status as prior art                                                                |
| --- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| D1  | Shell = **Capacitor** (web TS), not Flutter/RN/native                                 | Chosen 2026-06 (drum-tutor-clone); shell tech NOT re-locked since — treat as input |
| D2  | **Tauri ruled out** (WKWebView lacks Web MIDI on Mac; WebView2 no Win win)            | Reasoning durable; re-verify WKWebView Web-MIDI status before reopening            |
| D3  | **Electron deferred to v2** (Chromium has Web MIDI everywhere, but doubles dist work) | Durable framing; PWA is v1 desktop                                                 |
| D4  | **iPad primary; Android co-primary; Mac = PWA; Windows v1 = PWA**                     | Durable platform priority                                                          |
| D5  | "Designed for iPad on Mac" = experimental bonus, **plan against its MIDI**            | Durable caveat                                                                     |
| D6  | Three distribution channels max: App Store / Play Store / PWA                         | Durable                                                                            |
| D7  | $2 paid app on iPad + Android; PWA free                                               | Re-confirm monetization intent + store pricing                                     |
| D8  | Native ASIO/WinMM Windows path = v3 "if ever"                                         | Durable (low priority)                                                             |

---

## Re-verify before building (2026 — version/platform-sensitive)

- **Capacitor MIDI bridge maturity.** No official `@capacitor/midi`; no shipping `@capacitor-community/midi` at research time (the community proposal issue dated to ~2020). **Both bridges (iOS Swift/CoreMIDI, Android Kotlin/`android.media.midi`) likely written from scratch.** The "~150 LoC each" estimate was called out as unsubstantiated — measure it. Doc-review suggested bumping the de-risking spike from 1 week to **2 weeks: iOS bridge + Android bridge + a measured latency floor**.
- **Web MIDI support facts** — re-confirm before relying on them: iPad/iOS Safari still lacks Web MIDI; Mac Safari still lacks it (Chrome/Edge OK); Tauri's Mac WKWebView still lacks it.
- **Version pins** (never set; flagged by doc-review): re-check current majors for AlphaTab (drum support ~1.4+, suggested `^1.5`), `@capacitor/core` (suggested `^6`), `tone` (`^15`), `@tonejs/midi` (`^2`).
- **Windows latency numbers** (Web MIDI ~10-20ms via WinMM; native WinMM ~8-15ms; ASIO ~3-8ms) are forum-sourced 2025/26 estimates, not measured here — re-benchmark if Windows gets serious.
- **App Store / Play Store fees + the "$2 app" assumption** — re-confirm current store pricing/policies and whether $2 is still the monetization shape.
- **Latency budget architecture caveat** (from doc-review): if every MIDI event crosses the Swift/Kotlin→JS bridge for scoring, bridge overhead (~5-15ms on iOS WKWebView in 2026 benchmarks) + Web Audio output (~10-20ms) blows the <20ms budget. **Lock the architecture: native captures MIDI + scores against a pre-loaded tick map; JS only receives `{noteId, verdict, ts}` events for rendering.** (This is a hit-detection/latency concern — see the separate audio-engine/latency spike if one exists.)
- **Shell tech is not locked by this doc.** The tooling foundation has been reopened since this research. Treat Capacitor + the version pins as a starting recommendation, not a binding decision.

---

## Sources / quotes

All drawn from the early **drum-tutor-clone** office-hours / brainstorm sessions (Claude Code JSONL transcripts under `~/.claude/projects/*drum-tutor-clone*/`).

**User quotes (verbatim):**

- _"A bit of each. I might release open source… For now, I want for myself and some friends, but it would be nice to release a $2 tablet app… I also want to use to level up my aws/cloud skills."_
- _"I like to play my drums with my iPad, more than my mac. If we manage to release to iPad, we could support M1+ from App Store, right? The heavier competitor from Drum Tutor is called the horizontal-highway drum app… they are lacking of 2 things: 1. no custom songs… 2. no Android app."_

**Assistant findings (verbatim fragments):**

- _"Tauri on Mac uses WKWebView (Safari engine), which doesn't support Web MIDI… Tauri is out for this product because of the WKWebView gap."_
- _"Electron (Chromium-based, Web MIDI works on Win + Mac + Linux from one codebase)… PWA v1 for Win + Mac → Electron v2 if you want a 'real' desktop installer experience."_
- _"'Two specific gaps, two specific complaints, one specific competitor. That's a wedge.'"_
- _"'Designed for iPad on Mac' runs iOS apps through a runtime layer… For audio + MIDI apps it's notorious for: higher audio buffer sizes by default… MIDI device enumeration quirks… Plan against it."_
- Final premises: _"P6 (revised). Distribution: App Store + Play Store + PWA. Electron desktop wrapper deferred to v2. Tauri ruled out (WKWebView lacks Web MIDI)."_

**External links surfaced during the sessions (latency research):**

- Audio latency iOS vs OSX — Loopy Pro Forum (`forum.loopypro.com/discussion/38870`)
- iOS Latency Comparison — Loopy Pro Forum (`forum.loopypro.com/discussion/42310`)
- Round Trip Audio Latency Meter for iOS (`onyx3.com/LatencyMeter/`)
- Apple Silicon plugin compatibility — W. A. Production (Zendesk)
- Core MIDI — Apple Developer Documentation (`developer.apple.com/documentation/coremidi/`)

_(External links are 2025/26-era forum/vendor pages — informational, re-verify if cited in a live doc.)_
