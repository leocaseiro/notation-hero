# Catalog search — filter-by-filter review

Every search UI element checked **one by one** against the read-side query contract
(`core/catalog/CatalogFilter.ts` + schema spec §9) and the canonical mockup
(`docs/mockups/catalog.html`). Decisions made with Leo on 2026-06-16.

**Key principle (Leo):** *data cardinality ≠ filter cardinality.* An item **has** one
genre / type / kind (columns stay single-valued — schema unchanged). The **filter** may
multi-*select* to OR-match (`col = ANY($1)`). So "rudiments OR beats" preserves the
single-value relationship.

| # | UI piece | Contract | Mockup | Decision (v1.2) | Query | Schema delta |
|---|----------|----------|--------|-----------------|-------|:---:|
| 1 | Search | fuzzy pg_trgm + FTS | text | functional (title/artist) | `unaccent/ILIKE` + `tsvector` | — |
| 2 | Songs / Lessons | `type` single | segmented | **single** | `type = $1` | — |
| 3 | Genre | `genre` single `=` | dropdown | **multi-select filter** (OR) | `genre = ANY($1)` | SD-8 |
| 4 | Kind (`lesson_type`) | `lessonType` single | dropdown | **multi-select filter** (OR) | `lesson_type = ANY($1)` | SD-8 |
| 5 | Level | `{min,max}`, excl. ungraded | "≤ N" | **range** (min/max) + incl-ungraded toggle; **0 = Debut** | `level BETWEEN` (NULL excluded unless toggle) | SD-7 |
| 6 | Instrument | `instruments[]` `@>` | "is any of" | **single-select** (multi later) | `instruments @> ARRAY[$1]` | — |
| 7 | Tempo | `bpm {min,max}` | dual slider | **range** (min/max) | `bpm BETWEEN` | — |
| 8 | Time-sig | `timeSig` single | multi chips | **multi-select filter** (OR) | `time_sig = ANY($1)` | SD-8 |
| 9 | Tags | `tags[]` `@>` (ALL) | token multi | **ALL-of** (keep) | `tags @> $1` | — |
| 10 | Skill | `skill[]` `@>` (ALL) | multi chips | **ALL-of** (keep) | `skill @> $1` | — |
| 11 | Pattern | `patternId` single (JOIN) | token multi | **single** (v1) | `JOIN item_pattern` | — |
| 12 | Key | **absent from contract** | token multi | **add `musicalKey`**, multi (OR), **shown only for pitched instruments** | `musical_key = ANY($1)` | SD-9 |
| 13 | Sort | relevance·level·bpm·newest·title·curated | "Relevance" only | **functional dropdown** (6 options) | `ORDER BY` | — |
| 14 | *(admin)* Status | `status` (admin-only) | — | admin status filter (later slice) | `status = $1` | — |

## Resolved decisions

- **A — Instrument = single-select** for now (`instruments @> ARRAY[$1]` = "includes X"). Multi-select
  (and the ANY-vs-ALL question) deferred — "rarely play either instrument; change later." Tags/Skill **stay
  ALL-of** (`@>`): "must have all selected".
- **B — Genre / Time-sig / Kind = multi-select filter** (OR via `= ANY`). **Item columns stay single** — only
  the filter contract gains list inputs (`string → string[]`). → SD-8.
- **C — Key** added to the contract (`musical_key` column already exists), exposed **only when the instrument
  filter is pitched** (guitar / keys). Drums are unpitched → no Key. A Scale/Mode filter can join later. → SD-9.
- **Level 0 = Debut** — extend the scale to 0–10 (0 = Debut; NULL = ungraded, kept distinct). → SD-7.

## Drums vs pitched (the conditional-Key rule)

- **Drums** = unpitched → **no key, no scale**.
- **Pitched** (guitar, bass, **keys/piano**) → have a **key** (C, F♯m…) and a **scale/mode** (major, dorian…).
- So `musicalKey` (and a future `scale`/`mode`) filter is **instrument-conditional**: rendered only when the
  instrument filter is a pitched one; hidden for drums / "Any".
