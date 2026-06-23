-- ============================================================================
-- NotationHero — UNIFIED "Playable" content model — DRAFT v3 (2026-06-17)
-- ----------------------------------------------------------------------------
-- A throwaway draft to SEE the locked shape in DBeaver, not the final spec.
-- LOCKED MODEL (this session — see docs/wireframe/model-map.html):
--   * playable = every playable unit; kind ∈ {song, part, lesson, pattern}.
--       `kind` is the ROLE; the shape is shared.
--       - song    : a whole piece (usually one notation/score)
--       - part    : a slice of a song (parent_id -> song, + bar range) [not listable]
--       - lesson  : something to learn — may play whole (own score) AND have steps
--       - pattern : a reusable block (beat/fill/rudiment/scale/chord/groove);
--                   LEAF (its own notation) or COMPOSITE (its own steps)
--   * notation = the SCORE: the bytes (an S3 file OR inline alphaTex).  (was `source`)
--       A playable points at it via notation_id when it plays whole.
--   * step = ONE self-referencing junction (was `lesson_step`): parent playable
--       -> child playable + order + bpm ladder. Shared by lessons AND composite
--       patterns. PK (parent_id, sort_order) so the SAME child may repeat
--       (e.g. a paradiddle drill at slow / medium / fast).
--   * Per-user SCORE lives in DynamoDB keyed by the playable id — EVERY playable
--       (song, part, pattern, lesson) is scored on its OWN id; a lesson's score is
--       its whole-play, NEVER an average of steps. (NOT in this DB.)
--   * difficulty is a CURVE in data.difficulty = { by, tiers } on a pattern.
--   * listable = shown in browse/search? (parts & private drafts = false).
--
-- Renames vs draft v2:  notation(umbrella) -> playable ;  source -> notation ;
--   lesson_step -> step (self-ref) ;  alphatex -> notation_alphaTex.
-- DBeaver: run the whole script on a Postgres connection, open the "ER Diagram"
-- tab (reads the FKs). Re-runnable (DROP clears prior runs).
-- ============================================================================

DROP TABLE IF EXISTS step, playable_link, playable, notation CASCADE;

-- ─────────────────────────────────────────────────────────────────
-- notation — the SCORE: the raw bytes (an S3 file OR inline alphaTex)
-- (was `source`)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE notation (
  id                text PRIMARY KEY,
  format            text NOT NULL,             -- 'gp' | 'midi' | 'alphatex' | 'xml'
  s3_key            text,                      -- set for file-backed formats
  notation_alphaTex text,                      -- set for inline alphaTex (canonical name: notation_alphaTex)
  checksum          text,                      -- sha256 (dedup / integrity), optional
  bytes             int,                       -- file size, optional
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_by        text,                      -- draft: FK to app_user later (NH users task)
  updated_by        text,
  CONSTRAINT notation_format CHECK (format IN ('gp','midi','alphatex','xml')),
  CONSTRAINT notation_one_of CHECK ((s3_key IS NOT NULL)::int + (notation_alphaTex IS NOT NULL)::int = 1)
);

