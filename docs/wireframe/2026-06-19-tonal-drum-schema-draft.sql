-- ============================================================================
-- NotationHero — Tonal + Drum extensible schema — DRAFT v4 (2026-06-19)
-- ----------------------------------------------------------------------------
-- Adds the two per-domain side-tables to the locked Playable model so drums
-- carry zero tonal NULLs and the catalogue is searchable by chords / progressions
-- / scales (pitched) and beats / fills / rudiments / techniques (drums).
--
-- Spec: docs/wireframe/2026-06-19-tonal-drum-extensible-schema-spec.md
-- Companion (interactive): /tmp/nh-tonal/index.html
--
-- NAMING: fully spelled-out (no abbreviations) per Leo. progression_* (not prog_*),
--   time_signature_* (not time_sig), "timeSignature"/"progression" jsonb keys,
--   index names spell the column. Inherited v3 CHECK-constraint names keep their
--   conventional prefixes (p_ = playable, pl_ = playable_link) — expandable on request.
--
-- CHANGES vs v3 (2026-06-17-notation-model-draft.sql):
--   * playable.musical_key  REMOVED  -> moved to tonal_profile (D2). No more
--     nullable key on drum rows.
--   * NEW  tonal_profile (pitched-only, 1:0..1) — musical_key, keys[], scales[],
--     chords[], progression_concrete[], progression_roman[], progression_family[], data jsonb.
--   * NEW  drum_profile  (drums-only, 1:0..1)   — beats[], fills[], rudiments[],
--     techniques[], kit_pieces[], data jsonb.
--   * data.sections[] gains optional per-section {key, scale, bpm, timeSignature, progression}
--     (the multi-key / multi-tempo / multi-meter timeline — D6).
--
-- Re-runnable (DROP clears prior runs). Open the DBeaver "ER Diagram" tab.
-- text PKs here are human slugs for readability; real schema uses ULIDs (R13).
-- ============================================================================

DROP TABLE IF EXISTS tonal_profile, drum_profile, step, playable_link, playable, notation CASCADE;

-- ─────────────────────────────────────────────────────────────────
-- notation — the SCORE (S3 file OR inline alphaTex)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE notation (
  id                text PRIMARY KEY,
  format            text NOT NULL,
  s3_key            text,                          -- object key in the AWS S3 bucket
  notation_alphatex text,
  checksum          text,
  bytes             int,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_by        text,
  updated_by        text,
  CONSTRAINT notation_format CHECK (format IN ('gp','midi','alphatex','xml')),
  CONSTRAINT notation_one_of CHECK ((s3_key IS NOT NULL)::int + (notation_alphatex IS NOT NULL)::int = 1)
);

