# AlphaTab integration — notation render + playback + overlay

> **Date documented:** 2026-06-18
> **Origin:** drum-tutor-clone phase (re-consolidated)
> **Status:** prior-art research

> **Scope note:** This is feature/engineering research about **AlphaTab itself** (a product/library fact-finding spike). The surrounding stack choices from those old sessions (Capacitor, PixiJS, RxDB, raw-AWS, React-vs-Vue) are **not** in scope here and are under an active clean-slate tooling rethink — do not import them as decisions. Where a fact is version- or platform-sensitive, it is flagged in **Re-verify before building (2026)** below rather than asserted as current truth.

---

## TL;DR / verdict

AlphaTab was chosen — and proven in a working browser prototype — as the **load-bearing centerpiece** of the whole app. In one MIT-adjacent (actually **MPL-2.0**) TypeScript library it does the three hardest things in the scope at once:

1. **Parses** Guitar Pro (GP3–GP7) and MusicXML into a real score model.
2. **Renders** standard + drum/percussion notation (clef, X-noteheads, multiple voices) to SVG.
3. **Plays** the score through its built-in **AlphaSynth** SoundFont synthesizer, with a **synced playback cursor** and **per-track gain**.

It also exposes **note geometry** (`boundsLookup`) so a custom feedback overlay can be aligned to noteheads, and supports an **external cursor / time provider** so visuals can ride your own audio clock.

The repeated framing across the sessions: _"nearly everything hard and unique in the scope is core functionality of AlphaTab. Rebuilding even half of that in any other ecosystem is a multi-month project."_ That is **why the whole stack leaned web/TypeScript** in the first place. AlphaTab was called a _"50%+ product head-start"_ and _"the anchor."_

**Critical boundary repeated by multiple reviews:** AlphaTab is built for _display + playback_, **not** millisecond-accurate hit detection. The rhythm-game scoring loop must run off the **AlphaSynth tick timeline** (`positionChanged`), not off the SVG/DOM. The feedback overlay (rings, crosses) is a **custom layer on top of** AlphaTab's SVG, not an AlphaTab feature.

**Already de-risked:** Leo built a working Phase-0 prototype (a fork of `alphaTabWebsite`, `rhythm-game` branch) with drum rendering + Web MIDI scoring + auto-BPM + accuracy-coloured score running in the browser at acceptable latency. So this is not speculative — the core integration is proven; the open work is the custom layers and the native shells.

---

## What AlphaTab covers (out of the box)

| Capability                          | Detail (as found in sessions)                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **File parse**                      | Guitar Pro **GP3–GP7** (`.gp` / `.gpx` / `.gp5`) + **MusicXML**. Notation-grade input.                                                                                                                                                                                                                                                           |
| **Standard notation render**        | Full engraving to SVG.                                                                                                                                                                                                                                                                                                                           |
| **Drum / percussion render**        | Since **v1.4**: percussion clef, X-noteheads, drum tablature, **multiple drum voices per staff**, cymbal notation + articulations. Set `\instrument "percussion"` on the track; notes via articulation names/numbers. Uses the **same drum-tab notation as Guitar Pro 5**. AlphaTab can also show numbered notation (jiǎnpǔ) and slash notation. |
| **Playback (AlphaSynth)**           | Built-in **SoundFont synthesizer**. Per-track gain → drives the per-instrument volume mixer (mute-mine / solo-mine).                                                                                                                                                                                                                             |
| **Synced cursor**                   | A playback cursor synced to the audio.                                                                                                                                                                                                                                                                                                           |
| **Note geometry**                   | `boundsLookup` exposes the position/bounds of rendered notes → used to place overlay feedback on the exact notehead.                                                                                                                                                                                                                             |
| **External cursor / time provider** | Lets visuals ride your own audio clock instead of AlphaTab's internal one (see alphaTab issue #1961, "External Audio Cursor API").                                                                                                                                                                                                               |

