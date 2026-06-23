# NotationHero — Song / Lesson Schema (shared contract)

> ⛔ **SUPERSEDED (2026-06-10)** — replaced by the authoritative v1 catalog contract: **[specs/2026-06-10-catalog-schema.md](specs/2026-06-10-catalog-schema.md)** (Postgres + JSONB; song / lesson / pattern; ce-doc-review applied). Kept for history only — do not build to this file.

> **Status:** DRAFT — seed for **Track 3** (finalize before splitting APP + CMS) · 2026-06-05 · **2026-06-09: catalog store = Neon Postgres + JSONB** (see [decision record](decisions/2026-06-09-catalog-store-postgres-neon.md); Lesson ≠ Song; per-user data = DynamoDB)
> **Companions:** [feature-freeze.md](feature-freeze.md) (area `K`, `H-11`, `D-2`, sync model) · [design-stack.md](design-stack.md)
> **Why this is first:** it's the ONE contract the **player app (reader)** and **Admin CMS (writer)** both build to. Lock it, then APP and CMS proceed in parallel. Keep it **extensible** (the `meta` blob) so a late `/design-shotgun` finding doesn't force a rebuild.

## Logical record (Lesson / Song — distinct types)

```ts
// Logical shape (shared by both types). Physical store = Neon Postgres + JSONB — see "Postgres storage" below.
interface CatalogItem {      // Lesson | Song — distinct types, shared base columns
  lessonId: string;            // uuid (catalog item id)
  type: "lesson" | "song";     // distinct schemas; type-specific structure (Song `parts`) lives in `meta` / `data jsonb`
  title: string;
  artist?: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  tags: string[];              // genre, technique, kit-piece focus…
  category?: string;           // library grouping (e.g. "Rock", "Warm-ups")
  order?: number;              // sort within category

  bpm: number;                 // default/display tempo (from file or override)
  timeSignature: string;       // "4/4"
  durationBars?: number;

  instrument: "drums";         // primary; extensible to keyboard etc.
  drumTrackIndex?: number;     // which track in a multi-track .gp is the drums
  defaultMappingPresetId?: string; // links to a D-2 MIDI-mapping preset

  file: {
    key: string;               // S3 object key (see layout)
    format: "gp" | "gpx" | "gp5" | "mid" | "alphatex";
    sizeBytes: number;
    checksum: string;          // sha256 (matches H-10 validation)
  };

  coverImageKey?: string;
  description?: string;
  source: "curated" | "user-upload";  // curated = CMS; user-upload = M1 (H-10)
  license?: string;            // for curated (royalty-free / CC / owned)
  status: "published" | "draft";
  version: number;             // bump on content/schema change
  meta?: Record<string, unknown>; // EXTENSIBILITY — late UI findings land here
  createdAt: number;
  updatedAt: number;
}
```

## Postgres storage (Neon — relational + JSONB hybrid)

The logical record above maps to one `catalog` row. **Promote queried fields to typed columns**; keep **variable/nested/type-specific content in a `data jsonb` column** (this is where `meta`, Song `parts`/sections, per-section tags, and late `/design-shotgun` findings live — no migration needed).

- **Typed columns** (queried/filtered): `lesson_id`, `type`, `title`, `artist`, `difficulty`, `tags text[]`, `category`, `sort_order`, `bpm`, `time_signature`, `duration_bars`, `instrument`, `file_key`, `file_format`, `status`, `source`, `version`, `created_at`, `updated_at`.
- **`data jsonb`** (the `meta` of the logical record): everything variable/nested — Song `parts`, difficulty curve, per-section tags, design-shotgun findings.

```sql
create extension if not exists pg_trgm;                     -- partial/fuzzy search

create index on catalog (status, category, sort_order);   -- library listing
create index on catalog using gin (tags);                 -- "items with tag X"
create index on catalog using gin (data jsonb_path_ops);  -- document-style queries on JSONB
create index on catalog using gin (title gin_trgm_ops);   -- partial/fuzzy title (LIKE '%x%')
create index on catalog (artist);
create index on catalog (difficulty);
create index on catalog (updated_at desc);                -- recency / future change-feed
```

