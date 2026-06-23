# v1 Scope and Success Criteria (the canonical scope.md)

|                      |                                                                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Date documented**  | 2026-06-18                                                                                                                              |
| **Origin**           | drum-tutor-clone (early exploration; project later renamed Notation Hero)                                                               |
| **Status**           | **prior art** — research/spec from the drum-tutor-clone phase. Capture only; do NOT treat stack bindings as live decisions.             |
| **Source sessions**  | `/office-hours` + spec-review + `ce-doc-review` runs on branches `pensive-boyd-6d17e3` and `serene-grothendieck-fb5e67` (2026-06-03/04) |
| **Primary artifact** | the original `scope.md` (4853 bytes, 63 numbered lines, git commit `179185f "initial scope"`) — reproduced verbatim below               |

---

## TL;DR

This is the canonical **"what is v1"** document. The drum-tutor-clone repo started life as a single `scope.md` (no code) — a deep, nested feature checklist written by someone who had actually used the discontinued north-star product long enough to know what it was missing. An `/office-hours` session turned that scope into a tiered Success Criteria ladder (**Phase 0 → v1 → v1.5 → v2**), and a `ce-doc-review` pass caught several scope requirements the design doc had silently dropped and forced them back into v1.

Two things make this the most reusable single artifact:

1. **The verbatim numbered scope.md** is preserved below — future sessions don't need to re-derive "what should v1 do".
2. **Reviewers referenced scope by `§NN` = LINE NUMBER** (not heading). The line-ref → requirement → v1-status mapping table below is the traceability you'd otherwise lose.

> **Read this as prior art.** Every stack binding inside (Capacitor, native Swift/Kotlin bridges, AWS CDK, Tone.js, Vue-or-React, DynamoDB-as-storage, the $2-app/store-launch framing) predates the clean-slate tooling rethink and is **stale**. Keep the FEATURE requirements; discard the scope-era stack choices.

---

## Part 1 — The canonical `scope.md` (verbatim prior art)

> Reproduced from the `cat scope.md` output captured in-session. Line numbers are the original file's. This is the source of every `§NN` line-ref reviewers used.