---

## What must be custom (on top of AlphaTab)

These are **not** AlphaTab features and were repeatedly called out as needing a custom layer:

- **The SVG feedback overlay** — green ring (perfect) / orange ring (early) / purple ring (late) around the notehead, positioned via `boundsLookup`. _"AlphaTab's overlay API isn't obviously suited to this — the design should acknowledge the custom rendering layer needed on top of AlphaTab's SVG."_
- **Extra-hit red-cross** — when the user hits the wrong drum, a red ✗ at the **staff position they actually hit** (e.g. hit snare instead of kick → cross on the snare line, not the kick line). This is custom positioning, not built-in.
- **The scoring loop** — compare MIDI hit timestamps against the AlphaSynth tick timeline; emit `{noteId, verdict, ts}` events. Runs off `positionChanged`, **not** DOM events.
- **The friendly "falling-notes" highway** — a separate **PixiJS / WebGL** view (horizontal lanes or a vertical waterfall) for users not fluent in notation. Drum charts are sparse, so it's cheap; rationale: timing is decoupled from rendering (audio clock is authoritative, so dropped frames ≠ wrong scoring). _(Note: PixiJS is a surrounding-stack pick under rethink — listed here only to mark the render split.)_
- **MIDI mapping layer** — multi-zone e-drums send different MIDI notes per zone (e.g. ride bell 51 / edge 52 / bow 53) but notation uses **one** MIDI note per instrument. A mapping table (e.g. 52 → 51) lets all zones count as valid hits. Spec'd in `MIDI_MAPPING_PLAN_SUMMARY.md` with preset templates (Yamaha DTX, Roland TD-50), LocalStorage persistence, ~6–9h estimate.
- **A/B-loop UI, count-in, metronome scheduling** — built around the audio clock; metronome ticks scheduled relative to AlphaSynth position.

---

## File-format handling

- **Guitar Pro / MusicXML → AlphaTab.** Notation-grade. `.gp` / `.gpx` / `.gp5`.
- **Raw `.mid` → `@tonejs/midi`.** Reason: _"raw `.mid` → standard notation is lossy (quantize / voice / map). Guitar Pro / MusicXML = notation-grade. For the falling-notes view, raw MIDI is easy (just timings + lanes). Parse MIDI with `@tonejs/midi`."_
- So: Guitar Pro is the path to real **notation**; raw MIDI is the easy path to the **friendly lane view**.

---

## The overlay mechanism (the load-bearing detail)

The notation feedback overlay is a **custom SVG layer aligned to AlphaTab `boundsLookup`**. The single most important configuration fact found:

> **Note-level bounds are opt-in and performance-costly — you must set `core.includeNoteBounds = true`.** Warn about render-time cost on dense drum scores.

Init recipe distilled from the working fork (clean-room described, not copied):

- AlphaTab init with `core.includeNoteBounds = true`
- Web MIDI listener (desktop)
- Scoring against `AlphaSynth.positionChanged` ticks
- Green / orange / purple ring overlay positioned via `boundsLookup`
- Auto-BPM + accuracy-coloured score

---

## Clock / timing model (important nuance)

- **Scoring** rides the AlphaSynth tick timeline (`positionChanged`), **not** the SVG/DOM.
- **Tone.js** (metronome, count-in) is **drift-corrected from** `positionChanged` callbacks — it is **NOT "slaved"** to AlphaSynth. An early draft said "slave Tone.js to AlphaSynth's internal clock"; a review flagged this as _"fanfic — AlphaSynth provides no sample-accurate clock export."_ The correct framing: _"Tone.Transport periodically re-synced from AlphaSynth tick callbacks; metronome ticks scheduled relative to AlphaSynth position, not Tone.Transport time."_
- The reason this matters: Tone.js Transport drifts on backgrounded tabs and on iOS where AudioContext gets throttled; over a 4-minute song the drift accumulates.

---