-- ─────────────────────────────────────────────────────────────────
-- playable — every playable unit (song · part · lesson · pattern)
-- (was `notation`)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE playable (
  id             text PRIMARY KEY,
  kind           text NOT NULL,                 -- song | part | lesson | pattern  (the ROLE)
  title          text NOT NULL,
  parent_id      text REFERENCES playable(id) ON DELETE CASCADE,  -- composition: part -> song
  notation_id    text REFERENCES notation(id) ON DELETE RESTRICT, -- the score to play whole (nullable)
  start_bar      int,                           -- slice within the score (parts)
  end_bar        int,
  sort_order     int,                           -- order of parts within a song

  listable       boolean NOT NULL DEFAULT true, -- shown in browse/search? (parts/drafts = false)

  -- hot facets (typed, nullable per kind) ───────────────
  level          smallint,                      -- 0 = Debut .. 10 (headline; patterns also carry data.difficulty)
  artist         text,                          -- songs (optional)
  bpm            int,                           -- songs (required); optional elsewhere
  time_signature_numerator   smallint,          -- meter numerator (e.g. 4 in 4/4)
  time_signature_denominator smallint,          -- meter denominator (1,2,4,8,16,32)
  genre          text,
  musical_key    text,                          -- pitched only
  instruments    text[],
  skill          text[],                        -- lessons (timing, independence...)
  tags           text[],
  pattern_kind   text,                          -- patterns: beat|fill|rudiment|scale|chord
  family         text,                          -- pattern grouping (Rock/Funk; Diddle; major/minor)
  -- NOTE: `lesson_type` intentionally DROPPED — a lesson's "kind" derives from the
  --       patterns its steps reference (open Q in model-map; revisit in spec pass).

  -- lifecycle / provenance ──────────────────────────────
  origin         text NOT NULL DEFAULT 'curated',  -- curated | user-upload
  status         text NOT NULL DEFAULT 'draft',    -- draft | published | archived
  license        text,
  has_audio      boolean NOT NULL DEFAULT false,
  has_video      boolean NOT NULL DEFAULT false,

  -- per-kind variance (only non-filter, nested data) ────
  data           jsonb,                          -- songs:{album,year,sections} · patterns:{difficulty:{by,tiers}} · lessons:{passMark,...}

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  created_by     text,                           -- draft: FK to app_user later (NH users task)
  updated_by     text,

  CONSTRAINT p_kind    CHECK (kind   IN ('song','part','lesson','pattern')),
  CONSTRAINT p_status  CHECK (status IN ('draft','published','archived')),
  CONSTRAINT p_origin  CHECK (origin IN ('curated','user-upload')),
  CONSTRAINT p_level   CHECK (level IS NULL OR level BETWEEN 0 AND 10),
  CONSTRAINT p_no_self CHECK (parent_id IS NULL OR parent_id <> id),
  CONSTRAINT p_time_sig CHECK ((time_signature_numerator IS NULL AND time_signature_denominator IS NULL) OR (time_signature_numerator > 0 AND time_signature_denominator IN (1,2,4,8,16,32))),

  -- per-kind required fields (conditional CHECKs):
  CONSTRAINT p_song_bpm     CHECK (kind <> 'song' OR bpm IS NOT NULL),
  CONSTRAINT p_part_parent  CHECK (kind <> 'part' OR parent_id IS NOT NULL),
  -- song & part must play whole (need a score). lesson & pattern MAY rely on steps:
  CONSTRAINT p_needs_score  CHECK (kind IN ('lesson','pattern') OR notation_id IS NOT NULL),
  CONSTRAINT p_slice_bars   CHECK (start_bar IS NULL OR (start_bar > 0 AND end_bar >= start_bar))
  -- app-enforced: a LEAF pattern (no steps) needs notation_id; a COMPOSITE pattern /
  --   lesson may set notation_id (whole-play) OR be defined purely by its steps.
);

-- ─────────────────────────────────────────────────────────────────
-- step — ORDERED self-referencing junction (parent playable -> child playable)
-- (was `lesson_step`) — shared by lessons AND composite patterns.
-- PK (parent_id, sort_order): the SAME child may appear at several positions.
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE step (
  parent_id   text NOT NULL REFERENCES playable(id) ON DELETE CASCADE,   -- the lesson / composite
  child_id    text NOT NULL REFERENCES playable(id) ON DELETE RESTRICT,  -- the (reusable) pattern
  sort_order  int  NOT NULL,                  -- position in THIS parent
  start_bpm   int,                            -- this parent's practice ladder for this child
  goal_bpm    int,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_id, sort_order),        -- order unique per parent; child may repeat
  CONSTRAINT step_no_self CHECK (parent_id <> child_id),
  CONSTRAINT step_ladder  CHECK (start_bpm IS NULL OR goal_bpm IS NULL OR goal_bpm >= start_bpm)
  -- app-enforced: parent_id.kind IN ('lesson','pattern') (CHECK can't see other rows).
);

-- ─────────────────────────────────────────────────────────────────
-- playable_link — lightweight references (a SONG 'uses' a groove; a FILL 'uses'
-- a rudiment). (was `notation_link`)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE playable_link (
  from_id   text NOT NULL REFERENCES playable(id) ON DELETE CASCADE,
  to_id     text NOT NULL REFERENCES playable(id) ON DELETE CASCADE,
  relation  text NOT NULL,                    -- 'uses' | 'fill-fits-beat' ...
  PRIMARY KEY (from_id, to_id, relation),
  CONSTRAINT pl_no_self CHECK (from_id <> to_id)
);

