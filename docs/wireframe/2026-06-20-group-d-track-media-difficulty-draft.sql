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
--         (DISTINCT track.instrument, GIN-indexed) for the fast catalogue filter. A SPLIT, not
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
  notation_id          text REFERENCES notation(id) ON DELETE SET NULL DEFERRABLE INITIALLY IMMEDIATE,            -- D-1c: OPTIONAL per-track score override; NULL = share playable's
  notation_track_index int,                                      -- D-1c: which track inside the SHARED notation file (ingest-set)
  data                 jsonb NOT NULL DEFAULT '{}',               -- D-1d: per-track long-tail {tuning:{strings[],label}, capo, ...}
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  created_by           text,                                      -- R1: Cognito sub
  updated_by           text
);

-- ordering integrity: one sort_order per playable (architect refinement; mirrors step's PK)
CREATE UNIQUE INDEX track_playable_sort ON track (playable_id, sort_order);
-- foreign-key indexes (non-negotiable)
CREATE INDEX track_playable  ON track (playable_id);
CREATE INDEX track_notation  ON track (notation_id);
-- per-instrument lookups across tracks ("songs that HAVE a bass track")
CREATE INDEX track_instrument ON track (instrument);

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
INSERT INTO notation (id, format, notation_alphatex) VALUES
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
-- 3) Catalogue filter still works on the derived facet (GIN @>): songs with a bass track
--   SELECT title FROM playable WHERE instruments @> ARRAY['bass'];      -- Seven Nation Army
--
-- 4) notation_id OVERRIDE: vocals has its own file; piano/guitar share (notation_id NULL)
--   SELECT name, instrument, notation_id, notation_track_index FROM track WHERE playable_id='let-it-be' ORDER BY sort_order;
--
-- 5) per-track tuning (D-1d jsonb): lead = Standard, rhythm = Drop D
--   SELECT name, data->'tuning'->>'label' AS tuning FROM track WHERE playable_id='sna' AND data ? 'tuning' ORDER BY sort_order;
-- ============================================================================
