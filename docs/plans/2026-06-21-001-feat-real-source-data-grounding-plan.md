---
title: "feat: ground wireframe + SQL seed in real Guitar Pro source data"
type: feat
date: 2026-06-21
branch: docs/wireframe-pattern-lesson-model
pr: 52
origin: user request (autonomous /lfg run, 2026-06-21)
---

# feat: ground wireframe + SQL seed in real Guitar Pro source data

## Summary

Replace the invented/placeholder seed data in the notation-hero wireframe and SQL
seed with **real values extracted from the actual Guitar Pro (`.gp`) source files**
for the five decided seed songs, plus the already-real drum patterns. Feasibility
is proven: `@coderline/alphatab` (installed at `~/Sites/alphaTabWebsite`) parses the
`.gp` files in Node and yields real title/artist/tempo/bar-count/time-signature,
the full track list with instruments + percussion flag, and section markers with
bar ranges. The work writes a small reusable extractor, dumps each file to raw JSON,
maps the **objective** fields onto the wireframe `PLAYABLES` array and the SQL seed,
and **defers every subjective or un-extractable field to the spec delta** rather
than inventing it.

This is autonomous (`/lfg`). Leo stepped back. Do not ask him anything; open UI/DB
questions go to the spec delta and are skipped.

---

## Problem Frame

The seed data I authored earlier was largely invented (e.g. Zoio guessed at 140 bpm
when the real file is **76 bpm / 79 bars**; track lists and section data were made
up). Leo provided the real `.gp` files and asked that **every part of the wireframe
use the original sources**. The objective metadata in those files is the ground
truth and must replace the guesses. Subjective fields the file cannot carry
(per-track difficulty 0–10, technique tags) stay as human-assigned estimates but
must be **flagged as such**, never presented as extracted.

---

## Requirements

Traced to Leo's constraints for this run:

- **R1** — Use the real `.gp` files as the source for objective song metadata
  (title, artist, tempo, bars, time signature, tracks/instruments, sections).
- **R2** — Do **not** invent data. Where a value cannot be extracted, do not fabricate it.
- **R3** — Any open UI or DB question → append to the spec delta
  `docs/wireframe/2026-06-16-schema-deltas.md` and **skip** that item. Never block, never ask.
- **R4** — When unsure how the UI consumes a piece of data, print the **raw JSON** of
  the extracted data into the spec delta for Leo to verify later.
- **R5** — Subjective fields AlphaTab cannot provide (per-track `level`, `techniques`)
  → keep existing estimates but flag in the delta as human-assigned, pending calibration.
- **R6** — Extract the **real sections** from `Bohemian Rhapsody with sections.gp`
  (Leo's "no longer need sections" earlier is superseded by him providing the
  with-sections file; log the contradiction to the delta and proceed with real data).
- **R7** — Every change validated (SQL on `nh_tonal_scratch`; wireframe JS syntax +
  served screenshot); commit each green step; commitlint requires a lowercase subject;
  never `--no-verify`; push to PR #52.

---

## Key Technical Decisions

- **KTD-1 — Reuse the installed AlphaTab, do not install in the PR.** The extractor
  runs from `~/Sites/alphaTabWebsite` (where `@coderline/alphatab` resolves). The PR
  worktree gets the **script** (for reproducibility) + the **extracted JSON output**,
  but no `node_modules`/dependency churn. Proven working on Yellow.
- **KTD-2 — Objective vs subjective split.** AlphaTab gives: title, artist, tempo,
  bar count, time signature, track names/instruments/percussion flag, section
  labels + bar ranges, and (where present) key/chord data. It does **not** give
  per-track difficulty levels or technique tags — those remain human estimates and
  are flagged (R5), never overwritten with fake "extracted" values.
- **KTD-3 — Raw JSON is the durable artifact.** Each song's extraction is saved as
  raw JSON under `docs/wireframe/data/` and the salient parts echoed into the spec
  delta (R4), so Leo can verify the mapping later even where the UI consumption is
  uncertain.