-- ─────────────────────────────────────────────────────────────────
-- indexes
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX playable_parent    ON playable (parent_id);
CREATE INDEX playable_notation  ON playable (notation_id);
CREATE INDEX playable_browse    ON playable (kind, status, level, bpm) WHERE listable;  -- the catalog list
CREATE INDEX playable_gin_instr ON playable USING gin (instruments);
CREATE INDEX step_by_child      ON step (child_id);   -- "which playables use this pattern?"
CREATE INDEX playable_link_to   ON playable_link (to_id);

-- ============================================================================
-- SAMPLE DATA  (songs+parts, leaf+composite patterns, reuse, slow/med/fast, drafts)
-- ============================================================================

-- NOTATIONS (scores) ----------------------------------------------------------
INSERT INTO notation (id, format, s3_key, notation_alphaTex, bytes) VALUES
  ('n-sna-gp',     'gp',       'catalog/sna/source.gp', NULL, 51200),
  ('n-hihat-8',    'alphatex', NULL, ':8 x x x x x x x x', NULL),
  ('n-rock8-kick', 'alphatex', NULL, ':8 (x.36) x (x.36) x (x.36) x (x.36) x', NULL),
  ('n-single4',    'alphatex', NULL, 'R R R R  L L L L', NULL),
  ('n-paradiddle', 'alphatex', NULL, 'R L R R  L R L L', NULL),
  ('n-tom-fill',   'alphatex', NULL, ':16 38 40 43 45', NULL),
  ('n-groove-g',   'alphatex', NULL, ':8 (x.42 x.36) x (x.42 x.38) x', NULL),  -- whole-play of the groove
  ('n-cmaj-scale', 'alphatex', NULL, 'C4 D4 E4 F4 G4 A4 B4 C5', NULL),
  ('n-gmaj-scale', 'alphatex', NULL, 'G4 A4 B4 C5 D5 E5 F#5 G5', NULL),
  ('n-rock-exam',  'alphatex', NULL, ':8 (x.42 x.36) (x.38) (x.42 x.36) (x.38)', NULL);  -- a lesson's whole-play

-- SONG + its PARTS (parts are playables, listable=false -> hidden from search) -
INSERT INTO playable (id, kind, title, parent_id, notation_id, start_bar, end_bar, sort_order,
                      listable, level, artist, bpm, time_signature_numerator, time_signature_denominator, genre, instruments,
                      origin, status, license, data) VALUES
 ('sna',        'song', 'Seven Nation Army', NULL, 'n-sna-gp', NULL, NULL, NULL,
   true,  2, 'The White Stripes', 124, 4, 4, 'rock', '{drums,guitar}', 'curated', 'published', 'royalty-free',
   '{"album":"Elephant","year":2003,"sections":[{"label":"Intro","startBar":1,"endBar":8},{"label":"Verse","startBar":9,"endBar":24},{"label":"Chorus","startBar":25,"endBar":40}]}'),
 ('sna-intro',  'part', 'Intro',  'sna', 'n-sna-gp', 1,  8,  1, false, NULL, NULL, 124, 4, 4, NULL, '{drums,guitar}', 'curated', 'published', NULL, NULL),
 ('sna-verse',  'part', 'Verse',  'sna', 'n-sna-gp', 9,  24, 2, false, NULL, NULL, 124, 4, 4, NULL, '{drums,guitar}', 'curated', 'published', NULL, NULL),
 ('sna-chorus', 'part', 'Chorus', 'sna', 'n-sna-gp', 25, 40, 3, false, NULL, NULL, 124, 4, 4, NULL, '{drums,guitar}', 'curated', 'published', NULL, NULL);

