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
--
-- 2026-06-24 SCHEMA-DELTA CONSOLIDATION (SD-28/26/25/15 brainstorm — see
-- docs/wireframe/2026-06-24-schema-delta-decisions.md):
--   * track.role text  →  track.roles text[]      (SD-28: a track plays N parts)
--   * track.techniques text[]   ADDED             (SD-25: per-track, ALL instruments)
--   * drum_profile.techniques   REMOVED           (moved to track.techniques)
--   * track.source_instrument_id / _kind  ADDED   (SD-26: GM-program provenance)
--   * instrument is DERIVED from the AlphaTab GM program (never UGC); family = code-only map (no column)
--   * SD-15: voicing stays Thin (no note/voice_map tables)
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
  slug           text,                                -- friendly URL token (Leo) — separate from the opaque id; backfilled from title, then NOT NULL + UNIQUE (see below)
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
  roles                text[] NOT NULL DEFAULT '{}',  -- SD-28: part(s) this track plays (lead|rhythm|solo|pad|harmony); curated/UGC, auto-derivable
  techniques           text[] NOT NULL DEFAULT '{}',  -- SD-25: per-track techniques (tapping/slap/double-bass…), any instrument; auto-extracted + curated
  source_instrument_id   text,                        -- SD-26 provenance: raw GM program (0-127) / MusicXML sound-id / MuseScore id
  source_instrument_kind text,                        -- SD-26 provenance: gm-program | musicxml-sound | musescore-id | name-parse
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
  CONSTRAINT track_level CHECK (level IS NULL OR level BETWEEN 0 AND 10),
  CONSTRAINT track_source_kind CHECK (source_instrument_kind IS NULL OR source_instrument_kind IN ('gm-program','musicxml-sound','musescore-id','name-parse'))
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
CREATE UNIQUE INDEX playable_slug ON playable (slug);                 -- friendly URL token, globally unique
CREATE INDEX step_by_child        ON step (child_id);
CREATE INDEX playable_link_to     ON playable_link (to_id);

CREATE INDEX track_playable        ON track (playable_id);
CREATE INDEX track_notation        ON track (notation_id);
CREATE INDEX track_instrument      ON track (instrument);
CREATE INDEX track_instrument_level ON track (instrument, level);   -- "easy on <instrument>"
CREATE INDEX track_roles            ON track USING gin (roles);      -- SD-28: filter by part (rhythm/lead/solo)
CREATE INDEX track_techniques       ON track USING gin (techniques); -- SD-25: filter by technique (tapping/slap/double-bass)

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
INSERT INTO drum_profile (track_id, beats, fills, rudiments, kit_pieces) VALUES
 ('trk_ssr_debut','{}','{}','{single-stroke-roll}','{snare}'),
 ('trk_dsr_debut','{}','{}','{double-stroke-roll}','{snare}'),
 ('trk_ssr_l2','{}','{}','{single-stroke-roll}','{snare}'),
 ('trk_ss4_l3','{}','{}','{single-stroke-four}','{snare}'),
 ('trk_5sr_l4','{}','{}','{five-stroke-roll}','{snare}'),
 ('trk_7sr_l6','{}','{}','{seven-stroke-roll}','{snare}'),
 ('trk_swiss_l7','{}','{}','{swiss-army-triplet}','{snare}'),
 ('trk_ssr_l8','{}','{}','{single-stroke-roll}','{snare}'),
 ('trk_basic_rock','{rock,basic-rock}','{}','{}','{hi-hat,snare,kick}'),
 ('trk_snare_fill_l4','{}','{snare-fill}','{single-stroke-roll}','{snare}'),
 ('trk_voice_hh','{}','{}','{}','{hi-hat}'),
 ('trk_voice_sn','{}','{}','{}','{snare}'),
 ('trk_voice_kick','{}','{}','{}','{kick}'),
 ('trk_rock_composite','{rock,basic-rock}','{}','{}','{hi-hat,snare,kick}');

-- rudiment-flavour techniques moved to track.techniques (SD-25; were drum_profile.techniques)
UPDATE track SET techniques = '{accent}' WHERE id = 'trk_ss4_l3';
UPDATE track SET techniques = '{flam}'   WHERE id = 'trk_swiss_l7';
UPDATE track SET techniques = '{16th}'   WHERE id = 'trk_snare_fill_l4';

