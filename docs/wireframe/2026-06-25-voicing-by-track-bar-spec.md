---
project: notation-hero
date: 2026-06-25
status: ✅ decided — SD-15 resolved "stay Thin"; wireframe + seed merged in PR #76 (NH-213, 2026-06-26)
worktree: nh-213-voicing-by-track-bar
branch: worktree-nh-213-voicing-by-track-bar
builds_on:
  - docs/wireframe/2026-06-24-schema-delta-decisions.md (SD-15 → "stay Thin", PR #68)
  - docs/wireframe/2026-06-20-group-d-spec.md (the per-(section,track) grid cell)
  - docs/wireframe/2026-06-19-tonal-drum-extensible-schema-spec.md (drum_profile.kit_pieces[] facet, PR #52)
relates:
  - docs/wireframe/2026-06-16-schema-deltas.md (SD-15 ledger entry)
  - docs/spikes/2026-06-18-player-and-practice-features.md (per-stem mixer, runtime voice compute)
deciders: Leo (driver), Claude (brainstorm)
jira: NH-213 (SD-15 — voicing by track + bar)
---

# Voicing by track + bar — design spec (SD-15 / NH-213)

How Notation Hero models **which voices are active, per track, per bar-range** — for
**song structure** (intro = hats+kick; chorus = +snare+crash) and **lessons**
(partial-groove, "play just hats + kick"; piano hands-separate).

This is design **within** the locked **Thin** model. It does **not** reverse PR #68:
there are still **no `note` / `voice_map` tables** — individual notes live in AlphaTab.

---

## TL;DR

A "partial voicing" is one shape everywhere: **`{ track, voices[], barRange? }`** — "this
track, these voices, (optionally) these bars." It appears in three places, all jsonb / runtime,
**zero new tables**:

1. **Song structure** → the per-(section, track) grid cell gains `voices[]`
   (`data.sections[].tracks[].voices[]`). Display-only; **section-level union derived in code**.
2. **Lessons** → **Hybrid, incremental**: reusable named partials are `pattern` playables
   (existing `step` junction, already in the seed); per-song-section / hands-separate drills are
   an inline `step.data.voicing` — added **when first needed** (the `step.data jsonb` column also
   hosts the pending SD-17 step description).
3. **Playback** → "hear just hats+kick" is a **runtime** note filter over the AlphaTab score
   (~35 ms, NH-137 spike), not stored.

**Vocab** is a per-instrument code map: drums = the existing `kit_pieces`; piano = hands-separate
`left-hand` / `right-hand`. Guitar/bass get none (their "partial" is **role**, SD-28).

---

## 0 · Decisions (locked this brainstorm)

| #       | Decision           | Choice                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **V-1** | Search granularity | **Display/consume only.** Section-level voicing is rendered + drives lessons; it is **not** a catalogue search facet. ⇒ jsonb section grid, **no `section_voice` table**. Song/track-level search already exists via `drum_profile.kit_pieces[]`. Flip only if cross-catalogue _per-section_ search ever becomes real (clean additive: materialize from the grid).                                                   |
| **V-2** | Voice vocab        | **Per-instrument code map.** `drums: [hi-hat,snare,kick,crash,ride,tom]` (= `kit_pieces`); `keys: [left-hand,right-hand]` (piano hands-separate). Guitar/bass: **none** — role (rhythm/lead, SD-28) covers their partial practice. Enforced in app/ingest, **not** a DB CHECK (matches SD-26/SD-28).                                                                                                                 |
| **V-3** | Shape              | `voices[]` joins the **existing** per-(section,track) grid cell: `data.sections[].tracks[] = {track, voices[], level?, techniques[]?}`. A track **absent** from `tracks[]` = silent in that section. **Section-level union derived in code**, never stored.                                                                                                                                                          |
| **V-4** | Lesson model       | **Hybrid, incremental.** One shape `{track,voices[],barRange?}`. Reusable/named partials = `pattern` playables via the `step` junction (zero schema change — the seed already composes a beat from voice components). Per-song-section + hands-separate-song drills = inline **`step.data.voicing`** — add the `step.data jsonb` column **when the first such lesson is built** (also lands SD-17 step description). |
| **V-5** | Capo / settings    | **Not a voice** (locked). `voices[]` = "which sub-streams _sound_". Per-section guitar settings (capo, tuning) are a **future** concern, **not built** here. When built: start as a `techniques[]` tag (e.g. `capo-2`); promote to a valued per-cell `settings{}` only if a queryable need appears.                                                                                                                  |

**Guard rails honoured:** Thin model unchanged (no note/voice_map tables); Playable umbrella +
`step` junction unchanged; net DDL ≈ **0** (jsonb only; `step.data` deferred). "Well-architected
even at tiny scale": the heavier representation is added only where a query needs it (none today).

---

## 1 · The one shape

```
partial voicing  ::=  { track: <track_id>, voices: <string[]>, barRange?: [startBar, endBar] }
```

- `track` — a `track.id` (a track is exactly one instrument, Group D D-3-inv).
- `voices` — values from the instrument's vocab (V-2). Empty `[]` = plays, no kit voices (e.g. a
  bass line in a "drums = hats+kick" section). Track absent entirely = silent.
- `barRange` — optional `[start, end]` (1-based, inclusive). Omitted = the whole referenced playable.
  Sections are themselves bar-ranges, so a drill can target a named section or any span.

The same shape is a **section grid cell** (§2), a **pattern's own** voicing (§3), and a **lesson
step's** drill target (§3). Lessons need **no new structure** — they reference this shape.

---

## 2 · Song structure (display)

`voices[]` lives in the per-(section, track) cell defined by Group D — one grid, not a parallel
structure:

```jsonc
// playable 'yellow' → data.sections
{ "label":"Intro",    "startBar":1,  "endBar":4,
  "tracks":[ {"track":"t-yel-drums","voices":[]},                                    // drums silent
             {"track":"t-yel-keys", "voices":["right-hand"]} ] }                     // piano RH only
{ "label":"Chorus 1", "startBar":33, "endBar":40,
  "tracks":[ {"track":"t-yel-drums","voices":["hi-hat","snare","kick","crash"],"level":2},
             {"track":"t-yel-keys", "voices":["left-hand","right-hand"],"level":3} ] }
```

- **Per-track, per-section** → "intro: drums silent, piano right-hand; chorus: full kit + both hands."
- **Section-level union** ("what's active anywhere in the chorus") = derived in code; not stored.
- **Optional / progressive**: a song may have sections with no `voices[]` yet. Display falls back to
  nothing, or to a runtime AlphaTab compute (~35 ms). No invariant forces population.
- Supersedes the wireframe placeholder `voicesLine()` (a flat song-level `voices[]`): the headline
  chip line becomes the derived union; the section breakdown shows per-track voices.

---

## 3 · Lessons (Hybrid, incremental)

The `step` self-ref junction already orders a lesson's child playables and carries a tempo ladder
(`start_bpm`, `goal_bpm`). Two homes for a partial voicing, by case:

**(a) Reusable / named partial → a `pattern` playable** (zero schema change — already in the seed:
`pat_rock_composite` is built from hi-hat / snare / kick voice components):

```jsonc
playable: { id:"pat_rock_hihat", kind:"pattern", title:"Rock — hi-hat", data:{sections:[{tracks:[{track:"<own>",voices:["hi-hat"]}]}]} }
step: { parent_id:"lsn_rock_buildup", child_id:"pat_rock_hihat", sort_order:1 }   // no step.data
step: { parent_id:"lsn_rock_buildup", child_id:"pat_rock_kick",  sort_order:2 }
```

**(b) Per-song-section / hands-separate drill → inline `step.data.voicing`** (a _view_ into the
source; no new playable). Requires adding **`step.data jsonb`** — deferred until the first such
lesson:

```jsonc
// "teach Yellow's chorus drums: hats+kick → +snare"
step: { parent_id:"lsn_yel_chorus_drums", child_id:"yellow", sort_order:1, start_bpm:60, goal_bpm:87,
        data:{ title:"Hats + kick", voicing:{ track:"t-yel-drums", voices:["hi-hat","kick"], barRange:[33,40] } } }
step: { parent_id:"lsn_yel_chorus_drums", child_id:"yellow", sort_order:2, start_bpm:60, goal_bpm:87,
        data:{ title:"Add snare",   voicing:{ track:"t-yel-drums", voices:["hi-hat","snare","kick"], barRange:[33,40] } } }

// piano hands-separate, same shape:
step: { parent_id:"lsn_yel_verse_piano", child_id:"yellow", sort_order:1,
        data:{ title:"Right hand", voicing:{ track:"t-yel-keys", voices:["right-hand"], barRange:[13,32] } } }
```

**Rollout:** path (a) works **today** with no schema change. Add `step.data jsonb` when the first
song-section or hands-separate-song lesson is authored; that column also hosts the pending **SD-17**
step description (`data.title` / `data.description`). One shape `{track,voices[],barRange?}` in both
homes — a lesson step renderer/player reads it the same way regardless of home.

---

## 4 · Playback (runtime, out of catalogue-schema scope — flagged so it isn't lost)

"Hear **just** hats + kick" = mute every drum-track note whose voice ∉ the selected set. AlphaTab's
per-track mixer (`AlphaSynth.applyTrackVolume`, the per-stem mixer in the player spike) is
**per-track** — it cannot mute _within_ a track. So a partial voicing is realised by a **runtime
note filter** over the AlphaTab score, using the same GM note→voice map that derives `kit_pieces`
(~35 ms per slice, NH-137). This is a **player** concern, consistent with Thin (compute at runtime,
store nothing). Recorded here as the consumption dependency; specced under the player/practice layer,
not the catalogue schema.

---

## 5 · Ingest / population

`voices[]` is **derived**, never hand-stored per note:

- **Drums** — for each track, over each section's bar-range, the distinct voices via the GM
  note→voice map (the NH-232 extractor). The track-wide **union** is `drum_profile.kit_pieces[]`
  (search facet, PR #52); a section's subset is the grid cell (display). **Same source**, two scopes
  ⇒ `kit_pieces[] = ⋃ sections (section drum voices[])`.
- **Piano hands** — derive from the AlphaTab staff split (treble/bass) or track voice index where
  available; else curated. (Hands have **no** search facet — display/consume only, V-1.)
- Population is **progressive**: ingest fills what it can compute; admins can curate; runtime fills
  the rest. Nothing blocks publish on `voices[]`.

---

## 6 · What this is NOT (reaffirming Thin)

- **No `note` / `voice_map` tables** — PR #68 stands; this is design within it.
- **No `section_voice` search table** — V-1 is display/consume only.
- **No pitched search facet** — piano hands are display-only; no `tonal_profile.hands[]`.
- **No `step.data` built now** — added incrementally with the first inline drill (V-4).
- **No `settings{}` / capo built now** — V-5 is a documented extension point only.

Net schema change born of this spec: **`data.sections[].tracks[].voices[]`** (jsonb, no DDL).
Deferred: `step.data jsonb` (when the first inline-voicing lesson lands).

---

## 7 · Open / follow-ups

1. **`step.data jsonb`** — add when the first per-song-section or hands-separate-song lesson is
   authored; co-design with SD-17 (step description). Tracked as the V-4 deferred half.
2. **Capo / per-section settings (V-5)** — resolve `techniques[]` tag vs valued `settings{}` when a
   real guitar-settings need appears. Future guitar concern; not this delta.
3. **Piano-hands derivation** — confirm AlphaTab exposes a reliable treble/bass or voice split for
   keys at ingest (NH-232 extractor scope); else curate.
4. **Seed proof (optional)** — populate `voices[]` on a couple of seed songs (Yellow drums + piano)
   - one buildup lesson to validate the shape on `nh_tonal_scratch` and light up the wireframe
     section breakdown. Small, can ride a later wireframe-alignment pass.

---

## 8 · Status / changelog

- **2026-06-25** — Brainstormed (V-1…V-5) with Leo. Display/consume only; drums + piano-hands vocab;
  voices[] in the Group D grid cell; Hybrid-incremental lessons; capo not-a-voice. Net DDL ≈ 0
  (jsonb). Resolves **SD-15 / NH-213** (design within Thin complete). Draft for Leo review.