## Prior decisions reached then (label: drum-tutor-clone phase)

These are the AlphaTab-specific decisions that landed during the office-hours / plan-review sessions. **Captured as prior art** — re-confirm versions and the surrounding stack independently.

1. **AlphaTab is the centerpiece / anchor dependency.** Not negotiable for v1 — it's the 50%+ head-start.
2. **Version pin = `@coderline/alphatab@^1.8.1`** (the version the working fork actually uses). An earlier doc-review had suggested `^1.5`; the proven fork is `1.8.1`, and the doc was corrected to match.
3. **Drum support is real (since v1.4)** but the rendering _quality_ for percussion-specific glyphs was flagged as needing visual verification (see re-verify list).
4. **`core.includeNoteBounds = true`** is mandatory for the overlay; accept the render-time cost.
5. **Scoring off `positionChanged`, not DOM.** Overlay is custom on top of AlphaTab SVG.
6. **File parse split:** AlphaTab for `.gp/.gpx/.gp5`; `@tonejs/midi@^2` for `.mid`.
7. **License = MPL-2.0** (file-level copyleft). AlphaTab as an **npm dependency only** is App-Store-safe for a paid app; the `alphaTabWebsite` fork is also MPL-2.0 (derivative work) and must stay open — so the **production repo should be clean-room** (no files copied from the fork).
8. **Phase 0 is effectively done in-browser** via the fork — so the remaining work is the clean-room rewrite + custom layers + native shells, not "can AlphaTab do this."

---

## Re-verify before building (2026)

These facts are version- or platform-sensitive, or were analysis assertions rather than measured/confirmed. **Do not assert them as current — re-check first.**

