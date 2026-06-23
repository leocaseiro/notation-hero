-- ============================================================================
-- NotationHero — Group D — track · media · per-instrument difficulty — DRAFT (2026-06-20)
-- ----------------------------------------------------------------------------
-- ADDITIVE on top of 2026-06-19-tonal-drum-schema-draft.sql (load that FIRST).
-- Builds on the locked Playable model + tonal/drum side-tables (PR #52). Does NOT
-- reopen them. text PKs here are human slugs for readability; real schema mints ULIDs (R13).
--
-- Reload after edits (pristine base, then this file):
--   psql -d nh_tonal_scratch -v ON_ERROR_STOP=1 -f docs/wireframe/2026-06-19-tonal-drum-schema-draft.sql
--   psql -d nh_tonal_scratch -v ON_ERROR_STOP=1 -f docs/wireframe/2026-06-20-group-d-track-media-difficulty-draft.sql
--
-- ── D-1 · track relation — DECISIONS RATIFIED 2026-06-20 ───────────────────
--   D-1a  Adopt a `track` relation AND keep playable.instruments text[] as a DERIVED facet
--         (DISTINCT track.instrument, GIN-indexed) for the fast catalog filter. A SPLIT, not
--         a rename. (Database Architect: normalize the detail; denormalize only the hot path.)
--   D-1b  instrument = the real instrument someone learns: drums|guitar|bass|keys|vocals|ukulele|...
--         A FLAT, OPEN vocabulary (no CHECK). role = same-instrument variant: solo|rhythm|lead|pad|harmony.
--         (bass is its OWN instrument, not a guitar role.)
--         FUTURE (deferred, not v1): an instrument FAMILY grouping — guitar -> electric/acoustic; wind; brass.
--   D-1c  A track SHARES the playable's notation by default. notation_track_index points at WHICH
--         track inside that shared file (set at ingest; re-derived on re-upload). A nullable
--         notation_id is an OPTIONAL per-track score override (NULL = share). Covers all 3 cases:
--           shared file -> notation_track_index set, notation_id NULL
--           own file     -> notation_id set (override)
--           metadata only-> both NULL
--         Grounded in spikes NH-200 (tracks addressable by index in the shared Score) + NH-137
--         (reference, don't split/duplicate). No new spike needed.
--   D-1d  track.data jsonb = per-track long-tail (tuning, capo, ...). Promote to a typed facet
--         only when a real filter appears (locked hybrid rule). Tuning does NOT affect tonal
--         search — NH-196 F7: key detection uses sounding pitch (note.realValue), tuning baked in.
--
--   Architect refinements folded in: FK columns indexed; explicit ON DELETE; UNIQUE(playable_id,
--   sort_order) for deterministic order (mirrors step's PK); DEFERRABLE FKs (R16); audit columns.
-- ============================================================================

DROP TABLE IF EXISTS track CASCADE;

-- ─────────────────────────────────────────────────────────────────
-- track — one instrument/role line of a playable (D-1)
--   A song has N tracks; MULTIPLE tracks may share an instrument
--   (guitar 'lead' + guitar 'rhythm'; two vocal harmonies).
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE track (
  id                   text PRIMARY KEY,                          -- ULID at real-schema time
  playable_id          text NOT NULL REFERENCES playable(id) ON DELETE CASCADE  DEFERRABLE INITIALLY IMMEDIATE,  -- R16
  instrument           text NOT NULL,                             -- D-1b: real instrument; FLAT OPEN vocab (no CHECK)
  role                 text,                                      -- D-1b: same-instrument variant (solo|rhythm|lead|pad|harmony); NULL when unambiguous
  name                 text,                                      -- optional display label ("Lead Guitar")
  sort_order           int  NOT NULL,                             -- display order within the playable
  level                smallint,                                  -- D-3 L2: per-track = per-instrument difficulty (0–10, nullable)
  notation_id          text REFERENCES notation(id) ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE,            -- D-1c: OPTIONAL per-track score override; NULL = share playable's
  notation_track_index int,                                      -- D-1c: which track inside the SHARED notation file (ingest-set)
  data                 jsonb NOT NULL DEFAULT '{}',               -- D-1d: per-track long-tail {tuning:{strings[],label}, capo, ...}
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           text,                                      -- R1: Cognito sub
  updated_by           text,
  CONSTRAINT track_level CHECK (level IS NULL OR level BETWEEN 0 AND 10)   -- D-3: mirror playable.level scale (0=Debut..10)
);

-- ordering integrity: one sort_order per playable (architect refinement; mirrors step's PK)
CREATE UNIQUE INDEX track_playable_sort ON track (playable_id, sort_order);
-- foreign-key indexes (non-negotiable)
CREATE INDEX track_playable  ON track (playable_id);
CREATE INDEX track_notation  ON track (notation_id);
-- per-instrument lookups across tracks ("songs that HAVE a bass track")
CREATE INDEX track_instrument ON track (instrument);
CREATE INDEX track_instrument_level ON track (instrument, level);   -- D-3 L2: "easy on <instrument>" (e.g. guitar tracks <= L3)

-- ============================================================================
-- SAMPLE DATA (D-1)
-- ============================================================================

-- SEVEN NATION ARMY — the headline case: TWO guitar tracks (lead + rhythm) of the
-- SAME instrument, distinguished by role; + drums + bass (its OWN instrument).
-- All four SHARE the song's n-sna-gp file (notation_id NULL; notation_track_index = file track).
INSERT INTO track (id, playable_id, instrument, role, name, sort_order, notation_id, notation_track_index, data) VALUES
 ('track-sna-drums',         'sna', 'drums',  NULL,     'Drums',         1, NULL, 0, '{}'),
 ('track-sna-guitar-lead',   'sna', 'guitar', 'lead',   'Lead Guitar',   2, NULL, 1, '{"tuning":{"strings":["E4","B3","G3","D3","A2","E2"],"label":"Standard"}}'),
 ('track-sna-guitar-rhythm', 'sna', 'guitar', 'rhythm', 'Rhythm Guitar', 3, NULL, 2, '{"tuning":{"strings":["E4","B3","G3","D3","A2","D2"],"label":"Drop D"}}'),
 ('track-sna-bass',          'sna', 'bass',   NULL,     'Bass',          4, NULL, 3, '{}');

-- LET IT BE — demonstrates the notation_id OVERRIDE: the vocals track has its OWN
-- one-track score file (notation_id set, notation_track_index NULL); piano + guitar share.
INSERT INTO notation (id, format, notation_alphaTex) VALUES
 ('n-letitbe-vocals', 'alphatex', 'C4 D4 E4 F4');
INSERT INTO track (id, playable_id, instrument, role, name, sort_order, notation_id, notation_track_index, data) VALUES
 ('track-letitbe-piano',  'let-it-be', 'keys',   NULL, 'Piano',  1, NULL,                0,    '{}'),
 ('track-letitbe-guitar', 'let-it-be', 'guitar', NULL, 'Guitar', 2, NULL,                1,    '{}'),
 ('track-letitbe-vocals', 'let-it-be', 'vocals', NULL, 'Vocals', 3, 'n-letitbe-vocals',  NULL, '{}');

-- ── D-1a DERIVE: playable.instruments := DISTINCT track.instrument ───────────
-- The app runs this on every track write. Two guitar tracks collapse to one 'guitar'
-- in the facet; SNA gains 'bass'; Let It Be gains 'vocals'. The GIN facet filter is unchanged.
UPDATE playable p
SET instruments = sub.instruments, updated_at = now()
FROM (
  SELECT playable_id, array_agg(DISTINCT instrument ORDER BY instrument) AS instruments
  FROM track GROUP BY playable_id
) sub
WHERE p.id = sub.playable_id;

-- ============================================================================
-- POKE-AROUND QUERIES (D-1)
-- ============================================================================
-- 1) SNA's tracks — TWO guitars, one bass, one drums (the headline D-1 case)
--   SELECT instrument, role, name, notation_track_index FROM track WHERE playable_id='sna' ORDER BY sort_order;
--
-- 2) Derived facet == DISTINCT track.instrument (the D-1a "split")
--   SELECT p.id, p.instruments AS facet,
--          (SELECT array_agg(DISTINCT t.instrument ORDER BY t.instrument) FROM track t WHERE t.playable_id=p.id) AS from_tracks
--   FROM playable p WHERE p.id IN ('sna','let-it-be');
--
-- 3) Catalog filter still works on the derived facet (GIN @>): songs with a bass track
--   SELECT title FROM playable WHERE instruments @> ARRAY['bass'];      -- Seven Nation Army
--
-- 4) notation_id OVERRIDE: vocals has its own file; piano/guitar share (notation_id NULL)
--   SELECT name, instrument, notation_id, notation_track_index FROM track WHERE playable_id='let-it-be' ORDER BY sort_order;
--
-- 5) per-track tuning (D-1d jsonb): lead = Standard, rhythm = Drop D
--   SELECT name, data->'tuning'->>'label' AS tuning FROM track WHERE playable_id='sna' AND data ? 'tuning' ORDER BY sort_order;
-- ============================================================================


