-- ============================================================================
-- Per-track tonal/drum profiles (SD-27) + REAL seed data
-- ----------------------------------------------------------------------------
-- Validated on:  nh_tonal_scratch  (psql -d nh_tonal_scratch -f <this file>)
-- Supersedes for profiles:  2026-06-19-tonal-drum-schema-draft.sql (playable-keyed)
-- Builds on:                2026-06-20-group-d-track-media-difficulty-draft.sql (track/media)
--
-- SD-27 RESOLVED (Leo, 2026-06-21): tonal_profile + drum_profile move from the
-- PLAYABLE to the TRACK. A track IS one instrument, so the chords/progressions
-- belong to the pitched tracks and the beats/fills/kit_pieces to the drum track.
-- Shape is unchanged — only the key flips:  playable_id PK  →  track_id PK.
--
-- Instrument-conditional rule (was: drum songs get no tonal_profile, and vice
-- versa) now keys off track.instrument:
--   * a DRUMS track may own a drum_profile  (never a tonal_profile)
--   * a PITCHED track may own a tonal_profile (never a drum_profile)
-- Postgres can't cheaply enforce "profile.instrument matches its track", so this
-- is an APP-LAYER invariant (same call the schema already makes for "every
-- playable owns >=1 track" and the derived instruments[]/has_audio facets).
-- ============================================================================

DROP TABLE IF EXISTS tonal_profile, drum_profile, media, track, step, playable_link, playable, notation CASCADE;

-- ─────────────────────────────────────────────────────────────────
-- notation — the SCORE (S3 file OR inline alphaTex)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE notation (
  id                text PRIMARY KEY,
  format            text NOT NULL,
  s3_key            text,
  notation_alphatex text,
  checksum          text,
  bytes             int,
  upload_status     text NOT NULL DEFAULT 'ready',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_by        text,
  updated_by        text,
  CONSTRAINT notation_format CHECK (format IN ('gp','midi','alphatex','xml')),
  CONSTRAINT notation_status CHECK (upload_status IN ('ready','pending_blob','client')),
  CONSTRAINT notation_one_of CHECK (
    upload_status <> 'ready'
    OR (s3_key IS NOT NULL)::int + (notation_alphatex IS NOT NULL)::int = 1
  )
);

-- ─────────────────────────────────────────────────────────────────
-- playable — every playable unit (song · part · lesson · pattern)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE playable (
  id             text PRIMARY KEY,
  kind           text NOT NULL,
  title          text NOT NULL,
  description    text,
  parent_id      text REFERENCES playable(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
  notation_id    text REFERENCES notation(id) ON DELETE RESTRICT DEFERRABLE INITIALLY IMMEDIATE,
  start_bar      int,
  end_bar        int,
  sort_order     int,
  listable       boolean NOT NULL DEFAULT true,

  level          smallint,                            -- L1 headline = max(track.level) for the selected instrument
  author         text[],
  author_type    text,
  bpm            int,
  time_signature_numerator   smallint,
  time_signature_denominator smallint,
  genre          text[],
  instruments    text[],                              -- DERIVED facet = DISTINCT track.instrument
  skill          text[],
  tags           text[],
  pattern_kind   text,                                -- beat|fill|rudiment|scale|chord|progression
  family         text[],

  origin         text NOT NULL DEFAULT 'curated',
  visibility     text NOT NULL DEFAULT 'public',
  status         text NOT NULL DEFAULT 'draft',
  license        text,
  has_audio      boolean NOT NULL DEFAULT false,      -- DERIVED facet = EXISTS over media
  has_video      boolean NOT NULL DEFAULT false,      -- DERIVED facet

  data           jsonb,

  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  created_by     text,
  updated_by     text,

  CONSTRAINT p_kind        CHECK (kind   IN ('song','part','lesson','pattern')),
  CONSTRAINT p_status      CHECK (status IN ('draft','published','archived')),
  CONSTRAINT p_origin      CHECK (origin IN ('curated','user-upload')),
  CONSTRAINT p_visibility  CHECK (visibility IN ('public','private','shared')),
  CONSTRAINT p_author_type CHECK (author_type IS NULL OR author_type IN ('artist','teacher','user')),
  CONSTRAINT p_description_len CHECK (description IS NULL OR char_length(description) <= 255),
  CONSTRAINT p_curated_public CHECK (origin <> 'curated' OR visibility = 'public'),
  CONSTRAINT p_level   CHECK (level IS NULL OR level BETWEEN 0 AND 10),
  CONSTRAINT p_no_self CHECK (parent_id IS NULL OR parent_id <> id),
  CONSTRAINT p_time_signature CHECK ((time_signature_numerator IS NULL AND time_signature_denominator IS NULL) OR (time_signature_numerator > 0 AND time_signature_denominator IN (1,2,4,8,16,32))),
  CONSTRAINT p_song_bpm    CHECK (kind <> 'song' OR bpm IS NOT NULL),
  CONSTRAINT p_part_parent CHECK (kind <> 'part' OR parent_id IS NOT NULL),
  CONSTRAINT p_needs_score CHECK (kind IN ('lesson','pattern') OR notation_id IS NOT NULL),
  CONSTRAINT p_slice_bars  CHECK (start_bar IS NULL OR (start_bar > 0 AND end_bar >= start_bar))
);

-- ─────────────────────────────────────────────────────────────────
-- track — one instrument per row (Group D D-1); the profile's new home
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE track (
  id                   text PRIMARY KEY,
  playable_id          text NOT NULL REFERENCES playable(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
  instrument           text NOT NULL,                 -- flat open vocab (drums, guitar, bass, keys, vocals…)
  role                 text,                          -- same-instrument variant (solo|rhythm|lead|pad|harmony)
  name                 text,
  sort_order           int  NOT NULL,
  level                smallint,                      -- L2 per-instrument difficulty (0–10, nullable)
  notation_id          text REFERENCES notation(id) ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE,
  notation_track_index int,
  data                 jsonb NOT NULL DEFAULT '{}',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           text,
  updated_by           text,
  CONSTRAINT track_level CHECK (level IS NULL OR level BETWEEN 0 AND 10)
);

-- ─────────────────────────────────────────────────────────────────
-- step — ordered self-referencing junction (parent -> child playable)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE step (
  parent_id   text NOT NULL REFERENCES playable(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
  child_id    text NOT NULL REFERENCES playable(id) ON DELETE RESTRICT DEFERRABLE INITIALLY IMMEDIATE,
  sort_order  int  NOT NULL,
  start_bpm   int,
  goal_bpm    int,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_by  text,
  updated_by  text,
  PRIMARY KEY (parent_id, sort_order),
  CONSTRAINT step_no_self CHECK (parent_id <> child_id),
  CONSTRAINT step_ladder  CHECK (start_bpm IS NULL OR goal_bpm IS NULL OR goal_bpm >= start_bpm)
);

-- ─────────────────────────────────────────────────────────────────
-- playable_link — lightweight refs (a SONG 'uses' a progression / groove)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE playable_link (
  from_id    text NOT NULL REFERENCES playable(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
  to_id      text NOT NULL REFERENCES playable(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
  relation   text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text,
  PRIMARY KEY (from_id, to_id, relation),
  CONSTRAINT pl_no_self CHECK (from_id <> to_id)
);

-- ─────────────────────────────────────────────────────────────────
-- media — audio/video, song-level (track_id NULL) or per-track (Group D D-2)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE media (
  id          text PRIMARY KEY,
  playable_id text NOT NULL REFERENCES playable(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
  track_id    text REFERENCES track(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
  kind        text NOT NULL,
  provider    text NOT NULL,
  url         text,
  s3_key      text,
  label       text,
  sort_order  int  NOT NULL DEFAULT 0,
  data        jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_by  text,
  updated_by  text,
  CONSTRAINT media_kind     CHECK (kind     IN ('audio','video')),
  CONSTRAINT media_provider CHECK (provider IN ('gp-embedded','s3','youtube')),
  CONSTRAINT media_location CHECK (
       (provider = 'gp-embedded' AND s3_key IS NULL     AND url IS NULL)
    OR (provider = 's3'          AND s3_key IS NOT NULL  AND url IS NULL)
    OR (provider = 'youtube'     AND url    IS NOT NULL  AND s3_key IS NULL)
  )
);

-- ─────────────────────────────────────────────────────────────────
-- tonal_profile — PITCHED-only (1:0..1 PER TRACK). SD-27: key = track_id.
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE tonal_profile (
  track_id             text PRIMARY KEY REFERENCES track(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,  -- SD-27 (was playable_id)
  musical_key          text,
  keys                 text[] NOT NULL DEFAULT '{}',
  scales               text[] NOT NULL DEFAULT '{}',
  chords               text[] NOT NULL DEFAULT '{}',
  progression_concrete text[] NOT NULL DEFAULT '{}',
  progression_roman    text[] NOT NULL DEFAULT '{}',
  progression_family   text[] NOT NULL DEFAULT '{}',
  data                 jsonb  NOT NULL DEFAULT '{}',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           text,
  updated_by           text
);

-- ─────────────────────────────────────────────────────────────────
-- drum_profile — DRUMS-only (1:0..1 PER TRACK). SD-27: key = track_id.
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE drum_profile (
  track_id      text PRIMARY KEY REFERENCES track(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,  -- SD-27 (was playable_id)
  beats         text[] NOT NULL DEFAULT '{}',
  fills         text[] NOT NULL DEFAULT '{}',
  rudiments     text[] NOT NULL DEFAULT '{}',
  techniques    text[] NOT NULL DEFAULT '{}',
  kit_pieces    text[] NOT NULL DEFAULT '{}',
  data          jsonb  NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  created_by    text,
  updated_by    text
);

-- ─────────────────────────────────────────────────────────────────
-- indexes
-- ─────────────────────────────────────────────────────────────────
CREATE INDEX playable_parent      ON playable (parent_id);
CREATE INDEX playable_notation    ON playable (notation_id);
CREATE INDEX playable_browse      ON playable (kind, status, level, bpm) WHERE listable;
CREATE INDEX playable_instruments ON playable USING gin (instruments);
CREATE INDEX playable_genre       ON playable USING gin (genre);
CREATE INDEX playable_family      ON playable USING gin (family);
CREATE INDEX playable_author      ON playable USING gin (author);
CREATE INDEX step_by_child        ON step (child_id);
CREATE INDEX playable_link_to     ON playable_link (to_id);

CREATE INDEX track_playable        ON track (playable_id);
CREATE INDEX track_notation        ON track (notation_id);
CREATE INDEX track_instrument      ON track (instrument);
CREATE INDEX track_instrument_level ON track (instrument, level);   -- "easy on <instrument>"

CREATE INDEX media_playable ON media (playable_id);
CREATE INDEX media_track    ON media (track_id);
CREATE INDEX media_kind     ON media (playable_id, kind);

-- tonal/drum indexes now sit on the TRACK-keyed tables (search joins via track)
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
-- SEED DATA
-- ----------------------------------------------------------------------------
-- Provenance: drum patterns are REAL grooves from
--   ~/Sites/notation-hero-resources/groovescribe-import.json
-- Each pattern stores its real GrooveScribe share URL in playable.data
-- (the authoritative score). Patterns/lessons may have notation_id NULL
-- (constraint p_needs_score), so no fabricated alphaTex blob is invented; the
-- GrooveScribe URL renders/round-trips and a real alphaTex can be backfilled
-- later via the groovescribe skill. The drum_profile (rudiments/beats/fills/
-- techniques/kit_pieces) hangs off each pattern's DRUMS track (SD-27).
--
-- Level groups (display-only, N-14): Debut 0 · Beginner 1-3 · Intermediate 4-6
--                                   · Advanced 7-8 · Expert 9-10
-- 2 rudiments per group, Debut→Advanced (the source tops out at L8; Expert 9-10
-- is covered by the Angra song's drums track in the songs block).
-- ============================================================================

-- ── DRUM PATTERNS: 8 leveled rudiments (2 per group) ────────────────────────
INSERT INTO playable (id, kind, title, description, level, pattern_kind, family, instruments, tags, origin, visibility, status, created_by, data) VALUES
 ('pat_ssr_debut','pattern','Single Stroke Roll (Debut)','Alternating single strokes, 8th notes — the first rudiment.',0,'rudiment','{Roll,Single}','{drums}','{rudiment,roll}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=8&Title=Single%20Stroke%20Roll%20(Level%20Debut)&Tempo=70&Measures=1&H=|--------|&S=|oooooooo|&K=|--------|&Stickings=|RLRLRLRL|","source":"groovescribe-import.json"}'),
 ('pat_dsr_debut','pattern','Double Stroke Roll (Debut)','Open roll, RRLL — 8th notes.',0,'rudiment','{Roll,Diddle}','{drums}','{rudiment,roll}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=8&Title=Double%20Stroke%20Roll%20(Level%20Debut)&Tempo=70&Measures=1&H=|--------|&S=|oooooooo|&K=|--------|&Stickings=|RRLLRRLL|","source":"groovescribe-import.json"}'),
 ('pat_ssr_l2','pattern','Single Stroke Roll (L2)','Single strokes at 16th notes.',2,'rudiment','{Roll,Single}','{drums}','{rudiment,roll}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=16&Title=Single%20Stroke%20Roll%20(Level%202)&Tempo=80&Measures=1&H=|----------------|&S=|oooooooooooooooo|&K=|----------------|&Stickings=|RLRLRLRLRLRLRLRL|","source":"groovescribe-import.json"}'),
 ('pat_ss4_l3','pattern','Single Stroke Four (L3)','Four singles resolving to an accent.',3,'rudiment','{Single,Accent}','{drums}','{rudiment}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=16&Title=Single%20Stroke%20Four%20(Level%203)&Tempo=90&Measures=1&H=|----------------|&S=|oooOoooOoooOoooO|&K=|----------------|&Stickings=|RLRLRLRLRLRLRLRL|","source":"groovescribe-import.json"}'),
 ('pat_5sr_l4','pattern','Five Stroke Roll (L4)','RR LL R — two diddles plus an accent.',4,'rudiment','{Roll,Diddle}','{drums}','{rudiment,roll}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=16&Title=Five%20Stroke%20Roll%20(Level%204)&Tempo=75&Measures=1&H=|----------------|&S=|ooooO-----------|&K=|----------------|&Stickings=|RRLLR-----------|","source":"groovescribe-import.json"}'),
 ('pat_7sr_l6','pattern','Seven Stroke Roll (L6)','Three diddles plus an accent.',6,'rudiment','{Roll,Diddle}','{drums}','{rudiment,roll}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=16&Title=Seven%20Stroke%20Roll%20(Level%206)&Tempo=85&Measures=1&H=|----------------|&S=|ooooooO---------|&K=|----------------|&Stickings=|RRLLRRL---------|","source":"groovescribe-import.json"}'),
 ('pat_swiss_l7','pattern','Swiss Army Triplet (L7)','Flam plus two singles per triplet (RRL feel).',7,'rudiment','{Flam,Triplet}','{drums}','{rudiment,flam}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=12&Title=Swiss%20Army%20Triplet%20(Level%207)&Tempo=85&Measures=1&H=|------------|&S=|foofoofoofoo|&K=|------------|&Stickings=|RRLRRLRRLRRL|","source":"groovescribe-import.json"}'),
 ('pat_ssr_l8','pattern','Single Stroke Roll (L8)','Single strokes at 32nd notes.',8,'rudiment','{Roll,Single}','{drums}','{rudiment,roll}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=32&Title=Single%20Stroke%20Roll%20(Level%208)&Tempo=65&Measures=1&H=|--------------------------------|&S=|oooooooooooooooooooooooooooooooo|&K=|--------------------------------|&Stickings=|RLRLRLRLRLRLRLRLRLRLRLRLRLRLRLRL|","source":"groovescribe-import.json"}');

-- ── DRUM PATTERNS: 1 standalone beat + 1 fill ───────────────────────────────
INSERT INTO playable (id, kind, title, description, level, bpm, time_signature_numerator, time_signature_denominator, pattern_kind, family, instruments, tags, origin, visibility, status, created_by, data) VALUES
 ('pat_basic_rock','pattern','Basic Rock Beat','Backbeat on 2 & 4, kick on 1 & 3 — the first groove.',1,100,4,4,'beat','{Rock}','{drums}','{beat,rock}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=8&Title=Basic%20Rock%20Beat&Tempo=100&Measures=1&H=|xxxxxxxx|&S=|--o---o-|&K=|o---o---|","source":"groovescribe-import.json"}'),
 ('pat_snare_fill_l4','pattern','16th-Note Snare Fill (L4)','Continuous 16th-note snare fill.',4,120,4,4,'fill','{Fill,Snare}','{drums}','{fill}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=16&Title=16th-Note%20Snare%20Fill%20(Level%204)&Tempo=120&Measures=1&H=|----------------|&S=|oooooooooooooooo|&K=|----------------|&Stickings=|RLRLRLRLRLRLRLRL|","source":"groovescribe-import.json"}');

-- ── COMPOSITE BEAT: full beat = hi-hat + snare + kick voices (via step) ──────
-- The 3 single-voice leaves are masked views of Basic Rock Beat (real data).
INSERT INTO playable (id, kind, title, description, level, bpm, time_signature_numerator, time_signature_denominator, pattern_kind, family, instruments, tags, origin, visibility, status, created_by, data) VALUES
 ('pat_voice_hh','pattern','Hi-Hat Voice (8ths)','Just the hi-hats — eight straight 8th notes.',0,100,4,4,'beat','{Rock,Voice}','{drums}','{beat,voice,hi-hat}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=8&Title=Hi-Hat%20Voice&Tempo=100&Measures=1&H=|xxxxxxxx|&S=|--------|&K=|--------|","source":"masked from Basic Rock Beat"}'),
 ('pat_voice_sn','pattern','Snare Voice (backbeat)','Just the snare — backbeat on 2 & 4.',1,100,4,4,'beat','{Rock,Voice}','{drums}','{beat,voice,snare}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=8&Title=Snare%20Voice&Tempo=100&Measures=1&H=|--------|&S=|--o---o-|&K=|--------|","source":"masked from Basic Rock Beat"}'),
 ('pat_voice_kick','pattern','Kick Voice (1 & 3)','Just the kick — on beats 1 & 3.',1,100,4,4,'beat','{Rock,Voice}','{drums}','{beat,voice,kick}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=8&Title=Kick%20Voice&Tempo=100&Measures=1&H=|--------|&S=|--------|&K=|o---o---|","source":"masked from Basic Rock Beat"}'),
 ('pat_rock_composite','pattern','Rock Beat — built from voices','The full beat assembled from its hi-hat, snare and kick voices.',1,100,4,4,'beat','{Rock,Composite}','{drums}','{beat,rock,composite}','curated','public','published','seed','{"grooveScribeUrl":"https://leocaseiro.github.io/GrooveScribe/?TimeSig=4/4&Div=8&Title=Rock%20Beat%20(composite)&Tempo=100&Measures=1&H=|xxxxxxxx|&S=|--o---o-|&K=|o---o---|","source":"composed from voices"}');

-- composite -> voice leaves (ordered)
INSERT INTO step (parent_id, child_id, sort_order, created_by) VALUES
 ('pat_rock_composite','pat_voice_hh',  1,'seed'),
 ('pat_rock_composite','pat_voice_sn',  2,'seed'),
 ('pat_rock_composite','pat_voice_kick',3,'seed');

-- ── one DRUMS track per drum pattern (the drum_profile's home; level mirrors) ─
INSERT INTO track (id, playable_id, instrument, sort_order, level, created_by) VALUES
 ('trk_ssr_debut','pat_ssr_debut','drums',1,0,'seed'),
 ('trk_dsr_debut','pat_dsr_debut','drums',1,0,'seed'),
 ('trk_ssr_l2','pat_ssr_l2','drums',1,2,'seed'),
 ('trk_ss4_l3','pat_ss4_l3','drums',1,3,'seed'),
 ('trk_5sr_l4','pat_5sr_l4','drums',1,4,'seed'),
 ('trk_7sr_l6','pat_7sr_l6','drums',1,6,'seed'),
 ('trk_swiss_l7','pat_swiss_l7','drums',1,7,'seed'),
 ('trk_ssr_l8','pat_ssr_l8','drums',1,8,'seed'),
 ('trk_basic_rock','pat_basic_rock','drums',1,1,'seed'),
 ('trk_snare_fill_l4','pat_snare_fill_l4','drums',1,4,'seed'),
 ('trk_voice_hh','pat_voice_hh','drums',1,0,'seed'),
 ('trk_voice_sn','pat_voice_sn','drums',1,1,'seed'),
 ('trk_voice_kick','pat_voice_kick','drums',1,1,'seed'),
 ('trk_rock_composite','pat_rock_composite','drums',1,1,'seed');

-- ── drum_profile per drums track (SD-27: keyed by track_id) ──────────────────
INSERT INTO drum_profile (track_id, beats, fills, rudiments, techniques, kit_pieces) VALUES
 ('trk_ssr_debut','{}','{}','{single-stroke-roll}','{}','{snare}'),
 ('trk_dsr_debut','{}','{}','{double-stroke-roll}','{}','{snare}'),
 ('trk_ssr_l2','{}','{}','{single-stroke-roll}','{}','{snare}'),
 ('trk_ss4_l3','{}','{}','{single-stroke-four}','{accent}','{snare}'),
 ('trk_5sr_l4','{}','{}','{five-stroke-roll}','{}','{snare}'),
 ('trk_7sr_l6','{}','{}','{seven-stroke-roll}','{}','{snare}'),
 ('trk_swiss_l7','{}','{}','{swiss-army-triplet}','{flam}','{snare}'),
 ('trk_ssr_l8','{}','{}','{single-stroke-roll}','{}','{snare}'),
 ('trk_basic_rock','{rock,basic-rock}','{}','{}','{}','{hi-hat,snare,kick}'),
 ('trk_snare_fill_l4','{}','{snare-fill}','{single-stroke-roll}','{16th}','{snare}'),
 ('trk_voice_hh','{}','{}','{}','{}','{hi-hat}'),
 ('trk_voice_sn','{}','{}','{}','{}','{snare}'),
 ('trk_voice_kick','{}','{}','{}','{}','{kick}'),
 ('trk_rock_composite','{rock,basic-rock}','{}','{}','{}','{hi-hat,snare,kick}');

-- ============================================================================
-- SONGS + POKE QUERIES  — appended next.
-- ============================================================================
