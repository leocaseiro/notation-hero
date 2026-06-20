# Friendly-notation "highway" view + dual-view + rendering primitive

|                     |                                                           |
| ------------------- | --------------------------------------------------------- |
| **Date documented** | 2026-06-18                                                |
| **Origin**          | `drum-tutor-clone` (early exploration, now Notation Hero) |
| **Status**          | **Prior art** — captured research; not a current decision |

> **Scope of this doc:** the _friendly view_ design + the _dual-view_ (standard notation ↔ highway) + the _rendering-primitive_ choice for the gameplay overlay and highway. The MIDI input bridge / multi-zone mapping lives in the **webmidi-input-ios-bridge** spike; the timing/scoring loop lives in the **game-scoring-engine** and **audio-engine-and-latency** spikes; AlphaTab itself lives in the **alphatab-integration** spike. This doc cross-references those rather than re-deriving them.

---

## TL;DR

`scope.md` left the **friendly notation view** as an explicit **"TBD — can you provide suggestions?"**. The early sessions answered it:

- **Primary friendly view = a HORIZONTAL highway** — notes scroll left→right toward a now-line (hit line), **one lane per kit piece**, lanes mirror the physical kit (cymbals/hi-hat on top, kick at the bottom), configurable. Best fit for drums because rhythm reads left→right like notation.
- **Optional alternate = a VERTICAL waterfall** (falling notes). Same data, different axis.
- **It is OPTIONAL / a "nice-to-have."** Standard notation (AlphaTab) is the **primary** view; the friendly highway is the alternative for users not fluent in notation. This is a **dual-view** product: standard ↔ highway.
- **Rendering primitive resolved to PixiJS (WebGL)** for the highway (after an earlier "Canvas 2D first, PixiJS fallback" hedge). Game engines (Unity/Godot) were rejected outright.
- The highway carries a full **visual grammar** (gem shape = articulation, translucent now-line band = hit window, velocity → brightness) and a **feedback mapping** (perfect/early/late/miss/wrong) plus extras (tendency meter, combo glow), all built **colorblind-safe** (color + shape + text + position).

---

## 1. The friendly view design (the answer to "TBD")

This is the **fullest** version, from the client-side `stack-brainstorm.md` (worktree `serene-grothendieck-fb5e67`), later flagged for folding into `design-stack.md`.

### Layout

- **Primary: horizontal highway.** Lanes = kit pieces; the rhythm reads **left→right** (like notation). Notes scroll toward a fixed **now-line** (hit line).
- **Alternate: vertical waterfall** (falling notes). Optional toggle.
- **Lanes mirror the physical kit** — cymbals / hi-hat up top, kick at the bottom, toms/snare in the middle band. **Configurable.**

### Gem (note) visual grammar — encodes articulation

| Gem             | Meaning                                                   |
| --------------- | --------------------------------------------------------- |
| Filled circle   | Normal hit                                                |
| **X-gem**       | Cymbals (echoes the X-notehead in standard drum notation) |
| Halo / ring     | Accent                                                    |
| Small / dim gem | Ghost note (ties into the "dynamic detection" idea)       |

- **Velocity → gem brightness / size.**
- **A translucent band at the now-line** visualizes the **hit window** — users _see_ how much timing tolerance they have.

### Real-time feedback mapping (highway vs standard notation)

The friendly view mirrors the standard-notation color language from `scope.md` but makes it "punchier":