-- ============================================================================
-- D-2 · media model — DECISION RATIFIED 2026-06-20 (Option A: a media table)
-- ----------------------------------------------------------------------------
--   media keyed by playable_id + OPTIONAL track_id (NULL = song-level; set = per-track).
--   A track can have MANY media (drumless / drums-only / full mix / drum-cam) → 1:N, no limit.
--   THREE audio/video SOURCES, validated by a location CHECK (Leo's call-out):
--     provider='gp-embedded' — audio lives INSIDE the playable's/track's notation .gp file
--                              (no s3_key/url; resolve via that notation). NH-137: 7.9 MB blob —
--                              ingest may EXTRACT it to S3 (then it becomes provider='s3').
--     provider='s3'          — external file in our S3 bucket (s3_key set). The NH-137 shared
--                              FULL-song audioRef is one such SONG-LEVEL row; sync points live in data.
--     provider='youtube'     — external link (url set).  (extensible: add 'vimeo' etc. via ALTER)
--   has_audio / has_video become DERIVED facets (EXISTS over media), recomputed on write —
--   same pattern as the D-1a instruments[] facet. Kept as columns for the fast list filter.
--   NH-137 slice (a kind='part') carries NO media of its own — it resolves the SOURCE song's
--   audio via parent_id (memory notation-hero-song-slice-storage). No per-slice copy.
-- ============================================================================

DROP TABLE IF EXISTS media CASCADE;

CREATE TABLE media (
  id          text PRIMARY KEY,                          -- ULID at real-schema time
  playable_id text NOT NULL REFERENCES playable(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,  -- R16
  track_id    text REFERENCES track(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,              -- NULL = song-level; set = per-track
  kind        text NOT NULL,                             -- 'audio' | 'video'
  provider    text NOT NULL,                             -- WHERE it lives: 'gp-embedded' | 's3' | 'youtube' (extensible)
  url         text,                                      -- external link (youtube/vimeo/...)
  s3_key      text,                                      -- object key in our S3 bucket
  label       text,                                      -- 'Full mix' | 'Drumless' | 'Drums only' | 'Drum-cam' | 'Official video'
  sort_order  int  NOT NULL DEFAULT 0,                   -- order within its (playable, track) scope
  data        jsonb NOT NULL DEFAULT '{}',               -- syncPoints[], msOffsetBaseline, durationMs, mixType, ...
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_by  text,                                      -- R1: Cognito sub
  updated_by  text,
  CONSTRAINT media_kind     CHECK (kind     IN ('audio','video')),
  CONSTRAINT media_provider CHECK (provider IN ('gp-embedded','s3','youtube')),
  -- location matches the source: embedded lives in the notation; s3 needs a key; external needs a url
  CONSTRAINT media_location CHECK (
       (provider = 'gp-embedded' AND s3_key IS NULL     AND url IS NULL)
    OR (provider = 's3'          AND s3_key IS NOT NULL  AND url IS NULL)
    OR (provider = 'youtube'     AND url    IS NOT NULL  AND s3_key IS NULL)
  )
);

CREATE INDEX media_playable ON media (playable_id);
CREATE INDEX media_track    ON media (track_id);
CREATE INDEX media_kind     ON media (playable_id, kind);

-- ============================================================================
-- SAMPLE DATA (D-2)
-- ============================================================================

-- SEVEN NATION ARMY — all 3 sources, song-level AND per-track, multiple per scope.
INSERT INTO media (id, playable_id, track_id, kind, provider, url, s3_key, label, sort_order, data) VALUES
 -- song-level (track_id NULL):
 ('media-sna-yt',        'sna', NULL, 'video', 'youtube',     'https://youtu.be/0J2QdDbelmY', NULL,                         'Official video', 1, '{}'),
 ('media-sna-full',      'sna', NULL, 'audio', 's3',          NULL,  'catalog/sna/audio/full-mix.m4a',  'Full mix',     2, '{"syncPoints":[{"bar":1,"ms":0}],"msOffsetBaseline":0}'),  -- NH-137 shared audioRef
 ('media-sna-drumless',  'sna', NULL, 'audio', 's3',          NULL,  'catalog/sna/audio/drumless.m4a',  'Drumless',     3, '{"mixType":"minus","excludes":"drums"}'),
 ('media-sna-embedded',  'sna', NULL, 'audio', 'gp-embedded', NULL,  NULL,                                'Embedded backing', 4, '{"note":"lives in n-sna-gp; ingest may extract to S3"}'),
 -- per-track (track_id set) — the drums track has TWO media (stem + cam):
 ('media-sna-drumsonly', 'sna', 'track-sna-drums',       'audio', 's3',     NULL, 'catalog/sna/audio/drums-only.m4a', 'Drums only', 1, '{"mixType":"isolated"}'),
 ('media-sna-drumcam',   'sna', 'track-sna-drums',       'video', 'youtube','https://youtu.be/drumcam', NULL,            'Drum-cam',   2, '{}'),
 ('media-sna-leadcam',   'sna', 'track-sna-guitar-lead', 'video', 'youtube','https://youtu.be/leadcam', NULL,            'Lead-cam',   1, '{}');

-- ── D-2 DERIVE: has_audio / has_video := EXISTS(media …) ──────────────────────
UPDATE playable p SET
  has_audio  = EXISTS (SELECT 1 FROM media m WHERE m.playable_id = p.id AND m.kind = 'audio'),
  has_video  = EXISTS (SELECT 1 FROM media m WHERE m.playable_id = p.id AND m.kind = 'video'),
  updated_at = now()
WHERE EXISTS (SELECT 1 FROM media m WHERE m.playable_id = p.id);

-- ============================================================================
-- POKE-AROUND QUERIES (D-2)
-- ============================================================================
-- 1) All THREE sources represented on one song (Leo's call-out)
--   SELECT label, kind, provider, coalesce(s3_key,url) AS location FROM media WHERE playable_id='sna' AND track_id IS NULL ORDER BY sort_order;
--
-- 2) A track with MULTIPLE media (drums track: stem + cam)
--   SELECT t.name AS track, m.label, m.kind, m.provider FROM media m JOIN track t ON t.id=m.track_id WHERE m.track_id='track-sna-drums' ORDER BY m.sort_order;
--
-- 3) Song-level vs per-track split
--   SELECT CASE WHEN track_id IS NULL THEN 'song-level' ELSE 'per-track' END AS scope, count(*) FROM media WHERE playable_id='sna' GROUP BY 1;
--
-- 4) Derived has_audio/has_video facets (SNA now true)
--   SELECT title, has_audio, has_video FROM playable WHERE id='sna';
--
-- 5) NH-137 — a slice (part) resolves the SOURCE song's audio via parent_id (no per-slice copy)
--   SELECT part.title AS slice, m.label AS resolved_audio, m.s3_key
--   FROM playable part JOIN media m ON m.playable_id = part.parent_id AND m.track_id IS NULL AND m.kind='audio' AND m.provider='s3'
--   WHERE part.id='sna-intro';
--
-- 6) location CHECK holds per provider (embedded has neither key nor url)
--   SELECT provider, (s3_key IS NOT NULL) AS has_key, (url IS NOT NULL) AS has_url FROM media WHERE playable_id='sna' ORDER BY provider;
-- ============================================================================


