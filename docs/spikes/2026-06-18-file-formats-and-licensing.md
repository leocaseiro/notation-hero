# File formats (.mid vs Guitar Pro / MusicXML) + Licensing & App-Store compliance

|                     |                                                                                                                                                                                                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Date documented** | 2026-06-18                                                                                                                                                                                                                                                                                                              |
| **Origin**          | drum-tutor-clone (now Notation Hero) early office-hours / scope / plan-review sessions                                                                                                                                                                                                                                  |
| **Status**          | **Prior art** — research from the drum-tutor-clone phase. Most facts are 2026-time-sensitive; see "Re-verify before building". Do not treat stack picks (React 19 / Pulumi / CDK / Capacitor / AWS) as current — they conflict with the ongoing clean-slate rethink and are out of scope here.                          |
| **Related spikes**  | `webmidi-input-ios-bridge` (the MIDI input bridge + multi-zone mapping), `alphatab-integration`, `game-scoring-engine`, `audio-engine-and-latency`, `cross-platform-shell-and-distribution`. This doc is the FULL feature spec for the two linked threads below; it cross-references those, it does not re-derive them. |

---

## TL;DR

Two linked research threads from the early sessions:

1. **File formats.** AlphaTab gives **notation-grade** import only from **Guitar Pro (GP3–GP7) and MusicXML** (plus its own AlphaTex text format and CapXML). A raw **`.mid`** file is "just note numbers on channel 10" — turning it into clean _standard notation_ needs **quantization + GM-percussion→staff mapping + voicing/beaming**, which is **heuristic and lossy** and **melody-oriented tools do it badly for drums**. The decision reached: **two paths** — Guitar Pro / MusicXML = rich notation path via AlphaTab; raw MIDI = parse with `@tonejs/midi`, drive the **friendly "falling-notes" view easily** (it only needs timings + lanes), and accept rougher output (or extra work) for the standard-notation view.

2. **Licensing & App Store.** The user explicitly asked to **evaluate licenses + App-Store compatibility before locking the stack**. Result after reading the actual LICENSE files: **AlphaTab is MPL-2.0** (file-level copyleft — App-Store-fine as a normal npm dependency); the user's **alphaTabWebsite fork is also MPL-2.0** (a derivative — must stay MPL-2.0; extract only the _logic patterns_ into a clean proprietary app, never copy files); a **GPL-3** reference app is App-Store **incompatible** for a closed paid app (VLC-for-iOS precedent — treat any GPL-3 codebase as _reference only_, never copy/adapt code). The closed $2 app stays compliant via a **clean-room production repo** that uses `@coderline/alphatab` as a plain npm dependency, plus a `LICENSE-NOTES.md` documenting the boundary.

> **Important correction captured here:** the earliest scope/office-hours docs repeatedly called AlphaTab **"MIT"**. That was wrong. When the user asked to verify licenses, the agent read the repos' LICENSE files and corrected AlphaTab → **MPL-2.0** and confirmed the GPL-3 reference app's license → **GPL-3**. Anywhere old prior-art docs say "AlphaTab (MIT)", treat it as superseded by MPL-2.0.

---

## Thread 1 — File formats: what AlphaTab parses, and the raw-MIDI lossiness

### What AlphaTab imports (from the sessions' web research)