```text
1  # Drum Tutor clone
2  heavily inspired by:
3  - primary by the discontinued north-star product
4  - also inspired by the horizontal-highway drum app
5  - note-highway rhythm-game franchises
6  - the waterfall piano app
7
8  I want to create an app to learn and practice how to play drums.
9  As a main goal, the app should have all the features from the discontinued north-star product.
10 - The app should:
11     - work in both Windows and Mac devices, as well as for tablets (iPad/Android Tablet)
12         - a nice to have is to also work in a browser
13         - nice to have for small devices (mobile)
14     - primary work from e-drums, but should allow to select other instruments that are midi inputs (e.g. keyboard).
15     - work as a rhythm game, where the user has to hit the drums at the right time.
16     - allow the user to choose a file in format to play/listen to midi and/or guitar pro.
17         - nice to have is to also allow the user to have a background audio (e.g. mp3) or video (e.g. mp4 or youtube) to play/listen to while playing the song.
18     - display primary the song in notation, but a nice to have would be to display the song in a friendly notation view (like a vertical falling-notes app or a horizontal-highway drum app for users that are not familiar with notation).
19     - display in real time the correct note hit by the user with a visual feedback for:
20         - Standard notation:
21             - a green circle around the notehead on perfect hit
22             - a orange circle around the notehead when too early
23             - a purple circle around the notehead when too late
24             - missed notes, shouldn't have any visual feedback
25             - extra hits, should display a red cross in the correct time and line/space position of the staff (e.g. if the user hits the snare instead of the kick, we should display a red cross in the snare position, and not in the kick position).
26     - Friendly notation view:
27         - TBD UI and feedback (can you provide suggestions for both the friendly notation view and the real time feedback indicators?)
28     - Player features:
29         - choose a song (upload or previous loaded)
30         - play / pause / stop
31         - loop on/off (off by default)
32         - count-in which should have the metronome sound for each bit based on the measure (e.g. 4 beats for a 4/4 time signature)
33         - metronome on/off (on by default)
34         - tempo that can be adjusted by bpm or percentage
35         - select what the volume of each instrument to listen to (e.g. drums, guitar, bass, etc)
36             - alternatively, the user can select a the instrument to listen and others (e.g. drums only, drums + everything else, just everything else but my instrument)
37         - select what part (from point A to point B) of the song to play (select point A and point B by clicking on a smaller timeline score view)
38         - repeat on/off (off by default)
39         - select what instrument to play (e.g. drums, keyboard) - default is drums
40         - back to start (stop and go to the start of the song)
41     - Score rating
42         - we should use a 5 star rating system to rate the user's performance and save a percentage from 0 to 100 for each time the user plays the song.
43         - streak, we should indicate the current streak of correct hits and the longest streak of correct hits.
44     - Game mode
45         - for game mode, user cannot select:
46             - select what part (from point A to point B) of the song to play
47             - tempo
48             - repeat
49     - Practice mode
50         - auto speed based on score accuracy (e.g. user can select to every time the hit over 90% accuracy, the speed wound increase 5 bpm, until the user reaches the song's original speed).
51         - memory mode, user can select to practice and/or play the song by memory, without displaying the notation. However, if the user makes a mistake, then we display the notation which should fade out after a few perfect hits.
52     - Midi input
53         - user should be able to select a midi input device to play/listen to.
54         - user should be able to map the midi note for each instrument to the notation. (e.g. hitting either 51, 53, 59 and 93 from the midi input should consider as a ride 51 hit from notation).
55         - for the pedal hi-hat, we should allow the user select to ignore errors on extra hits, but still count the correct hits. (this is because the pedal hi-hat is a special case, because it is not just a hit note, but also is a preparation for the hit-hat closed/opened).
56     - Extra configuration features:
57         - latency compensation
58     - Nice to have features:
59         - keyboard shortcuts
60         - audio/video player
61         - keep a history of the user daily streak
62         - keep a history of the user for each score/play/practice session
63         - dynamic detection (e.g. ghost notes have lower volume, etc)
```

---

## Part 2 — The `§NN` line-ref map (how reviewers cited scope)

Reviewers in the office-hours and ce-doc-review sessions cited scope requirements as **`§NN` where NN is the line number above**. This is the lookup table to decode any later reference:

