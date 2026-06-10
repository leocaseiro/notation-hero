# NotationHero — Catalogue Schema (Song / Lesson / Pattern) — v1 Design

> **Status:** 🟢 DESIGN (brainstorm-approved 2026-06-10) — ready for implementation planning
> **Store:** Neon **PostgreSQL + JSONB** (per [2026-06-09 catalogue-store decision](../decisions/2026-06-09-catalogue-store-postgres-neon.md))
> **Supersedes:** the DynamoDB-based `song-schema.md` draft (Lesson record / single-table / GSIs).
> **Feature-freeze refs:** `K-1`/`K-3` (CMS + catalog API), `H-11` (lesson library), `D-2` (mapping presets), `H-10` (upload validation). DynamoDB stays for **per-user** data only.
> **Owner:** leocaseiro

---

## 1. What this is

The shared **catalogue** contract the player app (reader) and the admin CMS (writer) both build to. It holds **songs** and **lessons** (and the **patterns** — beats / fills / rudiments — that connect them), with the search/filter surface a drum-practice library needs. Per-user data (scores, settings, mappings) is **out of scope** — that's DynamoDB.

**Governing principle (drives every column):** the database caches **only what we search / filter / sort / show in a list** without opening the file. Everything else AlphaTab derives at load time. Files live in **S3** (served via **CloudFront**); Postgres stores **keys + searchable metadata only — never blobs.**

---

## 2. Storage architecture

| Concern | Where | Notes |
|---|---|---|
| Searchable metadata (the tables below) | **Neon Postgres** | typed columns for filters; `data jsonb` for variable/nested; tiny rows (~few MB for thousands of items) |
| Song notation files (`.gp`/`.gpx`/`.gp5`/`.gp4`/`.gp3`/`.xml`) | **S3** | uploaded binary; key stored in `catalogue_item.notation_key` |
| Exercise-step notation | **inline alphaTex** (a `text` column) | authored, tiny (~hundreds of bytes); no S3 object, no signed URL |
| External audio/video | **links** in `audio`/`video` jsonb | YouTube URL or S3 key; embedded GP audio travels inside the `.gp` |
| File delivery | **CloudFront** | short-lived signed URL (or public) resolved by the `K-3` API on item open |

**Notation reality (locked):** AlphaTab renders **Guitar Pro 3–8, MusicXML, Capella, alphaTex** — **not** standard MIDI. MIDI is a *reference / import-source* (convert-at-ingest → GP/alphaTex), never the stored notation format. So the `notation_format` enum excludes `mid`.

---

## 3. Entity model

```
catalogue_item ──< exercise            (a lesson's ordered steps)
      │  │
      │  └──────< item_pattern >────── pattern        (beats / fills / rudiments; m:n, optional)
      │                                   └──< pattern_pairing  ⟂ DEFERRED (slot only)
      └ type = 'song' | 'lesson'
        lesson_type = 'song-breakdown' | 'beat' | 'rudiment'   (lessons only)
```

- **`catalogue_item`** — one row per song **or** lesson. Shared facets = typed columns → **unified cross-type search in one query**. Type-specific + parsed extras live in `data jsonb`.
- **`exercise`** — the ordered **steps** of a lesson (`Lesson 1 ──< * Exercise`). Each step has its own notation + its own start→goal BPM ladder.
- **`pattern`** — a named, reusable groove vocabulary, discriminated by `kind` (`beat` | `fill` | `rudiment`; extensible to `ostinato`/`scale`/`chord` later). **`item_pattern`** links songs/lessons to patterns (m:n, optional).
- **`pattern_pairing`** — *designed but NOT built in v1*: a self-referential m:n for "fills that go well with beats" (the future *suggest-a-fill* feature).

---

## 4. Schema (authoritative DDL)

