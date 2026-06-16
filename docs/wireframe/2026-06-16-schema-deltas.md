# Catalog schema — UI-surfaced deltas (running ledger)

Findings from the catalog **wireframe** (`docs/wireframe/index.html`) that touch the **locked** schema
(`docs/specs/2026-06-10-catalogue-schema.md`).

**Model:** wireframe surfaces a gap → logged here as a numbered delta → **you approve each one** → only then
is the locked spec amended (with a changelog line). Unapproved gaps stay open or live in `data jsonb`.
Nothing changes unilaterally.

**Status legend:** 🔵 open (needs your call) · 🟢 approved → applied · ⚪ confirmed, no change · ⛔ rejected

---

## 🔵 SD-1 — Are **Fills** a `lesson_type` or only a `pattern.kind`?

- **What the UI needs:** the Lessons tab shows sub-kinds **Beats · Rudiments · Fills** (locked UI). To list a
  "Fill" as a browsable lesson, an item needs `lesson_type='fill'`.
- **Schema today:** `catalogue_item.lesson_type` open vocab = `'song-breakdown' | 'beat' | 'rudiment'`.
  `'fill'` exists only as `pattern.kind='fill'` (a reusable vocabulary entry, not a browsable lesson).
- **Why it matters:** without `lesson_type='fill'`, the Fills sub-tab has nothing to list (or must query
  `pattern`, which is a different entity with no steps/BPM-ladder).
- **Proposed change:** add `'fill'` to the `lesson_type` open vocab (no DDL change — it's a free-text column;
  just a documented value + a seed). Keep `pattern.kind='fill'` for the reusable-vocabulary role.
- **Cheapest alternative:** point the Fills sub-tab at `pattern` rows instead of lessons (changes what "Fills"
  means — vocabulary, not practiceable lessons).
- **Prior art:** the catalog-UI memory already flagged *"Fills → add `lesson_type='fill'` (schema tweak, open
  vocab)."* This delta just formalises the decision.

## 🔵 SD-2 — How does a **Song** find its "Practice in parts" lesson?

- **What the UI needs:** Song detail shows **Practice in parts** → a song-breakdown lesson whose steps slice
  that song.
- **Schema today:** the link is *one-way* — a song-breakdown `exercise` points **up** to the song via
  `source_item_id`. There's no pointer **down** from the song to its breakdown lesson(s).
- **Why it matters:** to render the button, the app must reverse-query `exercise WHERE source_item_id = :song`
  and group by `lesson_id` (works, but it's an implicit relationship the K-3 list projection doesn't carry).
- **Proposed change:** none to DDL — document the reverse lookup as the supported pattern, and (optionally)
  expose a `breakdownLessonIds[]` convenience field on `GET /catalogue/{id}` computed at read time.
- **Cheapest alternative:** keep it purely query-driven (current assumption). ⚪ leaning no-change.

## 🔵 SD-3 — Where does a **user-upload's owner** live (for the "my uploads" view)?

- **What the UI needs:** a signed-in **User** sees their own uploaded drafts (e.g. *"My practice loop"*) that
  aren't in the shared published catalog; **Admin** sees all.
- **Schema today:** `catalogue_item.source='user-upload'` + `status` exist, but there is **no `owner` / `uploader_id`**
  column. Deferred-slots note says user files are *"keyed by uploader, never auto-published"* — but doesn't say
  where the uploader key lives.
- **Why it matters:** filtering "items owned by *this* user" needs an owner reference somewhere queryable.
- **Proposed change (options to decide):** (a) add `owner_id text` to `catalogue_item` (NULL for curated);
  (b) keep user-upload pointers **per-user in DynamoDB** and never list them from the catalog query; (c) a
  separate `user_upload` table.
- **Cheapest alternative:** (b) — matches "per-user data → DynamoDB"; the catalog stays curated-only. Likely
  the right call, but it changes how the User role's library is assembled (two sources merged client-side).

## ⚪ SD-4 — Per-user score/history on list + detail (confirmed, no change)

- Best score, sessions, trend, top-BPM are **per-user (DynamoDB)**, joined **client-side** — never in the
  catalog tables. The wireframe fakes them on the item for demo only. The K-3 list projection (catalog fields
  only) + client-side join **holds** under the UI. **No schema change.**

