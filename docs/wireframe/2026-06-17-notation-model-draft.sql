-- ============================================================================
-- NotationHero — UNIFIED "notation" model — DRAFT v2 (2026-06-17)
-- ----------------------------------------------------------------------------
-- A throwaway draft to SEE the shape in DBeaver, not the final spec.
-- Model (this session's brainstorm):
--   * notation = every PLAYABLE unit, kind ∈ {song, part, lesson, pattern}.
--       - song   : a whole piece (one source file)
--       - part   : a slice of a song (parent_id -> song, + bar range)  [not searchable]
--       - lesson : an ordered drill; its steps are a JUNCTION to patterns (below)
--       - pattern: a reusable building block (beat/fill/rudiment/scale/chord),
--                  playable & searchable on its own
--   * lesson_step = the ordered steps of a lesson = (lesson -> pattern) + order + bpm-ladder.
--       Same pattern can be step 1 in lesson A and step 3 in lesson B (per-lesson order).
--   * source = the bytes (an S3 file OR inline alphaTex), referenced by notations.
--   * difficulty is a CURVE in data.difficulty = { by, tiers } — driver varies by
--       instrument (drums: by 'bpm'; guitar/piano: by 'fingering'/'position').
--       A step's effective level = the pattern's curve evaluated at the step's goal_bpm.
--   * listable = is this shown in browse/search? (parts & private drafts = false).
--   * per-user SCORES live in DynamoDB keyed by the notation id (NOT in here).
--
-- DBeaver: run the whole script on a Postgres connection, then expand the schema
-- and open the "ER Diagram" tab (it reads the FKs). Re-runnable (DROP clears prior runs).
-- ============================================================================

DROP TABLE IF EXISTS lesson_step, notation_link, notation, source CASCADE;

-- ─────────────────────────────────────────────────────────────────
-- source — the raw notation bytes: an S3 file OR inline alphaTex
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE source (
  id          text PRIMARY KEY,
  format      text NOT NULL,                 -- 'gp' | 'midi' | 'alphatex' | 'xml'
  s3_key      text,                          -- set for file-backed formats
  alphatex    text,                          -- set for inline alphaTex
  checksum    text,                          -- sha256 (dedup / integrity), optional
  bytes       int,                           -- file size, optional
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_by  text,                          -- draft: FK to app_user later (NH users task)
  updated_by  text,
  CONSTRAINT source_format CHECK (format IN ('gp','midi','alphatex','xml')),
  CONSTRAINT source_one_of CHECK ((s3_key IS NOT NULL)::int + (alphatex IS NOT NULL)::int = 1)
);

-- ─────────────────────────────────────────────────────────────────
-- notation — every playable unit (song · part · lesson · pattern)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE notation (
  id             text PRIMARY KEY,
  kind           text NOT NULL,              -- song | part | lesson | pattern
  title          text NOT NULL,
  parent_id      text REFERENCES notation(id) ON DELETE CASCADE,  -- composition: part -> song
  source_id      text REFERENCES source(id)  ON DELETE RESTRICT,  -- the bytes to play
  start_bar      int,                         -- slice within source (parts)
  end_bar        int,
  sort_order     int,                         -- order of parts within a song
  listable       boolean NOT NULL DEFAULT true,  -- shown in browse/search? (parts/drafts = false)

  -- hot facets (typed, nullable per kind) ───────────────
  level          smallint,                    -- 0 = Debut .. 10  (headline level; patterns also carry data.difficulty)
  artist         text,                        -- songs (optional)
  bpm            int,                          -- songs (required), optional elsewhere
  time_signature_numerator   smallint,    -- meter numerator (e.g. 4 in 4/4)
  time_signature_denominator smallint,    -- meter denominator (note value: 1,2,4,8,16,32)
  genre          text,
  musical_key    text,                         -- pitched only
  instruments    text[],
  skill          text[],                       -- lessons (timing, independence...)
  tags           text[],
  lesson_type    text,                         -- lessons: beat|rudiment|fill|scale|chord...
  pattern_kind   text,                         -- patterns: beat|fill|rudiment|scale|chord
  family         text,                         -- pattern grouping (Rock/Funk; Roll/Diddle; major/minor)

  -- lifecycle / provenance ──────────────────────────────
  origin         text NOT NULL DEFAULT 'curated',  -- curated | user-upload
  status         text NOT NULL DEFAULT 'draft',    -- draft | published | archived
  license        text,
  has_audio      boolean NOT NULL DEFAULT false,
  has_video      boolean NOT NULL DEFAULT false,

  -- per-kind variance (NOT a dumping ground — only non-filter, nested data) ──
  data           jsonb,                        -- songs: {album,year,sections} · patterns: {difficulty:{by,tiers}}

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  created_by     text,                         -- draft: FK to app_user later (NH users task)
  updated_by     text,                         -- owner_id + app_user table still deferred

  CONSTRAINT n_kind    CHECK (kind   IN ('song','part','lesson','pattern')),
  CONSTRAINT n_status  CHECK (status IN ('draft','published','archived')),
  CONSTRAINT n_origin  CHECK (origin IN ('curated','user-upload')),
  CONSTRAINT n_level   CHECK (level IS NULL OR level BETWEEN 0 AND 10),
  CONSTRAINT n_no_self CHECK (parent_id IS NULL OR parent_id <> id),
  CONSTRAINT n_time_sig CHECK ((time_signature_numerator IS NULL AND time_signature_denominator IS NULL) OR (time_signature_numerator > 0 AND time_signature_denominator IN (1,2,4,8,16,32))),

  -- per-kind required fields (conditional CHECKs):
  CONSTRAINT n_song_bpm     CHECK (kind <> 'song' OR bpm IS NOT NULL),
  CONSTRAINT n_song_source  CHECK (kind <> 'song' OR source_id IS NOT NULL),
  CONSTRAINT n_part_parent  CHECK (kind <> 'part' OR parent_id IS NOT NULL),
  -- only a lesson (a pure container) may lack a source; song/part/pattern must be playable:
  CONSTRAINT n_needs_source CHECK (kind = 'lesson' OR source_id IS NOT NULL),
  CONSTRAINT n_slice_bars   CHECK (start_bar IS NULL OR (start_bar > 0 AND end_bar >= start_bar))
);

-- ─────────────────────────────────────────────────────────────────
-- lesson_step — the ORDERED steps of a lesson (lesson -> pattern + ladder)
-- a pattern can appear in many lessons at different sort_orders.
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE lesson_step (
  lesson_id   text NOT NULL REFERENCES notation(id) ON DELETE CASCADE,   -- the lesson
  pattern_id  text NOT NULL REFERENCES notation(id) ON DELETE RESTRICT,  -- the reusable pattern
  sort_order  int  NOT NULL,                  -- position in THIS lesson
  start_bpm   int,                            -- this lesson's practice ladder for this pattern
  goal_bpm    int,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lesson_id, pattern_id),
  UNIQUE (lesson_id, sort_order),
  CONSTRAINT ls_no_self CHECK (lesson_id <> pattern_id),
  CONSTRAINT ls_ladder  CHECK (start_bpm IS NULL OR goal_bpm IS NULL OR goal_bpm >= start_bpm)
  -- app-enforced: lesson_id.kind='lesson' AND pattern_id.kind='pattern' (CHECK can't see other rows)
);

-- ─────────────────────────────────────────────────────────────────
-- notation_link — lightweight references (e.g. a SONG 'uses' a groove PATTERN)
-- ('teaches' is now lesson_step; this stays for 'uses' & friends — parked w/ taxonomy)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE notation_link (
  from_id   text NOT NULL REFERENCES notation(id) ON DELETE CASCADE,
  to_id     text NOT NULL REFERENCES notation(id) ON DELETE CASCADE,
  relation  text NOT NULL,                    -- 'uses' | 'fill-fits-beat' ...
  PRIMARY KEY (from_id, to_id, relation),
  CONSTRAINT nl_no_self CHECK (from_id <> to_id)
);

-- ─────────────────────────────────────────────────────────────────
-- indexes
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX notation_parent    ON notation (parent_id);
CREATE INDEX notation_source    ON notation (source_id);
CREATE INDEX notation_browse    ON notation (kind, status, level, bpm) WHERE listable;  -- the catalog list
CREATE INDEX notation_gin_instr ON notation USING gin (instruments);
CREATE INDEX ls_by_pattern      ON lesson_step (pattern_id);   -- "which lessons use this pattern?"
CREATE INDEX notation_link_to   ON notation_link (to_id);

-- ============================================================================
-- SAMPLE DATA  (deliberately broad — drums + piano, reuse, drafts, difficulty curves)
-- ============================================================================

-- sources --------------------------------------------------------------------
INSERT INTO source (id, format, s3_key, alphatex, bytes) VALUES
  ('src-yellow-gp',  'gp',       'catalogue/yellow/source.gp', NULL, 48213),
  ('src-hihat-8',    'alphatex', NULL, ':8 x x x x x x x x', NULL),
  ('src-rock8-kick', 'alphatex', NULL, ':8 (x.36) x (x.36) x (x.36) x (x.36) x', NULL),
  ('src-rock8-full', 'alphatex', NULL, ':8 (x.42 x.36) x (x.42 x.38) x', NULL),
  ('src-paradiddle', 'alphatex', NULL, 'R L R R  L R L L', NULL),
  ('src-tom-fill',   'alphatex', NULL, ':16 38 40 43 45', NULL),
  ('src-cmaj-scale', 'alphatex', NULL, 'C4 D4 E4 F4 G4 A4 B4 C5', NULL),
  ('src-gmaj-scale', 'alphatex', NULL, 'G4 A4 B4 C5 D5 E5 F#5 G5', NULL),
  ('src-user-loop',  'gp',       'quarantine/u-123/loop.gp', NULL, 9210);

-- SONG + its PARTS (parts are notations, but listable=false -> hidden from search)
INSERT INTO notation (id, kind, title, parent_id, source_id, start_bar, end_bar, sort_order,
                      listable, level, artist, bpm, time_signature_numerator, time_signature_denominator, genre, instruments,
                      origin, status, license, data) VALUES
 ('yellow',        'song', 'Yellow',  NULL,     'src-yellow-gp', NULL, NULL, NULL,
   true,  3, 'Coldplay', 86, 4, 4, 'rock', '{guitar,drums}', 'curated', 'published', 'royalty-free',
   '{"album":"Parachutes","year":2000,"sections":[{"label":"Intro","startBar":1,"endBar":4},{"label":"Chorus","startBar":17,"endBar":24}]}'),
 ('yellow-intro',  'part', 'Intro',   'yellow', 'src-yellow-gp', 1,  4,  1,
   false, NULL, NULL, 86, 4, 4, NULL, '{guitar,drums}', 'curated', 'published', NULL, NULL),
 ('yellow-chorus', 'part', 'Chorus',  'yellow', 'src-yellow-gp', 17, 24, 2,
   false, NULL, NULL, 86, 4, 4, NULL, '{guitar,drums}', 'curated', 'published', NULL, NULL);

-- LESSONS (containers; their steps are lesson_step rows below) -----------------
INSERT INTO notation (id, kind, title, level, instruments, skill, lesson_type, genre, origin, status, listable, data) VALUES
 ('rock8-beat',  'lesson', '8th-Note Rock Beat', 1, '{drums}', '{timing,coordination}', 'beat',  'rock', 'curated', 'published', true,
   '{"description":"The everyday rock groove, built one limb at a time."}'),
 ('funk-groove', 'lesson', 'Funk Groove 1',      2, '{drums}', '{independence}',         'beat',  'funk', 'curated', 'published', true, NULL),
 ('major-scales','lesson', 'Major Scales (RH)',  2, '{keys}',  '{technique}',            'scale', NULL,   'curated', 'published', true, NULL);

-- PATTERNS (reusable building blocks; playable & searchable on their own) ------
INSERT INTO notation (id, kind, title, source_id, level, instruments, musical_key, pattern_kind, family, genre, origin, status, listable, data) VALUES
 ('hihat-8',     'pattern', 'Straight 8th Hi-hats', 'src-hihat-8',    1, '{drums}', NULL, 'beat',     'Rock',   'rock', 'curated', 'published', true,
   '{"difficulty":{"by":"bpm","tiers":[{"upTo":90,"level":1},{"upTo":140,"level":2},{"upTo":null,"level":3}]}}'),
 ('rock8-kick',  'pattern', 'Rock Kick Pattern',    'src-rock8-kick', 1, '{drums}', NULL, 'beat',     'Rock',   'rock', 'curated', 'published', true, NULL),
 ('rock8-full',  'pattern', '8th-Note Rock Groove', 'src-rock8-full', 2, '{drums}', NULL, 'beat',     'Rock',   'rock', 'curated', 'published', true,
   '{"difficulty":{"by":"bpm","tiers":[{"upTo":80,"level":2},{"upTo":120,"level":3},{"upTo":null,"level":4}]}}'),
 ('paradiddle',  'pattern', 'Single Paradiddle',    'src-paradiddle', 2, '{drums}', NULL, 'rudiment', 'Diddle', NULL,   'curated', 'published', true, NULL),
 ('tom-fill-1',  'pattern', 'Descending Tom Fill',  'src-tom-fill',   2, '{drums}', NULL, 'fill',     'Tom',    NULL,   'curated', 'published', true, NULL),
 ('cmaj-scale',  'pattern', 'C Major Scale',        'src-cmaj-scale', 1, '{keys}',  'C',  'scale',    'major',  NULL,   'curated', 'published', true,
   '{"difficulty":{"by":"fingering","tiers":[{"when":"hands separate","level":1},{"when":"hands together","level":2}]}}'),
 ('gmaj-scale',  'pattern', 'G Major Scale',        'src-gmaj-scale', 1, '{keys}',  'G',  'scale',    'major',  NULL,   'curated', 'published', true, NULL);

-- a USER-UPLOAD draft (private: origin=user-upload, status=draft, listable=false)
INSERT INTO notation (id, kind, title, source_id, instruments, pattern_kind, origin, status, listable, created_by) VALUES
 ('u123-loop', 'pattern', 'My practice loop', 'src-user-loop', '{drums}', 'beat', 'user-upload', 'draft', false, 'user-123');

-- LESSON STEPS (the ordered junction) -----------------------------------------
-- note: hihat-8 is step 1 in rock8-beat but step 2 in funk-groove (per-lesson order!)
INSERT INTO lesson_step (lesson_id, pattern_id, sort_order, start_bpm, goal_bpm) VALUES
 ('rock8-beat',  'hihat-8',    1, 60, 120),
 ('rock8-beat',  'rock8-kick', 2, 60, 120),
 ('rock8-beat',  'rock8-full', 3, 60, 120),
 ('funk-groove', 'rock8-kick', 1, 70, 130),
 ('funk-groove', 'hihat-8',    2, 70, 130),
 ('major-scales','cmaj-scale', 1, NULL, NULL),
 ('major-scales','gmaj-scale', 2, NULL, NULL);

-- LINKS: the song USES the groove pattern -------------------------------------
INSERT INTO notation_link (from_id, to_id, relation) VALUES
 ('yellow', 'rock8-full', 'uses');

-- ============================================================================
-- POKE-AROUND QUERIES (try these in DBeaver)
-- ============================================================================
-- the catalog browse list (only listable, top-level kinds):
--   SELECT id, kind, title, level, lesson_type, pattern_kind FROM notation
--   WHERE listable AND status='published' ORDER BY kind, title;
-- a lesson's ordered steps (junction -> pattern):
--   SELECT s.sort_order, p.title, s.start_bpm, s.goal_bpm
--   FROM lesson_step s JOIN notation p ON p.id = s.pattern_id
--   WHERE s.lesson_id = 'rock8-beat' ORDER BY s.sort_order;
-- THE REUSE PROOF — same pattern, different order per lesson:
--   SELECT pattern_id, lesson_id, sort_order FROM lesson_step
--   WHERE pattern_id = 'hihat-8' ORDER BY lesson_id;
-- which lessons use a pattern:
--   SELECT lesson_id FROM lesson_step WHERE pattern_id = 'rock8-kick';
-- a pattern's difficulty curve (per-kind variance in JSONB):
--   SELECT id, data->'difficulty' FROM notation WHERE data ? 'difficulty';
