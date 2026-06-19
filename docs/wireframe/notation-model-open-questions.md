# Notation model — decisions, open questions & deferred changes

Running tracker from the model brainstorm (2026-06-17). DB-first focus; the
"open questions" and "deferred changes" below are **parked deliberately** — noted
so they're not lost, not actioned yet.

## Decisions banked (this session) — see `model-map.html`
- **F1 — umbrella name = `playable`.** Song / Lesson / Pattern / Part are all a *Playable* (`kind` = the role).
- **F2 — the score = `notation`** (the bytes table, renamed from `source`): `format`, `s3_key?`, `notation_alphaTex?`. A Playable references it via `notation_id` (nullable — set when the playable plays whole).
- **F3 — `groove` is not a model type** — it's an instrument-specific example of a **composite Pattern** (a Pattern with steps). The model stays instrument-agnostic (drums / piano / guitar / …).
- **F4 — one shape, distinct roles.** A Playable may carry its own `notation_id` (plays whole) **and/or** ordered **Steps** via ONE self-referencing **`step`** junction (`parent_id`, `child_id`, `sort_order`, `start_bpm`, `goal_bpm`) — renamed/generalised from `lesson_step`, shared by lessons **and** composite patterns.
- **Scoring is per-playable.** Every Playable — song, part, pattern, lesson — has its **own** score (per-user, DynamoDB, keyed by `playable_id`). A **Lesson has its own score** from *playing the whole lesson* (the "final exam") — **NOT** an average of step scores. You can skip the steps, play it whole, score 100%. Same for any playable (a song, a part) — all independently scored.

## Still open
- **F5 — structured song learning** = a Lesson whose Steps are the Song's Parts. Confirm when we build Song Parts.

## Deferred DB changes
- **Rename `notation_tex` → `notation_alphaTex`** (the inline alphaTex field — `notation_tex` in the wireframe, `alphatex` in the draft SQL `source` table). Do during the real schema pass, not now.

## Wireframe / layout open questions
- **OQ1 — Artist in the catalog Song list.** Display the (optional) `artist` on screen when listing Songs in the catalog list, **and** allow **filtering by artist**. *(✅ resolved 2026-06-19: `artist` → `author text[]` + `author_type`, GIN-filterable — see `2026-06-19-tonal-drum-schema-draft.sql`.)*
