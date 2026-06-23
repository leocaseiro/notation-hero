# Spike — MIDI → Notation pipeline (music21 + AlphaTab)

- **Date:** 2026-06-22
- **Ticket:** follows [NH-205](https://leocaseiro.atlassian.net/browse/NH-205) (epic [NH-178 Player & Notation](https://leocaseiro.atlassian.net/browse/NH-178))
- **Builds on:** `2026-06-21-phpmusicxml-midi-to-musicxml.md` (PHPMusicXML rejected: no license). This spike runs the **music21** path live and validates an end-to-end, $0, in-browser pipeline.
- **Goal:** Support **MIDI files as input** in the app. AlphaTab (our renderer) **cannot import MIDI** — it reads Guitar Pro, MusicXML, alphaTex. So we need a bridge: **MIDI → {MusicXML | Guitar Pro} → AlphaTab**, with good **drum** notation (drum-focused product).

---

## TL;DR — decisions

1. **Bridge = MIDI → MusicXML via `music21`** (Python, BSD-3, v10.5.0). Validated live: pitched instruments convert well; drums need a custom layer (below).
2. **Drums = a pitch-keyed drum-map layer we own.** music21 identifies drums but never assigns staff positions (everything defaults to one line). Fix: map **raw MIDI pitch → staff line + notehead**. Proven on a synthetic kit (kick/snare/4 toms/ride/crash → distinct lines, ✗ noteheads, percussion clef).
3. **Hosting = $0, no Python server.** Two cases: catalogue → convert **offline in CI**; user uploads → run music21 **in the browser via Pyodide (WASM)**. Confirmed working.
4. **AlphaTab exports Guitar Pro.** AlphaTab 1.8.3 has `Gp7Exporter`. So the whole thing is client-side: **MIDI → music21(WASM) → MusicXML → AlphaTab render (+ optional `.gp` download)**. No backend.
5. **Upstream contribution opportunity:** music21 issue [#1659](https://github.com/cuthbertLab/music21/issues/1659) (open, maintainer engaged) + the missing drum-layout map = a clean, portfolio-worthy PR.

---

## The pipeline (recommended)

```
            ┌─────────────────────── all client-side, $0, no server ───────────────────────┐
 user .mid → │ Pyodide/WASM: music21.converter.parse → our drum-map layer → MusicXML (bytes) │
            └──────────────────────────────────┬───────────────────────────────────────────┘
                                               ▼
                        AlphaTab.importer.ScoreLoader.loadScoreFromBytes(xml)
                                               │
                              ┌────────────────┴─────────────────┐
                              ▼                                   ▼
                       AlphaTab render                  Gp7Exporter().export()  →  .gp download (optional)
```

Static host (GitHub Pages **or** S3+CloudFront free tier) serves the JS/WASM; conversion compute runs on each visitor's device → scales free.

---

## Evidence

### 1. music21 MIDI → MusicXML works (live run — closes NH-205 Q1/Q2)

Installed `music21==10.5.0` (BSD-3) in a venv; converted three MIDIs; all output is **well-formed MusicXML 4.0** (`xmllint` clean):

| Input                                   | Output                                                                  | Result                             |
| --------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------- |
| `twinkle.mid` (simple)                  | 96 measures, 353 notes, 2/4                                             | ✓ clean                            |
| `coldplay-yellow.mid` (real multitrack) | 7 named parts (vocals/guitars/bass/**drumkit**), chords, key/time/tempo | ✓ strong for pitched               |
| `16th-rock-beat.mid` (128 B)            | empty                                                                   | degenerate input (no usable notes) |

**Quality note:** music21 has built-in quantization (`stream.quantize()`), the genuinely hard part of MIDI→notation. It does best on MIDI exported from notation software; human-performance MIDI yields messier rhythms (quantize first).

### 2. The drum problem — and the fix

music21 **identifies** drums correctly via its `PercussionMapper` (GM map, pitches 35–81: kick 36, snare 38, hat 42, …) — but its MusicXML export **never assigns a staff position**: every `Unpitched` note defaults to `displayStep='B', octave=4` (note.py:1880) and gets no percussion clef. Result: all drums collapse onto one line.

Stress test on real kits exposed two layers of loss:

| Gap                           | Evidence                                     | Cause                                                                                       |
| ----------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Layout collapse               | all hits → B4                                | music21 has **no GM→staff-position table**                                                  |
| Ride cymbal **identity** lost | 90 Coldplay ride hits → generic "Percussion" | music21 has **no Ride class** → [#1659](https://github.com/cuthbertLab/music21/issues/1659) |
| Open/closed hat indistinct    | 42/44/46 share a name                        | name-based mapping is lossy                                                                 |

**Fix (validated):** key the drum-map off the **raw MIDI pitch number**, not music21's instrument name. Pitch is unambiguous and complete; reading it directly bypasses both the layout gap and the #1659 identity loss. Proven on a synthetic 10-sound kit → **9 distinct staff lines, ✗ noteheads on cymbals/hats, ride recovered, percussion clef present.**

The drum-map table (the reusable artifact / the #1659 PR candidate):

```py
# GM MIDI pitch -> (display-step, display-octave, notehead)
PITCH_MAP = {
    35:("F",4,None), 36:("F",4,None),                         # bass drum
    41:("G",4,None), 43:("G",4,None),                         # floor toms
    45:("A",4,None), 47:("B",4,None),                         # low / low-mid tom
    37:("C",5,"x"), 38:("C",5,None), 40:("C",5,None),         # snare (side-stick = x)
    48:("D",5,None), 50:("E",5,None),                         # hi / high tom
    51:("F",5,"x"), 53:("F",5,"x"), 59:("F",5,"x"),           # ride  (music21 loses this -> #1659)
    42:("G",5,"x"), 46:("G",5,"x"), 44:("D",4,"x"),           # closed / open / pedal hi-hat
    49:("A",5,"x"), 57:("A",5,"x"), 52:("A",5,"x"), 55:("A",5,"x"),  # crashes / china / splash
    56:("E",5,"x"), 54:("D",5,"x"),                           # cowbell / tambourine
}
```

### 3. $0 hosting — confirmed

- **Catalogue pieces:** convert **offline** (local or free GitHub Actions) → ship static MusicXML. $0.
- **User uploads:** run music21 **in-browser via Pyodide** (Python→WASM, `micropip.install("music21")`). **Confirmed:** music21 10.5.0 installed in Pyodide, parsed a MIDI, emitted well-formed MusicXML — no server.
  - First-load payload ≈ **27 MB** (Pyodide core + music21 + deps), browser-cached after. ~9 MB is matplotlib/pillow/fonttools, which MIDI→MusicXML does **not** use → installing with deps trimmed should cut first-load to ≈ **18 MB**.
- **Google Colab** (the gist idea): fine as a **manual tool** for you/testers (upload→download), but **cannot** be the app's backend — Colab ToS forbids "web service offerings not related to interactive compute," it's not an API, and runtimes are ephemeral.

### 4. AlphaTab exports Guitar Pro (corrects earlier assumption)

AlphaTab **1.8.3** ships `alphaTab.exporter.Gp7Exporter` (`.export(score, settings) → Uint8Array`). Headless round-trip **passed**: imported our drum MusicXML (1 percussion track, 11 beats) → exported `.gp` (3,099 bytes) → re-imported identical. So GP output is **free** via AlphaTab — no MIDI→GP converter needed.

> **Resolved (2026-06-23) — MIDI note was being dropped.** The _display_ (clef/line/notehead) survives, but each drum's **MIDI note** did not: music21's MusicXML export writes **no `<midi-unpitched>`** (one generic "Percussion"), so AlphaTab→GP yields note `0`. The leak is the **music21→MusicXML** step, not AlphaTab. **Fix:** give each distinct MIDI pitch its own `UnpitchedPercussion` instrument with `percMapPitch` = the raw note (incl. ride 51, which music21 loses to #1659), so music21 emits per-drum `<midi-unpitched>`. **Verified end-to-end:** input notes `[36,38,42,46,43,45,47,48,51,49]` == GP output. (Pending visual confirmation in Guitar Pro.)

### 5. MIDI → Guitar Pro converters (for reference)

No drop-in, pipeline-ready MIDI→GP tool exists. **PyGuitarPro** (Python, LGPL-3, maintained) can _write_ GP5 but has no MIDI parser/quantizer (≈500–1000 LOC to bridge). **TuxGuitar** does MIDI→GP but is GUI-only. Conclusion: **don't build MIDI→GP** — go via MusicXML and let AlphaTab export GP if a `.gp` is ever needed.

---

## Open items / next steps

- [ ] Productionize the **pitch-based drum-map** (full GM table + open-hat `o` articulation, ghost notes/accents).
- [ ] Verify drum **voicing fidelity** through MusicXML → AlphaTab → GP.
- [ ] **Trim Pyodide payload** (install music21 without matplotlib/pillow) and measure first-load.
- [ ] Decide conversion **timing**: offline-CI for catalogue (now) vs in-browser Pyodide for user uploads (when that feature lands).
- [ ] **Upstream contribution** (portfolio): engage music21 #1659 (preserve `percMapPitch` for unrecognized sounds) and/or propose the drum-layout map.
- [ ] Quantization quality pass on human-performance MIDI.

## Artifacts (spike, ephemeral `/tmp`)

- Conversion + drum-map scripts (music21), Pyodide test (`test.mjs`), AlphaTab GP-export test (`export_test.mjs`).
- Sample outputs sent to Leo: `1-beat-DRUMMAP-v2.musicxml`, `tom-fill-DRUMMAP.musicxml`, `tom-fill-EXPORTED.gp`.

## Sources

- AlphaTab exporter: <https://alphatab.net/docs/guides/exporter> · `Gp7Exporter` <https://alphatab.net/docs/reference/types/exporter/gp7exporter/>
- music21 MIDI translate / `PercussionMapper`: `music21/midi/percussion.py` · issue <https://github.com/cuthbertLab/music21/issues/1659>
- Pyodide: <https://github.com/pyodide/pyodide> · Colab ToS: <https://research.google.com/colaboratory/tos_v4.html>
- PyGuitarPro: <https://github.com/Perlence/PyGuitarPro>
