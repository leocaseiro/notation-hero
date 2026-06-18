# Spike — GP→tonal parser (NH-196)

**Ticket:** [NH-196](https://leocaseiro.atlassian.net/browse/NH-196) (relates to [NH-137](https://leocaseiro.atlassian.net/browse/NH-137))
**Date:** 2026-06-19
**Question:** Can we parse Guitar Pro (`.gp`/`.gp5`/`.gpx`) and MusicXML (`.xml`/`.mxl`) in JS and extract tonal elements — key, chord progressions, chords-from-notes, scales, sections, time signatures?
**Answer:** Yes. Proven end-to-end with [AlphaTab](https://www.alphatab.net) (headless, Node) for parsing + [tonal](https://github.com/tonaljs/tonal) for theory.

## How to run

```bash
cd docs/spikes/2026-06-19-gp-tonal
npm init -y && npm install @coderline/alphatab tonal
node spike.mjs  "<path to .gp/.xml/.mxl>"   # explicit chords + detect-from-notes
node spike2.mjs "<path to file>"            # per-track key (Krumhansl) + tuning + sections + time-sig + tempo
node spike3-export.mjs                       # write-back: inject a chord diagram → Gp7Exporter → reload → verify
```

(`node_modules` is not committed — install the two deps locally to run.)

## Pipeline

```
bytes ──► AlphaTab ScoreLoader.loadScoreFromBytes ──► Score (auto-detects GP3–8 + MusicXML)
            │
            ├─ MasterBar: keySignature*, timeSignatureNumerator/Denominator, tempoAutomations, section
            ├─ Staff:     tuning[], chords{} (explicit diagrams, name + frets)
            └─ Beat/Note: chord (diagram ref), note.realValue (sounding MIDI pitch)
            │
            └─► tonal: Chord.detect(notes), Scale.detect(notes), Progression.toRomanNumerals(key, chords)
                + small Krumhansl-Schmuckler key-from-notes step (tonal has no key finder)
```

\* the embedded key field is unreliable — see F3.

## Findings

| # | Finding |
|---|---------|
| F1 | Pipeline works first try on all test files; one code path for `.gp`/`.gp5`/`.gpx`/`.xml`/`.mxl`. |
| F2 | **Explicit chord diagrams extract perfectly** when present: I'm Yours `B F# G#m E` (I V vi IV); Yellow `B Badd9 F#6 E7M`; When I Come Around `F#5 C#5 D#5 B5`. |
| F3 | ⚠️ **Embedded key-signature field is unreliable** — left at default `0` (C major) in 3 of 4 files. Must infer key from notes/chords, not read the field. |
| F4 | Chord-from-notes (`Chord.detect`) works but is noisy raw (enharmonic spelling vs key, partial/passing voicings). Cleanup = spell-to-key + dedup + group-by-bar. |
| F5 | `.gp` is richer than MusicXML-from-GP: the MusicXML export dropped chord diagrams. Prefer `.gp` for explicit chords. |
| F6 | **Key-from-notes (Krumhansl-Schmuckler) is accurate:** I'm Yours B major 0.96, Yellow B major 0.95, When I Come Around F# major 0.87, Dias Atrás B major 0.87. |
| F7 | ✅ **Tuning does NOT affect key detection.** Two Yellow files (non-standard `Eb4 B3 G3 B2 A2 E2` vs standard) → identical **B major 0.953**, because detection uses `note.realValue` (actual sounding MIDI pitch, tuning already baked in). The "C major" in F3 came from the metadata field, not the notes. |
| F8 | Per-track keys mostly agree. Bass is a weak signal (mostly roots → low confidence). Yellow's piano → G# minor = relative minor of B major (same notes). Aggregate harmonic tracks weighted high. |
| F9 | ✅ **Sections/parts parse for free** (3 of 4 files) with bar numbers — Intro/Verse/Chorus/Bridge/Outro etc. Dias Atrás has none (the "approximate it" case). |
| F10 | Time-signature + tempo timelines extract cleanly (When I Come Around opens `1/8` pickup → `4/4`). |
| F11 | ✅ **Chord write-back proven:** read no-chord file → inject a `Chord` diagram onto a beat → `Gp7Exporter` → reload → the chord survived the round-trip. |
| F12 | HookTheory blocks automated fetch (403); cross-checked against documented references instead (all match). |
| F14 | ⚠️ **Modes:** basic Krumhansl gets the tonic right but labels mode major/minor — Man In The Mirror detected "G major", truth **G Mixolydian**. Needs a mode-refinement step (`Scale.detect`). |
| F15 | ⚠️ **Multi-key songs** (Toto Africa — 3 keys, no markers) need **windowed** key detection → a key-change timeline; whole-song single key is misleading. Approximate without markers; no LLM in v1. |
| F16 | Meter changes captured (Africa `4/4 → 2/4 → 4/4 → 2/4 → 4/4`). |

## Test corpus (`/Users/leocaseiro/Music/AlphaTab-RhythmGame/`)

| File | Has chords | Real key (detected) | Notable |
|------|-----------|---------------------|---------|
| I'm Yours - Jason Mraz.gp | yes | B major (0.96) | I–V–vi–IV; sections present |
| Coldplay-Yellow-06-26-2025.gp | yes | B major (0.95) | non-standard tuning; sections present |
| Coldplay-Yellow-06-26-2025-standard-tunning.gp | yes | B major (0.95) | tuning control vs the above |
| Green Day-When I Come Around…gp/.xml/.mxl | yes | F# major (0.87) | tuned ½-step down; MusicXML variants |
| Cpm22-Dias Atrás…gp | no | B major (0.87) | finger-patterns only (detect-from-notes) |
| Michael Jackson - Man In The Mirror.gp | no | G **Mixolydian** | mode case (F14) |
| Toto - Africa.gp | partial | 3 keys + meter changes | modulation + tempo-change case (F15/F16) |

## Decisions (see design spec)

- Build the **read-only analyzer core** first; write-back / section-approximation / progression-search are satellites.
- Key detection = **hybrid** (chords + roman numerals when present; histogram + mode otherwise; cross-check; weight harmonic tracks).
- Per-section analysis included when markers exist; windowed fallback for modulation.
- Output naming aligned to **tonal** field names; `barStart` + `barEnd` on all spans.
