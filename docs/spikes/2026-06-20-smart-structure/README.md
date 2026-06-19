# NH-200 spike — smart structure detection (marker-less songs)

Throwaway spike. Infers a **key-change (modulation) timeline** and **approximate
section boundaries** for Guitar Pro files that carry **no section markers**.
Builds on the NH-196 gp-tonal spike (reuses its Krumhansl key detector).

**Read [FINDINGS.md](./FINDINGS.md) for the accuracy read and the rule-based-vs-ML recommendation.**

## Run

```bash
npm install                                  # @coderline/alphatab + tonal (node_modules gitignored)

node keychanges.mjs "<path to .gp>"          # windowed key-change timeline → keyChanges[]
node sections.mjs   "<path to .gp>"          # 3 rule-based methods + vote-merge + structural labels
node validate.mjs                            # accuracy vs ground-truth markers + key-change checks
```

`keychanges.mjs` takes optional `[windowBars] [minSegBars]` args (defaults 8, 4).

## Browser demo (visual)

`demo.html` is a standalone served page (same approach as the NH-137 play-parts demo): AlphaTab from CDN, drop a `.gp`/`.xml`/`.mxl`, and it renders the score **plus** the detected key-span timeline and inferred section boundaries overlaid. The detection logic is the same as the `.mjs` core, ported inline.

```bash
python3 -m http.server 8201 --directory .   # then open http://localhost:8201/demo.html
```

Drop any file to analyse it; tune `window`/`minSeg` and press Re-run. Optionally place a `sample.gp` next to `demo.html` (gitignored) to auto-load it on open.

## Files

| File | What |
|------|------|
| `lib.mjs` | shared core: score loading, per-bar pitch-class histograms, `detectKey` (Krumhansl-Schmuckler, from NH-196), structure readers (markers / time-sig / tempo / repeats) |
| `keychanges.mjs` | R1 — sliding-window key detection + hysteresis collapse → `keyChanges[]` |
| `sections.mjs` | R2 — (a) GP repeats, (b) chord-root change-points, (c) self-similarity + Foote checkerboard novelty; vote-merge + A/B/C labelling |
| `validate.mjs` | R3 — precision/recall/F1 vs file markers (±1/±2 bars) + key-change timeline checks |
| `demo.html` | browser demo — AlphaTab renders the score + detected key-span timeline + section boundaries overlay |
| `FINDINGS.md` | R3/R4 — measured numbers, failure modes, recommendation |

## Corpus

External (not committed): `/Users/leocaseiro/Music/AlphaTab-RhythmGame/`. Ground
truth = files with real markers (I'm Yours, Yellow); targets = marker-less
(Africa, Bohemian Rhapsody, Happiness is a Warm Gun).
