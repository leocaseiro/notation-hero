# Design — `gp-tonal` analyzer core

**Ticket:** [NH-196](https://leocaseiro.atlassian.net/browse/NH-196) (relates to [NH-137](https://leocaseiro.atlassian.net/browse/NH-137))
**Spike:** `docs/spikes/2026-06-19-gp-tonal/` (findings F1–F16)
**Date:** 2026-06-19
**Status:** Design — awaiting review before implementation plan.

## 1. Context & goal

Notation Hero needs to read musical meaning out of Guitar Pro / MusicXML files: the **key** (root, accidental, signature, mode), the **chord progression(s)**, **chords inferred from finger patterns**, **scales used**, **sections**, **time signatures**, and **tempo**. The spike (NH-196) proved this is feasible with AlphaTab (parsing) + tonal (theory).

This design covers the **read-only analyzer core** — a small, reusable, npm-publishable TypeScript library. Its single job: `bytes → SongAnalysis`. Downstream product features consume that object.

## 2. Decisions (locked with Leo)

| # | Decision |
|---|----------|
| D-build | Build the **read-only analyzer core first**. Write-back, section-approximation, and progression-search are satellites built on top, later. |
| D-key | Key detection = **hybrid**: chord-based when explicit chords exist (precise + roman numerals), pitch-class histogram (Krumhansl-Schmuckler) + mode refinement otherwise; cross-check and report alternatives; aggregate across tracks weighting harmonic tracks high. |
| D-sections | Include **per-section** analysis when the file carries section markers. |
| D-naming | Output field names **aligned to tonal's vocabulary** (`tonic`/`type`/`alteration`/`keySignature`; time sig `upper`/`lower`; chord `symbol`/`tonic`/`type`/`quality`; roman numerals in tonal form e.g. `"VIm"`). camelCase (map to snake_case at the DB layer). |
| D-bars | `barStart` + `barEnd` on all spans (sections, keyChanges, timeSignatures, tempos). Chords carry `bar` + `beat` onset. |

## 3. Scope

**In scope (this design / first implementation):**
- Parse `.gp` / `.gp5` / `.gpx` / `.xml` / `.mxl` (one code path).
- Per-song + per-track + per-section: key, chord progression (explicit + detected), scales, time signatures, tempos, sections, tuning.
- Hybrid key detection with mode refinement and windowed modulation timeline.

**Out of scope (satellites — separate tickets, designed-for but not built here):**
- **Chord write-back** into the file (`Gp7Exporter` — proven F11).
- **Search by progression** across keys (consumes `roman[]`).
- **Scale-usage search** and **time-signature/tonal search** (consume the output).
- **Section approximation** when a file has NO markers beyond the basic windowed key timeline (full part-labelling, possibly ML, is later).

## 4. Architecture & packaging

- **Location:** `core/gp-tonal/` in this monorepo (workspace glob `core/*`). *Note: supersedes the earlier `packages/gp-tonal/` mention — the repo uses `core/*`, not `packages/*`.*
- **Package name:** `@notation-hero/gp-tonal` (publishable to npm; working name `gp-tonal`).
- **Runtime deps:** `@coderline/alphatab` (parse + future export), `tonal` (theory). No DOM, no framework.
- **Language/build:** TypeScript, ESM, follows the repo's existing `core/*` build + lint conventions.

**Public API:**
```ts
analyze(input: Uint8Array | ArrayBuffer, options?: AnalyzeOptions): SongAnalysis
// reusable lower-level units (also exported):
detectKey(histogram: number[]): KeyResult
detectChordsFromBeats(beats: BeatNotes[], key?: KeyRef): ChordHit[]   // BeatNotes = { bar; beat; notes: string[] }
toRoman(key: KeyRef, chords: string[]): string[]
```

```ts
type TrackRole = 'harmonic' | 'bass' | 'melody' | 'percussion';
interface AnalyzeOptions {
  windowBars?: number;      // sliding-window size for modulation detection (default 8)
  detectFromNotes?: boolean;// run Chord.detect on note-only tracks (default true)
  trackWeights?: Partial<Record<TrackRole, number>>; // harmonic vs bass/melody weights
}
```

## 5. Module breakdown (small, single-purpose, independently testable)

| Module | Purpose | In → Out |
|--------|---------|----------|
| `parse.ts` | Thin wrapper over `ScoreLoader.loadScoreFromBytes`; format detection. | bytes → AlphaTab `Score` |
| `pitch.ts` | Note helpers via tonal (`Note.fromMidi`, `Note.get`, pitch-class, decompose `letter`/`acc`/`alt`). | midi/name → parts |
| `histogram.ts` | Duration-weighted 12-bin pitch-class histogram from notes. | notes → number[12] |
| `key.ts` | Krumhansl-Schmuckler correlation → tonic + major/minor + confidence; **mode refinement** via `Scale.detect`; **chord-based** inference from explicit chords; **hybrid combiner** + alternatives. | histogram/chords → `KeyResult` |
| `chords.ts` | Extract explicit diagrams; detect-from-notes (`Chord.detect`); cleanup (spell-to-key, dedup, group-by-bar). | beats → `ChordHit[]` |
| `progression.ts` | Chord timeline → de-duplicated progression → roman numerals (`Progression.toRomanNumerals`). | chords + key → `string[]` |
| `scale.ts` | Scale/mode candidates from notes (`Scale.detect`). | notes → `ScaleCandidate[]` |
| `structure.ts` | Sections (markers), time-signature + tempo timelines, tuning; **windowed key detection** → `keyChanges[]`. | score → structure |
| `analyze.ts` | Orchestrates all of the above into `SongAnalysis`. | score → `SongAnalysis` |

## 6. Output contract — `SongAnalysis` (tonal-aligned naming)

```ts
interface SongAnalysis {
  meta: { title: string; artist: string; format: 'gp'|'gp5'|'gpx'|'musicxml'; bars: number };
  song: {
    key: KeyResult;
    timeSignatures: TimeSig[];   // change events; barStart+barEnd
    tempos: Tempo[];             // change events; barStart+barEnd
    sections: SectionSpan[];     // from file markers (may be empty)
    keyChanges: KeyChange[];     // modulation timeline (>=1 entry); barStart+barEnd
  };
  tracks: TrackAnalysis[];
}

interface KeyResult {
  tonic: string;            // 'B'
  letter: string;           // 'B'   (tonal Note.get)
  acc: string;              // ''|'#'|'b'
  alt: number;              // signed accidental count of the tonic note
  type: string;             // 'major'|'minor'|'mixolydian'|'dorian'|...  (mode lives here)
  alteration: number;       // tonal signed key-signature integer (+5 = five sharps)
  keySignature: string;     // tonal string e.g. '#####'
  scale: string[];          // ['B','C#','D#','E','F#','G#','A#']
  confidence: number;       // 0..1
  method: 'chords'|'histogram'|'hybrid';
  alternatives: Array<{ tonic: string; type: string; relation?: string; confidence: number }>;
}

interface TimeSig { name: string; upper: number; lower: number; type: string; barStart: number; barEnd: number }
interface Tempo  { bpm: number; barStart: number; barEnd: number }
interface SectionSpan { name: string; barStart: number; barEnd: number;
                        key?: KeyRef; progression?: string[]; roman?: string[]; scales?: ScaleCandidate[] }
interface KeyChange { barStart: number; barEnd: number; key: KeyRef; confidence: number }
type KeyRef = { tonic: string; type: string };

interface TrackAnalysis {
  name: string;
  isPercussion: boolean;
  tuning: string[];         // ['E4','B3','G3','D3','A2','E2'] (empty for non-stringed)
  key: KeyResult;
  chords: {
    explicit: ChordHit[];   // from diagrams
    detected: ChordHit[];   // from notes (cleaned)
    progression: string[];  // de-duped, bar-grouped
    roman: string[];        // tonal Progression.toRomanNumerals output (e.g. 'VIm')
  };
  scales: ScaleCandidate[];
  sections?: SectionSpan[];  // per-section slice (derived) when markers exist
}

interface ChordHit {        // tonal Chord.get() shape + position
  symbol: string;           // 'G#m'
  tonic: string;            // 'G#'
  type: string;             // 'minor'
  quality: string;          // 'Minor'
  notes: string[];          // ['G#','B','D#']
  bar: number; beat: number;
}
interface ScaleCandidate { name: string; tonic: string; type: string; score: number }
```

### Worked example — I'm Yours (real spike values)
See `docs/spikes/2026-06-19-gp-tonal/FINDINGS.md`. Song key `B major` (alteration 5, keySignature `#####`), sections Intro/Verse/Chorus…, Classical Guitar progression `["B","F#","G#m","E"]` → roman `["I","V","VIm","IV"]`.

## 7. Key + mode + hybrid algorithm

1. **Histogram** — duration-weighted pitch-class counts per track (and aggregated per song / per window).
2. **Krumhansl-Schmuckler** — correlate the histogram against all 24 major/minor profiles → best tonic + major/minor + confidence (the spike's working code).
3. **Mode refinement** — given the tonic, inspect the scale degrees actually present (e.g. natural vs flat 7th) via `Scale.detect`; upgrade `type` from major/minor to the best-fit mode (catches G Mixolydian, F14).
4. **Chord-based inference** — when explicit chords exist, pick the key whose diatonic triads (`Key.majorKey().triads` / minor) best cover the chord set; this path also yields roman numerals directly.
5. **Hybrid combiner** — prefer the chord-based result when chords are present and confident; otherwise histogram+mode. Cross-check the two; record competing readings (e.g. relative minor) in `alternatives`. For the **song-level** key, aggregate harmonic tracks (guitar/piano/keys) weighted high, bass/vocal low (F8).

## 8. Chords, progression, roman numerals

- **Explicit:** read `Beat.chord` diagrams → `Chord.get(name)` for parts → `ChordHit` with `bar`/`beat`.
- **Detected:** gather simultaneous non-percussion notes per beat → `Note.fromMidi(realValue)` → `Chord.detect(names)`. Cleanup: spell enharmonics to the detected key, drop bare power-chord noise where a fuller chord exists, dedup, **group by bar** to produce a readable progression (fixes F4).
- **Progression → roman:** `Progression.toRomanNumerals(tonic, progression)` → key-independent signature that powers cross-key search later.

## 9. Structure: sections, modulation, time, tempo, tuning

- **Sections:** `MasterBar.section.text` when present → `SectionSpan` with `barStart`/`barEnd`; each carries a derived `key`/`progression`/`roman`/`scales` (slice of the track data).
- **Modulation:** sliding-window (default 8 bars) key detection over the song → collapse equal adjacent windows → `keyChanges[]`. For single-key songs this is one entry. Honest limitation: ambiguous multi-key songs (Toto Africa, F15) stay approximate; no LLM in v1.
- **Time signatures / tempo:** straight from master bars; emit change events with `barStart`/`barEnd` (F10/F16).
- **Tuning:** `Staff.tuning` (MIDI ints) → scientific names; informational (key detection is tuning-independent, F7).

## 10. Error handling & edge cases

- Unparseable/empty bytes → throw a typed `ParseError` (don't return a half object).
- Percussion tracks → `isPercussion: true`, skip pitched analysis.
- Tracks with no pitched notes → `key.confidence: 0`, empty chords/scales (don't guess).
- Files with no section markers → `sections: []`; rely on `keyChanges[]` windowing.
- Enharmonic spelling always resolved relative to the detected key.

## 11. Testing (TDD)

Use the spike corpus as fixtures with known-answer assertions:
- I'm Yours → song key B major; Classical Guitar progression `B F# G#m E` / roman `I V VIm IV`; sections present.
- Yellow + Yellow-standard-tuning → **both** B major, equal confidence (the tuning-invariance test, F7).
- When I Come Around → F# major (sounding); `.gp`, `.xml`, `.mxl` all parse.
- Dias Atrás → no explicit chords; detect-from-notes yields a non-empty cleaned progression; B major.
- Man In The Mirror → tonic G; mode refinement reports Mixolydian (F14).
- Toto Africa → time-signature changes captured; `keyChanges[]` has >1 entry (F15/F16).
- Unit tests per module (`key`, `chords`, `progression`, `scale`, `histogram`, `structure`).

## 12. Satellites (designed-for, separate tickets)

- **Write-back** (`annotateChords(score, opts) → Uint8Array` via `Gp7Exporter`, proven F11).
- **Search by progression** (transposition-invariant match on `roman[]`).
- **Scale-usage / time-signature search** (filters over the output).
- **Full section approximation** for marker-less files.

## 13. Open questions

- Publishing: publish under `@notation-hero/*` scope, or a standalone unscoped npm name? (Resolve before first publish — does not block the core build.)
- `trackWeights` defaults: exact weights for guitar/piano vs bass/vocal — tune against the fixtures during implementation.