-- LEAF PATTERNS (reusable building blocks; their own notation) -----------------
INSERT INTO playable (id, kind, title, notation_id, level, instruments, musical_key, pattern_kind, family, genre, origin, status, listable, data) VALUES
 ('hihat-8',    'pattern', 'Straight 8th Hi-hats', 'n-hihat-8',    1, '{drums}', NULL, 'beat',     'Rock',   'rock', 'curated', 'published', true,
   '{"difficulty":{"by":"bpm","tiers":[{"upTo":90,"level":1},{"upTo":140,"level":2},{"upTo":null,"level":3}]}}'),
 ('rock8-kick', 'pattern', 'Rock Kick Pattern',    'n-rock8-kick', 1, '{drums}', NULL, 'beat',     'Rock',   'rock', 'curated', 'published', true, NULL),
 ('single4',    'pattern', 'Single Stroke Four',   'n-single4',    1, '{drums}', NULL, 'rudiment', 'Stroke', NULL,   'curated', 'published', true, NULL),
 ('paradiddle', 'pattern', 'Single Paradiddle',    'n-paradiddle', 2, '{drums}', NULL, 'rudiment', 'Diddle', NULL,   'curated', 'published', true, NULL),
 ('tom-fill',   'pattern', 'Descending Tom Fill',  'n-tom-fill',   2, '{drums}', NULL, 'fill',     'Tom',    NULL,   'curated', 'published', true, NULL),
 ('cmaj-scale', 'pattern', 'C Major Scale',        'n-cmaj-scale', 1, '{keys}',  'C',  'scale',    'major',  NULL,   'curated', 'published', true,
   '{"difficulty":{"by":"fingering","tiers":[{"when":"hands separate","level":1},{"when":"hands together","level":2}]}}'),
 ('gmaj-scale', 'pattern', 'G Major Scale',        'n-gmaj-scale', 1, '{keys}',  'G',  'scale',    'major',  NULL,   'curated', 'published', true, NULL);

-- COMPOSITE PATTERN: a groove that HAS its own steps AND a whole-play notation --
INSERT INTO playable (id, kind, title, notation_id, level, instruments, pattern_kind, family, genre, origin, status, listable) VALUES
 ('groove-g', 'pattern', 'Rock Groove (full)', 'n-groove-g', 3, '{drums}', 'beat', 'Rock', 'rock', 'curated', 'published', true);

-- LESSONS (kind=lesson) — one with a whole-play "final exam", one defined by steps
INSERT INTO playable (id, kind, title, notation_id, level, instruments, skill, genre, origin, status, listable, data) VALUES
 ('rock-lesson', 'lesson', 'Play a Rock Song', 'n-rock-exam', 2, '{drums}', '{timing,coordination}', 'rock', 'curated', 'published', true,
   '{"passMark":80,"description":"Build the groove one block at a time, then play it whole."}'),
 ('funk-lesson', 'lesson', 'Funk Groove 1',    NULL,         3, '{drums}', '{independence}',         'funk', 'curated', 'published', true,
   '{"passMark":80}'),
 ('para-drill',  'lesson', 'Single Paradiddle — speed ladder', NULL, 2, '{drums}', '{control}',      NULL,   'curated', 'published', true,
   '{"passMark":80}');

-- a USER-UPLOAD draft (private: origin=user-upload, status=draft, listable=false)
INSERT INTO playable (id, kind, title, notation_id, instruments, pattern_kind, origin, status, listable, created_by) VALUES
 ('u123-loop', 'pattern', 'My practice loop', 'n-rock8-kick', '{drums}', 'beat', 'user-upload', 'draft', false, 'user-123');

