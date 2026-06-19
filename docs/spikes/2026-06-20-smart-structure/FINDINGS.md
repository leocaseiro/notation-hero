# Spike — Smart structure detection (NH-200)

**Ticket:** [NH-200](https://leocaseiro.atlassian.net/browse/NH-200) (builds on [NH-196](https://leocaseiro.atlassian.net/browse/NH-196); feeds [NH-137](https://leocaseiro.atlassian.net/browse/NH-137))
**Date:** 2026-06-20
**Question:** For songs with **no section markers**, can we infer (1) a **key-change (modulation) timeline** and (2) **section/part boundaries** with rule-based methods — and how accurate is it?
**Answer:** **Key-change timeline — yes, ship it.** Windowed Krumhansl-Schmuckler + hysteresis cleanly separates single-key from modulating songs (all corpus checks pass). **Section approximation — partial.** Rule-based gives a rough first guess (best F1 ≈ 67–70%, precision often < 50%); good enough for *candidate* cut-points with a human in the loop, not for unattended labelling. Full semantic naming (intro/verse/chorus) is NOT solved here and is the ML/LLM candidate.

## How to run

```bash
cd docs/spikes/2026-06-20-smart-structure
npm install                                  # @coderline/alphatab + tonal (node_modules gitignored)
node keychanges.mjs "<path to .gp>"          # windowed key-change timeline
node sections.mjs   "<path to .gp>"          # 3 rule-based section methods + merge + labels
node validate.mjs                            # accuracy vs ground-truth markers + key-change checks
```

## Pipeline

```
bytes ─► AlphaTab Score ─► per-bar duration-weighted 12-bin pitch-class histograms (realValue%12, skip percussion)
   │                         │
   │                         ├─► keychanges: sliding window (8 bars) ► Krumhansl detectKey ► hysteresis (minSeg 4) ► keyChanges[]
   │                         └─► sections:  (a) GP repeats  (b) chord-root change-points  (c) self-similarity + Foote novelty ► vote-merge ► labels
   └─► masterBars: section markers (ground truth), time-sig, tempo, repeat flags
```

Reuses NH-196's proven `detectKey` (Krumhansl profiles + Pearson) and histogram, reproduced in `lib.mjs` (NH-196 spike lives on branch `alphatab-tonal-spike`).

---

## Findings

| # | Finding |
|---|---------|
| S1 | ✅ **Key-change timeline works.** Single-key songs collapse to **one** span; modulating songs yield several. All five corpus checks pass (table below). This half is production-shaped. |
| S2 | **Africa** (no markers) → **5 spans across 3 tonal centres** (B→A→E→A→E major), matching NH-196 F15 ("~3 keys"). The repeated A/E reflect real back-and-forth, not noise. |
| S3 | **Bohemian Rhapsody** (no markers, 122 bars) → **11 spans** (A♯ major home with G minor / C minor / D♯ / F / A excursions). Musically plausible for a through-composed song; confidence dips (0.71–0.93) in the ambiguous operatic middle — honest uncertainty, not a bug. |
| S4 | **Hysteresis matters.** Without a minimum-segment rule the window jitters key every few bars. `minSeg = 4` bars + collapse gives stable spans. Each final span's key is re-derived from its whole-span histogram (cleaner than averaging windows). |
| S5 | ⚠️ **Section approximation is rough.** Best single result: chords on I'm Yours **F1 67%** (P/R 70/64 @±2). Best overall: merged(all) on I'm Yours **F1 70%** (P/R 67/73). Yellow is weaker and precision-poor (table below). |
| S6 | ⚠️ **Method (a) GP-repeats: high precision but usually absent.** I'm Yours / Yellow / Bohemian have **0 repeat marks** → 0 recall there; Africa has 7 → genuinely useful. Free signal when present, nothing when not. |
| S7 | ⚠️ **Method (b) chords over-segments + lands ~2 bars off.** Harmonic phrases (≈4–8 bars) are finer than sections (≈8–20). Yellow: precision **7% @±1 but 50% @±2** — boundaries are near-misses, not random. |
| S8 | ⚠️ **Method (c) novelty is inconsistent.** Under-segments I'm Yours (2 boundaries, 9% recall); decent on Yellow (R 56% @±2). Sensitive to kernel size / threshold; would need per-song tuning. |
| S9 | ⚠️ **Vote-merge (≥2 methods agree) only pays off when repeat structure is present.** On the two *scored* songs (no repeat marks) the three signals rarely coincide within ±1 bar, so `merged(votes>=2)` yields 0–1 boundaries — too sparse to use. But on repeat-rich Africa (7 repeat marks) it gives **6 non-trivial boundaries** — productive exactly when method (a) fires. When no repeats exist, **union (`merged-all`) is the useful mode**: recall 73–78% @±2 at a precision cost. |
| S10 | ⚠️ **Structural-class labels (A/B/C) conflate same-key sections.** Labelling by per-segment pitch-class histogram makes most sections collapse to "A" (they share the key's notes). This is boundary detection, NOT verse/chorus naming — naming is deliberately out of scope (it's the ML/LLM job). |
| S11 | ❌ **The "Bohemian Rhapsody with sections.gp" file is not bar-aligned ground truth.** It carries only **3 annotation texts** ("gtrs enter", "tempo 144", "tempo 207"), not intro/verse/chorus markers, and a **different bar count** (139 vs 122 — verified manually via the loader; `validate.mjs` does not load this file). Excluded from scored accuracy; the marker-less Bohemian is reported qualitatively only. |
| S12 | ✅ **Time-signature + tempo + repeat timelines come free** from master bars (confirms NH-196 F10/F16). Happiness is a Warm Gun has ~18 meter changes; Bohemian ~16. These are read-not-inferred and need no spike. |
| S13 | 🔧 **Post-review hardening — numbers re-measured.** A code-review pass fixed three real bugs: boundary-cluster center *drift* (clusters could exceed the ±tol contract and inflate vote counts), *early-boundary suppression* in the peak-picker (a section change in bars 2–4 was silently dropped), and *chordless-window novelty* read as maximum change. The **scored** accuracy was unchanged after the fixes (the two scored songs have no early/short sections and no drift-affected clusters); the **marker-less qualitative** boundaries shifted by ≈1 bar (and Africa gained an early boundary). All numbers in this document are the post-fix re-measurement. |

## Measured accuracy

Section-boundary accuracy vs real file markers (bar 1 excluded so it can't inflate; tolerance = bars):

| Song (true markers) | method | pred | P/R @±1 | P/R @±2 | F1 @±2 |
|---|---|---|---|---|---|
| I'm Yours (12) | repeats | 0 | 0/0 | 0/0 | 0% |
| | chords | 10 | 70/64 | 70/64 | **67%** |
| | novelty | 2 | 50/9 | 50/9 | 15% |
| | merged(all) | 12 | 67/73 | 67/73 | **70%** |
| | merged(votes≥2) | 0 | 0/0 | 0/0 | 0% |
| Yellow (10) | repeats | 0 | 0/0 | 0/0 | 0% |
| | chords | 14 | 7/11 | 50/78 | 61% |
| | novelty | 12 | 33/44 | 42/56 | 48% |
| | merged(all) | 25 | 20/56 | 28/78 | 41% |
| | merged(votes≥2) | 1 | 0/0 | 0/0 | 0% |

Key-change timeline check (legend M = major, m = minor):

| Song | spans | timeline (head) | expected | result |
|---|---|---|---|---|
| I'm Yours | 1 | B M [1–76] | single key | ✅ PASS |
| Yellow | 1 | B M [1–97] | single key | ✅ PASS |
| Africa | 5 | B→A→E→A→E major | modulates | ✅ PASS |
| Bohemian Rhapsody | 11 | A♯M + Gm/Cm/D♯M/Fm… | modulates | ✅ PASS |
| Happiness is a Warm Gun | 3 | Am [1–16] Em [17–23] CM [24–42] | (exploratory) | ✅ PASS |

Marker-less section approximation (qualitative — no bar-aligned ground truth; bar 1 is the trivial song-start, always present):

| Song | merged(votes≥2) boundaries | merged(all) count |
|---|---|---|
| Africa (7 repeats) | 1, 3, 8, 15, 19, 23, 41 | 9 |
| Bohemian Rhapsody (0 repeats) | 1, 5, 14, 25, 61, 90, 95, 108 | 26 |
| Happiness is a Warm Gun (2 repeats) | 1, 13 | 9 |

---

## Recommendation — rule-based vs ML/LLM

**Key-change timeline → ship the rule-based version now.** Windowed Krumhansl + hysteresis is accurate and cheap, has no training/data cost, and produces a confidence per span. It directly fills NH-196's `keyChanges[]` for marker-less files. No ML needed.

**Section approximation → rule-based as a *candidate* generator, defer ML until there's demand.**

1. **Prefer file markers when present** (NH-196 F9). Most curated files in the corpus (I'm Yours, Yellow) already carry intro/verse/chorus markers — read them, don't infer.
2. **When markers are absent, use `merged(all)` boundaries as rough cut-point candidates** (recall 73–78% @±2) feeding a *human-in-the-loop* picker (this is exactly what NH-137's song-slice picker needs — approximate bars a user nudges, not authoritative sections). Do **not** present them as authoritative labelled sections (precision is too low, ~28–67%).
3. **Repeat structure is a free high-precision signal** — always fold it in when the file has it.
4. **ML/LLM is the right tool for *accurate, named* sections, but only if that becomes a product need.** The promising, cheap path is an **LLM over the symbolic features** this spike already extracts (per-bar chord/key/repeat/novelty series) — not raw audio — asked to label intro/verse/chorus. Cost: prompt design + a small labelled eval set + per-file inference. A **trained segmenter** (SALAMI-style supervised model) is heavier (labelled dataset + training/serving) and likely overkill at catalogue scale. Recommend a follow-up spike *only* when accurate auto-naming is actually required; today's rule-based candidates + file markers cover the near-term need.

### Honest limitations

- Two clean-ground-truth songs only (I'm Yours, Yellow) — small sample; treat F1 figures as indicative, not definitive.
- Parameters (window 8, minSeg 4, kernel ±4, novelty threshold mean+0.5σ, label sim 0.9) are sensible defaults, **not** tuned per song — deliberately, to avoid overfitting to two files.
- Boundary detection ≠ part naming. This spike finds *where* sections change, not *what* they are.
- **Read recall with precision, never alone.** A "predict every bar" detector would score 100% recall; the F1 and precision columns are what keep the read honest, so quote them together.
- Per-bar features assume each track's bar list is index-aligned with the song's master bars (true for all six corpus files). A track that enters late or ends early would contribute empty (zero) bars for its missing tail, slightly distorting the self-similarity and key windows there.

## Feed-forward

- `keyChanges[]` (from `keychanges.mjs`) → NH-196 `SongAnalysis.song.keyChanges` when a file has no markers. Shape matches the NH-196 design (`barStart`/`barEnd`/`key{tonic,type}`/`confidence`).
- `merged(all)` boundaries → NH-137 song-slice picker as suggested cut-points.
- Time-sig / tempo / repeat timelines already parse for free (no further work).

## Test corpus (`/Users/leocaseiro/Music/AlphaTab-RhythmGame/`)

| File | Markers | Role |
|------|---------|------|
| I'm Yours - Jason Mraz.gp | 11 (clean) | section ground truth; single-key B major |
| Coldplay-Yellow-06-26-2025.gp | 10 (clean) | section ground truth; single-key B major |
| Toto - Africa.gp | none | marker-less; modulation (5 spans) + meter changes |
| Bohemian Rhapsody.gp | none | marker-less; heavy modulation (11 spans), 122 bars |
| Happiness is a Warm Gun.gp | none | marker-less; extreme meter changes, 3 key spans |
| Bohemian Rhapsody with sections.gp | 3 annotations | ✗ not usable ground truth (see S11) |
