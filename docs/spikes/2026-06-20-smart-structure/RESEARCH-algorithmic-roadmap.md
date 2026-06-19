# Algorithmic structure detection — research roadmap (NH-200, no ML/LLM)

**Date:** 2026-06-20 · **Question:** how far can we push section detection + naming with **algorithms only** (no ML, no LLM), and **what do we need from the song** to do it? · **Method:** three parallel research agents (MIR methods · role-labeling cues · AlphaTab signal audit). Sources at the end.

## TL;DR

- **Boundaries** (where sections change) are the easy part — algorithmic ceiling ≈ **70–78% F1** on pop/rock. We're at ~67–70%; a couple of upgrades get us near the ceiling.
- **Naming** (verse/chorus/…) is the hard part. We measured rule-based naming at 14–30%. The literature explains exactly why and how to fix it **without ML**: stop relying on pitch/chord repetition alone (verse & chorus share a key) and add an **energy/texture signal**. Realistic algorithmic ceiling for naming ≈ **65–80% on pop/rock** (lower on jazz/through-composed).
- The single biggest unlock: **we are throwing away the data that distinguishes verse from chorus** — dynamics/velocity, polyphony, and which instruments are playing. All three are in the Guitar Pro file; we only use pitch + duration today.

---

## 1. The three principles (every algorithmic method is one or more of these)

| Principle | Detects | Algorithm | We have it? |
|---|---|---|---|
| **Novelty** | boundaries | Foote checkerboard kernel on a self-similarity matrix (SSM) | ✅ yes (`boundariesFromNovelty`) |
| **Homogeneity** | labels (cluster IDs) | spectral clustering of the SSM (scluster), convex-NMF | ⚠️ partial — we group by histogram cosine (`labelSegments`), not proper clustering |
| **Repetition** | which segments recur (**the chorus key**) | **time-lag matrix / structure features** (Serra), SSM diagonal scoring (audio "thumbnailing"), Goto RefraiD | ❌ **no** — our SSM captures *local* similarity, not *repetition across the song* |

**Biggest method gap:** we don't do **repetition** properly. Our SSM + Foote finds where the texture changes, but not "this 8-bar block recurs 4× → it's the chorus." That needs a **time-lag (lag-matrix) representation** or **diagonal scoring** of the SSM.

---

## 2. Why naming fails — and the fix (no ML)

**Measured failure (our spike):** verse and chorus *in the same key* have near-identical pitch-class content, so similarity-clustering lumps them together and "most-repeated class = chorus" over-applies. The literature (Goto's RefraiD: 0.938 F at *finding* repetition but can't split verse/chorus; Maddage; ASSDP) hits the **exact same wall**.

