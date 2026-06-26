---
project: notation-hero
date: 2026-06-20
status: handoff — start a fresh session to update the wireframe for the Group D schema
worktree: wireframe-pattern-lesson-model
branch: docs/wireframe-pattern-lesson-model
pr: https://github.com/leocaseiro/notation-hero/pull/52
home: /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model/docs/wireframe/2026-06-20-HANDOFF-wireframe-schema-update.md
---

# Handoff — update the wireframe for the Group D schema (track · media · per-instrument difficulty)

## 0 · How to start (paste into a fresh Claude Code session)

```
Working directory: /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model
Read docs/wireframe/2026-06-20-HANDOFF-wireframe-schema-update.md (full context), then
docs/wireframe/2026-06-20-group-d-spec.md and docs/wireframe/2026-06-20-group-d-track-media-difficulty-draft.sql.

Task: update the interactive catalog wireframe (docs/wireframe/index.html) so it reflects the
NEW Group D schema we just locked — tracks, per-track + song-level media (3 sources), and
3-layer per-instrument difficulty — for EVERYTHING we discussed. The schema is DONE and
validated; this is a UI/wireframe pass, NOT a schema change. Use the draft SQL's SNA sample
data as the model. Keep the Thin model + hybrid rule. Follow Leo's collaboration rules
(AskUserQuestion per decision; long input via normal message NOT the picker "Other" box;
chunked findings; full paths; commit before review; baby commits on every green step).
Validate visually with the preview tools and show screenshots before claiming done.
```

## 1 · What is DONE — do NOT redo (on PR #52)

- **Tonal/drum schema** (prior): `playable · notation · step · playable_link · tonal_profile · drum_profile`. Spec `docs/wireframe/2026-06-19-tonal-drum-extensible-schema-spec.md`.
- **Group D schema** (this session, 2026-06-20) — designed, validated on `nh_tonal_scratch`, committed + pushed:
  - **D-1 `track`** (`051df31`): track table + `playable.instruments text[]` kept as a DERIVED facet (`DISTINCT track.instrument`, GIN). `instrument` flat open vocab (bass = own instrument); `role` = same-instrument variant; share-the-notation + `notation_track_index` + nullable `notation_id` override; `track.data` for tuning.
  - **D-2 `media`** (`a8d0288`): `media(playable_id, track_id?)` — song-level + per-track, many per scope; **3 sources** (`gp-embedded` | `s3` | `youtube`) via a location CHECK; `has_audio`/`has_video` = DERIVED facets; NH-137 audioRef = a song-level row, slices resolve via `parent_id`.
  - **D-3 difficulty** (`804b735`): **L1** `playable.level` (browse headline) · **L2** `track.level` (per-instrument) · **L3** `data.sections[].tracks[]` = `{track, level, techniques[]}` (per-section × per-track grid). Renames `by:'fingering'`→`'technique'`, `by:'bpm'`→`'tempo'`. **Invariant: every playable owns ≥1 track.**
  - **Spec** `7019b64` + **SD-ledger reconcile** `6ab9391`.
- **Don't re-open these decisions.** This handoff is the _wireframe_ reflecting them.

## 2 · Next step — the wireframe update (the work)

Update `docs/wireframe/index.html` (the catalog wireframe, already on the locked Playable model) so it surfaces Group D. Use the SNA sample (`docs/wireframe/2026-06-20-...draft.sql`) as the worked example.