| Ref     | scope.md line | Requirement                                                                                                                                             | v1 status (prior art decision)                                                                                 |
| ------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| §11     | 11            | Windows + Mac + iPad + Android tablet                                                                                                                   | Co-primary: iPad/Android. Windows/Mac = PWA.                                                                   |
| §12     | 12            | Browser support                                                                                                                                         | Nice-to-have → PWA covers it                                                                                   |
| §13/§15 | 13            | Small-device (mobile)                                                                                                                                   | **Nice-to-have, explicitly DEFERRED** (reviewer flagged it was silently dropped)                               |
| §14     | 14            | Keyboard / other MIDI inputs (not just e-drums)                                                                                                         | **Re-added to v1 SC** (reviewer caught it; "any Web MIDI/CoreMIDI/android.media.midi input device selectable") |
| §16-17  | 16-17         | Upload MIDI / Guitar Pro; bg audio/video nice-to-have                                                                                                   | v1 = MIDI+GP upload; audio/video sync → v1.5                                                                   |
| §18     | 18            | Notation primary; friendly view nice-to-have                                                                                                            | v1 = standard notation; friendly view **TBD**                                                                  |
| §21-24  | 21-24         | green=perfect / orange=early / purple=late / missed=no feedback                                                                                         | v1 SC (note: green/orange/purple, NOT green/orange/red)                                                        |
| §25     | 25            | **Extra-hit red-cross at the actually-hit staff position** (snare line if snare hit, not kick)                                                          | v1 SC — needs custom SVG overlay on AlphaTab `boundsLookup`                                                    |
| §28-40  | 28-40         | Player features (song select, play/pause/stop, loop, count-in, metronome, tempo, per-instrument volume, A/B, repeat, instrument-to-play, back-to-start) | Core v1 player                                                                                                 |
| §35     | 35            | **Per-stem volume** + "mute mine / solo mine" modes                                                                                                     | v1 SC (`AlphaSynth.applyTrackVolume`)                                                                          |
| §37     | 37            | **A/B section select** via click on a smaller timeline score view                                                                                       | v1 SC                                                                                                          |
| §38     | 38            | **Repeat on/off** (off by default)                                                                                                                      | **Re-added to v1 player checklist** (reviewer caught it as never mentioned)                                    |
| §41-43  | 41-43         | 5-star rating + 0-100 % saved per play; current+longest streak                                                                                          | v1 SC                                                                                                          |
| §44-48  | 44-48         | **Game mode** locks A/B select, tempo, repeat                                                                                                           | **Re-added to v1** (reviewer: "entirely missing from Success Criteria → add Game mode toggle to v1")           |
| §49-51  | 49-51         | Practice mode: auto-speed (+5bpm at >90% until original) + memory mode (notation fades after perfect hits)                                              | **Moved to v1.5**                                                                                              |
| §52-55  | 52-55         | MIDI input device select; **per-instrument MIDI-note→notation mapping**; hi-hat-pedal "ignore extra-hit errors" toggle                                  | Mapping UI **promoted to v1** (was v1.5); hi-hat toggle in v1 SC                                               |
| §57     | 57            | **Latency compensation**                                                                                                                                | **Re-added to v1 SC** (reviewer: per-device offset slider, persisted)                                          |
| §58-63  | 58-63         | Nice-to-haves: keyboard shortcuts, audio/video player, daily-streak history, per-session score history, dynamic detection (ghost notes)                 | Daily-streak history + score history → v1.5; ghost-note dynamics surfaced in v1 via velocity                   |

---

## Part 3 — Tiered Success Criteria derived from scope (prior art)

The `/office-hours` design doc turned scope.md into four tiers. **v1 is the de-facto acceptance list.**

### Phase 0 (the spike, 1-2 weekends)

- Vite + AlphaTab + Web MIDI on Mac Chrome.
- Load a `.gp` file, see the drum notation render.
- E-drums hit → expected note highlights with a green ring within **25ms end-to-end** (measured with slow-motion camera).

### v1 — "I can practice my own song on my iPad"

- AlphaTab renders an uploaded `.gp` or `.mid` file in standard drum notation.
- User's e-drums connect via CoreMIDI through the Capacitor bridge.
- Hit scoring runs native-side; per-note feedback (green/orange/purple circles, red cross at the **actually-hit** staff position) appears within **20ms perceived on iPad**.
- Velocity read from `noteon.velocity` and surfaced visually (lighter feedback for ghost notes — covers §63 dynamic detection).
- **User-editable MIDI mapping UI**: maps source MIDI notes (e.g. 51, 53, 59, 93) → notation targets (e.g. ride). Stored per-user, cached locally. (scope §52-54)
- Per-instrument volume mixer with mute-mine / solo-mine modes. (§35-36)
- Count-in and metronome with the loaded song's time signature/tempo. (§32-33)
- A/B loop selection via click on a smaller timeline-view of the score. (§37)
- Score percentage (0-100) + 5-star rating at song end. (§42)
- Streak counter — current + longest — during play. (§43)
- Hi-hat pedal "ignore extra-hits" toggle. (§55)
- **Game mode toggle** (locks A/B, tempo, repeat). (§44-48 — added in review)
- **Repeat on/off**. (§38 — added in review)
- **Latency compensation** offset slider, persisted. (§57 — added in review)
- **Keyboard / other MIDI input device selectable** (not just e-drums). (§14 — added in review)

> Reviewer note retained: scope's in-session **"streak (current+longest)"** is distinct from v1.5's **"daily streak history"** — the review asked these be renamed "in-session streak" vs "cross-session daily streak history" to avoid conflation.

