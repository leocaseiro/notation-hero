# NotationHero — Catalog Schema (Song / Lesson / Pattern) — v1 Design

> **Status:** 🟢 DESIGN (brainstorm-approved 2026-06-10; ce-doc-review applied 2026-06-10) — ready for implementation planning
> **Store:** Neon **PostgreSQL + JSONB** (per [2026-06-09 catalog-store decision](../decisions/2026-06-09-catalog-store-postgres-neon.md))
> **Supersedes:** the `song-schema.md` drafts (2026-06-05 DynamoDB record; 2026-06-09 Postgres reframe) — this is the authoritative contract with the full brainstormed field design (patterns, exercises, lesson types).
> **Feature-freeze refs:** `K-1`/`K-3` (CMS + catalog API), `H-11` (lesson library), `D-2` (MIDI mapping presets), `H-10` (upload validation). DynamoDB stays for **per-user** data only.
> **Owner:** leocaseiro

---

## 1. What this is

The shared **catalog** contract the player app (reader) and the admin CMS (writer) both build to. It holds **songs** and **lessons** (and the **patterns** — beats / fills / rudiments — that connect them), with the search/filter surface a drum-practice library needs. Per-user data (scores, settings, mappings) is **out of scope** — that's DynamoDB.

**Governing principle (drives every column):** the database caches **only what we search / filter / sort / show in a list** without opening the file. Everything else AlphaTab derives at load time. Files live in **S3** (served via **CloudFront signed URLs**); Postgres stores **keys + searchable metadata only — never blobs.**

---

## 2. Storage architecture

| Concern                                                        | Where                                                           | Notes                                                                                                                 |
| -------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Searchable metadata (the tables below)                         | **Neon Postgres**                                               | typed columns for filters; `data jsonb` for variable/nested; tiny rows (~few MB for thousands of items)               |
| Song notation files (`.gp`/`.gpx`/`.gp5`/`.gp4`/`.gp3`/`.xml`) | **S3**                                                          | uploaded binary; key in `catalog_item.notation_key`                                                                   |
| Exercise-step notation                                         | **inline alphaTex** (a `text` column)                           | authored, tiny (~hundreds of bytes); no S3 object, no signed URL                                                      |
| External audio/video                                           | **links** in `audio`/`video` jsonb                              | YouTube URL or S3 key; embedded GP audio travels inside the `.gp`                                                     |
| File delivery                                                  | **CloudFront — short-lived signed URL (private, never public)** | resolved by the `K-3` API on item open; signed so files can't be hotlinked/bulk-downloaded around the API (copyright) |

**S3 key layout + quarantine (`H-10`).** Validated curated files live under a served prefix (`catalog/<id>/source.<ext>`). User uploads (M1) land in a **quarantine prefix** (`quarantine/<id>/…`) first; only after validation are they promoted to the served prefix. IAM scopes the ingest Lambda to write `quarantine/` only; a separate step promotes. Bucket/IAM path separation keeps user-upload and curated objects access-controllable.

**Notation reality (locked, D1).** AlphaTab renders **Guitar Pro 3–8, MusicXML, Capella, alphaTex** — **not** standard MIDI (verified against the fork: it loads via the generic `api.load()` notation importers; there is no MIDI-notation path). MIDI is a **source format, converted _before_ it becomes a catalog item** (curators convert in Guitar Pro and upload the `.gp` — the existing workflow). So `notation_format` excludes `mid`. (⚠ `feature-freeze` A-1/B-1 say "renders `.mid`" — that is inaccurate and should be corrected there. Automated MIDI→MusicXML conversion is an **M1 / user-upload** concern, deferred.)

---

## 3. Entity model

```
catalog_item ──< exercise            (a lesson's ordered steps)
      │  │
      │  └──────< item_pattern >────── pattern        (beats / fills / rudiments; m:n, optional)
      │                                   └──< pattern_pairing  ⟂ DEFERRED (slot only)
      └ type = 'song' | 'lesson'
        lesson_type = 'song-breakdown' | 'beat' | 'rudiment'   (lessons only)
```

