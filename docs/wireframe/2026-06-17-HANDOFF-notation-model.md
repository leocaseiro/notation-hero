# Handoff — Notation/Playable model — 2026-06-17 (session 2: MODEL LOCKED)

**Status:** ✅ Content model **locked** + validated on Postgres. ✅ **Wireframe migrated** to it (C1–C5) + UX deltas built (E1–E6) on **2026-06-18** — branch `docs/wireframe-pattern-lesson-model`. Next = apply the locked model to the **real spec**.

## Where to work
- Worktree: `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model`
- Branch: `docs/wireframe-pattern-lesson-model`. Session-2 commits (local, not pushed): `b2c02fa` → `a87cf7f` → `d409ada` → `7ad0033` → `cb00d1f` → `88005e8`.
- Serve: preview config in repo `.claude/launch.json` (name `wireframe`, port 8780), or `python3 -m http.server 8780 --directory <worktree>`. URLs:
  - **Model map (source of truth):** `http://localhost:8780/docs/wireframe/model-map.html`
  - Wireframe v1.4: `http://localhost:8780/docs/wireframe/index.html`
- Local DB: `nh_notation` (Postgres `localhost:5432`, user `leocaseiro`, no password). Reload: `psql -d nh_notation -f docs/wireframe/2026-06-17-notation-model-draft.sql`

## What's locked — full detail in `docs/wireframe/model-map.html` + project memory `notation_model.md`
- **One shape:** a **`playable`** is a *leaf* (its own `notation`/score) **or** a *sequence* (ordered `step`s → other playables) — or both.
- **`playable`** (was `notation`): umbrella, `kind ∈ {song,part,lesson,pattern}` = the role; `parent_id` self-ref (part→song); `notation_id` → score (nullable, set when it plays whole); facets + `data jsonb`; `listable`.
- **`notation`** (was `source`): the **score** — `format`, `s3_key` OR `notation_alphatex`.
- **`step`** (was `lesson_step`): ONE self-referencing junction `(parent_id→child_id, sort_order, start_bpm, goal_bpm)`, shared by lessons AND composite patterns. PK `(parent_id, sort_order)` → same child may repeat (slow/med/fast).
- **Score** (DynamoDB, per-user, keyed by `playable_id`): every playable scored on its own; a lesson's score = whole-play, **never** an average.
- **Decisions:** F1 `playable` · F2 `notation`=score · F3 `groove`=composite pattern (not a type) · F4 one-shape/roles/shared-step/per-playable-scoring. All validated on Postgres.

## Key files
- Model map (ERM + vocab + decisions): `docs/wireframe/model-map.html`
- Validated draft SQL: `docs/wireframe/2026-06-17-notation-model-draft.sql`
- Decisions + open-Qs tracker: `docs/wireframe/notation-model-open-questions.md`
- Wireframe v1.4 (per-step field panels added this session): `docs/wireframe/index.html`

## ✅ DONE (2026-06-18) — wireframe migrated to the locked model + UX deltas
All five migration steps below shipped (C1–C5). Plus UX deltas E1–E6: per-Playable descriptions (SD-17/19);
song part field-inspector + clickable artist→filter (SD-13); lesson step table-headers + Continue/Play-from-start
(SD-20); iPhone-style topbar back + step-detail revival + parts/steps prev-next; pattern relationships
"Used in" + "Related"/uses (SD-14); repeated parts (SD-16); level bands (N-14); completed + reset-keep-history
(SD-21); voicing placeholder (SD-15). DB-side notes for the spec pass live in `2026-06-16-schema-deltas.md` (Round-5).

### Original resume goal (now done): migrate the wireframe (`index.html`) to the locked model
1. **Rename** data + render: `ITEMS`→playable (`kind`), `source`→`notation`, `STEPS`→`step` junction (parent→child), `notation_tex`→`notation_alphaTex`.
2. **Song Parts:** `sna-breakdown` (fake lesson) → `kind=part` under the song (`parent_id`, bar range, `listable=false`), reached via "Practice in parts". Remove `song-breakdown` from `LESSON_KINDS`/`BROWSE_KINDS`.
3. **Steps → `step` junction** referencing reusable patterns; show reuse + same-child-repeats + a composite pattern (groove with its own steps).
4. **Per-playable scores** everywhere (lesson whole-play score *and* per-step/pattern scores; no averaging).
5. **Drop `lesson_type`** (derive a lesson's kind from its patterns); Lessons "Kind" filter → `pattern_kind`.

## Still open
- **F5** — structured song-learning = a Lesson whose steps are the song's Parts (confirm during Song Parts).
- **OQ1** — artist on catalog Song rows + filter by artist (tracked in `notation-model-open-questions.md`).
- Apply the locked model to the **real spec**; reconcile users/audit (`created_by`/owner) vs the `architecture-spec` worktree's `2026-06-17-data-layer-requirements.md`.
