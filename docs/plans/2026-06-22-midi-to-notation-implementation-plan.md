# Plan — MIDI → Notation pipeline (music21 + AlphaTab)

- **Date:** 2026-06-22
- **Ticket:** [NH-205](https://leocaseiro.atlassian.net/browse/NH-205) (epic [NH-178 Player & Notation](https://leocaseiro.atlassian.net/browse/NH-178))
- **Spike:** `docs/spikes/2026-06-22-music21-midi-to-notation-pipeline.md` (everything below is validated there)

## Goal

Let the app accept **MIDI files** and show them as notation in **AlphaTab** (which cannot import MIDI), with correct **drums**, at **$0 hosting**.

## Decisions locked (from the spike)

- **Bridge:** MIDI → MusicXML via **music21** (BSD-3). AlphaTab renders MusicXML.
- **Drums:** our own **pitch-keyed drum-map** layer (read channel-10 MIDI pitch → staff line + notehead + percussion clef). Do **not** rely on music21's lossy percussion labels.
- **Hosting:** **$0** — offline CI for the catalog; **Pyodide/WASM** in-browser for uploads. No Python server.
- **Guitar Pro:** if a `.gp` download is ever needed, use AlphaTab's `Gp7Exporter` (no MIDI→GP converter to build).

## Phases

### Phase 1 — Offline catalog converter (MVP, lowest risk)

Goal: a reusable Python converter that turns a catalog MIDI into AlphaTab-ready MusicXML, run in CI.

1. **`midi_to_musicxml` module** — parse with music21, emit MusicXML. → _verify: well-formed MusicXML 4.0; pitched parts correct._
2. **Drum-map layer** — read channel-10 pitches directly; apply full GM `pitch → (display-step, octave, notehead)` table + percussion clef, **and emit `<midi-unpitched>` per drum** (a distinct `UnpitchedPercussion` instrument per pitch, incl. ride — music21 writes none by default, so MIDI notes drop to 0 in GP). → _verify: ride/toms/open-hat on distinct lines **and** GP notes read the real GM numbers (not 0), on a real-kit test corpus._
3. **CI conversion step** (GitHub Actions) — convert catalog MIDIs → commit static MusicXML. → _verify: headless AlphaTab renders each output, drums included._

**Done when:** catalog MIDIs render correctly (incl. drums) in AlphaTab from committed MusicXML; golden-file tests pass.

### Phase 2 — In-browser conversion (Pyodide) for user uploads

Goal: client-side MIDI → MusicXML → AlphaTab, $0, no backend.

1. **Pyodide bootstrap** — load Pyodide + music21 with deps trimmed (skip matplotlib/pillow); run the drum-map in WASM. → _verify: converts in-browser; first-load measured (target < ~18 MB)._
2. **Wire the UI** — upload → convert → `ScoreLoader.loadScoreFromBytes` render → optional `Gp7Exporter` `.gp` download. → _verify: end-to-end in a real browser._

**Done when:** a static page (GitHub Pages or S3+CloudFront) converts + renders an uploaded MIDI with no server.

### Phase 3 — Upstream contribution (parallel · portfolio)

1. Engage music21 **#1659** — preserve `percMapPitch` for unrecognized percussion (maintainer already engaged).
2. Propose the **drum-layout map** — open an issue to agree the default layout, then PR.

**Done when:** PR(s) opened upstream.

## Risks / open questions

- **Quantization** on human-performance MIDI (music21 handles quantized MIDI well; messy input needs a pre-quantize step).
- **Drum voicing fidelity** through MusicXML → AlphaTab → GP (confirm by opening an exported `.gp`).
- **Pyodide first-load size** (mitigate by trimming deps; cached after first visit).

## Out of scope (for now)

- MIDI→Guitar Pro converters (PyGuitarPro/TuxGuitar) — unnecessary; AlphaTab exports GP.
- On-demand user uploads UI until pre-beta — catalog (Phase 1) ships first.