-- ─────────────────────────────────────────────────────────────────
-- playable — every playable unit (song · part · lesson · pattern)
--   (musical_key REMOVED — now on tonal_profile)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE playable (
  id             text PRIMARY KEY,
  kind           text NOT NULL,
  title          text NOT NULL,
  parent_id      text REFERENCES playable(id) ON DELETE CASCADE,
  notation_id    text REFERENCES notation(id) ON DELETE RESTRICT,
  start_bar      int,
  end_bar        int,
  sort_order     int,
  listable       boolean NOT NULL DEFAULT true,

  -- hot facets (universal; typed) ───────────────────────
  level          smallint,
  artist         text,
  bpm            int,                                -- headline beats-per-minute (full timeline in data.sections)
  time_signature_numerator   smallint,              -- headline meter numerator (e.g. 4 in 4/4)
  time_signature_denominator smallint,              -- headline meter denominator (1,2,4,8,16,32)
  genre          text,
  instruments    text[],
  skill          text[],
  tags           text[],
  pattern_kind   text,                              -- beat|fill|rudiment|scale|chord|progression
  family         text,

  -- lifecycle / provenance ──────────────────────────────
  origin         text NOT NULL DEFAULT 'curated',
  status         text NOT NULL DEFAULT 'draft',
  license        text,
  has_audio      boolean NOT NULL DEFAULT false,
  has_video      boolean NOT NULL DEFAULT false,

  -- per-kind nested data (incl. the sections timeline) ──
  data           jsonb,

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  created_by     text,
  updated_by     text,

  CONSTRAINT p_kind    CHECK (kind   IN ('song','part','lesson','pattern')),
  CONSTRAINT p_status  CHECK (status IN ('draft','published','archived')),
  CONSTRAINT p_origin  CHECK (origin IN ('curated','user-upload')),
  CONSTRAINT p_level   CHECK (level IS NULL OR level BETWEEN 0 AND 10),
  CONSTRAINT p_no_self CHECK (parent_id IS NULL OR parent_id <> id),
  CONSTRAINT p_time_signature CHECK ((time_signature_numerator IS NULL AND time_signature_denominator IS NULL) OR (time_signature_numerator > 0 AND time_signature_denominator IN (1,2,4,8,16,32))),
  CONSTRAINT p_song_bpm    CHECK (kind <> 'song' OR bpm IS NOT NULL),
  CONSTRAINT p_part_parent CHECK (kind <> 'part' OR parent_id IS NOT NULL),
  CONSTRAINT p_needs_score CHECK (kind IN ('lesson','pattern') OR notation_id IS NOT NULL),
  CONSTRAINT p_slice_bars  CHECK (start_bar IS NULL OR (start_bar > 0 AND end_bar >= start_bar))
);

-- ─────────────────────────────────────────────────────────────────
-- step — ordered self-referencing junction (parent -> child playable)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE step (
  parent_id   text NOT NULL REFERENCES playable(id) ON DELETE CASCADE,
  child_id    text NOT NULL REFERENCES playable(id) ON DELETE RESTRICT,
  sort_order  int  NOT NULL,
  start_bpm   int,
  goal_bpm    int,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_id, sort_order),
  CONSTRAINT step_no_self CHECK (parent_id <> child_id),
  CONSTRAINT step_ladder  CHECK (start_bpm IS NULL OR goal_bpm IS NULL OR goal_bpm >= start_bpm)
);

-- ─────────────────────────────────────────────────────────────────
-- playable_link — lightweight refs (a SONG 'uses' a progression / groove)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE playable_link (
  from_id   text NOT NULL REFERENCES playable(id) ON DELETE CASCADE,
  to_id     text NOT NULL REFERENCES playable(id) ON DELETE CASCADE,
  relation  text NOT NULL,
  PRIMARY KEY (from_id, to_id, relation),
  CONSTRAINT pl_no_self CHECK (from_id <> to_id)
);