-- ============================================================================
-- SONGS  — multi-track, per-instrument levels + per-track tonal/drum profiles
-- ----------------------------------------------------------------------------
-- playable.level = headline = MAX(track.level) overall (default-sort number).
-- The per-instrument headline ("max on guitar") is derived at query time as
-- MAX(track.level) WHERE instrument = <selected> — see the poke queries.
-- Only Angra – Nothing To Say has a real .gp on disk; the others are catalog
-- rows with placeholder s3 keys (the seed exercises metadata + tags, not blobs).
-- Expert (9-10): TWO examples — Angra (Nothing To Say, drums + lead L9) and
-- Zoio de Lula (DRUMS L9; guitar only L3-4). The rudiment source tops out at L8,
-- so Expert coverage comes from songs. Zoio shows the per-instrument point well:
-- hard on drums, easy on guitar — so its guitar headline is 4, drums headline 9.
-- ============================================================================

INSERT INTO notation (id, format, s3_key, upload_status, created_by) VALUES
 ('not_bohemian','gp','s3://nh-notation/seed/bohemian-rhapsody.gp','ready','seed'),
 ('not_yellow','gp','s3://nh-notation/seed/yellow.gp','ready','seed'),
 ('not_zoio','gp','s3://nh-notation/seed/zoio.gp','ready','seed'),
 ('not_imyours','gp','s3://nh-notation/seed/im-yours.gp','ready','seed'),
 ('not_angra','gp','s3://nh-notation/seed/angra-nothing-to-say.gp','ready','seed');

INSERT INTO playable (id, kind, title, description, notation_id, level, author, author_type, bpm, time_signature_numerator, time_signature_denominator, genre, instruments, tags, family, origin, visibility, status, has_audio, has_video, created_by, data) VALUES
 ('song_bohemian','song','Bohemian Rhapsody','Queen''s multi-section epic — ballad, opera and hard-rock parts.','not_bohemian',8,'{Queen}','artist',72,4,4,'{rock,progressive}','{keys,guitar,bass,drums,vocals}','{classic-rock}','{Rock}','curated','public','published',true,true,'seed','{"bars":139,"sections":[{"label":"gtrs enter","startBar":42,"endBar":54,"tracks":[{"track":"trk_boh_drums","voices":["hi-hat","kick"],"level":5},{"track":"trk_boh_keys","voices":["left-hand","right-hand"],"level":6}]},{"label":"tempo 144","startBar":55,"endBar":95,"tracks":[{"track":"trk_boh_drums","voices":["hi-hat","snare","kick","crash"],"level":5},{"track":"trk_boh_keys","voices":["left-hand","right-hand"],"level":6}]},{"label":"tempo 207","startBar":96,"endBar":139,"tracks":[{"track":"trk_boh_drums","voices":["hi-hat","snare","kick","crash","ride"],"level":5},{"track":"trk_boh_keys","voices":["right-hand"],"level":6}]}]}'),
 ('song_yellow','song','Yellow','Coldplay — a steady, ringing guitar anthem.','not_yellow',3,'{Coldplay}','artist',87,4,4,'{rock,alternative}','{guitar,bass,drums,keys,vocals}','{}','{Rock}','curated','public','published',false,true,'seed','{"bars":97}'),
 ('song_zoio','song','Zoio de Lula','Charlie Brown Jr. — Brazilian rock (artist unconfirmed; flagged).','not_zoio',9,'{Charlie Brown Jr.}','artist',76,4,4,'{rock,brazilian}','{guitar,bass,drums}','{}','{Rock}','curated','public','published',false,true,'seed','{"bars":79,"markerless":true}'),
 ('song_imyours','song','I''m Yours','Jason Mraz — one I–V–vi–IV progression carries the whole song.','not_imyours',2,'{Jason Mraz}','artist',73,4,4,'{pop,reggae}','{guitar,bass,drums,vocals}','{}','{Pop}','curated','public','published',false,true,'seed','{"singleSection":true,"bars":76}'),
 ('song_angra','song','Nothing To Say','Angra — neoclassical power metal; Expert-level double-bass drumming.','not_angra',9,'{Angra}','artist',138,4,4,'{metal,power-metal}','{drums,guitar,bass,keys,vocals}','{neoclassical}','{Metal}','curated','public','published',true,true,'seed','{"bars":221}');

