# Notation model — decisions, open questions & deferred changes

Running tracker from the model brainstorm (2026-06-17). DB-first focus; the
"open questions" and "deferred changes" below are **parked deliberately** — noted
so they're not lost, not actioned yet.

## Decisions banked (this session) — see `model-map.html`

- **F1 — umbrella name = `playable`.** Song / Lesson / Pattern / Part are all a _Playable_ (`kind` = the role).
- **F2 — the score = `notation`** (the bytes table, renamed from `source`): `format`, `s3_key?`, `notation_alphaTex?`. A Playable references it via `notation_id` (nullable — set when the playable plays whole).
- **F3 — `groove` is not a model type** — it's an instrument-specific example of a **composite Pattern** (a Pattern with steps). The model stays instrument-agnostic (drums / piano / guitar / …).
- **F4 — one shape, distinct roles.** A Playable may carry its own `notation_id` (plays whole) **and/or** ordered **Steps** via ONE self-referencing **`step`** junction (`parent_id`, `child_id`, `sort_order`, `start_bpm`, `goal_bpm`) — renamed/generalised from `lesson_step`, shared by lessons **and** composite patterns.
- **Scoring is per-playable.** Every Playable — song, part, pattern, lesson — has its **own** score (per-user, DynamoDB, keyed by `playable_id`). A **Lesson has its own score** from _playing the whole lesson_ (the "final exam") — **NOT** an average of step scores. You can skip the steps, play it whole, score 100%. Same for any playable (a song, a part) — all independently scored.

## Still open

- **F5 — structured song learning** = a Lesson whose Steps are the Song's Parts. → **filed: [NH-222](https://leocaseiro.atlassian.net/browse/NH-222) (SD-32)** — works like a normal lesson but _related to the song_ (`uses` song X); the wireframe example is gated on Song Parts existing (none yet).

## Deferred DB changes

- **Inline-alphaTex field naming — resolved (2026-06-23).** The field is **`notation_alphaTex`** (camelCase) in the wireframe **JS**, and the DB **column is `notation_alphatex`** (snake*case, lowercase). **Why lowercase:** Postgres folds unquoted identifiers to lowercase, so a `notation_alphaTex` column is \_really* `notation_alphatex` anyway — and double-quoting it later would create a mismatched case-sensitive identifier (`column "notation_alphaTex" does not exist`). The ORM (Drizzle) maps snake_case ↔ camelCase. (The draft SQL was briefly normalised to camelCase, then reverted on `chore/nh-220`.) The format **value** `'alphatex'` (gp/midi/alphatex/xml) is unchanged.

## Wireframe / layout open questions

- **OQ1 — Artist in the catalog Song list.** Display the (optional) `artist` on screen when listing Songs in the catalog list, **and** allow **filtering by artist**. _(✅ resolved 2026-06-19: `artist` → `author text[]` + `author_type`, GIN-filterable — see `2026-06-19-tonal-drum-schema-draft.sql`.)_
- **OQ2 — Multi-track instrument: which track does the user learn?** When one song has **more than one track for the same instrument** (e.g. guitar **Lead** vs **Rhythm**; two vocal harmonies), the user must choose which track to learn/play. Open: (a) _where/how_ they choose — in browse vs on entering the page; (b) the **default** track; (c) whether "learn Lead" and "learn Rhythm" are **separate progress/score records** (likely yes — each `track` is its own thing, but score is keyed by `playable_id` today, so per-track scoring is its own question); (d) how the **catalog row** represents a multi-track instrument (show a **level range** across those tracks, vs force a track pick). **Needs its own quick brainstorm before implementing** (Leo, 2026-06-20). Parked for now — the wireframe ships the simplest interim version: a **single track/instrument selector** that defaults to the first track (the track list comes from the Guitar Pro file). _(flagged 2026-06-20 during the Group D wireframe pass — the "instrument lens / single-track-per-page" model surfaces it.)_ → **filed: [NH-219](https://leocaseiro.atlassian.net/browse/NH-219) (SD-28)** — the a/b/c/d sub-questions are in the ticket comment.