- **`catalog_item`** — one row per song **or** lesson. Shared facets = typed columns → **unified cross-type search in one query**. Type-specific + parsed extras live in `data jsonb`.
- **`exercise`** — the ordered **steps** of a lesson (`Lesson 1 ──< * Exercise`). Each step has its own notation + its own start→goal BPM ladder.
- **`pattern`** — a named, reusable groove vocabulary, discriminated by `kind` (`beat` | `fill` | `rudiment`; extensible to `ostinato`/`scale`/`chord` later). **`item_pattern`** links songs/lessons to patterns (m:n, optional).
- **`pattern_pairing`** — _designed but NOT built in v1_: a self-referential m:n for "fills that go well with beats" (the future _suggest-a-fill_ feature).

---

## 4. Schema (authoritative DDL)

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- fuzzy/partial search (§9)
CREATE EXTENSION IF NOT EXISTS unaccent;   -- accent-insensitive search ("sao" finds "São")
-- immutable wrapper so unaccent() works inside generated columns + functional indexes
CREATE FUNCTION immutable_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT public.unaccent('public.unaccent', $1) $$;
-- array_to_string is only STABLE → wrap it IMMUTABLE so the §9 generated tsvector column compiles
CREATE FUNCTION immutable_array_to_string(text[], text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT array_to_string($1, $2) $$;

-- ─────────────────────────────────────────────────────────────────────
-- ① catalog_item — songs AND lessons (shared facets = typed columns)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE catalog_item (
  id               text PRIMARY KEY,              -- slug or uuid
  type             text       NOT NULL,           -- 'song' | 'lesson'
  title            text       NOT NULL,           -- seeded from file/filename, curator-editable
  level            smallint,                      -- difficulty 1–10, NULLABLE (NULL = ungraded; not parseable from files)
  artist           text,                          -- songs (optional); lessons usually null
  bpm              int,                           -- ★ required for songs (CHECK); optional lessons
  time_sig         text,                          -- '4/4','7/8'… optional, searchable
  genre            text,                          -- musical style, stored LOWERCASE ('rock','jazz'…) optional, searchable
  musical_key      text,                          -- 'C','Am','F#m'… piano/guitar; drums ignore. per-row = per-version
  instruments      text[],                        -- {drums,guitar…} auto-derived at ingest · GIN
  skill            text[],                        -- lessons {timing,independence} · GIN
  tags             text[],                        -- free facets · GIN
  lesson_type      text,                          -- lessons only: 'song-breakdown'|'beat'|'rudiment' (open vocab)
  sort_order       int,                           -- curator manual ordering within a list (NULL = alphabetical)
  source           text       NOT NULL,           -- 'curated' | 'user-upload'
  license          text,                          -- controlled vocab: 'royalty-free'|'cc'|'owned'|'public-domain' (see §10 gate)
  cover_image_key  text,                          -- S3 key for library thumbnail (optional; icon fallback if null)
  notation_key     text,                          -- S3 key — SONGS (one file). lessons: NULL (steps carry notation)
  notation_format  text,                          -- songs: 'gp'|'gpx'|'gp5'|'gp4'|'gp3'|'xml'  (NO 'mid' — see §2; NO 'alphatex' — songs are file-backed)
  notation_checksum text,                         -- sha256 of the file (integrity / dedup / H-10) — optional
  notation_bytes   int,                           -- file size (upload-limit + display) — optional
  has_audio        boolean    NOT NULL DEFAULT false,
  has_video        boolean    NOT NULL DEFAULT false,
  audio            jsonb,                          -- [{provider,url|key,label}] external links (embedded GP audio = auto-flag)
  video            jsonb,                          -- [{provider:'youtube',url,label}]
  status           text       NOT NULL DEFAULT 'draft',  -- 'draft'|'published'|'archived' (archived = soft-delete tombstone)
  data             jsonb,                          -- see §12 "data jsonb known keys" (album, year, bars, sections[], defaultMappingPresetId, meta) — NEVER the file
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ci_type      CHECK (type IN ('song','lesson')),
  CONSTRAINT ci_status    CHECK (status IN ('draft','published','archived')),
  CONSTRAINT ci_level     CHECK (level IS NULL OR level BETWEEN 1 AND 10),
  CONSTRAINT ci_song_bpm  CHECK (type <> 'song' OR bpm IS NOT NULL),
  CONSTRAINT ci_song_file CHECK (type <> 'song' OR notation_key IS NOT NULL),
  CONSTRAINT ci_song_fmt  CHECK (notation_format IS NULL OR notation_format IN ('gp','gpx','gp5','gp4','gp3','xml')),
  CONSTRAINT ci_lesson_type_only CHECK (type = 'lesson' OR lesson_type IS NULL),
  CONSTRAINT ci_shared_curated   CHECK (status <> 'published' OR source = 'curated'),  -- v1: shared catalog is curated-only; user-uploads stay private-per-user (M1)
  CONSTRAINT ci_source           CHECK (source IN ('curated','user-upload')),           -- source is write-once (set by K-1 ingest; NOT CMS-updatable — the curated-only CHECK trusts it)
  CONSTRAINT ci_pub_license      CHECK (status <> 'published' OR source <> 'curated' OR license IS NOT NULL)  -- published curated items must carry a license
);

-- ─────────────────────────────────────────────────────────────────────
-- ② exercise — ordered STEPS of a lesson (each: own notation + bpm ladder)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE exercise (
  id             text PRIMARY KEY,
  lesson_id      text NOT NULL REFERENCES catalog_item(id) ON DELETE CASCADE,
  step_no        int  NOT NULL,
  title          text NOT NULL,                   -- "Hi-hat only", "+ Kick"
  section_label  text,                            -- song-breakdown display label ("Chorus 1") — seeded from GP <Section> or curator
  start_bpm      int,
  goal_bpm       int,                             -- ★ the start→goal practice ladder

  -- notation source: EXACTLY ONE of the three
  notation_tex   text,                            -- authored alphaTex inline (beat/rudiment steps) — the common case
  notation_key   text,                            -- rare: a step authored as a standalone GP/MusicXML S3 file
  source_item_id text REFERENCES catalog_item(id) ON DELETE RESTRICT,  -- song-breakdown slice; RESTRICT = can't hard-delete a sliced song (archive instead)
  start_bar      int,
  end_bar        int,

  data           jsonb,
  UNIQUE (lesson_id, step_no),
  CONSTRAINT ex_one_source CHECK (
    (notation_tex IS NOT NULL)::int
  + (notation_key IS NOT NULL)::int
  + (source_item_id IS NOT NULL)::int = 1
  ),
  CONSTRAINT ex_slice_bars CHECK (source_item_id IS NULL OR (start_bar > 0 AND end_bar >= start_bar)),
  CONSTRAINT ex_bpm_ladder CHECK (
    (start_bpm IS NULL OR start_bpm > 0) AND (goal_bpm IS NULL OR goal_bpm > 0)
    AND (start_bpm IS NULL OR goal_bpm IS NULL OR goal_bpm >= start_bpm)
  )
);

-- ─────────────────────────────────────────────────────────────────────
-- ③ pattern — named reusable vocabulary (beats / fills / rudiments / …)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE pattern (
  id           text PRIMARY KEY,                  -- slug: 'rock-8th', 'single-paradiddle'
  kind         text NOT NULL,                     -- 'beat'|'fill'|'rudiment' (open vocab; later 'ostinato'/'scale'/'chord')
  name         text NOT NULL,                     -- "8th-Note Rock", "Single Paradiddle"
  family       text,                              -- kind-relative grouping (NOT genre): beat→Rock/Funk · rudiment→Roll/Diddle/Flam/Drag · scale→major/minor
  subdivision  text,                              -- '8th'|'16th'|'triplet'|'quarter'
  level        smallint,                          -- 1–10
  aliases      text[],
  description  text,
  notation_tex text,                              -- canonical pattern as alphaTex (tiny, playable)
  data         jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pat_level CHECK (level IS NULL OR level BETWEEN 1 AND 10)
);

-- ④ item_pattern — m:n link (songs↔beats, lessons↔patterns). Optional: an item may link 0..n.
CREATE TABLE item_pattern (
  item_id    text NOT NULL REFERENCES catalog_item(id) ON DELETE CASCADE,
  pattern_id text NOT NULL REFERENCES pattern(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, pattern_id)
);

-- ⑤ pattern_pairing — ⟂ DEFERRED (v1.5): "fills that go well with beats" / suggest-a-fill.
-- Designed slot only; not created in v1. Self-referential m:n on pattern:
--   pattern_pairing(pattern_id, paired_id, relation, PRIMARY KEY(pattern_id,paired_id,relation))
--   relation e.g. 'fill-fits-beat' · generalizes to 'variation-of', 'rudiment-in', …
```

### Controlled vocabularies (app-enforced, not DB enums — for extensibility)

- `lesson_type`: `song-breakdown` · `beat` · `rudiment` (extensible).
- `pattern.kind`: `beat` · `fill` · `rudiment` (v1); later `ostinato` · `scale` · `chord` · `progression`.
- `instruments[]`: `drums` (priority) · `guitar` · `bass` · `keys` · `vocals` · `other`.
- `license`: `royalty-free` · `cc` · `owned` · `public-domain`.

> **Array-first rule:** a controlled vocab starts as a `text[]` column (+ GIN); it graduates to its own table only when it needs its own columns or relationships (that's why `pattern` is a table and `skill`/`tags` are arrays).

---

## 5. Required vs optional + lifecycle rules

Real files are messy/incomplete → **almost everything is optional, seeded from the file.** Required = just enough to _exist, be found, be opened_.

| Field                                                                                                                                                                                                  | Required?                                                                   | Rule                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `id`, `type`, `title`, `source`, `status`, `created_at`, `updated_at`                                                                                                                                  | ✅ always                                                                   |                                                                 |
| `bpm`                                                                                                                                                                                                  | ✅ songs · ⬜ lessons                                                       | `CHECK (type<>'song' OR bpm IS NOT NULL)`                       |
| `notation_key` (+`notation_format`)                                                                                                                                                                    | ✅ songs · ⬜ lessons                                                       | lessons carry notation on their steps                           |
| `level`, `artist`, `time_sig`, `genre`, `musical_key`, `instruments`, `skill`, `tags`, `sort_order`, `cover_image_key`, `notation_checksum`, `notation_bytes`, `audio`, `video`, `data`, pattern links | ⬜ optional                                                                 | seeded from parse / curated when known. `level` NULL = ungraded |
| `lesson_type`                                                                                                                                                                                          | recommended for lessons · n/a songs                                         | songs must leave it null                                        |
| `exercise` notation source                                                                                                                                                                             | ✅ exactly one of `notation_tex` \| `notation_key` \| `source_item_id`+bars | enforced by CHECK                                               |

**Publish-gate rules (app/CMS-enforced — DDL can't express these):**

- **A lesson must have ≥1 exercise** before `status` → `published` (else it is unplayable). _(D4)_
- **`source` is write-once** — set by the K-1 ingest pipeline, never updatable via CMS CRUD. The `ci_shared_curated` gate trusts `source`, so re-labeling a `user-upload` as `curated` must be impossible (enforce in the K-1/K-3 API contract, or a DB trigger).
- **The shared catalog is curated-only (v1).** `CHECK (status<>'published' OR source='curated')` enforces that no `user-upload` row is ever published here. User uploads (M1) live in a **private per-user space** (separate, keyed by uploader — mirrors shared-vs-per-user data), never auto-surfaced in the shared library. `source` stays for provenance + future deliberate curate-in.
- **`source='curated'` items require a non-null `license`** before `published`.

**Level → display (D6):** `level` 1–10 maps to the 5★ library display as `1–2→1★ · 3–4→2★ · 5–6→3★ · 7–8→4★ · 9–10→5★`; `NULL`→no stars ("—"). Library/CMS/player all use this mapping.

---

## 6. Notation storage — the three step shapes

A lesson's `lesson_type` determines where each step's notation comes from:

| `lesson_type`      | Step notation source                                                                    | Display label                | Links to                      | Example                               |
| ------------------ | --------------------------------------------------------------------------------------- | ---------------------------- | ----------------------------- | ------------------------------------- |
| **song-breakdown** | `source_item_id` + `start_bar`/`end_bar` (a slice of the source song — reuses its file) | `section_label` ("Chorus 1") | the source **song**           | "Yellow → Chorus 1 = bars 17–24"      |
| **beat**           | `notation_tex` (authored alphaTex layers)                                               | `title`                      | a **pattern** (kind=beat)     | hi-hat → +kick → +snare → full groove |
| **rudiment**       | `notation_tex` (authored alphaTex variations)                                           | `title`                      | a **pattern** (kind=rudiment) | single paradiddle at increasing BPM   |

- **Bonus (ingest nicety):** because GP files carry `<Section>` markers (verified: Coldplay "Yellow" → Intro / Verse 1 / Chorus 1 / …), a **song-breakdown lesson's steps can be auto-seeded** from the source song's sections (populating `section_label` + bar ranges).
- **Archived-source rule (D2):** a song-breakdown step references a song via `source_item_id`. Hard-delete of that song is blocked (`ON DELETE RESTRICT`) — curators **archive** instead. When resolving a slice, the **`K-3` API must verify the source song's `status='published'`**; if the source is `archived`/`draft`, the API refuses to serve the slice (so a retired/de-licensed song can't keep serving through a song-breakdown back door). Slice resolution goes through a **single shared K-3 resolver** so the status check can't be bypassed by a new consumer (CMS preview, export, bulk re-render).

---

## 7. Patterns — beats, fills, rudiments (and why `family` ≠ `genre`)

- **One `pattern` table, discriminated by `kind`.** The UI shows "Beats" / "Rudiments" / "Fills" as `WHERE kind=…` views; the table is internal. _"What songs/lessons use pattern X"_ is the same query for every kind.
- **`genre` vs `family` are different axes (both kept):** `genre` (on `catalog_item`) = musical style of the song/lesson (a library facet). `family` (on `pattern`) = kind-relative grouping: `beat`→groove style (Rock/Funk/Shuffle/Latin), `rudiment`→PAS families (Roll/Diddle/Flam/Drag), `scale`→major/minor. Rudiments/scales have no genre — `family` works across all kinds.
- **`item_pattern` is optional** — "some songs we won't know the beat" (a song may link 0, 1, or many patterns).
- **`fill` is a pattern kind, not a lesson type (v1).** Fills are linked to beats/songs via `item_pattern` (and to beats via the deferred `pattern_pairing`). There is intentionally **no `fill` lesson_type** yet — a dedicated fill lesson can be added when fill-teaching content is authored; until then a fill rides inside a beat lesson's step content.
- **Fill↔beat compatibility = `pattern_pairing` (DEFERRED).** "Including a fill in a beat exercise" is just _content_ (the step's alphaTex has the fill). The reusable "fills f1,f2 go well with beats b1,b2,b4" is the self-referential `pattern_pairing` slot — designed now, built when the _suggest-a-fill_ feature lands.

---

## 8. Media (audio / video)

- **Item-level** `audio jsonb` / `video jsonb` arrays of links (`{provider, url|key, label}`) — YouTube link or separately-hosted mp3. Cheap booleans `has_audio` / `has_video` for filtering.
- **Embedded GP audio travels with the file:** a synced `.gp` literally contains its mp3 inside the zip (`Content/Assets/*.mp3` + `<BackingTrack>`), so **uploading only the `.gp` works** and `has_audio` can be auto-detected at ingest. (AlphaTab audio/video **sync** itself is a later feature.)
- **Upload size limits (security).** The embedded mp3 makes a valid `.gp` arbitrarily large (a synced file is ~4.6 MB). Ingest enforces a max size on both the container and any extracted asset as a **streaming limit** — abort decompression once the running total exceeds the ceiling (~20 MB decompressed, tune per `H-10`) **before** buffering the full payload in Lambda memory (a post-load check still lets a zip-bomb exhaust the Lambda). Cross-references the `H-10` rate-limit.
- **Per-track media (Songsterr-style "video per track") = deferred.** Re-associating media to tracks later is additive → no v1 rework.

---

## 9. Search & filters

Every facet the player browses by is a typed column or array → one query spans songs + lessons.

```sql
-- pg_trgm already enabled in §4.
CREATE INDEX ci_gin_instruments ON catalog_item USING gin (instruments);
CREATE INDEX ci_gin_skill       ON catalog_item USING gin (skill);
CREATE INDEX ci_gin_tags        ON catalog_item USING gin (tags);
CREATE INDEX ci_btree_filters   ON catalog_item (type, status, level, bpm, time_sig, genre);
CREATE INDEX ci_updated         ON catalog_item (updated_at);
-- fuzzy indexes are accent + case-insensitive (immutable_unaccent from §4) → "sao" matches "São"
CREATE INDEX ci_trgm_title  ON catalog_item USING gin (immutable_unaccent(lower(title)) gin_trgm_ops);
CREATE INDEX ci_trgm_artist ON catalog_item USING gin (immutable_unaccent(lower(coalesce(artist,''))) gin_trgm_ops);
CREATE INDEX ip_by_pattern  ON item_pattern (pattern_id);
ALTER TABLE catalog_item ADD COLUMN search tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', immutable_unaccent(coalesce(title,''))),  'A')
 || setweight(to_tsvector('simple', immutable_unaccent(coalesce(artist,''))), 'B')
 || setweight(to_tsvector('simple', immutable_unaccent(immutable_array_to_string(coalesce(tags,'{}'),' '))), 'C')
) STORED;
CREATE INDEX ci_fts ON catalog_item USING gin (search);
```

```sql
-- Example queries. NOTE: all user-supplied values MUST be bound as parameters
-- (Neon serverless driver parameterized query interface) — never string-interpolated.
-- The literals below are illustrative only.
WHERE type='song' AND status='published' AND bpm BETWEEN 80 AND 120
  AND time_sig='4/4' AND instruments @> '{drums}' AND level <= 4
-- genre + artist                 →  WHERE genre='rock' AND artist ILIKE 'coldplay%'   (genre stored lowercased)
-- skill (lessons)                →  WHERE type='lesson' AND skill @> '{independence}'
-- lesson type                    →  WHERE type='lesson' AND lesson_type='beat'
-- musical key (piano)            →  WHERE musical_key='C'
-- by pattern (beat or rudiment)  →  JOIN item_pattern ip ON ip.item_id=ci.id WHERE ip.pattern_id='rock-8th'
-- fuzzy title (accent-insensitive) → WHERE immutable_unaccent(lower(title)) % immutable_unaccent(lower('Sao'))
-- full-text                      →  WHERE search @@ websearch_to_tsquery('simple','yellow coldplay')
```

**`K-3` list projection (the library card contract).** `GET /catalog` (list) returns exactly: `id, type, title, artist, genre, level, bpm, time_sig, instruments, has_audio, has_video, sort_order, cover_image_url, status, updated_at` — **excluding** `data jsonb`, `notation_key`, `notation_checksum`. `cover_image_url` is the API-resolved (signed/CDN) form of `cover_image_key`. Full record + signed notation URL is fetched on item open. Per-user fields (best score, "continue") are joined from DynamoDB at the app layer, not from the catalog.

**UX (informs later UI spec):** _simple_ filters always visible (search · type · level · bpm · time-sig · instrument); _advanced_ behind "More" (genre · tags · skill · pattern · key · source/license). Sort: relevance · level · bpm · newest · most-practiced (later, from `H-6`) · A–Z · curated (`sort_order`).

**Internationalization:** storage is **UTF-8** — `text` holds any language natively (ã/à/ñ/ç, 中文, emoji); no config. Search is **accent + case-insensitive** via `unaccent`+`lower` ("sao"→"São", "motorhead"→"Motörhead"). A–Z sort uses the UTF-8 collation; per-language ICU collation can refine later.

**Level filter semantics:** the level filter is **unbounded by default**; a bounded `level <= N` (or range) **excludes ungraded (`NULL`) items by design** (ungraded ≠ any 1–10 bucket). Ungraded is common (level isn't parsed from files), so never silently apply a bound the user didn't set; an "include ungraded" toggle is a later UI nicety.

---

## 10. Ingest / auto-populate (CMS, `K-1` — Lesson store)

Parse each uploaded file **once at upload**; never parse server-side again (the player parses client-side at play).

1. **Reliable from the file** → seed typed columns: `bpm`, `time_sig`, `instruments[]` (GM program + **MIDI channel 9 = drums**, verified), `data.bars`, `data.sections[]`.
2. **Unreliable from the file** → `title`/`artist`/`album` (GP header often empty; MIDI buries them in track names) → seed from **filename**, then **curator override** (the row is authoritative, the parse is a seed). `level` is **never** parsed — it's a curator judgment (or left NULL).
3. **Normalize** controlled-vocab values to **lowercase** at ingest (`genre`, array facets) so the §9 equality filters match.
4. **MIDI (D1):** convert **before** upload — curators convert MIDI→GP in **Guitar Pro** and upload the `.gp` (the existing workflow). Automated MIDI→MusicXML conversion is an **M1 / user-upload** concern (deferred); no v1 converter. `notation_format` never stores `mid`.
5. **`H-10` validation:** binary/sniffable formats validate by magic bytes (`gp`=PK zip, `gpx`=BCFS, `gp5/4/3`=version header, `xml`=`<?xml`); compute `notation_checksum` (sha256) + `notation_bytes`; enforce max size (§8); land in the `quarantine/` prefix, promote on pass. alphaTex is CMS-authored (parse-validated), never in the user-upload path.
6. **Publish gating** (see §5): lessons need ≥1 exercise; curated need a `license`; **user-uploads are never published to the shared catalog** (curated-only v1; private per-user at M1).

---

## 11. Out of scope for v1 (deferred — slots designed, not built)

| Deferred                                                    | Why / future home                                                                                                                                                        |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `track` table (per-track channel/program/index)             | AlphaTab enumerates tracks at load; v1 stores only `instruments[]` for filtering                                                                                         |
| `song_part` table                                           | AlphaTab gives sections at load (also seeded into `data.sections[]`); add a table only if we _filter by_ section                                                         |
| `pattern_pairing` (fill↔beat)                               | the _suggest-a-fill_ feature; self-referential m:n slot designed in §4                                                                                                   |
| `collection` (named curated shelves, m:n)                   | "Warm-ups", "Rock Essentials" shelves; v1 has `sort_order` for flat manual ordering                                                                                      |
| `default_mapping_preset_id` (`D-2` link)                    | a per-item player **hint**, not a search field → lives in `data.defaultMappingPresetId`; mapping itself is per-user (localStorage/DynamoDB), so the lesson only suggests |
| `most_practiced_count`                                      | added to `catalog_item` when `H-6` analytics lands (initially NULL; synced from DynamoDB counters); enables the "most-practiced" sort                                    |
| Per-track media (video-per-track)                           | item-level `audio[]`/`video[]` now; additive later                                                                                                                       |
| `course` (ordered lessons)                                  | v1 stops at Lesson→Exercise; Course wraps lessons later                                                                                                                  |
| Per-user "can-play pattern" skill graph                     | **DynamoDB** (per-user), joined at app layer — not the catalog                                                                                                           |
| Multi-arrangement grouping (one "work", many versions/keys) | each version is its own `catalog_item` row now                                                                                                                           |
| **User-upload private per-user space**                      | M1: a user's own files live separately (keyed by uploader), never auto-published to the shared (curated) catalog — see §5                                                |

> `pattern`/`item_pattern` ship in the v1 migration but stay empty until Beta content (`H-11`) is seeded — the CMS pattern-linking UI can arrive with that content.

---

## 12. Extensibility, security & lifecycle

- **`data jsonb`** on every entity absorbs late `/design-shotgun` findings with no migration.
- **`data jsonb` known keys** (the load-bearing ones features read; the rest is freeform): on `catalog_item` — `bars` (int), `sections` (`[{label, startBar, endBar}]`, used to auto-seed song-breakdown steps), `album`, `year`, `defaultMappingPresetId`, `meta`. Cross-row invariants (e.g. a slice's bars ≤ the source song's `data.bars`) are **app-enforced** (DDL can't reach into another row's JSONB). **`data` is not a PII landing zone.**
- **Open `kind`/`lesson_type` vocabularies** add categories (incl. piano scales/chords) with no schema change.
- **`status`** lifecycle `draft → published → archived`; `archived` = soft-delete tombstone (`updated_at` bumped → future change-feed carries it). The CMS **never hard-deletes** catalog rows (archival is the retirement path; see §6 archived-source rule).
- **Security notes (plan-level):** files served via **CloudFront signed URLs** (private, **~5 min TTL**); **shared catalog is curated-only** (CHECK: only `source='curated'` can be `published`); **`source` is write-once** (set by K-1 ingest, never CMS-updatable — the curated-only CHECK trusts it); **published curated items require `license`** (DB CHECK `ci_pub_license`); **streaming upload size limits + quarantine prefix** (§8/§2/§10); **all SQL values parameterized** (§9). The `K-2` admin Basic-Auth credential should be stored in **SSM Parameter Store (SecureString)** and injected at deploy — not baked into the CloudFront Function source (IaC concern, tracked with `K-2`).
- **Swappable behind the `K-3` catalog API** — the app reads catalog + signed file URLs through `K-3`; the Postgres choice stays an implementation detail (AWS-managed equivalent = Aurora/RDS + RDS Proxy).

---

## 13. Open questions (not blocking)

1. **`exercise` vs `step` naming** — direction confirmed (Lesson ──< Exercise); keep the table name `exercise` (default) or rename to `step`.
2. **`id` strategy** — `text` (slug where stable for curated/patterns, uuid for user-uploads). Exercise ids: prefer uuid over `lesson-slug+step` so reordering/renaming doesn't break references.
3. **`musical_key`** — free text in v1; a controlled list (for precise filtering) can come with piano content.
4. ~~`license` enforcement depth~~ — **resolved (round-2):** DB-enforced via the `ci_pub_license` CHECK (published curated items require a non-null license).