```sql
-- ─────────────────────────────────────────────────────────────────────
-- ① catalogue_item — songs AND lessons (shared facets = typed columns)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE catalogue_item (
  id              text PRIMARY KEY,                 -- slug or uuid
  type            text       NOT NULL,              -- 'song' | 'lesson'
  title           text       NOT NULL,              -- seeded from file/filename, curator-editable
  level           smallint   NOT NULL,              -- ★ difficulty 1–10 (both types)
  artist          text,                             -- songs (optional); lessons usually null
  bpm             int,                              -- ★ required for songs (CHECK); optional lessons
  time_sig        text,                             -- '4/4','7/8'… optional, searchable
  genre           text,                             -- musical style: Rock/Jazz/Funk… optional, searchable
  musical_key     text,                             -- 'C','Am','F#m'… piano/guitar; drums ignore. per-row = per-version
  instruments     text[],                           -- {drums,guitar,bass…} auto-derived at ingest
  skill           text[],                           -- lessons: {timing,independence…}
  tags            text[],                           -- free facets
  lesson_type     text,                             -- lessons only: 'song-breakdown'|'beat'|'rudiment' (open vocab)
  source          text       NOT NULL,              -- 'curated' | 'user-upload'
  license         text,
  notation_key    text,                             -- S3 key — SONGS (one file). lessons: null (steps carry notation)
  notation_format text,                             -- 'gp'|'gpx'|'gp5'|'gp4'|'gp3'|'xml'|'alphatex' (songs)
  has_audio       boolean    NOT NULL DEFAULT false,
  has_video       boolean    NOT NULL DEFAULT false,
  audio           jsonb,                            -- [{provider,url|key,label}] external links (embedded GP audio = auto-flag)
  video           jsonb,                            -- [{provider:'youtube',url,label}]
  status          text       NOT NULL DEFAULT 'draft',  -- 'draft'|'published'|'archived' (archived = soft-delete tombstone)
  data            jsonb,                            -- album, year, bars, sections[], parsed-raw, meta (NEVER the file)
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ci_type     CHECK (type IN ('song','lesson')),
  CONSTRAINT ci_status   CHECK (status IN ('draft','published','archived')),
  CONSTRAINT ci_level    CHECK (level BETWEEN 1 AND 10),
  CONSTRAINT ci_song_bpm CHECK (type <> 'song' OR bpm IS NOT NULL),
  CONSTRAINT ci_song_file CHECK (type <> 'song' OR notation_key IS NOT NULL),
  CONSTRAINT ci_lesson_type_only CHECK (type = 'lesson' OR lesson_type IS NULL)
);

-- ─────────────────────────────────────────────────────────────────────
-- ② exercise — ordered STEPS of a lesson (each: own notation + bpm ladder)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE exercise (
  id             text PRIMARY KEY,
  lesson_id      text NOT NULL REFERENCES catalogue_item(id) ON DELETE CASCADE,
  step_no        int  NOT NULL,                     -- 1,2,3…
  title          text NOT NULL,                     -- "Hi-hat only", "+ Kick", "Chorus 1"
  start_bpm      int,
  goal_bpm       int,                               -- ★ the start→goal practice ladder

  -- notation source: EXACTLY ONE of the three
  notation_tex   text,                              -- authored alphaTex inline (beat/rudiment steps)
  notation_key   text,                              -- …or an S3 file
  source_item_id text REFERENCES catalogue_item(id),-- …or a slice of a song (song-breakdown)
  start_bar      int,
  end_bar        int,

  data           jsonb,
  UNIQUE (lesson_id, step_no),
  CONSTRAINT ex_one_source CHECK (
    (notation_tex IS NOT NULL)::int
  + (notation_key IS NOT NULL)::int
  + (source_item_id IS NOT NULL)::int = 1
  ),
  CONSTRAINT ex_slice_bars CHECK (source_item_id IS NULL OR (start_bar IS NOT NULL AND end_bar IS NOT NULL))
);

-- ─────────────────────────────────────────────────────────────────────
-- ③ pattern — named reusable vocabulary (beats / fills / rudiments / …)
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE pattern (
  id           text PRIMARY KEY,                    -- slug: 'rock-8th', 'single-paradiddle'
  kind         text NOT NULL,                       -- 'beat'|'fill'|'rudiment' (open vocab; later 'ostinato'/'scale'/'chord')
  name         text NOT NULL,                       -- "8th-Note Rock", "Single Paradiddle"
  family       text,                                -- kind-relative grouping (NOT genre): beat→Rock/Funk · rudiment→Roll/Diddle/Flam/Drag · scale→major/minor
  subdivision  text,                                -- '8th'|'16th'|'triplet'|'quarter'
  level        smallint,                            -- 1–10
  aliases      text[],
  description  text,
  notation_tex text,                                -- canonical pattern as alphaTex (tiny, playable)
  data         jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pat_level CHECK (level IS NULL OR level BETWEEN 1 AND 10)
);

-- ④ item_pattern — m:n link (songs↔beats, lessons↔patterns). Optional: an item may link 0..n.
CREATE TABLE item_pattern (
  item_id    text NOT NULL REFERENCES catalogue_item(id) ON DELETE CASCADE,
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

> **Array-first rule:** a controlled vocab starts as a `text[]` column (+ GIN); it graduates to its own table only when it needs its own columns or relationships (that's exactly why `pattern` is a table and `skill`/`tags` are arrays).

---

## 5. Required vs optional

Real files are messy/incomplete → **almost everything is optional, seeded from the file.** Required = just enough to *exist, be found, be opened*.

| Field | Required? | Rule |
|---|---|---|
| `id`, `type`, `title`, `level`, `source`, `created_at`, `updated_at` | ✅ always | `level` 1–10 |
| `bpm` | ✅ songs · ⬜ lessons | `CHECK (type<>'song' OR bpm IS NOT NULL)` |
| `notation_key` (+`notation_format`) | ✅ songs · ⬜ lessons | lessons carry notation on their steps |
| `lesson_type` | ✅ lessons (recommended) · n/a songs | songs must leave it null |
| `artist`, `time_sig`, `genre`, `musical_key`, `instruments`, `skill`, `tags`, `audio`, `video`, `data`, pattern links | ⬜ optional | seeded from parse / curated when known |
| `exercise` notation source | ✅ exactly one of `notation_tex` \| `notation_key` \| `source_item_id`+bars | enforced by CHECK |

---

## 6. Notation storage — the three step shapes

A lesson's `lesson_type` determines where each step's notation comes from:

| `lesson_type` | Step notation source | Links to | Example |
|---|---|---|---|
| **song-breakdown** | `source_item_id` + `start_bar`/`end_bar` (a slice of the source song — reuses its file, no duplication) | the source **song** | "Yellow → Chorus 1 = bars 17–24" |
| **beat** | `notation_tex` (authored alphaTex layers) | `pattern(kind='beat')` | hi-hat → +kick → +snare → full groove |
| **rudiment** | `notation_tex` (authored alphaTex variations) | `pattern(kind='rudiment')` | single paradiddle at increasing BPM |

**Bonus (ingest nicety):** because GP files carry `<Section>` markers (verified: Coldplay "Yellow" → Intro / Verse 1 / Chorus 1 / …), a **song-breakdown lesson's steps can be auto-seeded** from the source song's sections.

---

## 7. Patterns — beats, fills, rudiments (and why `family` ≠ `genre`)

- **One `pattern` table, discriminated by `kind`.** The UI shows "Beats" / "Rudiments" / "Fills" as `WHERE kind=…` views; the table is internal. *"What songs/lessons use pattern X"* is the same query for every kind.
- **`genre` vs `family` are different axes (both kept):**
  - `genre` (on `catalogue_item`) = **musical style of the song/lesson** — a library facet (Rock, Jazz, Funk).
  - `family` (on `pattern`) = **kind-relative grouping**, meaning shifts by kind: `beat`→groove style (Rock/Funk/Shuffle/Latin), `rudiment`→PAS families (Roll/Diddle/Flam/Drag), `scale`→major/minor/modes. Rudiments and scales have **no genre** — `family` is the field that works across all kinds.
- **`item_pattern` is optional** — "some songs we won't know the beat" (a song may link 0, 1, or many patterns).
- **Fill↔beat compatibility = `pattern_pairing` (DEFERRED).** "Including a fill in a beat exercise" is just *content* (the step's alphaTex has the fill). The reusable "fills f1,f2 go well with beats b1,b2,b4" is the self-referential `pattern_pairing` slot — designed now, built when the *suggest-a-fill* feature lands.

---

## 8. Media (audio / video)

- **Item-level** `audio jsonb` / `video jsonb` arrays of links (`{provider, url|key, label}`) — YouTube link or separately-hosted mp3. Cheap booleans `has_audio` / `has_video` for filtering.
- **Embedded GP audio travels with the file:** a synced `.gp` literally contains its mp3 inside the zip (`Content/Assets/*.mp3` + `<BackingTrack>`), so **uploading only the `.gp` works** and `has_audio` can be auto-detected at ingest. (AlphaTab audio/video **sync** itself is a later feature.)
- **Per-track media (Songsterr-style "video per track") = deferred.** Re-associating media to tracks later is additive → no v1 rework.

---

## 9. Search & filters

Every facet the player browses by is a typed column or array → one query spans songs + lessons.

```sql
-- Indexes
CREATE INDEX ci_gin_instruments ON catalogue_item USING gin (instruments);
CREATE INDEX ci_gin_skill       ON catalogue_item USING gin (skill);
CREATE INDEX ci_gin_tags        ON catalogue_item USING gin (tags);
CREATE INDEX ci_btree_filters   ON catalogue_item (type, status, level, bpm, time_sig, genre);
CREATE INDEX ci_updated         ON catalogue_item (updated_at);
CREATE INDEX ci_trgm_title      ON catalogue_item USING gin (title gin_trgm_ops);   -- fuzzy
CREATE INDEX ci_trgm_artist     ON catalogue_item USING gin (artist gin_trgm_ops);
CREATE INDEX ip_by_pattern      ON item_pattern (pattern_id);
-- weighted full-text (title > artist > tags)
ALTER TABLE catalogue_item ADD COLUMN search tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('simple', coalesce(title,'')),  'A')
 || setweight(to_tsvector('simple', coalesce(artist,'')), 'B')
 || setweight(to_tsvector('simple', array_to_string(coalesce(tags,'{}'),' ')), 'C')
) STORED;
CREATE INDEX ci_fts ON catalogue_item USING gin (search);
```

```sql
-- Example queries (every filter you asked for)
-- bpm range + 4/4 drum songs by level
WHERE type='song' AND status='published' AND bpm BETWEEN 80 AND 120
  AND time_sig='4/4' AND instruments @> '{drums}' AND level <= 4
-- genre + artist                 →  WHERE genre='rock' AND artist ILIKE 'coldplay%'
-- skill (lessons)                →  WHERE type='lesson' AND skill @> '{independence}'
-- lesson type                    →  WHERE type='lesson' AND lesson_type='beat'
-- musical key (piano)            →  WHERE musical_key='C'
-- by pattern (beat or rudiment)  →  JOIN item_pattern ip ON ip.item_id=ci.id WHERE ip.pattern_id='rock-8th'
-- fuzzy title                    →  WHERE title % 'yelow'           -- pg_trgm typo-tolerant
-- full-text                      →  WHERE search @@ websearch_to_tsquery('simple','yellow coldplay')
```

**UX (informs later UI spec):** *simple* filters always visible (search · type · level · bpm · time-sig · instrument); *advanced* behind "More" (genre · tags · skill · pattern · key · source/license). Sort: relevance · level · bpm · newest · most-practiced (later, from analytics) · A–Z.

---

## 10. Ingest / auto-populate (CMS, `K-1`)

Parse each uploaded file **once at upload**; never parse server-side again (the player parses client-side at play).

1. **Reliable from the file** → seed typed columns: `bpm`, `time_sig`, `instruments[]` (GM program + **MIDI channel 9 = drums**, verified), `data.bars`, `data.sections[]`.
2. **Unreliable from the file** → `title`/`artist`/`album` (GP header often empty; MIDI buries them in track names) → seed from **filename**, then **curator override** (the row is authoritative, the parse is a seed).
3. **MIDI uploads** → convert-at-ingest (MIDI→GP/MusicXML/alphaTex) since AlphaTab can't render MIDI as notation; store the converted notation.
4. `H-10` validation: binary/sniffable formats validate by magic bytes (`gp`=PK zip, `gpx`=BCFS, `gp5/4/3`=version header, `xml`=`<?xml`). alphaTex is CMS-authored (parse-validated), never in the user-upload path.

---

## 11. Out of scope for v1 (deferred — slots designed, not built)

| Deferred | Why / future home |
|---|---|
| `track` table (per-track channel/program/index) | AlphaTab enumerates tracks at load; v1 stores only `instruments[]` for filtering |
| `song_part` table | AlphaTab gives sections at load; add only if we *filter by* section |
| `pattern_pairing` (fill↔beat) | the *suggest-a-fill* feature; self-referential m:n slot designed in §4 |
| Per-track media (video-per-track) | item-level `audio[]`/`video[]` now; additive later |
| `course` (ordered lessons) | v1 stops at Lesson→Exercise; Course wraps lessons later |
| Per-user "can-play pattern" skill graph | **DynamoDB** (per-user), joined at app layer — not the catalogue |
| Multi-arrangement grouping (one "work", many versions/keys) | each version is its own `catalogue_item` row now |

---

## 12. Extensibility & lifecycle

- **`data jsonb`** on every entity absorbs late `/design-shotgun` findings with no migration.
- **Open `kind`/`lesson_type` vocabularies** add categories (incl. piano scales/chords) with no schema change.
- **`status`** lifecycle `draft → published → archived`; `archived` = soft-delete tombstone (`updated_at` bumped → catalogue change-feed can carry it to future synced clients).
- **Swappable behind the `K-3` catalog API** — the app reads catalogue + signed file URLs through `K-3`; the Postgres choice stays an implementation detail (AWS-managed equivalent = Aurora/RDS + RDS Proxy).

---

## 13. Open questions (not blocking)

1. **`exercise` vs `step` naming** — confirmed direction (Lesson ──< Exercise); keep the table name `exercise` or rename to `step`?
2. **`id` strategy** — slugs for curated/patterns, uuids for user-uploads? (lean: `text`, slug where stable.)
3. **`musical_key` as enum vs free text** — free text v1; controlled list later for filtering precision.
4. **Most-practiced sort** — needs the analytics counter (`H-6`); catalogue exposes the column, value synced later.
