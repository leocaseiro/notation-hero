# Handoff — Wireframe COMPLETE (model + 2 review rounds) — 2026-06-18

**Status:** ✅ The catalog **wireframe is built on the locked Playable model** and has been through **two review
rounds** with Leo. All shipped on branch `docs/wireframe-pattern-lesson-model` (pushed to origin). Next = apply
the locked model + the **Round-5/6 deltas** to the **real spec**.

## Where to work
- Worktree: `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model`
- Branch: `docs/wireframe-pattern-lesson-model` (on origin).
- Serve: preview `wireframe` (port 8780) in repo `.claude/launch.json`, or
  `python3 -m http.server 8780 --directory <worktree>`. Wireframe: `http://localhost:8780/docs/wireframe/index.html`.
- Local DB: `psql -d nh_notation -f docs/wireframe/2026-06-17-notation-model-draft.sql`.

## What shipped (this branch)
- **C1–C5** — migrated `index.html` to the locked model: `playable`/`kind`, `notation`(score), `step` junction
  (reuse / same-child-repeats / composite), per-playable scores (whole-play, no averaging), dropped `lesson_type`
  (kind derived from step patterns).
- **E1–E7** (review round 1) — per-Playable descriptions; song part field-inspector + clickable artist→filter;
  lesson step headers + Continue/Play-from-start; iPhone topbar back + step detail + parts/steps prev-next;
  pattern relationships (Used-in + Related); repeated parts; level bands; completed + reset-keep-history; voicing
  placeholder; DB notes (schema-deltas **Round-5**).
- **F1–F8 + G1** (review round 2) — song = lesson parity (headers, Continue, part descriptions, play buttons,
  **expanded duplicate structure** Intro·Chorus·Verse·Chorus·Outro); pattern scores + **id-duality reconcile**
  (`patterns[]` → real pattern playables); **per-difficulty scores**; artist on part; **recent-plays list**;
  discoverable artist filter; **chord-progression lesson** (chords + I–V–vi–IV composite); **multi-level media**
  (song + per-track); DB notes (schema-deltas **Round-6** + SQL Round-6 DDL sketches); **tracks brainstorm**.

## Key files
- Wireframe: `docs/wireframe/index.html`  ·  Model map (source of truth): `docs/wireframe/model-map.html`
- Validated draft SQL + **Round-6 open-Q DDL sketches**: `docs/wireframe/2026-06-17-notation-model-draft.sql`
- Delta ledger (**Round-5 + Round-6**, the open questions): `docs/wireframe/2026-06-16-schema-deltas.md`
- Prior handoff (model lock + migration done): `docs/wireframe/2026-06-17-HANDOFF-notation-model.md`

## ▶ Next — apply the locked model + deltas to the REAL spec
Open questions to resolve in the spec pass (all written up in schema-deltas Round-5/6 + the SQL sketches):
1. **Tracks** — promote `instruments text[]` → a `track` relation `(playable_id, instrument, role, …)` so multiple
   same-instrument tracks work (guitar `solo` + `bass`); keep `instruments[]` as a derived filter facet. **Recommend
   the `track` table.** Open: `bass` = guitar role or own instrument?
2. **Media** — `media` keyed by `playable_id` + optional `track_id` (song-level + per-track).
3. **Per-instrument difficulty** — a scalar `level` is insufficient (CMaj6/F hard on guitar, easy on piano):
   `level_by_instrument` / per-track level / by-instrument difficulty curve.
4. **Chord progression** — composite pattern of chords; abstract I–V–vi–IV vs key-concrete; songs use progressions.
5. **Voicing (SD-15)** — per-track notes (MIDI) → voice via a note→voice map.
6. **SD-16 repeated parts** — multiple part rows vs `ranges jsonb`.
7. **Play-next on the score screen** (future play-screen build).
8. Reconcile **users/audit** (`created_by`/owner) + drop the vestigial `PATTERNS` dict — vs the `architecture-spec`
   worktree's `2026-06-17-data-layer-requirements.md`.

*(Wireframe is review-complete; this is the bridge into the real schema/spec work.)*