- **AlphaTab version & AlphaSynth JS API.** `^1.8.1` was the fork's pin in mid-2026; check npm / GitHub releases for the current version before pinning the production repo. The AlphaSynth core is **ported from C#**, so the JS API surface can differ from docs — re-confirm `positionChanged` and the per-track volume API (`applyTrackVolume` was asserted but not version-pinned) against the actual reference.
- **`includeNoteBounds` performance cost.** "Opt-in and render-time-costly on dense drum scores" was an _analysis claim_, not a benchmark. **Measure** actual render cost with it enabled on a realistic dense drum chart before locking the overlay design.
- **Drum/percussion render quality.** Supported since 1.4, but flagged as _"historically thin on percussion-specific glyphs (cymbal stems, ghost-note parens)."_ **Visually verify** current output for X-noteheads, multi-voice drum staves, cymbal articulations, and ghost notes.
- **External cursor / time-provider API** (alphaTab issue #1961). Confirm it exists and is stable in the pinned version if you plan to drive the cursor from your own clock.
- **`@tonejs/midi@^2` and `tone@^15`** — re-verify current majors + maintenance status before adding.
- **License / App-Store reasoning** (MPL-2.0 fine) — research-grade legal read, **not** legal advice. Re-confirm before any paid App Store submission and keep the production repo clean-room.
- **TOOLING-STACK CAVEAT.** The surrounding stack picks in those sessions (Capacitor shells, PixiJS, RxDB/Legend-State, raw-AWS-via-CDK-or-Pulumi, React vs Vue, latency targets) are from the drum-tutor-clone phase and are under an active clean-slate rethink. This doc is the **AlphaTab feature/engineering research only** — do not treat the surrounding stack as decided.

---

## Existing prior-art artifacts (read before re-deriving)

- **Working Phase-0 rhythm game (MPL-2.0 fork):** `~/Sites/alphaTabWebsite`, branch `rhythm-game`. Live demo: `https://leocaseiro.github.io/alphaTabWebsite/docs/rhythm-game`. Confirmed working in-browser: AlphaTab drum rendering + Web MIDI scoring + auto-BPM + accuracy-coloured score + iOS Web MIDI shim.
- **MIDI mapping feature plan:** `~/Sites/alphaTabWebsite/MIDI_MAPPING_PLAN_SUMMARY.md` (+ the `MIDI_MAPPING_*` doc set under `src/components/AlphaTabRhythmGame/`). Multi-zone mapping, presets, LocalStorage, ~6–9h.
- **Cross-project memory:** the [AlphaTab fork reference](alphatab_fork_reference.md) note — always check `~/Sites/alphaTabWebsite` for prior art before building related features.

---

## Sources / quotes (from drum-tutor-clone sessions)

Direct quotes captured from the JSONL transcripts:

- _"AlphaTab (open source, MIT) solves Guitar Pro parsing, standard notation rendering, AND audio synthesis in one library. Treat AlphaTab as a load-bearing dependency."_ — office-hours premise P4. (Note: the "MIT" label was later corrected to MPL-2.0.)
- _"nearly everything hard and unique in the scope is core functionality of AlphaTab … reads Guitar Pro (GP3–GP7) + MusicXML, renders drum/percussion notation (clef, X-noteheads, voices), plays via a built-in SoundFont synthesizer with a synced playback cursor, exposes note geometry for overlay feedback, and supports an external cursor/time provider so visuals can ride your own audio clock."_
- _"AlphaTab is built for display + playback, not millisecond-accurate hit detection against rendered noteheads. Hit detection needs the underlying tick timeline, not the SVG … Hit scoring runs off `AlphaSynth.positionChanged` ticks, not DOM."_
- _"`boundsLookup` for notes is opt-in and performance-costly — must set `core.includeNoteBounds = true` … warn about render-time cost on dense drum scores."_
- _"`alphatab@^1.5` … your fork uses 1.8.1"_ → corrected pin to `@coderline/alphatab@^1.8.1`.
- _"AlphaTab 1.4.0 added support for expressing percussion tabs … set `\instrument \"percussion\"` … uses the same drum tab notation as Guitar Pro 5 … percussion clef support, drum tablature, multiple drum voices per staff, cymbal notation and articulations."_ — web-search result digest.
- _"File parse: AlphaTab for .gp/.gpx/.gp5, @tonejs/midi for .mid … raw .mid → standard notation is lossy."_
- _"Tone.js is NOT slaved to AlphaSynth (that would be fanfic — no sample-accurate clock export). It's drift-corrected from `positionChanged` callbacks."_
- License table: _"AlphaTab core (`@coderline/alphatab`) — MPL-2.0 — ✅ Compatible. File-level copyleft … new files calling AlphaTab APIs can be proprietary."_
- Leo: _"I forked Alphatab's website, and I managed to get a lot with it, working okay. A few latency that can be improved, but that stack works fine. … <https://leocaseiro.github.io/alphaTabWebsite/docs/rhythm-game>"_

**External links cited in the sessions (re-verify currency):**

- alphaTab API docs — <https://alphatab.net/docs/reference/api>
- alphaTab v1.4 release notes — <https://www.alphatab.net/docs/releases/release1_4/>
- alphaTab percussion docs — <https://alphatab.net/docs/alphatex/percussion/>
- alphaTab data model / score reference — <https://alphatab.net/docs/reference/score>
- alphaTab special tracks — <https://alphatab.net/docs/showcase/special-tracks/>
- alphaTab GitHub — <https://github.com/CoderLine/alphaTab>
- alphaSynth GitHub — <https://github.com/CoderLine/alphaSynth>
- External Audio Cursor API issue — <https://github.com/CoderLine/alphaTab/issues/1961>
- "alphatex show drum (notation or tabs)" discussion #474 — <https://github.com/CoderLine/alphaTab/discussions/474>

**Session provenance:** drum-tutor-clone worktree sessions (office-hours brainstorm + `/plan-eng-review` style doc reviews), worktrees `serene-grothendieck-fb5e67` and `pensive-boyd-6d17e3`, JSONL under `~/.claude/projects/*drum-tutor-clone*/`.