- **KTD-4 — Map only what the UI/DB already model.** The wireframe item shape
  (`level`, `artist`, `bpm`, `time_sig`, `instruments[]`, `tracks[]`,
  `data.sections[]`) and the SQL columns are the target. Extracted fields with no
  home in the current model (e.g. effect-layer tracks like "Overdrive", per-string
  tuning) are logged to the delta as open questions (R3), not force-fit.
- **KTD-5 — Track identity reconciliation.** Real files have more/aux tracks than my
  invented 4–6 (Yellow has 8, incl. Overdrive + Strings + Piano Overdub). Decide a
  rule (map the primary playable instruments; fold/skip aux layers) and log it to the
  delta; keep per-track `level`/profile estimates attached to the surviving tracks.

---

## Implementation Units

### U1. Reusable GP→JSON extractor

**Goal:** A committed, documented Node script that parses a `.gp` file into the raw
JSON we need (title, artist, tempo, bars, timeSig, tracks[{name,instrument,
isPercussion,tuning}], sections[{label,startBar,endBar}], and key/chord data where
available).
**Files:** `docs/wireframe/tools/gp-extract.mjs` (create), with a header comment
documenting that it requires `@coderline/alphatab` and is run from a dir where that
resolves (e.g. `~/Sites/alphaTabWebsite`).
**Approach:** Port the proven probe (`ScoreLoader.loadScoreFromBytes` → walk
`masterBars` for `isSectionStart`/`section`, `score.tracks` for names + percussion).
Output JSON to stdout and/or a file path arg.
**Test scenarios:** Run against all 5 GP files; each yields non-empty title + tempo +
bars + ≥1 track without throwing. `Covers R1.`
**Verification:** `node gp-extract.mjs <file>` prints valid JSON for each of the 5 songs.

### U2. Extract all 5 songs → raw JSON artifacts + delta echo

**Goal:** Produce and store the raw extraction for Bohemian (with sections), Yellow,
Zoio, I'm Yours, Angra.
**Dependencies:** U1.
**Files:** `docs/wireframe/data/gp-extract-<song>.json` (×5, create); append a
"Real-source extraction (TS-4 grounding)" block to `docs/wireframe/2026-06-16-schema-deltas.md`
echoing the salient JSON per song (R4).
**Approach:** Run U1's script per file; save output. Capture the real bpm/bars/tracks/
sections. Note discrepancies vs current seed (e.g. Zoio 76bpm not 140).
**Test scenarios:** 5 JSON files exist and parse; delta block lists each song's real
tempo/bars/track-count/section-count. `Covers R1, R4.`
**Verification:** `jq . docs/wireframe/data/gp-extract-*.json` succeeds for all 5.

### U3. Ground the wireframe songs (objective fields)

**Goal:** Update the 5 seed songs in the wireframe `PLAYABLES` array to use real
bpm, time_sig, instruments[], tracks[] (names + instrument + percussion), and
`data.sections[]` (real labels + bar ranges) from the extraction.
**Dependencies:** U2.
**Files:** `docs/wireframe/index.html`.
**Approach:** Replace invented values with extracted ones. Keep per-track `level`
and `techniques` as the existing human estimates (R5) — do not pull fake levels from
the file. Apply KTD-5 track-identity rule (map primary instruments; log aux layers).
Bohemian gets its real `data.sections[]` (R6).
**Test scenarios:** JS parses clean (extract `<script>` → `new Function`); served
wireframe renders each song with real bpm/sections; instrument filter still scopes
levels correctly (regression of the earlier fix). `Covers R1, R6.`
**Verification:** Screenshot the Bohemian detail page showing real sections; Zoio row
shows 76 bpm.

### U4. Ground the SQL seed (objective fields)