-- STEPS (the ordered self-referencing junction) -------------------------------
-- rock-lesson: rudiment -> kick -> the composite groove  (Leo's worked example)
INSERT INTO step (parent_id, child_id, sort_order, start_bpm, goal_bpm) VALUES
 ('rock-lesson', 'single4',    1, 60, 110),
 ('rock-lesson', 'rock8-kick', 2, 60, 120),
 ('rock-lesson', 'groove-g',   3, 70, 124),
 -- groove-g is COMPOSITE: it has its OWN steps (reusing leaf patterns)
 ('groove-g',    'hihat-8',    1, 70, 124),
 ('groove-g',    'rock8-kick', 2, 70, 124),
 -- funk-lesson REUSES rock8-kick + hihat-8 at a different order (reuse across lessons)
 ('funk-lesson', 'rock8-kick', 1, 70, 130),
 ('funk-lesson', 'hihat-8',    2, 70, 130),
 -- para-drill: the SAME pattern at three positions (slow / medium / fast)
 ('para-drill',  'paradiddle', 1, 40, 60),
 ('para-drill',  'paradiddle', 2, 60, 100),
 ('para-drill',  'paradiddle', 3, 100, 160);

-- LINKS: a song USES a groove; a fill USES a rudiment (optional pattern->pattern)
INSERT INTO playable_link (from_id, to_id, relation) VALUES
 ('sna', 'groove-g', 'uses'),
 ('tom-fill', 'single4', 'uses');

-- ============================================================================
-- POKE-AROUND QUERIES (try these in DBeaver)
-- ============================================================================
-- the catalog browse list (only listable, top-level kinds):
--   SELECT id, kind, title, level, pattern_kind FROM playable
--   WHERE listable AND status='published' ORDER BY kind, title;
-- a song's parts (composition via parent_id):
--   SELECT id, title, start_bar, end_bar FROM playable WHERE parent_id='sna' ORDER BY sort_order;
-- a parent's ordered steps (junction -> child playable):
--   SELECT s.sort_order, c.title, s.start_bpm, s.goal_bpm
--   FROM step s JOIN playable c ON c.id=s.child_id
--   WHERE s.parent_id='rock-lesson' ORDER BY s.sort_order;
-- REUSE PROOF — same child across different parents, different order:
--   SELECT child_id, parent_id, sort_order FROM step WHERE child_id='rock8-kick' ORDER BY parent_id, sort_order;
-- SAME-CHILD-REPEATS PROOF — a pattern at slow/med/fast in one lesson:
--   SELECT parent_id, sort_order, child_id, start_bpm, goal_bpm FROM step WHERE parent_id='para-drill' ORDER BY sort_order;
-- COMPOSITE PATTERN — a pattern that itself has steps:
--   SELECT s.sort_order, c.title FROM step s JOIN playable c ON c.id=s.child_id WHERE s.parent_id='groove-g' ORDER BY s.sort_order;
-- a pattern's difficulty curve (per-kind variance in JSONB):
--   SELECT id, data->'difficulty' FROM playable WHERE data ? 'difficulty';

-- ============================================================================
-- ROUND-6 OPEN QUESTIONS (2026-06-18) — sketches for the spec pass. NOT created above.
-- ============================================================================
-- (1) TRACKS — replace the flat playable.instruments text[] with a track relation.
--     A song has N tracks; MULTIPLE tracks may share an instrument (guitar 'solo' + guitar 'bass').
--   CREATE TABLE track (
--     id          text PRIMARY KEY,
--     playable_id text NOT NULL REFERENCES playable(id) ON DELETE CASCADE,
--     instrument  text NOT NULL,         -- 'drums' | 'guitar' | 'keys' | 'bass' | ...
--     role        text,                  -- 'solo' | 'rhythm' | 'lead' | 'bass' | 'pad' …  (disambiguates same instrument)
--     name        text,                  -- optional display label
--     sort_order  int
--   );
--   -- KEEP a denormalised playable.instruments text[] (DISTINCT instrument across tracks) for the FAST
--   -- catalog filter (instruments @> ARRAY[$1]); the track table holds the detail. So the "rename" is a SPLIT.
--   -- Open: is 'bass' a guitar role OR its own instrument? per-instrument difficulty per-track or by-instrument curve?
--
-- (2) MEDIA — multi-level (playable-level + per-track).
--   CREATE TABLE media (
--     id          text PRIMARY KEY,
--     playable_id text NOT NULL REFERENCES playable(id) ON DELETE CASCADE,
--     track_id    text REFERENCES track(id) ON DELETE CASCADE,   -- NULL = song-level media
--     kind        text NOT NULL,         -- 'audio' | 'video'
--     provider    text, url text, label text, sort_order int
--   );
--
-- (3) PER-INSTRUMENT DIFFICULTY — a single scalar playable.level is INSUFFICIENT (CMaj6 / F-barre is hard on
--     guitar, easy on piano). Options: playable.level_by_instrument jsonb, OR a per-track level, OR a
--     data.difficulty(by:'instrument', tiers:[{when:'piano',level},{when:'guitar',level}]) curve (used in the wireframe).
--
-- (4) CHORD / PROGRESSION — a chord = LEAF pattern (pattern_kind='chord'); a chord PROGRESSION = a COMPOSITE
--     pattern whose `step`s ARE the chords (same shape as a composite groove — NO new table). Open: store the
--     abstract roman-numeral progression (I–V–vi–IV) once + derive concrete chords per key, OR one composite per
--     key. Songs USE progressions via playable_link / the patterns m:n.
-- ============================================================================