**Multi-attribute + partial-search examples:**
```sql
select * from catalog
where artist = 'Rush' and 'prog' = any(tags) and difficulty between 3 and 4;  -- combined filters
select * from catalog where title ilike '%love%';                            -- partial (pg_trgm-indexed)
select * from catalog where data @> '{"focus":"double-bass"}';               -- document-style on JSONB
```

**Song `parts` (later):** relational `song_parts` table (FK → `catalog`, queryable) **or** embed under `data->'parts'` (read-as-unit) — decide embed-vs-reference when the feature lands.

**Per-user data lives in DynamoDB** (scores / settings / mappings / sync) — the shared catalog and per-user data are a clean seam across two stores.

## S3 layout

```
lessons/<lessonId>/source.<ext>     # the gp/gpx/gp5/mid/alphatex file
lessons/<lessonId>/cover.<ext>      # optional cover image
# user uploads (M1, H-10): quarantine/<sub>/<uuid> → (validate) → uploads/<sub>/<songId>/source.<ext>
```

## Catalog API (`K-3` reader + `K-2` admin writer)

```
# Public (player app reads):
GET  /lessons?category=&difficulty=&tag=   → list projection: [{lessonId,title,artist,difficulty,tags,bpm,durationBars,category,order,coverImageUrl}]
GET  /lessons/{lessonId}                    → full Lesson + short-lived signed URL for the file

# Admin (behind K-2 CloudFront-Function Basic Auth):
POST   /lessons              → create metadata (status:"draft")
PUT    /lessons/{id}         → update
DELETE /lessons/{id}         → soft-delete (status:"draft" / tombstone)
POST   /lessons/{id}/file    → pre-signed PUT for the source file (magic-byte validated, per H-10 pipeline)
```

Note: the **list projection is a subset** of fields (cheap reads, only what the library screen needs); the full record is fetched on open.

## Design notes / rationale

- **Store the raw file; parse on the client via AlphaTab** at load (`.gp`/`.mid`/alphaTex → notation + tick map). Do NOT pre-store a tick map — it's derived and renderer-specific (`A-7`/`G`).
- `defaultMappingPresetId` references the existing `D-2` mapping presets (Yamaha DTX / Roland TD-50 / etc.) so a lesson can suggest a kit mapping.
- **Shared data, no identity** (per the locked sync model): the catalog is global/curated → stored in **Neon Postgres** (per-user data is separate, in **DynamoDB** — a clean two-store seam). User-uploaded songs at M1 add per-user catalog rows (keyed by uploader); per-user *sync* data stays in DynamoDB.
- `data jsonb` (= `meta` in the logical record) absorbs `/design-shotgun` discoveries (cover variants, difficulty curve, per-section tags, Song `parts`) without a schema migration.
- `version` + soft-delete (`status`/tombstone) keep it forward-compatible.

## Open questions (resolve in Track 3)

1. **Sections / A-B regions:** store recommended practice regions per lesson, or leave to the player? (Lean: optional `meta.sections` later; not v1.)
2. **Multi-instrument lessons:** keep `instrument:"drums"` only for now, or model multiple tracks/instruments up front? (Lean: drums-only + `drumTrackIndex`; extensible.)
3. **Lesson vs Song:** ✅ **RESOLVED (2026-06-09)** — *distinct* entities (different schemas): one `catalog` table with a `type` discriminator + shared base columns; type-specific structure (Song `parts`) lives in `data jsonb` / related tables. Songs gain `parts`/sections **later**.
4. **alphaTex authoring:** author preloaded exercises (`H-11`, Beta) directly in alphaTex stored as `format:"alphatex"`? (Lean: yes — `J-3`.)
5. **Difficulty:** single 1-5, or per-aspect (speed/coordination/reading)? (Lean: single now; `meta` for more.)