**The fix the field uses — add an energy/texture gradient.** Music theory (Nobile's *teleological* model) and MIR both say verse→pre-chorus→chorus is an **energy rise**, measurable from symbolic data:

| Discriminator | Why it splits verse vs chorus | Compute from GP |
|---|---|---|
| **Energy / loudness** | chorus is louder | sum of note **velocity/dynamics** per bar; **accentuation** frequency |
| **Texture / density** | chorus is fuller | **polyphony** (simultaneous notes/bar), **onset density**, rests |
| **Instrumentation** | drums/vocals enter at the chorus | **active-track count per bar**; track named "Vocals"/"Lead" present |
| **Register** | chorus melody sits higher | **mean MIDI pitch** of the lead voice per section (absolute height, not pitch-class) |
| **Harmonic stability** | chorus starts/ends on the tonic; pre-chorus ends on V | section start/end chord root vs the detected key |
| **Position prior** | intro first & short, bridge ~⅔ in, outro last | normalized section start position |
| **Length regularity** | chorus = regular 8/16 bars, low variance | bar count per structural class + variance across recurrences |

**Key idea:** rank repeated segments by **repetition × energy**, not repetition alone — that one change is what breaks the verse/chorus tie. Literature reports a simple **LCS / most-repeated-on-chord-sequence + energy + position** rule reaching ~65–80% role accuracy on pop/rock **with no training**.

---

## 3. What we need from the song — feature inventory (ranked)

We currently extract only **pitch-class histograms** + **durations** (+ markers/tempo/meter/repeats for structure). Everything below is in the GP file via AlphaTab and unused. Tiers are by impact × ease.

### Tier 1 — high impact, easy, not yet used
1. **Instrumentation / track activity** — `Track.name`, `Track.isPercussion`, `Track.playbackInfo.program` (GM instrument), and **active-track count per bar** (iterate `score.tracks[].staves[].bars[i]` for non-rest). → "drums/vocals enter" = chorus; a track literally named "Vocals" is gold.
2. **Dynamics / energy** — `Note.dynamics` (velocity), `Note.accentuated`, `Beat.dynamics`, `Beat.crescendo`, `Beat.fade`. → the verse-vs-chorus energy signal.
3. **Explicit chord diagrams** — `Beat.chordId` → `Staff.chords[id].name`. → real chord names (e.g. "F#6", "E7M") instead of noisy chord-from-notes; powers harmonic-stability + progression matching.

### Tier 2 — medium impact
4. **Texture / density** — `Beat.notes.length` (polyphony per beat), onset density, `Beat.isRest`/`isFullBarRest`.
5. **Register** — mean `Note.realValue` of the lead/highest voice per section (absolute pitch height).
6. **Lyrics** — `Beat.lyrics` (when present): a repeated lyrical hook = chorus; sometimes literal "Verse"/"Chorus" text.

### Tier 3 — niche / situational
7. **Articulation texture** — `Note.isPalmMute`, `Note.isLetRing` (muted verse vs sustained chorus).
8. **Directions / jumps** — `MasterBar.directions` (DaCapo/DalSegno/Coda/Fine) → reconstruct the *logical* play order (we currently ignore these).
9. **Already used:** time signature, tempo automations, triplet feel, repeats/alternate endings, section markers.

---

## 4. Recommended algorithmic upgrades (prioritised, no ML)

**Boundaries (→ aim ~75% F1):**
- **B1. Time-lag / structure-feature matrix** (Serra SF): from our per-bar histogram SSM, build an `L×B` lag matrix and run novelty on *that* — adds the repetition principle. Expected **+5–15 F1** (MSAF benchmarks).
- **B2. Hard-constrain on GP repeats + directions**: treat repeat barlines / volta / D.S./Coda as mandatory boundaries (exact ground truth audio methods never get), then refine with the SSM only inside blocks.
- **B3. Transposition-invariant repetition**: match modulated/key-shifted choruses by shifting the chroma by the Krumhansl key delta (we already compute keys) — DTW/chroma-shift.

**Naming (→ aim ~65–80% on pop/rock):**
- **N1. Per-section energy/density curve** — velocity sum + polyphony + active-track count. **This is the missing discriminator.**
- **N2. Repetition × energy ranking** — most-repeated *and* highest-energy recurring segment = chorus; zero-repetition short late segment = bridge; the energy-rising segment before a chorus = pre-chorus.
- **N3. Register + harmonic-stability tie-breakers** — higher mean pitch and tonic start/end → chorus.
- **N4. Position + length priors** — intro∈[0,15%] & short; first chorus∈[15,40%]; bridge∈[55,80%]; outro last; chorus length low-variance 8/16 bars.
- **N5. Lyrics shortcut** — when `Beat.lyrics` exist, repeated hook text strongly marks the chorus.

**Proper labeling backbone (optional, bigger):**
- **L1. Spectral clustering / C-NMF** of the SSM to get clean section classes before role assignment (replaces the ad-hoc cosine-threshold grouping). MSAF's `scluster`/`cnmf` are the references (feed our symbolic feature matrix directly, bypassing audio).

---

## 5. Realistic ceilings (no ML)

| Task | Pop / rock | Jazz / through-composed |
|---|---|---|
| Boundary detection | ~70–78% F1 @ 1-bar tol | lower; novelty over-segments |
| Section-role naming | ~65–80% | ~40–55% (verse/chorus assumption breaks) |

Bohemian Rhapsody (through-composed) will stay hard — that's expected and honest. The wins are concentrated on conventional verse/chorus songs, which is most of the catalogue.

---

## 6. Suggested next experiments (in order)

1. **N1+N2 — energy/density discriminator** (velocity + polyphony + active-tracks per bar → repetition×energy chorus pick). Cheapest, biggest naming win. Validate against I'm Yours / Yellow markers.
2. **B1 — time-lag structure features** for boundaries.
3. **Tier-1 feature extraction** (instrumentation, dynamics, explicit chords) wired into `lib.mjs`.
4. **B2 — GP directions/repeats as hard constraints.**
5. Re-measure naming accuracy after each; the I'm Yours / Yellow named markers are a ready-made scoring set.

---

## Sources

**MIR methods:** [Symbolic graph changepoint detection (arXiv 2303.13881)](https://arxiv.org/abs/2303.13881) · [CBM barwise MSA (arXiv 2311.18604)](https://arxiv.org/html/2311.18604) · [Serra structure features](https://www.researchgate.net/publication/264006858_Unsupervised_Music_Structure_Annotation_by_Time_Series_Structure_Features_and_Segment_Similarity) · [MSAF docs](https://msaf.readthedocs.io/en/latest/) · [FMP novelty/SSM notebooks (Müller)](https://www.audiolabs-erlangen.de/resources/MIR/FMP/C4/C4S4_NoveltySegmentation.html) · [pitchclass2vec symbolic segmentation (arXiv 2303.15306)](https://arxiv.org/abs/2303.15306) · [wavelet symbolic segmentation (arXiv 2504.20522)](https://arxiv.org/abs/2504.20522)

**Role labeling:** [Goto RefraiD chorus detection](https://staff.aist.go.jp/m.goto/PAPER/IEEETASLP200609goto.pdf) · ["To catch a chorus, verse, intro…" (arXiv 2205.14700)](https://arxiv.org/abs/2205.14700) · [Nobile — teleology in verse-prechorus-chorus (MTO 28.3)](https://mtosmt.org/issues/mto.22.28.3/mto.22.28.3.nobile.html) · [Open Music Theory — pop/rock form](https://openmusictheory.github.io/popRockForm.html) · [LCS chorus labeling (IJSDR)](https://www.ijsdr.org/papers/IJSDR1603009.pdf) · [ASSDP](https://vivianschen.github.io/ASSDP/)

**Benchmarks:** SALAMI dataset; MIREX Music Structure Analysis (non-ML ceiling ~0.65–0.75 boundary F1).

**AlphaTab signal paths:** see the per-feature `.d.ts` line references in the Tier inventory above (Beat 4786–5186, Note 12747–13149, MasterBar 10715–10884, Track 16005–16082, Staff 15545–15632).