## ⚪ SD-5 — Row flags `hasParts` / `hasSteps` (no new column — derive)

- **What the UI needs:** row indicators for audio / video / "has parts-or-steps" (`volume_up` · `smart_display`
  · `splitscreen`).
- **Decision (you, 2026-06-16):** **no extra schema flag.** `has_audio` / `has_video` are already columns (and
  in the K-3 projection). "Has parts" = a song has `data.sections[]`; "has steps" = a lesson has `exercise`
  rows — both **derivable**. To show them in the *list* without shipping `data jsonb`, the **K-3 projection
  computes two booleans** at read time: `has_parts := jsonb_array_length(data->'sections') > 0` (songs) and
  `has_steps := EXISTS(SELECT 1 FROM exercise WHERE lesson_id = ci.id)` (lessons). **No DDL change.**

## 🟢 SD-6 — Pagination = numbered (`OFFSET` + `COUNT`), not load-more/keyset

- **What the UI needs (you, 2026-06-16):** **numbered** pagination, not "load more".
- **Feasible?** Yes — JSONB doesn't block it. Numbered pages = `SELECT … LIMIT :n OFFSET :(page-1)*n` plus a
  `SELECT COUNT(*)` for the page count, over the **typed/indexed** filter columns (`ci_btree_filters`, GIN,
  FTS). Fine at catalog scale (hundreds–low thousands).
- **Supersedes:** the earlier "pagination = keyset/cursor" note (a scale optimisation). **v1 = OFFSET+COUNT
  numbered**; revisit keyset only if the catalog grows large enough that deep `OFFSET` hurts. **No DDL change.**

## 🟢 SD-7 — Level `0 = Debut` (extend the grade scale to 0–10)

- **Decision (you, 2026-06-16):** add a **Debut** tier as `level = 0` (below grade 1). Keeps a single integer
  scale; `NULL` stays "ungraded" and **distinct** from Debut.
- **Schema change:** `ci_level CHECK (level BETWEEN 1 AND 10)` → **`BETWEEN 0 AND 10`**. UI renders `0` as a
  "Debut" pill. The bounded-level filter still excludes ungraded `NULL` by design (§9).

## 🟢 SD-8 — Multi-select *filter* over single-valued columns (genre / time / kind)

- **Decision (you, 2026-06-16):** the **item columns stay single-valued** (a song has one genre, a lesson one
  `lesson_type`, one `time_sig`) — *schema unchanged*. Only the **filter contract** gains list inputs so the
  user can OR-match several.
- **Filter-contract change:** `genre`, `timeSig`, `lessonType` go `string → string[]` in `CatalogueFilter`;
  the SQL adapter maps them to `col = ANY($1)` (OR). `instruments` stays single-select for now (`@> ARRAY[$1]`).
  Tags/Skill keep **ALL-of** (`@>`). No `catalogue_item` column changes.

## 🟢 SD-9 — Add `musicalKey` filter, instrument-conditional (drums vs pitched)

- **Decision (you, 2026-06-16):** add **`musicalKey`** to the filter contract — the `musical_key` column
  already exists; it was just missing from `CatalogueFilter`. Expose it **only when the instrument filter is a
  pitched one** (guitar / keys); **drums are unpitched** (no key/scale) so Key is hidden for drums / "Any".
