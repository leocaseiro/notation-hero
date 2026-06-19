# Spike — Song slice: bars A–B as a standalone notation (NH-137)

**Ticket:** [NH-137](https://leocaseiro.atlassian.net/browse/NH-137) (builds on [NH-196](https://leocaseiro.atlassian.net/browse/NH-196) — GP→tonal parser, which gives the `sections[]` `barStart`/`barEnd` source for the A–B picker)
**Date:** 2026-06-19
**AlphaTab version tested:** `1.8.3` (latest on npm; website pins `1.7.0-alpha.1515` — see OQ-5)

## The question

AlphaTab already plays/loops bars A→B in place. That is NOT the question. The question is:
**how do we produce the selected bars A–B as a STANDALONE notation** — its own self-contained piece — so the "From a song" lesson/pattern step treats the slice as a single Guitar Pro file (editing its timeline affects only the slice)?

Four approaches were compared. All four are feasible. The decision turns on **storage** and **media (audio/video) sync**.

## What was proved by RUNNING (headless Node) vs CONCLUDED from source

| Claim | Proved by running | Concluded from source |
|---|---|---|
| Slice masterBars + bars to A–B and re-render the model | yes — `slice.mjs` on 3 files, 4 ranges | — |
| Approach 1: clone slice -> `Gp7Exporter` -> reload preserves notation | yes — bars/notes match exactly | — |
| Approach 2: `JsonConverter.scoreToJson`/`jsonToScore` round-trips a slice | yes — bars/notes match | `JsonConverter` is `@public` |
| Approach 3: `AlphaTexExporter.exportToString` round-trips a slice | yes — bars/notes/chords match | — |
| alphaTex carries sync points (`\sync barIndex barOcc ms [pos]`) | yes — 4 rebased `\sync` in output | `AlphaTex1LanguageHandler.buildSyncPointNodes` |
| Sync points rebase (bar A -> index 0, ms baseline subtracted) | yes — CPM22 (15 -> 4 in-range) | `Score.exportFlatSyncPoints`/`applyFlatSyncPoints` |
| Tempo/time-sig/tuning/chord-diagrams survive the slice | yes — tempo 147/73, tuning, `\chord` kept | tempo getter reads `masterBars[0]` |
| The **audio blob is never carried** by JSON or alphaTex | yes — `rawAudio=0B` after both | `BackingTrack.rawAudioFile` is `@json_ignore` |
| **GP export CAN re-embed** the audio blob | yes — 7.99 MB blob re-embedded into .gp | `Gp7Exporter` writes `rawAudioFile` into the zip |
| Browser render/play of a slice (`playbackRange`, `DisplaySettings.startBar`/`barCount`) | no — browser-only, not runnable here | `alphaTab.d.ts` + DisplaySettings docs |

`node_modules` is **not** committed. Run with: `cd docs/spikes/2026-06-19-nh137-song-slice && npm init -y && npm install @coderline/alphatab && node slice.mjs "<file.gp>" <A> <B>` (A,B = 1-based inclusive bar numbers).

## How the slice actually works (the real engineering)

`Bar.masterBar` is a **positional getter**: `score.masterBars[this.index]`. So a slice must keep the `masterBars` array and every staff's `bars` array **index-aligned** and re-index both to `0..N-1`. Three non-obvious gotchas were hit and solved:

1. **Re-index or crash.** Filtering the arrays without resetting `bar.index` makes `masterBars[bar.index]` return `undefined` -> `getFermata` throws in `finish()`. Fix: reset `bar.index` + `previousBar`/`nextBar`/`previousMasterBar`/`nextMasterBar` after filtering.
2. **Cross-boundary note links dangle.** Ties, hammer-ons, slurs, slides are chained by note-id (`_noteIdBag`) during `finish()`. If the partner note lived in a cut-away bar, `noteIdLookup.get(id)` returns `undefined` and `Note.chain` throws (`Cannot set properties of undefined`). **`Gp7Exporter` heals this** (re-derives ties from musical context), so the pragmatic fix is: slice -> `Gp7Exporter` -> reload, and use that healed score as the basis for JSON/alphaTex. (A pure in-memory fix would clear the private `_noteIdBag` id fields whose target is outside the slice — not on the public surface.)
3. **Tempo is lost on a mid-song slice.** Tempo automations only sit on bars where tempo *changes*; `Score.tempo` reads `masterBars[0].tempoAutomations[0]`. A slice starting at bar 5 loses the song's initial tempo -> falls back to 120 BPM. Fix: scan automations up to bar A for the effective tempo and inject a tempo automation onto the new first bar. **Time-signature** is per-MasterBar so it survives automatically; **tuning** is per-Staff so it survives automatically.

These three fixes are required for **every** non-baseline approach — they are properties of the slice operation, not of the storage format.

## The cross-cutting decider: media (audio/video) sync

- A real synced file (`Cpm22-Dias Atrás…gp`) embeds a **7.99 MB** audio blob + 15 sync points. `Charlie Brown Jr…gp` embeds 7.7 MB + 5 sync points.
- **The audio blob is structurally absent from JSON and alphaTex** (`BackingTrack.rawAudioFile` is `@json_ignore`). It is only carried by the `.gp` container.
- **alphaTex DOES carry the sync-point timing** as `\sync barIndex barOccurence millisecondOffset [barPosition]`. Approach 3 does NOT lose sync — it loses only the audio file (which it shares with approach 2).
- **Rebasing works and was proved**: keep sync points whose `barIndex` is in [A,B], shift `barIndex -= (A-1)`, subtract the earliest in-range `millisecondOffset` so the slice's audio starts at 0. Verified: CPM22 15 -> 4 sync points, baseline 2068 ms -> 0.

**Conclusion on sync:** the audio file must be stored/referenced **separately regardless of approach** — no serialization trims or re-times audio. This is a simplification, and it does **not** require splitting the audio (which the user does not want): store the full song's audio once (S3), and the slice carries only `(audioRef, barRange, msOffsetBaseline, rebasedSyncPoints[])`. At playback, feed the rebased sync points to AlphaTab and seek the shared audio element. Approach 1 *can* re-embed the whole-song audio into each slice `.gp` (proved), but that is storage-hostile (7.93 MB per slice) and still doesn't trim the audio.

## Per-approach verdict

### Approach 0 — Baseline / no-slice (full file + `playbackRange` + `DisplaySettings.startBar`/`barCount`)
- **Feasibility:** High (native AlphaTab feature; browser-only — concluded from `alphaTab.d.ts` + DisplaySettings docs, not runnable headless).
- **Storage:** Zero. No new artifact.
- **Fidelity:** Perfect (it IS the original file).
- **Media sync:** Perfect (original audio + sync points untouched).
- **Limit (dealbreaker for NH-137):** It is **not a standalone piece**. `startBar`/`barCount` only constrain display/playback; they don't make bar A "bar 1" of an independent file. Cannot satisfy "editing its timeline affects only the slice." **Good enough only for a read-only "play this part" view.**

### Approach 1 — Clone bars A–B -> new `.gp` via `Gp7Exporter` (S3 blob + DB row)
- **Feasibility:** High. Proved end-to-end. Builds on NH-196 F11 (Gp7 round-trip).
- **Storage:** S3 `.gp` blob. **~16–32 KB notation-only** per slice; **~7.9 MB if audio re-embedded.**
- **Fidelity:** Highest. GP importer heals dangling ties for free; only format that *can* carry embedded audio.
- **Media sync:** Sync points survive; audio can be embedded (wasteful) or stripped + referenced separately.
- **Cost:** Heaviest storage; needs S3; per-slice blob lifecycle (orphan cleanup on delete).

### Approach 2 — In-memory JSON model of A–B (`JsonConverter`), DB-only
- **Feasibility:** High. Proved. `JsonConverter` is `@public`.
- **Storage:** DB only, but **heaviest text format**: 237 KB–1.08 MB raw, ~11.7 KB gzipped (7-bar slice).
- **Fidelity:** High (uses healed score). Carries sync points. No audio.
- **Cost:** Largest text payload; ~13x alphaTex gzipped.

### Approach 3 — Convert A–B to alphaTex (`AlphaTexExporter`), DB-only  *(user leans here)*
- **Feasibility:** High. Proved (slice -> `exportToString` -> re-import -> bars/notes/chords/sync match).
- **Storage:** DB only and **by far smallest**: 8.5–34 KB raw, **~0.9 KB gzipped** (7-bar slice) — ~16x smaller than GP, ~13x smaller than JSON gzipped.
- **Fidelity:** High for the common case — notation, tempo, time-sig, tuning, **chord diagrams** (`\chord ("B" 7 7 8 9 9 7)`) and **sync points** (`\sync …`) all survive. Lossy *textual* re-encoding (rare GP-specific engraving details may lack a tex token), but everything NH needs round-tripped cleanly on all test files.
- **Media sync:** Carries rebased sync points in text; audio referenced separately (same as A2).
- **Cost:** Human-readable/diffable bonus; only risk is rare GP features without a tex token (low for drum/guitar lesson slices).

## Comparison table

| | A0 Baseline | A1 GP clone | A2 JSON | A3 alphaTex |
|---|---|---|---|---|
| Standalone piece? | no | yes | yes | yes |
| Storage location | none | S3 blob | DB | DB |
| Size (7-bar slice, gzip) | 0 | 14.3 KB (no audio) | 11.7 KB | **0.9 KB** |
| Size if audio embedded | n/a | ~7.9 MB | n/a (can't) | n/a (can't) |
| Notation fidelity | perfect | highest | high | high (textual) |
| Carries sync points | n/a | yes | yes | yes |
| Carries audio blob | n/a (original) | yes (optional) | no | no |
| Heals dangling ties | n/a | free | heal-via-GP | heal-via-GP |
| Human-readable / diffable | — | no | partly | yes |
| Best when | read-only "play a part" | need embedded audio in artifact | stay 100% in AlphaTab object model | minimal storage, standalone slice |

**Decisive trade-off:** storage size vs. carrying the audio *inside* the artifact. Audio can't be carried by JSON/alphaTex at all, and embedding it in a GP slice is 7.9 MB per slice — so audio is best stored once and referenced. Once audio is referenced separately, the artifact is notation-only, and alphaTex is the smallest by a wide margin while preserving everything NH needs.

## RECOMMENDATION

**Approach 3 (alphaTex), with audio referenced separately.** Per-slice pipeline:

1. Slice masterBars/bars to [A,B] with the three fixes (re-index, heal-via-GP for ties, carry-forward tempo).
2. Rebase sync points (bar A -> index 0, subtract baseline ms).
3. `AlphaTexExporter.exportToString(healedSlice)` -> store tex in DB (gzip it; ~1 KB).
4. New DB item for slice metadata: `{ sourcePlayableId, barRange:[A,B], audioRef (S3 key of FULL song audio), msOffsetBaseline }`. (The rhythm-game Score stays separate, as today.)
5. At play time: import the tex, set the shared `<audio>` to the song audio, drive AlphaTab's external-media handler with the rebased sync points + baseline offset.

**Why:** smallest storage (user's stated priority), DB-only (no S3 blob lifecycle for notation), human-readable/diffable, and proved to preserve notation, tempo, time-sig, tuning, chord diagrams, and sync points. Audio-referenced-separately avoids splitting audio (rejected by user) and avoids 7.9 MB-per-slice GP blobs.

**Flip to Approach 1 (GP) if** either: (a) a self-contained artifact that *embeds* its own audio is required (offline export / "download this slice as .gp"), or (b) test slices reveal a GP feature the corpus uses that alphaTex cannot re-encode (none found in 3 files / 4 ranges, but the corpus is small — see OQ-4). Approach 2 (JSON) is not recommended: strictly larger than alphaTex with no compensating benefit unless we want to stay 100% inside the AlphaTab object model and never re-parse text.

## Open questions for the user

- **OQ-1 — Audio storage shape.** Confirm: store the FULL song audio once in S3 and have each slice reference it + a rebased ms offset (recommended), rather than embedding per-slice or splitting the audio. This is the media-sync crux.
- **OQ-2 — Slice metadata item.** Approve a new DB item `{ sourcePlayableId, barRange, audioRef, msOffsetBaseline, rebasedSyncPoints? }` alongside the existing separate Score (scoring) item.
- **OQ-3 — Baseline (A0) as a separate, cheaper feature?** A0 cannot make a standalone slice, but it is zero-cost for a read-only "play this part" view. Is "play a part in place" wanted as its own thing, distinct from the editable standalone slice?
- **OQ-4 — alphaTex fidelity confidence.** Round-trip was clean on 3 files / 4 ranges. Want a broader corpus pass (more files, drum-specific notation, repeats/alternate-endings crossing the edge) before committing, given the textual format is theoretically lossy?
- **OQ-5 — AlphaTab version.** Tested on `1.8.3` (npm latest); the website repo pins `1.7.0-alpha.1515`. Which version does NH standardize on? (sync-point + exporter APIs are `since 1.6.0`, so both work — just pin one.)
- **OQ-6 — Repeats / alternate endings across the cut.** Not stress-tested. A slice starting/ending inside a repeat group may need the repeat open/close cleared at the edges (the spike clears note links but not repeat-group bracketing). Worth a dedicated test before build.

## Files

- `docs/spikes/2026-06-19-nh137-song-slice/slice.mjs` — the slice + 3-approach round-trip proof (load-bearing artifact).
- `docs/spikes/2026-06-19-nh137-song-slice/checksync.mjs` — inspects a file's sync points / backing track / tuning.

## How to run

```bash
cd docs/spikes/2026-06-19-nh137-song-slice
npm init -y && npm install @coderline/alphatab
node slice.mjs "<path to .gp>" <A> <B>      # A,B = 1-based inclusive bar numbers; proves approaches 1/2/3 + sync rebasing
node checksync.mjs "<path to .gp>"          # inspect sync points / backing track / tuning of a file
node parts.mjs "<path to .gp>"              # identify parts (sections) + export EACH part as a standalone alphaTex chunk
```

---

## Addendum — orchestrator review + parts demo (2026-06-19)

**Independent verification (re-ran the spike code, not just read the report):**
- I'm Yours bars 6–13 → 8 standalone bars; GP/JSON/alphaTex all round-trip (384 notes, tempo 73). ✅
- CPM22 (synced) bars 10–18 → 7 rebased sync points, baseline 16782 ms→0; the generated alphaTex contained `\tempo 147`, `\ts (4 4)` and 7 `\sync (...)` lines in 9.8 KB. ✅
- `BackingTrack.rawAudioFile` confirmed `@json_ignore` in source (`packages/alphatab/src/model/BackingTrack.ts`) → audio dropped by JSON/alphaTex, re-embedded only by GP. ✅

**`parts.mjs` — the "identify parts → export each part as a chunk" demo (Mamonas, well-synced: 119 bars, 107 sync points, 4.65 MB audio):**

| part | bars | Δbars | syncPts | alphaTex raw | alphaTex gz |
|------|------|-------|---------|--------------|-------------|
| Intro | 1–8 | 8 | 6 | 2991 ch | 496 B |
| Verse | 9–38 | 30 | 30 | 10230 ch | 894 B |
| Refrão | 39–60 | 22 | 20 | 7957 ch | 880 B |
| Verse | 61–74 | 14 | 12 | 5602 ch | 645 B |
| Refrão | 75–96 | 22 | 20 | 7833 ch | 867 B |
| Verse | 97–119 | 23 | 19 | 7814 ch | 950 B |

Sync points across parts sum to 107 (the whole song). Re-imported the Refrão chunk standalone → 22 bars, 237 notes, **tempo 145** (correctly carried forward), 20 sync points. The whole song splits into 6 standalone synced chunks for **~4.7 KB gzipped total** vs the 4.65 MB audio. This combines NH-196 (section detection → bar ranges) with the NH-137 slice.

**YouTube / video sync (was it missed?):** No new data spike needed. AlphaTab's sync is media-agnostic — the same sync points drive an `<audio>`, `<video>`, **or** a YouTube player. AlphaTab ships *no* built-in YouTube integration (cross-platform / GDPR / UI reasons) but documents a recipe wiring the YouTube IFrame Player API to `alphaTab.synth.IExternalMediaHandler` (feed time updates ~50 ms; handle seek/play/pause). It's a **frontend runtime integration**, not a data-model problem — the slice's rebased `msOffsetBaseline` is exactly the seek target into the shared video. Browser-only, so validate during build, not headless. Ref: `alphaTabWebsite/docs/guides/audio-video-sync.mdx`.

## Live UI verification (`play-parts.html`)

A browser test harness (`play-parts.html`, served on `localhost`) was built and **verified by Leo in a real browser**:
- Drop a `.gp`/`.xml`/`.mxl` → parts (sections) auto-listed.
- Click a part → it **renders as its own standalone slice** (probe via `ScoreLoader`, fast no-audio slice, ties healed, tempo carried) — not a range on the full sheet.
- **Cursor** follows playback (visual sync check). ✔
- **Embedded audio** plays via a **shared `<audio>`** element seeking to the part's start (the recommended reference-shared-audio model). ✔
- **YouTube** sync verified via the IFrame API + `IExternalMediaHandler`, seeking the video to the part. ✔
- Single part **stops at its boundary** (next bar's sync ms) for audio + YouTube. ✔

This confirms the recommended model works end-to-end with both embedded audio and an external YouTube video, with no per-slice audio storage.

## Storage / DB conclusion (resolves OQ-1 / OQ-2)

- **S3:** no new object *per slice*. The audio is shared **per song** — extract once (or keep inside the source `.gp`); the YouTube path needs no audio storage, just a `youtubeId` on the song.
- **DB (leanest viable):** a slice is **positions-only + pointers** — `sourcePlayableId`, `barStart`, `barEnd`, a shared media ref (`audioRef` | `youtubeId`, ideally on the source song), and an optional `msOffsetBaseline` (derivable from the source's sync point at `barStart`).
- The sliced alphaTex **and** rebased sync points are **derivable at runtime** (slicing is deterministic, ~35 ms) — **not** stored per slice. Optionally cache the alphaTex (~1 KB gz) + rebased sync in the row purely to skip re-slicing.
- The rhythm-game **Score stays a separate item**, as today.

**Bottom line:** persist `sourcePlayableId + barStart + barEnd` (+ shared media ref on the source). No new per-slice S3 blob, no per-slice notation row.

## Edge cases — songs that change tempo / meter / key (no new spike needed)

Tested on `Bohemian Rhapsody.gp` (Queen) and `Happiness is a Warm Gun.gp` (Beatles) — both change meter, tempo, and key repeatedly.
- **Time-signature changes:** fully captured as a timeline (Bohemian: `4/4→2/4→5/4→…→12/8→6/8→12/8→9/8→4/4`; Happiness adds `9/8/10/8` etc.). They **survive slicing** — slicing Happiness bars 18–26 (spanning `12/8→9/8→10/8`) kept every `\ts` in the alphaTex.
- **Tempo changes:** captured when the file encodes them (Happiness: `70→85→70→50→70 bpm`). They **survive slicing** (mid-slice `\tempo 70→85→70` preserved; the initial tempo is carry-forwarded onto bar A).
- **Key changes (modulation):** the only genuine frontier. Whole-song/per-track detection returns the **dominant** key (Bohemian → A#/Bb major ~0.9) and blurs the modulations. This is the windowed `keyChanges[]` work already identified in the **NH-196** design (F15) — build-and-tune, not a new spike. Slicing itself is key-agnostic (a slice just carries its notes), so a slice spanning a key change is fine.
- **Still verify at NH-137 build time:** repeats / alternate endings crossing a slice edge (OQ-6) — Bohemian Rhapsody is a good stress test.

**Verdict:** both edge cases fall within the existing two spikes' designs. No new spike — fold windowed key detection into the NH-196 analyzer build, and test repeats-across-cut during the NH-137 build.