-- ─────────────────────────────────────────────────────────────────
-- tonal_profile — PITCHED-only attributes (1:0..1). Drums never get a row.
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE tonal_profile (
  playable_id          text PRIMARY KEY REFERENCES playable(id) ON DELETE CASCADE,
  musical_key          text,                        -- headline 'C major','G mixolydian'
  keys                 text[] NOT NULL DEFAULT '{}',-- every key touched (modulation) → multi-key search
  scales               text[] NOT NULL DEFAULT '{}',-- 'minor pentatonic','blues',…    → S3
  chords               text[] NOT NULL DEFAULT '{}',-- distinct concrete chords        → S1 (<@)
  progression_concrete text[] NOT NULL DEFAULT '{}',-- 'C-G-Am-F'    → S2 mode A (exact, same key)
  progression_roman    text[] NOT NULL DEFAULT '{}',-- 'I-V-vi-IV'   → S2 mode B (any key / transpose)
  progression_family   text[] NOT NULL DEFAULT '{}',-- rotation-normalised roman → S2 mode C (loop)
  data                 jsonb  NOT NULL DEFAULT '{}',-- {mode, borrowed[], modulation[], per-section tonal}
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────
-- drum_profile — DRUMS-only attributes (1:0..1). Pitched-only never gets a row.
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE drum_profile (
  playable_id   text PRIMARY KEY REFERENCES playable(id) ON DELETE CASCADE,
  beats         text[] NOT NULL DEFAULT '{}',
  fills         text[] NOT NULL DEFAULT '{}',
  rudiments     text[] NOT NULL DEFAULT '{}',       -- 'single-paradiddle','double-stroke'
  techniques    text[] NOT NULL DEFAULT '{}',       -- 'shuffle','double-bass','ghost-notes','linear'
  kit_pieces    text[] NOT NULL DEFAULT '{}',       -- 'hi-hat','kick','snare','crash','ride','tom'
  data          jsonb  NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────
-- indexes  (index names spell out the column they cover)
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX playable_parent     ON playable (parent_id);
CREATE INDEX playable_notation   ON playable (notation_id);
CREATE INDEX playable_browse     ON playable (kind, status, level, bpm) WHERE listable;
CREATE INDEX playable_instruments ON playable USING gin (instruments);
CREATE INDEX step_by_child       ON step (child_id);
CREATE INDEX playable_link_to    ON playable_link (to_id);

CREATE INDEX idx_tonal_musical_key          ON tonal_profile (musical_key);
CREATE INDEX idx_tonal_keys                 ON tonal_profile USING gin (keys);
CREATE INDEX idx_tonal_chords               ON tonal_profile USING gin (chords);
CREATE INDEX idx_tonal_progression_concrete ON tonal_profile USING gin (progression_concrete);
CREATE INDEX idx_tonal_progression_roman    ON tonal_profile USING gin (progression_roman);
CREATE INDEX idx_tonal_progression_family   ON tonal_profile USING gin (progression_family);
CREATE INDEX idx_tonal_scales               ON tonal_profile USING gin (scales);

CREATE INDEX idx_drum_beats      ON drum_profile USING gin (beats);
CREATE INDEX idx_drum_fills      ON drum_profile USING gin (fills);
CREATE INDEX idx_drum_rudiments  ON drum_profile USING gin (rudiments);
CREATE INDEX idx_drum_techniques ON drum_profile USING gin (techniques);
CREATE INDEX idx_drum_kit_pieces ON drum_profile USING gin (kit_pieces);

-- ============================================================================
-- SAMPLE DATA
-- ============================================================================

-- NOTATIONS (scores) ----------------------------------------------------------
INSERT INTO notation (id, format, s3_key, notation_alphatex, bytes) VALUES
  ('n-sna-gp',     'gp',       'catalogue/sna/source.gp', NULL, 51200),
  ('n-rosanna',    'gp',       'catalogue/rosanna/source.gp', NULL, 60000),
  ('n-sandman',    'gp',       'catalogue/sandman/source.gp', NULL, 48000),
  ('n-billie',     'gp',       'catalogue/billie/source.gp', NULL, 40000),
  ('n-let-it-be',  'gp',       'catalogue/letitbe/source.gp', NULL, 30000),
  ('n-im-yours',   'gp',       'catalogue/imyours/source.gp', NULL, 30000),
  ('n-zombie',     'gp',       'catalogue/zombie/source.gp', NULL, 30000),
  ('n-creep',      'gp',       'catalogue/creep/source.gp', NULL, 30000),
  ('n-bohemian',   'gp',       'catalogue/bohemian/source.gp', NULL, 90000),
  ('n-hihat-8',    'alphatex', NULL, ':8 x x x x x x x x', NULL),
  ('n-rock8-kick', 'alphatex', NULL, ':8 (x.36) x (x.36) x', NULL),
  ('n-paradiddle', 'alphatex', NULL, 'R L R R  L R L L', NULL),
  ('n-cmaj-scale', 'alphatex', NULL, 'C4 D4 E4 F4 G4 A4 B4 C5', NULL),
  ('n-chord-c',    'alphatex', NULL, '(C4 E4 G4)', NULL),
  ('n-chord-g',    'alphatex', NULL, '(G3 B3 D4)', NULL),
  ('n-chord-am',   'alphatex', NULL, '(A3 C4 E4)', NULL),
  ('n-chord-f',    'alphatex', NULL, '(F3 A3 C4)', NULL);

-- DRUM SONG + its PARTS (instruments has drums; gets a drum_profile) -----------
INSERT INTO playable (id, kind, title, parent_id, notation_id, start_bar, end_bar, sort_order,
                      listable, level, artist, bpm, time_signature_numerator, time_signature_denominator, genre, instruments,
                      origin, status, license, data) VALUES
 ('sna', 'song', 'Seven Nation Army', NULL, 'n-sna-gp', NULL, NULL, NULL,
   true, 2, 'The White Stripes', 124, 4, 4, 'rock', '{drums,guitar}', 'curated', 'published', 'royalty-free',
   '{"album":"Elephant","year":2003,"sections":[{"label":"Intro","startBar":1,"endBar":8},{"label":"Verse","startBar":9,"endBar":24},{"label":"Chorus","startBar":25,"endBar":40}]}'),
 ('sna-intro',  'part', 'Intro',  'sna', 'n-sna-gp', 1,  8,  1, false, NULL, NULL, 124, 4, 4, NULL, '{drums,guitar}', 'curated', 'published', NULL, NULL),
 ('sna-verse',  'part', 'Verse',  'sna', 'n-sna-gp', 9,  24, 2, false, NULL, NULL, 124, 4, 4, NULL, '{drums,guitar}', 'curated', 'published', NULL, NULL),
 ('sna-chorus', 'part', 'Chorus', 'sna', 'n-sna-gp', 25, 40, 3, false, NULL, NULL, 124, 4, 4, NULL, '{drums,guitar}', 'curated', 'published', NULL, NULL);

-- MORE DRUM SONGS (for the ONLY/OR/AND drum demo) -----------------------------
INSERT INTO playable (id, kind, title, notation_id, level, artist, bpm, time_signature_numerator, time_signature_denominator, genre, instruments, origin, status, license, data) VALUES
 ('rosanna',  'song', 'Rosanna (half-time shuffle)', 'n-rosanna', 8, 'Toto',       86,  4, 4, 'rock',  '{drums}', 'curated', 'published', 'royalty-free', NULL),
 ('sandman',  'song', 'Enter Sandman',               'n-sandman', 5, 'Metallica',  123, 4, 4, 'metal', '{drums}', 'curated', 'published', 'royalty-free', NULL),
 ('billie',   'song', 'Billie Jean',                 'n-billie',  3, 'M. Jackson', 117, 4, 4, 'pop',   '{drums}', 'curated', 'published', 'royalty-free', NULL);

-- PITCHED SONGS (get a tonal_profile; NO drum_profile) ------------------------
INSERT INTO playable (id, kind, title, notation_id, level, artist, bpm, time_signature_numerator, time_signature_denominator, genre, instruments, origin, status, license, data) VALUES
 ('let-it-be', 'song', 'Let It Be',             'n-let-it-be', 2, 'The Beatles',  73,  4, 4, 'pop',  '{guitar,keys}', 'curated', 'published', 'royalty-free',
   '{"sections":[{"label":"Verse","startBar":1,"endBar":8,"key":"C major","progression":"I-V-vi-IV"},{"label":"Chorus","startBar":9,"endBar":16,"key":"C major","progression":"I-V-vi-IV"}]}'),
 ('im-yours',  'song', "I'm Yours",             'n-im-yours',  2, 'Jason Mraz',   151, 4, 4, 'pop',  '{guitar}',      'curated', 'published', 'royalty-free',
   '{"sections":[{"label":"Verse","startBar":1,"endBar":16,"key":"B major","progression":"I-V-vi-IV"}]}'),
 ('zombie',    'song', 'Zombie',                'n-zombie',    3, 'The Cranberries', 84, 4, 4, 'rock', '{guitar}',  'curated', 'published', 'royalty-free',
   '{"sections":[{"label":"Verse","startBar":1,"endBar":8,"key":"G major","progression":"vi-IV-I-V"}]}'),
 ('creep',     'song', 'Creep',                 'n-creep',     3, 'Radiohead',    92,  4, 4, 'rock', '{guitar}',      'curated', 'published', 'royalty-free',
   '{"sections":[{"label":"Verse","startBar":1,"endBar":8,"key":"G major","progression":"I-III-IV-iv"}]}'),
 -- MULTI-KEY / MULTI-TEMPO / MULTI-METER (D6): headline + keys[] + per-section timeline
 ('bohemian',  'song', 'Bohemian Rhapsody',     'n-bohemian',  9, 'Queen',        72,  4, 4, 'rock', '{keys,guitar}', 'curated', 'published', 'royalty-free',
   '{"album":"A Night at the Opera","year":1975,"sections":[{"label":"Ballad","startBar":1,"endBar":48,"key":"Bb major","bpm":72,"timeSignature":"4/4"},{"label":"Opera","startBar":49,"endBar":80,"key":"A major","bpm":63,"timeSignature":"4/4"},{"label":"Rock","startBar":81,"endBar":110,"key":"Eb major","bpm":140,"timeSignature":"4/4"}]}');

-- LEAF DRUM PATTERNS (reusable; get a drum_profile) ---------------------------
INSERT INTO playable (id, kind, title, notation_id, level, instruments, pattern_kind, family, genre, origin, status, listable) VALUES
 ('hihat-8',    'pattern', 'Straight 8th Hi-hats', 'n-hihat-8',    1, '{drums}', 'beat',     'Rock',   'rock', 'curated', 'published', true),
 ('rock8-kick', 'pattern', 'Rock Kick Pattern',    'n-rock8-kick', 1, '{drums}', 'beat',     'Rock',   'rock', 'curated', 'published', true),
 ('paradiddle', 'pattern', 'Single Paradiddle',    'n-paradiddle', 2, '{drums}', 'rudiment', 'Diddle', NULL,   'curated', 'published', true);

-- LEAF PITCHED PATTERNS (scale + chords; get a tonal_profile) ------------------
INSERT INTO playable (id, kind, title, notation_id, level, instruments, pattern_kind, family, origin, status, listable) VALUES
 ('cmaj-scale', 'pattern', 'C Major Scale', 'n-cmaj-scale', 1, '{keys}',         'scale', 'major', 'curated', 'published', true),
 ('chord-c',    'pattern', 'C major chord', 'n-chord-c',    1, '{keys,guitar}',  'chord', NULL,    'curated', 'published', true),
 ('chord-g',    'pattern', 'G major chord', 'n-chord-g',    1, '{keys,guitar}',  'chord', NULL,    'curated', 'published', true),
 ('chord-am',   'pattern', 'A minor chord', 'n-chord-am',   1, '{keys,guitar}',  'chord', NULL,    'curated', 'published', true),
 ('chord-f',    'pattern', 'F major chord', 'n-chord-f',    3, '{keys,guitar}',  'chord', NULL,    'curated', 'published', true);

-- COMPOSITE PROGRESSION pattern (CP-1 entity): steps ARE the chords ------------
INSERT INTO playable (id, kind, title, notation_id, level, instruments, pattern_kind, family, origin, status, listable, data) VALUES
 ('progression-axis-c', 'pattern', 'Axis Progression I-V-vi-IV (C)', NULL, 2, '{keys,guitar}', 'progression', 'Axis', 'curated', 'published', true,
   '{"roman":["I","V","vi","IV"],"quality":"Major"}');

-- ── tonal_profile rows (pitched only) ───────────────────────────────────────
INSERT INTO tonal_profile (playable_id, musical_key, keys, scales, chords, progression_concrete, progression_roman, progression_family) VALUES
 ('let-it-be',           'C major', '{"C major"}',                       '{"major"}',                    '{C,G,Am,F}',      '{C-G-Am-F}',   '{I-V-vi-IV}',   '{I-V-vi-IV}'),
 ('im-yours',            'B major', '{"B major"}',                       '{"major"}',                    '{B,"F#","G#m",E}','{B-F#-G#m-E}', '{I-V-vi-IV}',   '{I-V-vi-IV}'),
 ('zombie',              'G major', '{"G major"}',                       '{"minor pentatonic","major"}', '{Em,C,G,D}',      '{Em-C-G-D}',   '{vi-IV-I-V}',   '{I-V-vi-IV}'),
 ('creep',               'G major', '{"G major"}',                       '{"major"}',                    '{G,B,C,Cm}',      '{G-B-C-Cm}',   '{I-III-IV-iv}', '{I-III-IV-iv}'),
 ('bohemian',            'Bb major','{"Bb major","A major","Eb major"}', '{"major"}',                    '{Bb,Eb,F,A,Gm}',  '{}',           '{}',            '{}'),
 ('cmaj-scale',          'C major', '{"C major"}',                       '{"major"}',                    '{}',              '{}',           '{}',            '{}'),
 ('chord-c',             'C major', '{"C major"}',                       '{}',                           '{C}',             '{}',           '{}',            '{}'),
 ('chord-g',             'G major', '{"G major"}',                       '{}',                           '{G}',             '{}',           '{}',            '{}'),
 ('chord-am',            'A minor', '{"A minor"}',                       '{}',                           '{Am}',            '{}',           '{}',            '{}'),
 ('chord-f',             'F major', '{"F major"}',                       '{}',                           '{F}',             '{}',           '{}',            '{}'),
 ('progression-axis-c',  'C major', '{"C major"}',                       '{}',                           '{C,G,Am,F}',      '{C-G-Am-F}',   '{I-V-vi-IV}',   '{I-V-vi-IV}');

-- ── drum_profile rows (drums only) ──────────────────────────────────────────
INSERT INTO drum_profile (playable_id, beats, fills, rudiments, techniques, kit_pieces) VALUES
 ('sna',     '{Rock}',   '{}',         '{}',                  '{syncopation}',         '{hi-hat,kick,snare}'),
 ('rosanna', '{Shuffle}','{tom-fill}', '{single-paradiddle}', '{shuffle,ghost-notes}', '{hi-hat,kick,snare,ride}'),
 ('sandman', '{Rock}',   '{tom-fill}', '{}',                  '{double-bass}',         '{kick,snare,crash,tom}'),
 ('billie',  '{House}',  '{}',         '{}',                  '{four-on-floor}',       '{hi-hat,kick,snare}'),
 ('hihat-8',    '{Rock}', '{}', '{}', '{}',                   '{hi-hat}'),
 ('rock8-kick', '{Rock}', '{}', '{}', '{}',                   '{kick}'),
 ('paradiddle', '{}',     '{}', '{single-paradiddle}', '{}',  '{snare}');

-- STEPS: the progression composite's steps ARE the chords ---------------------
INSERT INTO step (parent_id, child_id, sort_order, start_bpm, goal_bpm) VALUES
 ('progression-axis-c', 'chord-c',  1, 50, 90),
 ('progression-axis-c', 'chord-g',  2, 50, 90),
 ('progression-axis-c', 'chord-am', 3, 50, 90),
 ('progression-axis-c', 'chord-f',  4, 50, 90);

-- LINKS: a song USES a progression (CP-1 m:n) ---------------------------------
INSERT INTO playable_link (from_id, to_id, relation) VALUES
 ('let-it-be', 'progression-axis-c', 'uses'),
 ('im-yours',  'progression-axis-c', 'uses');

-- ============================================================================
-- POKE-AROUND QUERIES  (run in DBeaver / psql)
-- ============================================================================

-- S1 · songs I can play (chord subset): every chord the song uses is in my set
--   SELECT p.title, t.chords
--   FROM tonal_profile t JOIN playable p ON p.id=t.playable_id
--   WHERE p.kind='song' AND t.chords <@ ARRAY['C','G','D','Dm','D7','E','Em','A','Am','F','B','F#','G#m','Bb','Eb'];

-- S2 mode A · exact (same key): literal C-G-Am-F
--   SELECT p.title FROM tonal_profile t JOIN playable p ON p.id=t.playable_id
--   WHERE t.progression_concrete @> ARRAY['C-G-Am-F'];            -- Let It Be, Axis progression

-- S2 mode B · any key (roman / transposition): I-V-vi-IV anywhere
--   SELECT p.title, t.musical_key FROM tonal_profile t JOIN playable p ON p.id=t.playable_id
--   WHERE t.progression_roman @> ARRAY['I-V-vi-IV'];              -- Let It Be, I'm Yours

-- S2 mode C · same loop (rotation 'Axis family'): any key + any start  (Zombie joins!)
--   SELECT p.title, t.musical_key, t.progression_roman FROM tonal_profile t JOIN playable p ON p.id=t.playable_id
--   WHERE t.progression_family @> ARRAY['I-V-vi-IV'];             -- Let It Be, I'm Yours, Zombie

-- S3 · songs with a minor-pentatonic part (solo practice)
--   SELECT p.title FROM tonal_profile t JOIN playable p ON p.id=t.playable_id
--   WHERE t.scales @> ARRAY['minor pentatonic'];                  -- Zombie

-- MULTI-KEY · songs that TOUCH A major (modulating songs still match)
--   SELECT p.title, t.keys FROM tonal_profile t JOIN playable p ON p.id=t.playable_id
--   WHERE t.keys && ARRAY['A major'];                             -- Bohemian Rhapsody

-- COMBINE · Axis loop + playable with my chords + beginner
--   SELECT p.title FROM tonal_profile t JOIN playable p ON p.id=t.playable_id
--   WHERE t.progression_family @> ARRAY['I-V-vi-IV']
--     AND t.chords <@ ARRAY['C','G','Am','F','Em','D','B','F#','G#m']
--     AND p.level <= 3;

-- DRUM · ONLY (subset) / OR (overlap) / AND (contains)
--   SELECT p.title FROM drum_profile d JOIN playable p ON p.id=d.playable_id WHERE d.techniques && ARRAY['shuffle','double-bass'];   -- OR  → Rosanna, Sandman
--   SELECT p.title FROM drum_profile d JOIN playable p ON p.id=d.playable_id WHERE d.techniques @> ARRAY['shuffle','ghost-notes'];   -- AND → Rosanna
--   SELECT p.title FROM drum_profile d JOIN playable p ON p.id=d.playable_id WHERE d.rudiments <@ ARRAY['single-paradiddle','double-stroke'] AND cardinality(d.rudiments) > 0;  -- ONLY

-- NO TONAL NULLS · drum songs have NO tonal_profile row (and vice-versa)
--   SELECT p.id, p.kind, (t.playable_id IS NOT NULL) AS has_tonal, (d.playable_id IS NOT NULL) AS has_drum
--   FROM playable p
--   LEFT JOIN tonal_profile t ON t.playable_id=p.id
--   LEFT JOIN drum_profile  d ON d.playable_id=p.id
--   WHERE p.kind='song' ORDER BY p.id;

-- CP-1 · the progression entity, its chord steps, and songs that use it
--   SELECT s.sort_order, c.title FROM step s JOIN playable c ON c.id=s.child_id WHERE s.parent_id='progression-axis-c' ORDER BY s.sort_order;
--   SELECT from_id AS song FROM playable_link WHERE to_id='progression-axis-c' AND relation='uses';

-- the per-section timeline (multi-key / tempo / meter)
--   SELECT p.title, jsonb_pretty(p.data->'sections') FROM playable p WHERE p.id='bohemian';
-- ============================================================================