- **Filter-contract change:** add `musicalKey?: string[]` → `musical_key = ANY($1)` (OR). Conditional UI only;
  no column change. A future `scale`/`mode` filter can join it for piano content (§13 "controlled list with
  piano content").

## 🟢 SD-10 — Sort **direction** (ASC / DESC) — `$10`

- **What the UI needs:** a direction toggle next to Sort. *Relevance* and *Curated* have a natural order
  (relevance = best-match DESC; curated = `sort_order` ASC) → no toggle. *Level / BPM / Newest / A–Z* get an
  ASC/DESC switch.
- **Filter-contract change:** add `sortDir?: 'asc' | 'desc'` (default per field). No column change. **Build in v1.3.**

## 🟢 SD-11 — Filter by **flags** (has audio / video / parts-or-steps) — `$11`

- **What the UI needs:** toggle filters matching the row flags. `has_audio` / `has_video` are **columns** →
  `has_audio = true`. "Has parts/steps" = derived (SD-5) → `EXISTS(...)` / `jsonb_array_length(...) > 0`.
- **Filter-contract change:** add `hasAudio?` / `hasVideo?` / `hasParts?` booleans. No new column. **Build in v1.3.**

## 🔵 SD-12 — Filter **and sort by score** — `$12` ⚠️ crosses the catalogue / per-user boundary

- **What the UI needs:** "show all below 90%", sort by best-score.
- **The catch:** best-score is **per-user (DynamoDB)** — **not in the catalogue** (SD-4) and not in the K-3 query.
  A pure catalogue query *cannot* filter/sort by it.
- **Options:** (a) **client-side** post-filter/sort of the fetched page (simple, but breaks server-side
  pagination + global sort — only sorts the current page); (b) a **per-user "my library" index** in DynamoDB
  (proper: query scores → ids, then hydrate from catalogue) — more work, belongs with the scores/player build;
  (c) **defer** until per-user data is wired. **Recommend (c)/defer** — revisit with the DynamoDB scores work.
- **No catalogue column change either way.**

---

## Filter / UI notes (not schema changes)

- **N-13 (`$13`) — show Key for drums / no-instrument too?** You're reconsidering SD-9's strict hide-for-drums.
  Likely: show Key when **no instrument is selected** (mixed catalogue) and for pitched; hide only when
  instrument = drums. *Explore later* — flagged on SD-9.
- **N-14 (`$14`) — group levels into named bands** (Debut · Beginner · Intermediate · Advanced, RSL-style) via
  `<optgroup>` in the Level picker. **Display only** (level stays 0–10); band ranges TBD (RSL-style, unverified).
  Nice-to-have, candidate for v1.3.
- **N-15 (`$15`) — range UI = from-to selects** (min/max), **confirmed** — no dual-handle slider needed in the
  wireframe (already built this way). Documented here + in `filter-review.md`.

---

## Round-2 resolutions (2026-06-16)

- **SD-1 → RESOLVED:** Fills = **`pattern.kind`**, *not* a `lesson_type`. *UI follow-up:* drop "Fills" from the
  Lessons **Kind** filter; patterns (beats / fills / rudiments) get a future **Patterns browse** (the `pattern`
  table already exists). Wireframe keeps a placeholder until that browse is designed.
- **SD-3 → DIRECTION:** add **`owner_id`** + a **`visibility`** enum to user-uploads — `public` (curated /
  shared) · `private` (owner-only) · `shared` / friends *(TBD)*. This is the per-item ACL. Full model lands
  with auth / CRUD; wireframe shows a "Private" tag on a user's own uploads.
- **SD-10 → OPEN QUESTIONS:** sort direction (asc / desc) deferred (your call).
- **SD-11 → v1.3 (deferred):** flag filters (audio / video / parts) — batched, not now.
- **SD-12 → BUILDING (client-side):** score filter + sort-by-score wireframed client-side (per-user caveat
  shown in-UI); the real impl needs the DynamoDB join (per SD-4).
- **N-16 — indexes (your PS):** per-sort indexes + (if keyset is ever revisited) e.g.
  `CREATE INDEX ci_keyset ON catalogue_item (updated_at DESC, id DESC)` — go in the spec when deltas are
  applied. We chose numbered `OFFSET` pagination (SD-6), so keyset is optional.

---

### 🔵 Open (need your call): SD-2 (song→breakdown link) · SD-3 (visibility model TBD) · SD-12 (impl) · SD-10 / SD-11 (deferred)
### ✅ Resolved: SD-1 (fills=pattern) · SD-4 · SD-5 · SD-6 · SD-7 (Debut=0) · SD-8 (multi-filter) · SD-9 (key conditional)
*(**Applying** resolved deltas to the locked spec is a SEPARATE deliberate pass — on your go, a changelog line
each, likely after CRUD. The item schema stayed almost entirely intact, as you predicted — most changes are
filter-side.)*
