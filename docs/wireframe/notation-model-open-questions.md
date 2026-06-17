# Notation model — decisions, open questions & deferred changes

Running tracker from the model brainstorm (2026-06-17). DB-first focus; the
"open questions" and "deferred changes" below are **parked deliberately** — noted
so they're not lost, not actioned yet.

## Decisions banked (this session)
- **F1 — umbrella name = `Playable`.** Song / Lesson / Pattern / Part are all a *Playable*. "Notation" now means **the score only**.
- **F3 — `groove` is not a model type** — it's an instrument-specific example of a **composite Pattern** (a Pattern with steps). The model stays instrument-agnostic (drums / piano / guitar / …).
- **Scoring is per-playable.** Every Playable (song, part, lesson, pattern) has its **own** score (per-user, DynamoDB, keyed by id). A **Lesson has its own score** from *playing the whole lesson* (the "final exam") — it is **NOT** an average of step scores. You can skip the steps, play the lesson whole, and score 100%.

## Deferred DB changes
- **Rename `notation_tex` → `notation_alphaTex`** (the inline alphaTex field — `notation_tex` in the wireframe, `alphatex` in the draft SQL `source` table). Do during the real schema pass, not now.

## Wireframe / layout open questions
- **OQ1 — Artist in the catalog Song list.** Display the (optional) `artist` on screen when listing Songs in the catalog list, **and** allow **filtering by artist**.