**Goal:** Update `2026-06-21-per-track-profiles-and-seed-draft.sql` song rows + tracks
to the real bpm/time-signature/instruments/track-set; add real `data.sections[]`
jsonb for Bohemian.
**Dependencies:** U2.
**Files:** `docs/wireframe/2026-06-21-per-track-profiles-and-seed-draft.sql`.
**Approach:** Set real `bpm`, `time_signature_*`, derived `instruments[]`, and track
rows to match the extraction. Keep per-track `level` estimates (R5). Put Bohemian's
real sections into `playable.data->'sections'`.
**Test scenarios:** File loads clean on `nh_tonal_scratch` (`psql ON_ERROR_STOP=1`,
exit 0); headline = max(track.level) invariant still holds; profile-instrument
invariant still 0/0/0. `Covers R1, R7.`
**Verification:** `psql -d nh_tonal_scratch -f <file>` exits 0; Zoio bpm = 76.

### U5. Flag subjective + un-extractable fields to the delta (skip, don't invent)

**Goal:** Record honestly, in the spec delta, every field that is NOT real-extracted.
**Dependencies:** U3, U4.
**Files:** `docs/wireframe/2026-06-16-schema-deltas.md`.
**Approach:** Append a "Grounding open items" subsection listing: (a) per-track
difficulty levels + technique tags = human estimates pending calibration (R5);
(b) aux/effect tracks (Overdrive, Strings, Piano Overdub) with no model home —
include/skip question (R3 + KTD-5); (c) the Bohemian "we no longer need sections"
contradiction (R6); (d) key/chord extraction fidelity if AlphaTab's tonal read is
weak; (e) any UI consumption uncertainty with the raw JSON inline (R4).
**Test scenarios:** Delta contains a dated "Grounding open items" block enumerating
each skipped/flagged item. `Covers R2, R3, R4, R5, R6.`
**Verification:** The block lists ≥4 explicit open items, each marked skip/flag not resolved.

### U6. Validate end-to-end + per-song commits

**Goal:** Prove the grounded data works and is committed in green steps.
**Dependencies:** U3, U4, U5.
**Files:** none new (validation + commits).
**Approach:** SQL re-validates on scratch; wireframe JS syntax-check; serve + screenshot
Bohemian sections + Zoio 76bpm. Commit each song/step with a lowercase-subject message;
push to PR #52.
**Test scenarios:** SQL exit 0; JS parses; screenshots captured. `Covers R7.`
**Verification:** PR #52 updated; `gh pr checks` green (handled by the LFG CI loop).

---

## Scope Boundaries

**In scope:** the 5 decided seed songs + drum patterns, grounded in their real `.gp` /
groovescribe sources, across the wireframe `index.html` and the SQL seed; the extractor
tool; the delta logging of open/flagged items.

### Deferred to Follow-Up Work
- **Catalogue expansion** to the other real `.gp` files in the folder (Toto Africa,
  Hotel California, Paranoid, Man In The Mirror, Bob Marley, Green Day, Mamonas, etc.) —
  available but not the decided seed; log as available, do not import now.
- **NH-200 algorithmic section inference** for marker-less files — separate spike.
- **Human calibration** of per-track difficulty levels + technique tags (R5).
- **Aux-track modeling** (effect layers, multi-stave) if Leo wants them as first-class.

---

## Risks & Open Questions

- **AlphaTab tonal fidelity:** key/chord extraction from notes may be weak or absent;
  if so, log to delta and keep existing key estimates rather than trusting a bad read (R2).
- **GP format coverage:** GP8 vs GPX vs GP5 — the extractor must handle the actual files;
  Yellow (GP) parsed; verify the others (esp. the large Zoio file ~4.6 MB) in U2.
- **Track-identity drift:** real files carry more tracks than the seed models; KTD-5 +
  U5 handle this by mapping primaries and logging the rest, not by inventing.
- **Per-track levels are estimates** — explicitly flagged (R5), not presented as real.