| Event             | Standard notation (scope.md spec)           | Friendly highway (suggested)                                                                      |
| ----------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Perfect           | green ring around notehead                  | green burst + **"PERFECT"** pop + combo tick + a satisfying sound                                 |
| Early             | orange ring                                 | orange flash + **"EARLY ←"** label                                                                |
| Late              | purple ring                                 | purple flash + **"LATE →"** label                                                                 |
| Miss              | _(nothing)_                                 | gem quietly greys + slides past — **gentle, no punishment**                                       |
| Wrong / extra hit | red ✗ at the wrongly-hit **staff position** | red flash/✗ in the **wrongly-hit lane** (suppressed for pedal hi-hat per the scope's hi-hat rule) |

### Two extras the sessions recommended adding (not in original scope)

- **Tendency meter** — a small "early ←|→ late" needle that nudges per hit, so users _learn_ whether they rush or drag. (Called out as the horizontal-highway drum app's best feature.)
- **Combo / streak glow** — a screen-edge glow that intensifies with the streak; feeds the star rating.

### Accessibility (a hard rule, not a nice-to-have)

> **Always pair color with shape + text + position.** Green / orange / purple / red is a lot of hues; pairing each with a distinct shape, a text label, and a lane/staff position makes the feedback survive colorblindness.

---

## 2. The dual-view architecture (standard ↔ highway)

The app renders **two distinct surfaces** from the same parsed song + the same audio clock:

- **Standard-notation view (primary)** → rendered by **AlphaTab**. Engraving-level feedback (rings around _noteheads_, a red ✗ at a specific _staff position_) is drawn on a **custom absolutely-positioned SVG overlay** aligned to AlphaTab's **`boundsLookup`** API. That overlay needs `core.includeNoteBounds = true` — which is **opt-in and performance-costly** on dense drum scores (flag this before turning it on).
- **Friendly highway (alternate)** → rendered by **PixiJS / WebGL** as a separate render surface, fed by the note timings AlphaTab already parsed (or, for the falling-notes case, raw MIDI timings + lanes).
- **One shared clock** → the **Web Audio clock** (`AudioContext.currentTime` + a look-ahead scheduler) drives metronome, count-in, scheduling, and scoring for **both** views. MIDI hit timestamps are reconciled against this clock.

**Key invariant (carried from the scoring/audio spikes):** _timing is decoupled from rendering._ The audio clock is authoritative, so **dropped frames ≠ wrong scoring**. This is why the highway can be a cheap 60fps sprite layer and the notation can render in a worker without corrupting hit detection.

**Note on the toggle itself:** the sessions establish that _both views exist_ and _standard is primary / friendly is the optional alternate_, but the **actual toggle UX** (control placement, default state, whether both can show at once) was never fully specified. See "Re-verify."

---

## 3. The rendering-primitive decision (and how it evolved)

This is the part `scope.md`'s "friendly view = TBD" most needed, and the early docs explicitly flagged it as a gap:

> _"'Friendly notation view' is left 'TBD' in scope and tentative in design — but it's a load-bearing UX element. Fix: at minimum spec the rendering primitive (Pixi.js? plain SVG? Three.js? Canvas?)."_ — doc-review finding

### The evolution

1. **First hedge (`design-stack.md` Open Questions):** _"Use **Canvas 2D** (simplest) or **Pixi.js** (better for animation throughput, ~150KB). **Recommend Canvas 2D for v1**; revisit if frame rate suffers on older Android tablets."_ (and a changelog line: _"Friendly notation view rendering primitive specified (Canvas 2D first, Pixi.js fallback)."_)
2. **Locked to PixiJS:** the AWS brainstorm + the final consolidated stack moved the decision to **PixiJS (WebGL)** outright — _"PixiJS for friendly notation / falling notes — was hand-waved Canvas."_ The consolidated stack table reads: **"Friendly 'falling notes' view → PixiJS (WebGL) → game-quality 2D without a game engine."**

So the **resolved prior-art position is PixiJS/WebGL**, but note this was settled by "newest doc wins," **not by a real benchmark on low-end hardware**. The Canvas-2D option still exists as a documented fallback.

### Why PixiJS / WebGL (not DOM, not Canvas-2D-only)

- **60fps sprite animation**; "game-class 2D rendering without leaving the JS ecosystem."
- **Drum charts are sparse**, so the highway is cheap to render even on WebGL.
- Keep the highway **off DOM / React** — the hot path should not re-render through React. Render notation in a **Web Worker**, pool objects, keep the soundfont small. _"Old iPads are fast; **cheap Android is the real test target**."_
- Cited support: PixiJS is _"WebGL-powered, mobile-optimized, the most performant JS renderer."_

### Why NOT a game engine (Unity / Godot) — the rejection that frames the whole choice

The user asked "shouldn't a rhythm game use Unity/Godot?" The answer was a firm no **for this app**:

> Note-highway rhythm games draw **custom note highways** — colored gems on a track. **None render standard music notation** (staves, beams, drum clef, noteheads) from Guitar Pro files. This app is a _music-education / notation tool_ as much as a game, and standard notation is the **primary** view. Game engines have **~zero ecosystem** for music engraving. An engine optimizes the **easy half** (falling notes — web does this fine) and **abandons you on the hard half** (Guitar Pro + drum engraving + synced synth — which AlphaTab gives you for free).

|                       | Godot                                                                                                                                                 | Unity                                                            | Web (PixiJS + AlphaTab)       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------- |
| Notation / Guitar Pro | ❌ none                                                                                                                                               | ❌ none (only `ABCUnity`, a partial ABC renderer — not GP/drums) | ✅ AlphaTab, turnkey          |
| MIDI input            | ⚠️ input-only, desktop-only; iOS/Android need custom OS work; **drops _simultaneous_ MIDI events** (kick+snare+hat at once) — disqualifying for drums | ⚠️ (via Keijiro's `Minis`)                                       | ✅ Web MIDI + native fallback |

**The reframe:** _"game-quality on web is real."_ You don't need an engine for sparse falling notes. (Existence proof cited: a web-based Guitar Pro player — browser-based living sheet music synced to MP3/YouTube, runs on phone/tablet, no install.) An engine _would_ be right only if you **dropped standard notation entirely** and built "a note-highway game for drums" — which the scope explicitly does not.

Other rendering-adjacent rejections from the same table: **.NET MAUI/C#** (AlphaTab ships WPF/WinForms-only on .NET, Windows-only, can't build from a Mac), **Flutter** and **React Native** (no AlphaTab equivalent; you'd rebuild drum notation + soundfont player + GP parser).

---

## 4. The locked stack split (prior art — for context)

From the consolidated stack table, the relevant rows:

| Concern                          | Choice                                   | Why                                                                       |
| -------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------- |
| Standard notation + playback     | **AlphaTab**                             | Guitar Pro + drum notation + SoundFont synth + synced cursor — the anchor |
| Friendly "falling notes" view    | **PixiJS (WebGL)**                       | game-quality 2D without a game engine                                     |
| Game clock / metronome / scoring | **Web Audio API** + look-ahead scheduler | sample-accurate; timing rides this clock, not frame rate                  |
| MIDI input                       | **Web MIDI** + native fallback           | (see webmidi spike)                                                       |

**Rendering split (verbatim framing):**

- **AlphaTab** → standard-notation view (the primary view + engraving-level feedback).
- **PixiJS/WebGL** → the friendly "falling notes" highway (60fps sprite animation; drum charts are sparse, so it's cheap).
- **Web Audio clock** → metronome, count-in, scheduling, and scoring.

---

## 5. Decisions reached then (labeled PRIOR ART)

These were the conclusions at the end of the `drum-tutor-clone` exploration. **They are prior art, not current commitments** — re-confirm before building.

1. **Friendly view = horizontal highway (primary) + vertical waterfall (optional alternate).** Answers `scope.md`'s "friendly view = TBD."
2. **Dual-view product:** standard notation is the primary/default view; the friendly highway is the optional alternative.
3. **Highway rendering primitive = PixiJS (WebGL)** (after an earlier "Canvas 2D first" hedge). Canvas 2D retained as a documented fallback.
4. **Standard-notation overlay = custom SVG aligned to AlphaTab `boundsLookup`** (`includeNoteBounds = true`, opt-in, perf-costly).
5. **Timing decoupled from rendering** — Web Audio clock is authoritative for both views.
6. **Game engines rejected** (no notation ecosystem; Godot's simultaneous-MIDI bug).
7. **Full visual grammar + feedback mapping + accessibility rule** as in §1.
8. Friendly-view UX detail (exact lane shapes, note shapes, animation curves) was deferred to a follow-up `/design-consultation`.

---

## 6. Re-verify before building (2026 — time-sensitive)

- **PixiJS on cheap/old Android tablets** — the stated real test target. The Canvas-2D-vs-PixiJS choice was settled by "newest doc wins," **never by an actual benchmark**. Profile the highway on low-end hardware first.
- **PixiJS version / size** — cited as "~150KB" and "8.x" in 2026. Re-verify current major version, bundle size, and the WebGL **vs WebGPU** story.
- **AlphaTab `boundsLookup` / `includeNoteBounds`** — API names and drum-notation render quality. Sessions cited `^1.5` then `^1.8.1`; confirm the latest version and methods (e.g. `api.renderer.boundsLookup.findBeat()`).
- **Highway data source** — derive from AlphaTab-parsed timings, or from **raw MIDI** directly (raw `.mid` → falling notes is easy: just timings + lanes via `@tonejs/midi`). Decide.
- **The dual-view TOGGLE UX** — never fully specified. Spec the control, default state, and whether both views can render simultaneously.
- **Surrounding stack is stale** — this research assumed the dropped Capacitor native-shell + AWS-CDK era. The current clean-slate rethink (Vite SPA, pnpm workspaces, NestJS, **no Next.js**) may change packaging assumptions. Treat the **view design** (§1–§3) as durable; treat the surrounding stack rows as context only.

---

## 7. Sources / quotes

All from `drum-tutor-clone` JSONL transcripts (read-only):

- `…/serene-grothendieck-fb5e67/c9615811-…jsonl` — the office-hours + **`stack-brainstorm.md`** (fullest friendly-view design, "You asked for friendly-notation + feedback suggestions", the Unity/Godot rejection table, "game-quality on web is real").
- `…/pensive-boyd-6d17e3/53466813-…jsonl` — **`design-stack.md`** (rendering split, Open Questions with the Canvas-2D-vs-PixiJS hedge, changelog "rendering primitive specified"), **`handoff.md`** (the "PRESERVE the fullest friendly-notation UI design into design-stack.md" instruction), and the doc-review finding flagging the TBD primitive.
- `…/pensive-boyd-6d17e3/…/subagents/…jsonl` — the AlphaTab `boundsLookup` web-search results.

**Verbatim, the original `scope.md` ask:**

> _"display primary the song in notation, but a nice to have would be to display the song in a **friendly notation view** (like **a vertical falling-notes app** or **a horizontal-highway drum app** for users that are not familiar with notation)."_ … _"Friendly notation view: **TBD UI and feedback (can you provide suggestions** for both the friendly notation view and the real time feedback indicators?)"_

**Verbatim, the resolved friendly-view recommendation:**

> _"I'd build the **horizontal highway** as the primary (best fit for drums: rhythm reads left→right like notation, one lane per kit piece), with the **vertical waterfall** as an optional alternate. … Lanes mirror the physical kit (cymbals/hi-hat up top, kick at bottom) — configurable. Gem shape encodes articulation: filled circle = normal, X-gem = cymbals, halo/ring = accent, small/dim gem = ghost note. A translucent band at the now-line visualizes the hit window. Velocity → gem brightness/size."_

**Verbatim, the rendering split:**

> _"**AlphaTab** → standard-notation view … **PixiJS/WebGL** → the friendly 'falling notes' highway (60fps sprite animation; drum charts are sparse, so it's cheap). **Web Audio clock** → metronome, count-in, scheduling, and scoring."_

**External links cited in-session:** alphaTab.net · AlphaTab GitHub (CoderLine) · PixiJS performance guide · Shirajuki js-game-rendering-benchmark · Godot `InputEventMIDI` docs · Godot simultaneous-MIDI bug #77035 · keijiro/Minis · `@tonejs/midi`.
