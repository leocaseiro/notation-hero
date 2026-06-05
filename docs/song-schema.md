# NotationHero — Song / Lesson Schema (shared contract)

> **Status:** DRAFT — seed for **Track 3** (finalize before splitting APP + CMS) · 2026-06-05
> **Companions:** [feature-freeze.md](feature-freeze.md) (area `K`, `H-11`, `D-2`, sync model) · [design-stack.md](design-stack.md)
> **Why this is first:** it's the ONE contract the **player app (reader)** and **Admin CMS (writer)** both build to. Lock it, then APP and CMS proceed in parallel. Keep it **extensible** (the `meta` blob) so a late `/design-shotgun` finding doesn't force a rebuild.

## Lesson record (DynamoDB single-table item)

```ts
// PK = LESSON#<lessonId>   SK = METADATA
interface Lesson {
  lessonId: string;            // uuid
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

GSI (matches `H-3`): `(category, order)` for library listing; `(updatedAt)` for the future M1 change-feed.

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
- **Shared data, no identity** (per the locked sync model): lessons are global/curated → DynamoDB partition is the lesson, not a user. (User-uploaded songs at M1 add per-user keys via `H-10`.)
- `meta` blob absorbs `/design-shotgun` discoveries (cover art variants, difficulty curve, per-section tags) without a schema migration.
- `version` + soft-delete (`status`/tombstone) keep it forward-compatible.

## Open questions (resolve in Track 3)

1. **Sections / A-B regions:** store recommended practice regions per lesson, or leave to the player? (Lean: optional `meta.sections` later; not v1.)
2. **Multi-instrument lessons:** keep `instrument:"drums"` only for now, or model multiple tracks/instruments up front? (Lean: drums-only + `drumTrackIndex`; extensible.)
3. **Exercises vs songs:** same schema with `category`/`tags`, or a separate `type`? (Lean: same schema, `category`.)
4. **alphaTex authoring:** author preloaded exercises (`H-11`, Beta) directly in alphaTex stored as `format:"alphatex"`? (Lean: yes — `J-3`.)
5. **Difficulty:** single 1-5, or per-aspect (speed/coordination/reading)? (Lean: single now; `meta` for more.)