-- ── slug (Leo): friendly URL token, separate from the opaque id. Backfill from title, then require it.
--    (real app mints the slug on insert from the title + admin-editable; this models that.)
UPDATE playable SET slug = trim(both '-' from regexp_replace(regexp_replace(lower(title), '''', '', 'g'), '[^a-z0-9]+', '-', 'g'));
ALTER TABLE playable ALTER COLUMN slug SET NOT NULL;

-- ── tracks: per-instrument, per-role, with per-instrument LEVELS ─────────────
INSERT INTO track (id, playable_id, instrument, roles, name, sort_order, level, notation_track_index, techniques, created_by) VALUES
 -- Bohemian Rhapsody (real .gp: 13 tracks incl. 5 guitars + 2 print-dupe pianos; primaries mapped). guitar lead(7) vs rhythm(4) → max-on-guitar = 7
 ('trk_boh_keys','song_bohemian','keys','{}','Piano',1,6,1,'{}','seed'),
 ('trk_boh_glead','song_bohemian','guitar','{lead}','Gtr 1',2,7,0,'{}','seed'),
 ('trk_boh_grhythm','song_bohemian','guitar','{rhythm}','Gtr 2',3,4,3,'{}','seed'),
 ('trk_boh_bass','song_bohemian','bass','{}','Bass',4,5,7,'{}','seed'),
 ('trk_boh_drums','song_bohemian','drums','{}','Percussions',5,5,10,'{}','seed'),
 ('trk_boh_vox','song_bohemian','vocals','{}','Voice',6,8,8,'{}','seed'),
 -- Yellow (real .gp: 8 tracks)
 ('trk_yel_glead','song_yellow','guitar','{lead}','Lead Guitar',1,3,2,'{}','seed'),
 ('trk_yel_grhythm','song_yellow','guitar','{rhythm}','Rhythm Guitar',2,2,1,'{}','seed'),
 ('trk_yel_bass','song_yellow','bass','{}','Bass',3,2,4,'{}','seed'),
 ('trk_yel_drums','song_yellow','drums','{}','Drums',4,2,7,'{}','seed'),
 ('trk_yel_keys','song_yellow','keys','{}','Strings / Piano',5,3,5,'{}','seed'),
 ('trk_yel_vox','song_yellow','vocals','{}','Lead Vocals',6,3,0,'{}','seed'),
 -- Zoio de Lula (real .gp: marker-less; 3 guitars + bass + drums; NO vocals track)
 ('trk_zoio_glead','song_zoio','guitar','{solo}','Guitarra Solo',1,4,1,'{}','seed'),
 ('trk_zoio_grhythm','song_zoio','guitar','{rhythm}','Guitarra Base',2,3,0,'{}','seed'),
 ('trk_zoio_gtr3','song_zoio','guitar','{}','Guitarra 3',3,3,2,'{}','seed'),
 ('trk_zoio_bass','song_zoio','bass','{}','Baixo',4,4,3,'{}','seed'),
 ('trk_zoio_drums','song_zoio','drums','{}','Bateria',5,9,4,'{}','seed'),
 -- I'm Yours (real .gp: classical + electric guitar, NOT ukulele; + vocals)
 ('trk_imy_grhythm','song_imyours','guitar','{rhythm}','Classical Guitar',1,2,0,'{}','seed'),
 ('trk_imy_uke','song_imyours','guitar','{lead}','Electric Guitar',2,2,1,'{}','seed'),
 ('trk_imy_bass','song_imyours','bass','{}','Bass',3,2,2,'{}','seed'),
 ('trk_imy_drums','song_imyours','drums','{}','Drums',4,1,3,'{cross-stick}','seed'),
 ('trk_imy_vox','song_imyours','vocals','{}','Lead Vocal Harmonies',5,2,4,'{}','seed'),
 -- Angra – Nothing To Say (real .gp: 15 sections, E→G modulation; player-named tracks)
 ('trk_angra_drums','song_angra','drums','{}','Ricardo (Drums)',1,9,4,'{double-bass,blast-beat}','seed'),
 ('trk_angra_glead','song_angra','guitar','{lead}','Kiko (Lead Guitar)',2,9,1,'{}','seed'),
 ('trk_angra_grhythm','song_angra','guitar','{rhythm}','Rafael (Rhythm Guitar)',3,7,2,'{}','seed'),
 ('trk_angra_bass','song_angra','bass','{}','Luis (Bass)',4,8,3,'{}','seed'),
 ('trk_angra_keys','song_angra','keys','{}','Keyboards',5,6,5,'{}','seed'),
 ('trk_angra_vox','song_angra','vocals','{}','Andre (Vocals)',6,8,0,'{}','seed');

-- ── tonal_profile per PITCHED track (SD-27: the bass carries its OWN notes) ──
INSERT INTO tonal_profile (track_id, musical_key, keys, scales, chords, progression_concrete, progression_roman, progression_family) VALUES
 -- Bohemian: the chart has NO chord symbols → chords empty (not invented); key Bb from the file (plausible).
 ('trk_boh_keys','Bb major','{Bb major}','{}','{}','{}','{}','{}'),
 ('trk_boh_glead','Bb major','{Bb major}','{}','{}','{}','{}','{}'),
 ('trk_boh_grhythm','Bb major','{Bb major}','{}','{}','{}','{}','{}'),
 ('trk_boh_bass','Bb major','{Bb major}','{}','{}','{}','{}','{}'),
 -- Yellow: REAL chords from the .gp (B major).
 ('trk_yel_glead','B major','{B major}','{}','{B,Badd9,F#6,E7M,Badd11,G#m,Eadd9,F#m7add11}','{B-Badd9-F#6-E7M}','{I-V-IV}','{I-IV-V}'),
 ('trk_yel_grhythm','B major','{B major}','{}','{B,Badd9,F#6,E7M,Badd11,G#m,Eadd9,F#m7add11}','{B-Badd9-F#6-E7M}','{I-V-IV}','{I-IV-V}'),
 ('trk_yel_bass','B major','{B major}','{}','{B,F#,E}','{}','{}','{}'),
 -- Zoio: chart has NO chord symbols + GP key is a default → tonal honestly unknown.
 ('trk_zoio_glead',NULL,'{}','{}','{}','{}','{}','{}'),
 ('trk_zoio_grhythm',NULL,'{}','{}','{}','{}','{}','{}'),
 ('trk_zoio_bass',NULL,'{}','{}','{}','{}','{}','{}'),
 -- I'm Yours: REAL chords from the .gp — B major, I-V-vi-IV (fixes the earlier wrong "C major").
 ('trk_imy_grhythm','B major','{B major}','{}','{B,F#,G#m,E,Fdim,F#/A#}','{B-F#-G#m-E}','{I-V-vi-IV}','{I-V-vi-IV}'),
 ('trk_imy_uke','B major','{B major}','{}','{B,F#,G#m,E,Fdim,F#/A#}','{B-F#-G#m-E}','{I-V-vi-IV}','{I-V-vi-IV}'),
 ('trk_imy_bass','B major','{B major}','{}','{B,F#,G#m,E}','{}','{}','{}'),
 -- Angra: NO chord symbols; keys from the real section labels (Chorus III modulates E→G).
 ('trk_angra_glead','E minor','{E minor,G major}','{}','{}','{}','{}','{}'),
 ('trk_angra_grhythm','E minor','{E minor,G major}','{}','{}','{}','{}','{}'),
 ('trk_angra_bass','E minor','{E minor,G major}','{}','{}','{}','{}','{}'),
 ('trk_angra_keys','E minor','{E minor,G major}','{}','{}','{}','{}','{}');

-- ── drum_profile per DRUMS track (the drum side of the same per-track model) ──
INSERT INTO drum_profile (track_id, beats, fills, rudiments, kit_pieces) VALUES
 ('trk_boh_drums','{rock}','{tom-fill}','{}','{hi-hat,snare,kick,crash,tom}'),
 ('trk_yel_drums','{rock,pop}','{}','{}','{hi-hat,snare,kick}'),
 ('trk_zoio_drums','{rock,punk}','{snare-fill}','{}','{hi-hat,snare,kick,crash}'),
 ('trk_imy_drums','{pop,reggae}','{}','{}','{hi-hat,snare,kick}'),
 ('trk_angra_drums','{metal,double-bass}','{around-the-kit}','{}','{hi-hat,snare,kick,ride,crash,tom}');

-- ── media: one official video per song; audio stems where we flagged has_audio
INSERT INTO media (id, playable_id, kind, provider, url, s3_key, label, sort_order, created_by) VALUES
 ('med_boh_vid','song_bohemian','video','youtube','https://www.youtube.com/watch?v=fJ9rUzIMcZQ',NULL,'Official video',0,'seed'),
 ('med_boh_aud','song_bohemian','audio','s3',NULL,'s3://nh-notation/seed/bohemian-rhapsody.mp3','Full mix',1,'seed'),
 ('med_yel_vid','song_yellow','video','youtube','https://www.youtube.com/watch?v=yKNxeF4KMsY',NULL,'Official video',0,'seed'),
 ('med_zoio_vid','song_zoio','video','youtube','https://www.youtube.com/watch?v=placeholder-zoio',NULL,'Official video',0,'seed'),
 ('med_imy_vid','song_imyours','video','youtube','https://www.youtube.com/watch?v=EkHTsc9PU2A',NULL,'Official video',0,'seed'),
 ('med_angra_vid','song_angra','video','youtube','https://www.youtube.com/watch?v=placeholder-angra',NULL,'Official video',0,'seed'),
 ('med_angra_aud','song_angra','audio','s3',NULL,'s3://nh-notation/seed/angra-nothing-to-say.mp3','Full mix',1,'seed');

-- ============================================================================
-- POKE QUERIES (verification) — run read-only after the seed loads
-- ============================================================================
-- 1) Per-instrument headline ("max on guitar") for Bohemian Rhapsody → 7
--    SELECT max(level) FROM track WHERE playable_id='song_bohemian' AND instrument='guitar';
-- 2) "Easy on guitar" browse (guitar tracks <= L3) → Yellow, I'm Yours
--    SELECT p.title, t.level FROM track t JOIN playable p ON p.id=t.playable_id
--      WHERE t.instrument='guitar' AND t.level <= 3 ORDER BY t.level;
-- 3) Songs using a I–V–vi–IV progression (per-track tonal_profile) → I'm Yours
--    SELECT DISTINCT p.title FROM tonal_profile tp JOIN track t ON t.id=tp.track_id
--      JOIN playable p ON p.id=t.playable_id WHERE tp.progression_family @> ARRAY['I-V-vi-IV'];
-- 4) Songs with double-bass drumming (techniques now on track, SD-25) → Angra
--    SELECT DISTINCT p.title FROM track t JOIN playable p ON p.id=t.playable_id
--      WHERE t.techniques @> ARRAY['double-bass'];
-- 5) "The BASS plays these notes" — per-track precision SD-27 unlocks
--    SELECT p.title, tp.chords FROM tonal_profile tp JOIN track t ON t.id=tp.track_id
--      JOIN playable p ON p.id=t.playable_id WHERE t.instrument='bass' AND p.id='song_bohemian';
-- 6) Expert-tier playables (level 9-10) → Angra
--    SELECT title, level FROM playable WHERE level BETWEEN 9 AND 10;
-- 7) Rhythm-guitar songs (SD-28 roles[] overlap) → Bohemian, Yellow, Zoio, I'm Yours, Angra
--    SELECT DISTINCT p.title FROM track t JOIN playable p ON p.id=t.playable_id
--      WHERE t.instrument='guitar' AND t.roles && ARRAY['rhythm'];
-- 8) SD-15 voicing by track + bar (display/consume; jsonb grid, no table) — drum voices per
--    section of Bohemian → "tempo 207" = hi-hat,snare,kick,crash,ride
--    SELECT s->>'label' AS section, t->'voices' AS drum_voices
--      FROM playable p,
--           jsonb_array_elements(p.data->'sections') s,
--           jsonb_array_elements(s->'tracks') t
--      WHERE p.id='song_bohemian' AND t->>'track'='trk_boh_drums';
-- ============================================================================