-- ============================================================================
-- D-3 · per-instrument difficulty — DECISION RATIFIED 2026-06-20 (3 layers)
-- ----------------------------------------------------------------------------
--   Difficulty is per-track (a track IS one instrument) AND per-section. THREE layers:
--     L1  playable.level (smallint)  — BROWSE HEADLINE (catalog sort); derivable from track levels.
--     L2  track.level   (smallint)   — PER-INSTRUMENT (column added to track above). "easy on guitar".
--     L3  data.sections[i].tracks[]  — PER-SECTION x PER-TRACK grid {track, level, techniques[]} (jsonb detail).
--   Curve (other axes) stays in data.difficulty{by,tiers}:  by:'fingering' -> by:'technique', by:'bpm' -> by:'tempo'.
--   INVARIANT (app-layer, NOT a DB CHECK — Postgres can't cheaply enforce ">=1 child row"):
--     EVERY playable owns >= 1 track (song/part/lesson/pattern). So instruments[] is always derived
--     and difficulty always has a track home.
--   Techniques get a HOME now (L3 cell.techniques[]); the SEARCHABLE cross-catalog technique facet
--     (reconciled with drum_profile.techniques[], Rockschool-grounded) is the FOLLOW-UP.
-- ============================================================================

-- L2 · per-instrument track levels (sna + let-it-be already have tracks from D-1) -----
UPDATE track SET level = 3 WHERE id = 'track-sna-drums';
UPDATE track SET level = 5 WHERE id = 'track-sna-guitar-lead';
UPDATE track SET level = 4 WHERE id = 'track-sna-guitar-rhythm';
UPDATE track SET level = 2 WHERE id = 'track-sna-bass';
UPDATE track SET level = 1 WHERE id = 'track-letitbe-piano';
UPDATE track SET level = 2 WHERE id = 'track-letitbe-guitar';
UPDATE track SET level = 2 WHERE id = 'track-letitbe-vocals';

-- LEAF-PATTERN per-instrument difficulty via track.level (the unified model):
-- the F chord is L3 on guitar (barre) but L1 on piano — TWO tracks over the same chord.
INSERT INTO track (id, playable_id, instrument, role, name, sort_order, level, notation_id, notation_track_index, data) VALUES
 ('track-chord-f-guitar', 'chord-f', 'guitar', NULL, 'Guitar (barre)', 1, 3, NULL, 0, '{}'),
 ('track-chord-f-piano',  'chord-f', 'keys',   NULL, 'Piano',          2, 1, NULL, 1, '{}');

-- INVARIANT demo: a LESSON is a playable, so it OWNS >= 1 track (the instrument it teaches).
INSERT INTO track (id, playable_id, instrument, role, name, sort_order, level, notation_id, notation_track_index, data) VALUES
 ('track-rock-lesson-drums', 'rock-lesson', 'drums', NULL, 'Drums', 1, 2, NULL, NULL, '{}');

-- re-run the D-1a DERIVE so the new tracks' playables get their instruments[] facet
UPDATE playable p
SET instruments = sub.instruments, updated_at = now()
FROM (SELECT playable_id, array_agg(DISTINCT instrument ORDER BY instrument) AS instruments FROM track GROUP BY playable_id) sub
WHERE p.id = sub.playable_id;

-- L3 · per-section x per-track GRID (level + techniques per cell) on SNA ---------
UPDATE playable SET data = '{
  "album":"Elephant","year":2003,
  "sections":[
    {"label":"Intro","startBar":1,"endBar":8,"tracks":[
      {"track":"track-sna-guitar-lead","level":2,"techniques":[]},
      {"track":"track-sna-drums","level":2,"techniques":[]}]},
    {"label":"Verse","startBar":9,"endBar":24,"tracks":[
      {"track":"track-sna-guitar-lead","level":3,"techniques":["palm-mute"]},
      {"track":"track-sna-bass","level":2,"techniques":[]},
      {"track":"track-sna-drums","level":3,"techniques":[]}]},
    {"label":"Chorus","startBar":25,"endBar":40,"tracks":[
      {"track":"track-sna-guitar-lead","level":5,"techniques":["palm-mute","accents"]},
      {"track":"track-sna-guitar-rhythm","level":4,"techniques":["power-chords"]},
      {"track":"track-sna-drums","level":3,"techniques":[]}]}
  ]}'::jsonb