### v1.5 — "the $2 app push"

- Android Capacitor build at parity with iPad. _(see re-verify: stack-era assumption)_
- AWS Cognito user accounts.
- DynamoDB score history + daily streak history. (§61-62)
- S3-stored user uploads (with Lambda validator).
- 5-10 included royalty-free practice tracks.
- Practice mode: auto-speed and memory mode. (§49-51)
- Backing-track playback (MP3/MP4/YouTube) — only if iOS sync measurement proves clean. (§17, §60)

### v2 — "the desktop story"

- PWA polished for Windows + Mac Chrome/Edge.
- Electron desktop wrapper if PWA install friction proves real.
- Native Windows ASIO/WinMM bridge if pro-latency demand materializes.

---

## Part 4 — Decisions reached then (labeled prior art)

These were explicit scoping decisions made in 2026-06 during the office-hours/review rounds. Recorded as prior art — re-confirm before acting:

- **Leaderboards DROPPED** — listed in an early v1.5 draft but **not in scope.md**; reviewer flagged YAGNI → dropped (or v2 at most).
- **"Designed for iPad on Mac" parked indefinitely** — too unreliable for audio/MIDI (user's own InstaDrum-on-M5 observation). OFF in App Store Connect.
- **Mobile / small-device (§13/§15) explicitly deferred** with a written "deferred" line so it isn't silently lost.
- **Friendly notation view (§26-27) stayed TBD** in scope; a horizontal-highway design was later proposed in `stack-brainstorm.md` (lanes mirror the kit, gem shape encodes articulation, translucent hit-window band, accessibility = colour+shape+text). That proposal is itself prior art — verify it's still the direction.
- **MIDI mapping UI promoted v1.5 → v1** (it's a signature feature; §52-54).
- **Velocity / ghost-note dynamic detection (§63) surfaced into v1** via `noteon.velocity`.
- **Per-instrument volume** specified via `AlphaSynth.applyTrackVolume` (mute-mine / solo-mine).
- **Extra-hit red-cross (§25)** specified via AlphaTab `boundsLookup` + a custom absolutely-positioned SVG overlay (AlphaTab's native overlay API was judged not obviously suited).
- The spec was noted as **"unusually deep for a side project"** — it covers feature flags the dominant competitor lacks (memory mode, auto-speed practice, hi-hat-pedal extra-hit forgiveness, ghost-note dynamics). Treated as a signal to honour, not trim.

---

## Re-verify before building (2026)

- **AlphaTab version** — scope-era pinned `alphatab@^1.5` (MIT). Confirm the current major/minor and that percussion/drum-clef rendering + the `boundsLookup` per-note geometry API still ship. The whole red-cross/coloured-circle feedback layer depends on per-notehead geometry.
- **The $2 paid-app monetization + store fees** — `$99/yr` Apple, `$25` one-time Google Play, and the entire "v1.5 = the $2 app push" framing are time-sensitive AND the active Notation Hero memory marks revenue/scale as **deprioritized**. Treat the $2-app tier and store-launch framing as **stale**, not a commitment.
- **Latency budget** (`<20ms` perceived iPad/Android/Mac; `25ms` Phase 0 end-to-end) — these were 2026 estimates tied to a **Capacitor native-MIDI-bridge** architecture that the clean-slate rethink dropped. Re-validate against the new FE/shell (Vite SPA decided 2026-06-18; no Capacitor/Next.js/Nx).
- **Stack bindings inside the SC** (Capacitor Swift/Kotlin bridges, native-side scoring, AWS CDK, Vue-or-React, Tone.js metronome, DynamoDB-as-storage) **conflict** with the current stack (pnpm workspaces, NestJS hexagon, Drizzle, oRPC, Cognito-in-Pulumi, Dexie, TanStack). Keep the **feature** requirements; discard the stack choices.
- **Friendly notation view (§26-27)** was TBD; verify whether the later horizontal-highway proposal is still the chosen design.
- **Notation-model vocabulary drift** — scope.md says "song" + per-"instrument"; the current locked model is the instrument-agnostic **Playable** model (`playable` / `notation` / `step`). Re-map scope's song/instrument terms onto Playable before turning these into tickets. The scope is also drum-specific ("e-drums", "hi-hat pedal", MIDI notes 51/53/59/93); the current project is instrument-agnostic with drums-now/tonal-future.

---

## Sources / quotes

All from the drum-tutor-clone session transcripts (read-only; the live `scope.md` lived at `~/Sites/drum-tutor-clone/.claude/worktrees/pensive-boyd-6d17e3/scope.md`, git commit `179185f "initial scope"`, 4853 bytes).

- **Raw `scope.md` (lines 1-63)** — reproduced verbatim in Part 1 above; captured from in-session file reads.
- **Reviewer mapping scope §-lines to v1 gaps** (ce-doc-review / spec-review):
  > "**Game mode** (scope §44-48: locks tempo/A-B/repeat) is entirely missing from Success Criteria. Fix: add Game mode toggle to v1. **Repeat on/off** (scope §38) never mentioned. Fix: add to player feature checklist in v1. **Mobile (small device)** nice-to-have (scope §15) is dropped without acknowledgement. Fix: add an explicit 'deferred' line so it isn't silently lost."
  > "**Latency compensation feature** (scope §57 'Extra configuration features') is not addressed anywhere. Fix: add to v1 Success Criteria with a per-device offset slider persisted."
  > "**Keyboard input as MIDI source** (scope §14 'primary work from e-drums, but should allow to select other instruments that are midi inputs (e.g. keyboard)') not explicitly called out — only e-drums named."
- **Extra-hit red-cross (§25)**:
  > "Scope line 25 is specific (red cross at the snare line when snare hit, not at the kick). AlphaTab's overlay API isn't obviously suited to this — design doc should acknowledge the custom rendering layer needed on top of AlphaTab's SVG."
- **Per-stem volume (§35)**:
  > "Scope line 35 demands per-stem volume (drums/guitar/bass) with mute-mine / solo-mine modes."
- **A/B timeline (§37)**:
  > "Scope line 37 calls for click-to-set A and B on a 'smaller timeline score view.'"
- **MIDI mapping (§54)**:
  > "Scope line 54 demands user-editable MIDI-note→notation mapping (e.g. 51/53/59/93 → ride)."
- **Tiered Success Criteria** (Phase 0 / v1 / v1.5 / v2) — reproduced in Part 3 from the `/office-hours` design-stack doc (`leocaseiro-claude-pensive-boyd-6d17e3-design-20260603-163704.md`).
- **Spike-not-architecture framing** (prior-art assignment): _"The spike is the assignment, not the architecture. Don't draw a database schema until you've felt a drum hit make a ring appear."_
- **"Unusually deep spec" note**: _"Scope.md covers feature flags the horizontal-highway drum app doesn't have (memory mode, auto-speed practice, hi-hat pedal extra-hit forgiveness, dynamic detection for ghost notes)."_

### Source transcripts (absolute paths, read-only)

```
/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-drum-tutor-clone--claude-worktrees-pensive-boyd-6d17e3/53466813-7343-411e-8e12-99a3ea7b6d33.jsonl
/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-drum-tutor-clone--claude-worktrees-serene-grothendieck-fb5e67/c9615811-444a-427a-8e80-a814484b621d.jsonl
/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-drum-tutor-clone--claude-worktrees-pensive-boyd-6d17e3/53466813-7343-411e-8e12-99a3ea7b6d33/subagents/agent-a44a55cbd3514a4c3.jsonl
/Users/leocaseiro/.claude/projects/-Users-leocaseiro-Sites-drum-tutor-clone--claude-worktrees-pensive-boyd-6d17e3/53466813-7343-411e-8e12-99a3ea7b6d33/subagents/agent-ad495835ca923de95.jsonl
```