- **Notation-grade importers:** Guitar Pro **3-5** (`.gp3/.gp4/.gp5`), Guitar Pro **6** (`.gpx`), Guitar Pro **7** (`.gp`), **MusicXML** (`.xml`/`.musicxml`), **CapXML** (`.cap`), and **AlphaTex** (AlphaTab's own text format).
- **Drum / percussion support** landed in **AlphaTab 1.4** (percussion clef, drum-kit notation, X-noteheads for cymbals, multiple drum voices per staff, articulations). It uses the **same drum-tab notation as Guitar Pro 5**.
- **AlphaTex drum support:** AlphaTex **supports drum / percussion notation since May 2024** — see [CoderLine/alphaTab#1493](https://github.com/CoderLine/alphaTab/pull/1493) ("Add Support for Percussion Tabs in alphaTex", merged 2024-05-16): activate percussion via `\instrument`, then write hits as numeric, full-text, or short-hand identifiers. ⚠️ This **overturns** the earlier prior-art claim that AlphaTex had no drum notation — that research was out of date. (Separately, MusicXML percussion support was still evolving in early 2026.)
- **Playback:** AlphaTab converts the data model into MIDI commands played by an embedded synth (**alphaSynth**, TinySoundFont-based, **SoundFont2/3**). So display + playback are one library.
- **Output is SVG**, and AlphaTab exposes **note bounding boxes / geometry** (`boundsLookup`, note-bounds) — the hook the per-note feedback overlay rides on (covered in the alphatab-integration / scoring spikes).

### The raw-MIDI → standard-notation lossiness (the core finding)

Two "honest caveats" stated directly in a session:

> **"MIDI files give you worse notation than Guitar Pro files."** AlphaTab's notation-grade import formats are Guitar Pro and MusicXML. **A raw `.mid` file is just note numbers on channel 10** — turning that into clean drum _notation_ requires **quantization + GM-percussion→staff mapping (heuristic, lossy)**.

The decision framed as a **two-row difficulty split**:

| Task                                            | What it needs                                                                         | Difficulty                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **MIDI → falling-notes** (friendly / game view) | Just note **timings + which drum** (lane). Raw MIDI gives this directly.              | 🟢 Easy everywhere — it's just timed events        |
| **MIDI → standard notation** (sheet-music view) | Quantize timing, infer meter, map to staff positions, voice stems, beam, X-noteheads… | 🔴 Hard everywhere — this is music _transcription_ |

> "Your 'at least support MIDI files' goal is mostly the _top_ row — trivial in any stack because it's just timed events."

**Why melody-oriented converters are bad for drums** (from the rejected "ABCUnity + MIDI→ABC" alternative, with midi2abc research quoted):

- MIDI→ABC converters are **melody-oriented / lossy** — "bad at drums."
- midi2abc finding: "MIDI is just a series of events… timings need not correspond to anything in conventional notation, so a converter tries a 'best fit' to notation — but sometimes the resulting notation can be **quite weird with odd note lengths**."
- **Quantization limit:** "midi2abc quantizes note durations to **half the L: value**" (e.g. L:1/8 → smallest extractable note is a 1/16th) — too coarse for some music.
- **Polyphony / chords** (which drums are — kick+snare+hat at once) are where these converters struggle most.
- (Related: the rejected **Godot** option had a known bug — it **drops _simultaneous_ MIDI events**, "disqualifying for drums.")

### Decision reached then (prior art)

- **Inputs to support:** Guitar Pro + MusicXML = **rich notation path** (AlphaTab does it natively). Raw `.mid` = parse with **`@tonejs/midi`**, feed the **friendly falling-notes view** directly; for the standard-notation view either do extra transcription work or accept rougher output.
- The scope explicitly wanted **both** MIDI and Guitar Pro as user-uploadable inputs ("allow the user to choose a file in format to play/listen to midi and/or guitar pro").
- A second tempo caveat was banked alongside: **tempo change on a MIDI/synth is trivial (it's a sequencer); tempo change on an MP3 backing track needs time-stretching** — different problem, relevant when MP3/MP4/YouTube backing tracks come in.

---

## Thread 2 — Licensing & App-Store compliance for a closed $2 paid app

### The trigger

The user's exact ask (paraphrased from the session): _"Because I don't own most of the AlphaTabWebsite, we should **evaluate licenses and issues with App Store before finally deciding the full stack**."_ This forced reading the actual LICENSE files of the fork, AlphaTab, and a GPL-3 reference app.

### License compatibility table (App-Store gate) — corrected, prior art

| Dependency / repo                                                     | License          | App Store (closed paid app) | Notes                                                                                                                                                                                                                                |
| --------------------------------------------------------------------- | ---------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@coderline/alphatab` (AlphaTab core)                                 | **MPL-2.0**      | ✅ Compatible               | **File-level copyleft only.** Modifications _to AlphaTab's own source files_ must stay open; **new files that merely call AlphaTab's APIs can be proprietary.** Used as a plain npm dependency, it imposes nothing on your app code. |
| `alphaTabWebsite` fork (user's `rhythm-game` branch)                  | **MPL-2.0**      | ✅ Compatible               | It's a **derivative work — it _must_ stay MPL-2.0.** Strategy: treat the fork as a **research playground**; **extract only the _logic patterns_ (your additions), not the source files**, into the clean app.                        |
| a GPL-3 reference app                                                 | **GPL-3**        | 🚫 **INCOMPATIBLE**         | GPL-3 conflicts with Apple's DRM / redistribution terms (**VLC-for-iOS precedent**). **Reference patterns ONLY — do not copy or adapt code** into a proprietary product.                                                             |
| Tone.js, RxDB, Legend-State, PixiJS, React, Capacitor, `@tonejs/midi` | MIT / Apache-2.0 | ✅ Compatible               | All App-Store friendly.                                                                                                                                                                                                              |

(The actual **Mozilla Public License v2.0** text and the **GNU GPL v3** text were both read from the repos during the session, confirming the labels — this is not a guess from package metadata.)

### Why MPL-2.0 is fine but GPL-3 is not (the reasoning)

- **MPL-2.0 = file-level (weak) copyleft.** The copyleft boundary is the _file_. As long as you don't modify AlphaTab's own files (you use it as an npm dep), your own files stay under whatever license you choose, including proprietary. Distribution through the App Store is unaffected.
- **GPL-3 = strong copyleft + anti-DRM / installation-information terms** that collide with Apple's App Store distribution agreement and DRM. The well-known **VLC-for-iOS** episode is the precedent. So GPL-3 code cannot be shipped inside a closed paid App-Store app. A GPL-3 app therefore is **look-and-learn only**: study the patterns, write your own implementation, never paste its code.

### How the paid app stays compliant (the "practical play")

1. **Keep the alphaTabWebsite fork as a research playground**, under MPL-2.0 (it has no choice — it's a derivative).
2. **Start the production app as a clean repo.** Depend on `@coderline/alphatab` as a **normal npm package**. New code you write there can be proprietary.
3. **Clean-room rewrite, don't copy files.** Re-implement the working patterns (AlphaTab init with note bounds, Web-MIDI listener, scoring against `AlphaSynth.positionChanged` ticks, the ring overlay via `boundsLookup`, auto-BPM, accuracy-coloured score) by **opening the fork in a separate window for reference and writing fresh in your own style** — this protects the MPL-2.0 file boundary.
4. **Never pull code from a GPL-3 app.** Learn from it, write your own version of the patterns.
5. **Add a `LICENSE-NOTES.md`** at the repo root stating: _"Production code is proprietary. Depends on @coderline/alphatab (MPL-2.0) as an npm dependency only. No source files copied from the alphaTabWebsite fork (also MPL-2.0). No GPL-3 code is a dependency — reference patterns only."_

### Repo visibility vs license (a distinct, useful clarification)

The sessions separated **two orthogonal axes** people conflate:

- **Visibility** (who can _see_ the code): Public vs Private.
- **License** (what people may legally _do_ with code they can see): Proprietary / MIT / GPL / …

Key points captured:

- **You can have a PUBLIC repo with a PROPRIETARY license** — this is **"source-available"**: anyone can read it, nobody may legally copy/use/sell/redistribute it.
- A repo with **no LICENSE file defaults to "all rights reserved"** — but add an explicit proprietary LICENSE so terms are unambiguous.
- Proposed default: **Public repo + proprietary "All Rights Reserved" LICENSE** — gets unlimited free GitHub Actions minutes while keeping every legal right. Rationale given: for a $2 app, the **moat is the native MIDI bridges + the AWS backend + App-Store convenience, not the web source** (a comparable GPL-public app still ran as a business). _(This is a strategy preference, not a license fact — re-decide per current goals.)_

### App-Store / store economics touched in the same thread (time-sensitive)

- **Apple Developer Program: $99 / year** — required for App Store _and_ TestFlight (cheapest way onto friends' iPhones/iPads).
- **Google Play Console: $25 one-time** fee.
- **PWA path = no store fee, no review queue** (Web MIDI works on Chrome/Edge incl. Android). Trade-off: "looks less app-y."
- Note from a session: **soundfont licenses** are a separate thing to sanity-check if you ever bundle/redistribute a SoundFont.

---

## Decisions reached then (labeled prior art — re-confirm, don't assume current)

1. **Formats:** Guitar Pro + MusicXML = notation-grade path (AlphaTab native). Raw MIDI = `@tonejs/midi` for the friendly view; rougher / extra-work path for standard notation. Both accepted as inputs.
2. **AlphaTab license corrected to MPL-2.0** (was mislabeled "MIT" in earlier docs). App-Store-fine as an npm dependency.
3. **GPL-3 reference apps = reference only**, never copy code (App-Store DRM/redistribution conflict; VLC-for-iOS precedent).
4. **alphaTabWebsite fork stays MPL-2.0; production app is a clean-room rewrite** depending on AlphaTab via npm, with a `LICENSE-NOTES.md` boundary note.
5. **Repo model proposed:** Public + proprietary "All Rights Reserved" LICENSE (source-available), for free CI without giving up rights. _(Strategy, not law.)_

---

## Re-verify before building (2026 time-sensitive)

- **AlphaTab license = MPL-2.0** — re-read `LICENSE` in `@coderline/alphatab` (and the user's fork) at the version you actually pin. Confirm it hasn't relicensed. The "MIT" label in older docs is wrong; verify MPL-2.0 still holds.
- **AlphaTab format support & versions** — GP3–GP7 / MusicXML / CapXML / AlphaTex and the **drum-since-1.4** fact were from early-2026 web search. (The old "AlphaTex-has-no-drums" claim was **wrong** — AlphaTex has had drums since May 2024, [alphaTab#1493](https://github.com/CoderLine/alphaTab/pull/1493); corrected above.) Re-check the current AlphaTab release notes (MusicXML percussion work was actively evolving).
- **GPL-3 reference app license = GPL-3** — licenses and availability can change (a referenced app may go private or relicense); re-confirm the exact license and status before relying on any such app even as a reference.
- **VLC-for-iOS / GPL-3 + App Store precedent** — re-confirm Apple's current App Store / DRM terms vs GPL-3; this is the load-bearing legal claim for the "no GPL code in the paid app" rule. Consider a 5-minute check rather than trusting the prior-art memo.
- **Store fees** — Apple $99/yr and Google Play $25 one-time were 2026 figures; re-check current pricing (and any new Apple/Google policy on $-priced apps, EU/DMA alternative-distribution changes).
- **`@tonejs/midi`** maintenance / version — vet before adopting (per the tool-vetting rule).
- **`midi2abc` quantization specifics** (half-L: rule) describe one tool's behaviour, not a universal law — if a real MIDI→notation transcription path is built, re-evaluate current libraries (the lossiness _principle_ stands; the specific numbers are tool-specific).
- **SoundFont license** — if any SoundFont is bundled/redistributed, check its license separately.
- Ignore the surrounding stack picks (React 19, Pulumi/CDK, Capacitor, AWS services, RxDB/Legend-State, "public repo for free CI") — those belong to the old stack era and are under active rethink.

---

## Sources / quotes (drum-tutor-clone session transcripts)

Session JSONL files under `~/.claude/projects/-Users-leocaseiro-Sites-drum-tutor-clone--claude-worktrees-*/`:

- `...pensive-boyd-6d17e3/53466813-...jsonl` (main office-hours / handoff)
- `...serene-grothendieck-fb5e67/c9615811-...jsonl` and `.../9d6a169e-...jsonl` (stack + AWS brainstorms, scope.md)
- `...recursing-feistel-29cb4e/fdc2c0ed-...jsonl`

Verbatim quotes captured:

- **Lossiness (caveat):** *"MIDI files give you worse notation than Guitar Pro files. AlphaTab's notation-grade import formats are Guitar Pro and MusicXML. A raw `.mid` file is just note numbers on channel 10 — turning that into clean drum *notation* requires quantization + GM-percussion→staff mapping (heuristic, lossy)."*
- **Gotcha line (scope doc):** _"MIDI files vs Guitar Pro: raw `.mid` → standard notation is lossy (quantize/voice/map). Guitar Pro/MusicXML = notation-grade. For the falling-notes view, raw MIDI is easy (just timings + lanes). Parse MIDI with `@tonejs/midi`."_
- **midi2abc research:** _"MIDI is just a series of events… so a converter tries to work out a 'best fit' to notation but sometimes the resulting notation can be quite weird with odd note lengths… midi2abc quantizes the note durations to a length of half the L: value."_
- **AlphaTab formats:** _"AlphaTab has importers for Guitar Pro 3-5 (.gp3/.gp4/.gp5), GP6 (.gpx), GP7 (.gp), MusicXML (.xml), CapXML (.cap), and alphaTex…"_ — ⚠️ **the rest of this session quote ("alphaTex does not support any kind of drum notation") is factually wrong and superseded:** AlphaTex has supported drums since May 2024 ([alphaTab#1493](https://github.com/CoderLine/alphaTab/pull/1493)). Kept here only to show what the original out-of-date research claimed.
- **User trigger:** _"because I don't own mostly of the AlphaTabWebsite, we should evaluate licenses and issues with app store, before finally decide the full stack."_
- **License table (committed in `docs/design-stack.md`):** AlphaTab MPL-2.0 ✅ file-level copyleft; alphaTabWebsite fork MPL-2.0 ✅ (must stay MPL-2.0, extract logic patterns only); the GPL-3 reference app GPL-3 🚫 INCOMPATIBLE — "GPL-3 conflicts with Apple's DRM/redistribution restrictions (VLC-for-iOS precedent)… reference for ideas/patterns ONLY."
- **`LICENSE-NOTES.md` text:** _"Production code is proprietary. Depends on @coderline/alphatab (MPL-2.0) as an npm dependency only. No source files copied from the alphaTabWebsite fork (also MPL-2.0). No GPL-3 code is a dependency — reference patterns only."_
- **Source-available:** _"You can have a PUBLIC repo with a PROPRIETARY license. That's called 'source-available'… A repo with no license file defaults to 'all rights reserved'."_
- **Store fees:** _"Apple Developer Program ($99/year)… Google Play Console (one-time $25 fee)."_ and _"PWA → no App Store fees, no review queue."_

External URLs referenced in-session: alphatab.net/docs/formats/musicxml, alphatab.net/docs/reference/score (Data Model), github.com/CoderLine/alphaTab. (A GPL-3 reference app and a browser living-sheet-music app were also reviewed as existence proofs — names kept private per the competitor-name scrub.)