WHERE id = 'sna';

-- Curve (renamed axes): by:'tempo' (harder faster) + by:'technique' (hands separate -> together)
UPDATE playable SET data = '{"difficulty":{"by":"tempo","tiers":[{"upTo":90,"level":1},{"upTo":140,"level":2},{"upTo":null,"level":3}]}}'::jsonb
WHERE id = 'paradiddle';
UPDATE playable SET data = '{"difficulty":{"by":"technique","tiers":[{"when":"hands separate","level":1},{"when":"hands together","level":2}]}}'::jsonb
WHERE id = 'cmaj-scale';

-- ============================================================================
-- POKE-AROUND QUERIES (D-3)
-- ============================================================================
-- 1) L2 per-instrument levels on a song (hardest first)
--   SELECT instrument, role, level FROM track WHERE playable_id='sna' ORDER BY level DESC;
--
-- 2) L2 "easy on guitar" across the catalog (uses track_instrument_level index)
--   SELECT p.title, t.level FROM track t JOIN playable p ON p.id=t.playable_id WHERE t.instrument='guitar' AND t.level<=3 ORDER BY t.level;
--
-- 3) LEAF per-instrument difficulty via track.level: F chord = guitar L3, piano L1
--   SELECT p.title, t.instrument, t.level FROM track t JOIN playable p ON p.id=t.playable_id WHERE p.id='chord-f' ORDER BY t.level;
--
-- 4) L3 per-section x per-track GRID (SNA chorus: level + techniques per cell)
--   SELECT sec->>'label' AS section, cell->>'track' AS track, cell->>'level' AS level, cell->'techniques' AS techniques
--   FROM playable p, jsonb_array_elements(p.data->'sections') sec, jsonb_array_elements(sec->'tracks') cell
--   WHERE p.id='sna' AND sec->>'label'='Chorus';
--
-- 5) Curve renames in action: by:'tempo' and by:'technique'
--   SELECT id, data->'difficulty'->>'by' AS axis, data->'difficulty'->'tiers' AS tiers FROM playable WHERE data ? 'difficulty' ORDER BY id;
--
-- 6) INVARIANT: a lesson (a playable) OWNS a track
--   SELECT p.kind, p.title, t.instrument, t.level FROM track t JOIN playable p ON p.id=t.playable_id WHERE p.id='rock-lesson';
--
-- 7) L1 headline derivable from track levels (max as the representative)
--   SELECT p.title, p.level AS headline, max(t.level) AS max_track FROM playable p JOIN track t ON t.playable_id=p.id WHERE p.id='sna' GROUP BY p.title, p.level;
-- ============================================================================