1. **Tracks (D-1).** On a song's detail, show its **tracks** — including two of the same instrument (SNA: Lead Guitar + Rhythm Guitar + Bass + Drums), each with `role`, `name`, and (D-3) its `level`. Show that the `instruments[]` filter facet is the **DISTINCT** of track instruments (two guitars → one "guitar" chip).
2. **Media (D-2).** Show **song-level** media AND **per-track** media, with the **3 sources** (a YouTube link, an S3 file, a gp-embedded badge). Demonstrate multiple per track (drums: "Drums only" stem + "Drum-cam"), and the song mixes (Full / Drumless). Reflect `has_audio`/`has_video` as derived row flags.
3. **Per-instrument difficulty (D-3).** Show the **3 layers**: the browse headline `level`; the **per-track levels** (guitar-lead L5, drums L3…); and the **per-section grid** (Verse vs Chorus level + techniques per track). Render the techniques chips per cell.
4. **Field inspector.** Surface the new fields (`track.*`, `media.*`, `data.sections[].tracks[]`) so the "what's stored where" view stays accurate.
5. If there is a **model map** (`docs/wireframe/model-map.html`), add `track` + `media` boxes and the derived-facet/edge annotations.

**Scope guard:** wireframe + field-inspector only. No schema/DDL changes (those are locked). If a real gap appears, log it as a new SD in `docs/wireframe/2026-06-16-schema-deltas.md` and raise it — don't change the locked schema unilaterally.

## 3 · Method + guard rails

- **Thin model** (Neon = browse/search metadata + file keys; AlphaTab owns score internals) and the **hybrid** rule (hot facet = column; long-tail = jsonb) are intact — the wireframe should _show_ them, not fight them.
- **Validate visually** with the preview tools (serve `index.html`, screenshot) before claiming done — Leo decides design visually ("show, don't tell").
- **Leo's collaboration rules:** AskUserQuestion per decision; **long/important input via a normal chat message, NOT the picker "Other" box** (it can lose content); chunked findings (long context in response-body chunks, lean picker references them); full absolute paths incl. worktree; commit before review; baby commits; never `--no-verify`. Commit subject must be lowercase-led (commitlint).

## 4 · Key files (full paths)

- Wireframe to update: `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model/docs/wireframe/index.html`
- Group D spec: `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model/docs/wireframe/2026-06-20-group-d-spec.md`
- Group D DDL (SNA sample data): `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model/docs/wireframe/2026-06-20-group-d-track-media-difficulty-draft.sql`
- SD ledger (Group D reconciliation): `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model/docs/wireframe/2026-06-16-schema-deltas.md`
- Tonal/drum spec + draft: `.../docs/wireframe/2026-06-19-tonal-drum-extensible-schema-spec.md` · `.../2026-06-19-tonal-drum-schema-draft.sql`
- PR: https://github.com/leocaseiro/notation-hero/pull/52

## 5 · Scratch DB (to read the worked example)

```
host localhost · port 5432 · db nh_tonal_scratch · user leocaseiro
reload:  psql -d nh_tonal_scratch -v ON_ERROR_STOP=1 -f docs/wireframe/2026-06-19-tonal-drum-schema-draft.sql
         psql -d nh_tonal_scratch -v ON_ERROR_STOP=1 -f docs/wireframe/2026-06-20-group-d-track-media-difficulty-draft.sql
```

Poke-around queries are at the bottom of the Group D `.sql`.

## 6 · Follow-ups (NOT this wireframe task — separate threads)

- **SD-25 — searchable per-instrument technique facet** (guitar/bass/piano `techniques[]` like `drum_profile.techniques[]`; reconcile with drums). Pairs with Rockschool.
- **Rockschool grounding** — read the 3 syllabi (`~/Sites/notation-hero-resources/Rockschool/`) to calibrate the 0–10 levels + fix the per-instrument technique vocabulary. (Leo's order: do this AFTER the delta check — which is done — and before the implementation plan.)
- **SD-26 — instrument family grouping** (guitar→electric/acoustic; strings/wind/brass).
- **SD-15 unification** — fold per-section voicing into the D-3 grid cell: `data.sections[].tracks[] = {track, level, techniques[], voices[]}`.
- **gp-embedded → S3 extraction** — ingest policy (extract the embedded `.gp` audio to S3 vs keep embedded).
- **writing-plans** — turn the Group D spec into an implementation plan for the real Drizzle schema/migration.
