# Handoff — Notation model (songs / lessons / parts / steps) — 2026-06-17

**Resume goal (Leo):** finish looking into the **notation** model for **songs / lessons** and their **parts / steps**.

## Where to work
- Worktree: `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model`
- Branch: `docs/wireframe-pattern-lesson-model` (pushed to origin; PR not opened). Commits this session: `80eaaa5` → `d12d189` → `fe15ccd`.
- Serve the wireframe: `python3 -m http.server 8780` → `http://localhost:8780/docs/wireframe/index.html` (flip **Inspector** on).
- Local DB for DBeaver: `nh_notation` (Postgres `localhost:5432`, user `leocaseiro`, no password). Reload: `psql -d nh_notation -f docs/wireframe/2026-06-17-notation-model-draft.sql`.

## What's settled this session — full detail in project memory `notation_model.md`
- **Unified `notation` model**: one table, `kind ∈ {song, part, lesson, pattern}`; self-ref `parent_id` (part→song); **`source`** table (file/alphaTex, optional bar range); **`lesson_step`** junction (lesson→reusable pattern + `sort_order` + bpm ladder); **difficulty curve** `data.difficulty {by, tiers}` (by = bpm for drums, fingering for pitched); **`listable`** flag; **`time_signature_numerator` / `time_signature_denominator`**; per-user **scores key off the notation id** (DynamoDB).
- **UI**: `Songs | Lessons` tabs — Lessons = every **non-song listable** (lessons + patterns: beats/fills/rudiments/scales); **NO Patterns tab**. Patterns are first-class playables with their own detail (score/history).
- Validated end-to-end on Postgres; wireframe v1.4 migrated + a global **"Show all fields"** field-dock inspector (fixed/resizable, on list + every detail page).

## Key files
- Draft SQL (validated): `docs/wireframe/2026-06-17-notation-model-draft.sql`
- Field explorer: `docs/wireframe/notation-explorer.html`
- Wireframe v1.4: `docs/wireframe/index.html`
- Brainstorm framing: `docs/wireframe/2026-06-16-brainstorm-prep-patterns-lessons.md`

## Open / next — the resume goal
1. **Parts & steps in depth (MAIN GOAL):**
   - Song **parts** = first-class `notation` (kind=part, parent_id=song, bar range, `listable=false`). The wireframe still models *song-breakdown as a lesson* (old) — migrate it to **Song Parts**.
   - Lesson **steps** = the `lesson_step` junction to **reusable patterns** (steps are NOT notations). The wireframe still uses old inline `STEPS` — migrate to the junction + reusable patterns so the same pattern can be step 1 in one lesson and step 3 in another.
   - Confirm: a song "part" stays song-owned (parent_id), not reused like a pattern.
2. **Taxonomy:** is `lesson_type` redundant now patterns carry `pattern_kind`? How the Lessons "Kind" filter should span both.
3. **GP-upload kind** (old SD-23): largely dissolved — upload → notation of a chosen kind; upload-flow UX deferred to CRUD.
4. Apply the resolved deltas to the real spec deliberately; reconcile users/audit (`created_by`/`owner`) vs the `architecture-spec` worktree's `2026-06-17-data-layer-requirements.md`.

## Wireframe niceties already added
- Global Inspector toggle (banner) → all-columns field-dock on list rows + song/lesson/step/pattern detail pages.
- Clickable patterns (incl. on song detail pages), `cursor:pointer` + hover on every `[data-nav]` link.
- Seven Nation Army → multi-instrument; Funk 16ths has `coordination` (ALL-of skill filter demo).
