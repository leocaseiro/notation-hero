# Brainstorm prep — Lesson ↔ Step ↔ Pattern (+ the GP-file role)

**Status:** 🧠 scheduled (Leo's call, resuming tomorrow). We got tangled here during the READ-page review;
this doc frames it so the brainstorm starts clean. **v1.4 build is PAUSED** until the model settles — v1.3
(songs + catalog/search/filters + READ pages) is solid and stands.

## The tangle (two models that don't quite line up)

**Schema model (locked spec):**

- `pattern` is a **standalone first-class table** (beat / fill / rudiment / …; reusable vocabulary).
- `item_pattern` (m:n) links **songs and lessons** to patterns.
- `lesson` has ordered **`exercise` steps**; each step carries notation (alphaTex / upload / song-slice) + a
  start→goal BPM ladder.

**Leo's UI model (emerging, clearer for users):**

- **"A Lesson = 1+ patterns."** You don't browse loose patterns — **Lessons _is_ the browse**:
  - drums → **beats · fills · rudiments**
  - piano → **scales** (+ whatever piano players need)
- A lesson can have a **single or multiple steps**.
- **No "pattern without a lesson" in the UI** — that was the confusing turn.

## Open questions for the brainstorm

1. **Is a STEP the same as a PATTERN, or different?** Lesson = ordered steps — is each _step_ a pattern, or
   does a step _reference_ a pattern? → reconcile `exercise` vs `pattern` (maybe step→pattern link, maybe merge).
2. **Do standalone patterns exist in the UI at all?** Leo: no. So is `pattern` purely the building block that
   lessons compose (never browsed alone)? Then who creates/curates patterns, and where?
3. **GP-file role (flagged flaw — SD-23):** a GuitarPro file can be a **song** _or_ a **pattern/groove**.
   "Upload → always a song" is too narrow. How does upload decide **song vs pattern vs lesson-step**?
4. **Load & go (SD-22):** drop a `.gp` → play now (private / draft, no required fields). Depends on #3.
5. **Lesson taxonomy is instrument-dependent:** drums → beats/fills/rudiments; piano → scales/etc. Lesson
   "kinds" vary by instrument.
6. **Song-breakdowns** are reached **through the song** ("Practice in parts"), _not_ listed under Lessons —
   likely still holds; confirm inside the new model.

## What's settled (won't re-open)

- Songs, catalog search + **functional filters**, the READ pages (song/lesson/step detail), 3-role ACL,
  routing, numbered pagination, score donut/bands, Debut=0, media, source/license. → all in **v1.3**.
- The filter-side schema deltas (SD-7/8/9 etc.) — see `2026-06-16-schema-deltas.md`.

## Resume here

> Brainstorm the **Lesson ↔ Step ↔ Pattern** model + the **GP-file role** (song/pattern/step). Once settled,
> build **v1.4** on it (restore the right Lessons taxonomy, pattern handling, step descriptions, voicing,
> per-step scores). Then CRUD.
