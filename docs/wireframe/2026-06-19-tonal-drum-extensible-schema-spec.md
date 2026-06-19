---
project: notation-hero
date: 2026-06-19
status: draft — for Leo review (brainstorm output)
worktree: wireframe-pattern-lesson-model
branch: docs/wireframe-pattern-lesson-model
supersedes_open_question: docs/wireframe/2026-06-18-HANDOFF-tonal-schema-open-question.md (§3 open question)
relates:
  - docs/wireframe/2026-06-17-notation-model-draft.sql (locked Playable model + draft DDL)
  - docs/wireframe/2026-06-16-schema-deltas.md (SD ledger)
  - docs/wireframe/filter-review.md (14-filter catalogue contract)
  - architecture-spec/docs/decisions/2026-06-17-architecture-decisions.md (ADR, NH-194)
  - architecture-spec/docs/specs/2026-06-17-data-layer-requirements.md (R1–R16)
  - keen-neumann-0405de/docs/spikes/2026-06-19-gp-tonal/FINDINGS.md (NH-196 GP→tonal spike)
deciders: Leo (driver), Claude (brainstorm)
companion_visual: /tmp/nh-tonal/index.html (interactive — served on :8782 during the session)
---

# Extensible Tonal + Drum Schema — design spec

How Notation Hero stores **tonal/harmonic** attributes (key, scale, mode, chords, chord
progressions) **and drum-domain** attributes (beats, fills, rudiments, techniques, kit pieces)
so that:

1. **drums carry zero tonal NULLs** (and pitched content carries zero drum NULLs);
2. the catalogue is **searchable** by all of the above, fast, composably;
3. **new fields are cheap** to add later, with no painful `ALTER` on the hot table.

---

## 0 · Decisions (locked this brainstorm)

| # | Decision | Choice |
|---|----------|--------|
| **D1** | Relationship shape | **Hybrid (C)** — per-domain side-tables (`tonal_profile`, `drum_profile`) hanging off `playable` 1:0..1, **hot facets as typed columns + a `data jsonb` overflow on each side-table.** |
| **D2** | `musical_key` placement | **Move off `playable` → `tonal_profile`.** The wireframe's "Key hidden for drums" rule becomes "drums have no `tonal_profile` row." No nullable key on drum rows. |
| **D3** | Progression match modes | **All three:** A = exact (same key, `progression_concrete`), B = any-key/roman/transposition (`progression_roman`), C = same-loop/rotation "Axis family" (`progression_family`). |
| **D4** | Section granularity | **Both** "includes" and "exact set"; progressions are **section-scoped** (verse/chorus/bridge) in the jsonb timeline, aggregated into flat facet arrays for search. |
| **D5** | Drums | **`drum_profile` planned now** (drums-first focus). Symmetric to `tonal_profile`. A future `guitar_profile` is "just add another side-table." Only **domain-specific** (otherwise-NULL) fields live in a profile; **universal** facets stay on `playable`. |
| **D6** | Multi-key / multi-tempo / multi-meter songs | **Headline scalar + set facet + jsonb timeline.** Headline = dominant value (filter/display); set facet (`keys[]`, …) = "touches X"; `data.sections[]` = full per-section detail. |
| **D7** | Database | **SQL — Neon Postgres** for the catalogue/search (relational + arrays + GIN + cheap joins). DynamoDB stays per-user only. Not NoSQL for faceted search. |

Guard rails honoured: the **Thin** model (Neon = metadata + file keys; AlphaTab owns score internals,
R10) and the **Playable umbrella** (`playable · notation · step · playable_link`) are **unchanged** —
this spec only adds two side-tables and moves one column.

---

## 1 · Scope

**In scope:** `tonal_profile`, `drum_profile`, their facet columns + jsonb, the search semantics
(S1 chords, S2 progressions ×3 modes, S3 scales, drum ONLY/OR/AND, combine, partial-match,
multi-key), CP-1 reconciliation, the tonaljs vocabulary + ingest derivation, the schema-evolution
cost, and confirmation that all 14 wireframe filters still work.

**Base-model reconciliation — Groups A+B+R15 now APPLIED in the draft SQL** (R1 `created_by`, R2 `origin`
naming, R16 `DEFERRABLE` FKs, SD-3 `visibility`, R15 `upload_status`). **Still out of scope:** ULID
*values* (R13 — column already `text`), `POST /sync/batch` (R14, M1), Group C upload UX (SD-22/SD-23),
and the `track`/`media`/per-instrument-difficulty Round-6 items (Group D). The PATTERNS dict is already
absent from the SQL.

---

## 2 · The shape (Hybrid C, per-domain profiles)

```
                       ┌───────────────────────────────┐
                       │ playable  (universal facets)   │
                       │  id · kind · title · level     │
                       │  bpm · time_signature_*        │  ← headline tempo/meter (universal)
                       │  instruments[] · genre · tags[]│
                       │  skill[] · data jsonb          │  ← data.sections[] timeline lives here
                       └───────────────────────────────┘
                          ▲ 1:0..1 (pitched)   ▲ 1:0..1 (drums)
            ┌─────────────┘                    └─────────────┐
 ┌──────────────────────────┐         ┌──────────────────────────┐
 │ tonal_profile (pitched)  │         │ drum_profile (drums)     │
 │  playable_id PK/FK        │         │  playable_id PK/FK        │
 │  musical_key  (headline)  │         │  beats[]                  │
 │  keys[]       (touches)   │         │  fills[]                  │
 │  scales[]                 │         │  rudiments[]              │
 │  chords[]                 │         │  techniques[]             │
 │  progression_concrete[]          │         │  kit_pieces[]             │
 │  progression_roman[]             │         │  data jsonb (long-tail)   │
 │  progression_family[]            │         └──────────────────────────┘
 │  data jsonb (long-tail)   │
 └──────────────────────────┘
```

**Principle — a field goes in a profile only if it is NULL for the other domain.** Universal
facets (`level, bpm, time_signature_*, genre, tags, skill, instruments`, the `data.sections[]`
timeline) **stay on `playable`** — drums use them too. Pitched-only → `tonal_profile`. Drum-only →
`drum_profile`. A band song with guitar+drums gets **both** profiles; Twinkle-on-piano gets only
`tonal_profile`; a drum loop gets only `drum_profile` (or none). Nobody carries another domain's
NULLs.

### DDL (draft — Neon Postgres, behind Lambda; no Supabase RLS/Data-API grants)

```sql
-- pitched-only attributes; row exists ONLY for pitched playables
CREATE TABLE tonal_profile (
  playable_id   text PRIMARY KEY REFERENCES playable(id) ON DELETE CASCADE,

  -- headline (display + single-value fast filter)
  musical_key   text,                              -- 'C major','A minor','G mixolydian' (tonaljs Key)

  -- set facets (multi-value search; GIN) — aggregated across sections at ingest
  keys          text[] NOT NULL DEFAULT '{}',      -- every key the piece touches (modulation)
  scales        text[] NOT NULL DEFAULT '{}',      -- 'minor pentatonic','blues','dorian',…
  chords        text[] NOT NULL DEFAULT '{}',      -- distinct concrete chords used  → S1
  progression_concrete text[] NOT NULL DEFAULT '{}',      -- 'C-G-Am-F'        → S2 mode A (exact, same key)
  progression_roman    text[] NOT NULL DEFAULT '{}',      -- 'I-V-vi-IV'       → S2 mode B (any key)
  progression_family   text[] NOT NULL DEFAULT '{}',      -- 'I-V-vi-IV' (rotation-normalised roman) → S2 mode C (loop)

  -- long-tail / experimental (no DDL to add a field)
  data          jsonb  NOT NULL DEFAULT '{}',      -- {mode, borrowed:[], modulation:[], sections:[{...tonal}]}

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- drum-only attributes; row exists ONLY for drum playables
CREATE TABLE drum_profile (
  playable_id   text PRIMARY KEY REFERENCES playable(id) ON DELETE CASCADE,

  beats         text[] NOT NULL DEFAULT '{}',      -- groove/beat families used
  fills         text[] NOT NULL DEFAULT '{}',
  rudiments     text[] NOT NULL DEFAULT '{}',      -- 'single-paradiddle','double-stroke',…
  techniques    text[] NOT NULL DEFAULT '{}',      -- 'shuffle','double-bass','ghost-notes','linear',…
  kit_pieces    text[] NOT NULL DEFAULT '{}',      -- 'hi-hat','kick','snare','crash','ride','tom' (derived from notes at ingest)

  data          jsonb  NOT NULL DEFAULT '{}',      -- {subdivision, feel, long-tail}

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
```

> `musical_key` is **removed from `playable`** (it is line 75 of the current draft SQL — the exact
> nullable-on-drums column we are eliminating). All other `playable` columns are unchanged.

---

## 3 · `tonal_profile` — facets, multi-key, vocabulary

### 3.1 Headline + set-facet + timeline (multi-key/tempo/meter)

A song that modulates or changes tempo/meter (Bohemian Rhapsody, Africa, Happiness Is a Warm Gun) is
stored three ways, each for a job:

- **Headline** — `tonal_profile.musical_key`, `playable.bpm`, `playable.time_signature_*` = the
  dominant/opening value. Powers the simple filter + the badge in the UI.
- **Set facet** — `tonal_profile.keys[]` (every key touched), optionally a `time_signatures[]` facet, and
  bpm-range handling — so a modulating song is findable by *every* key/meter it visits.
- **Timeline** — `playable.data.sections[]`, each section:
  `{ label, barStart, barEnd, bpm?, timeSignature?, key?, scale?, progression? }`. Universal section structure
  (drums use `label/barStart/barEnd/voices` too); the **tonal keys are simply absent** on drum
  sections — no NULL columns. Overrides appear only where a value changes.

All of it is **derivable at ingest** (GP spike: F6 key-from-notes, F10 tempo timeline, F14 mode
refine, F15 windowed/multi-key, F16 meter changes).

### 3.2 Vocabulary (tonaljs) — what we store vs derive

We store **canonical strings**, validated against tonaljs at ingest (no vocabulary table needed for
v1; an optional reference table can come later for DB-level integrity):

| Facet | Stored form | tonaljs source |
|-------|-------------|----------------|
| key | `'C major'`, `'G mixolydian'` | `Key`, `Mode` |
| scale | `'minor pentatonic'`, `'blues'`, `'dorian'` | `Scale.names()` |
| chord | tonaljs symbol `'Cmaj7'`, `'Am'`, `'Cmaj7/B'` | `Chord.get(sym)` → `{tonic, type, bass}` |
| progression (concrete) | `'C-G-Am-F'` | derived from chords + key |
| progression (roman) | `'I-V-vi-IV'` | `Progression.toRomanNumerals(key, chords)` |
| progression (family) | rotation-normalised roman — rotate to start at `I`; fallback: lexicographically-smallest rotation when no `I` is present | computed from roman |

`Progression.fromRomanNumerals(key, roman)` lets us **derive concrete chords per key** from an
abstract progression — so "store abstract + render per key" is viable without a hand-built theory
engine (resolves the old CP-1 "abstract vs concrete" open question).

**Structured values are derived, not stored decomposed (tonaljs round-trip).** Every facet string is
a tonaljs *canonical form* that parses losslessly back to its components — `Key.majorKey('C')` ⇄
`'C major'` (`{tonic:'C', type:'major'}`); `Chord.get('Cmaj7/B')` ⇄ `'Cmaj7/B'` (`{tonic:'C',
type:'maj7', bass:'B'}`). So we store the **flat string** (GIN-searchable) and **derive `{tonic, type,
bass}` on read** — no fidelity lost, no decomposed columns to maintain. If component-level filtering
becomes a real need ("any maj7 chord", "any minor key"), promote a derived facet (`chord_types[]`,
`key_modes[]`) — the same born-in-jsonb-then-promote rule as any other field.

### 3.3 Derivation pipeline (ingest)

```
.gp / .gpx / .xml / .mxl  ──► AlphaTab (headless, Node)
        │  notes (realValue), masterbar key/tempo/meter, sections, explicit chords
        ▼
   tonal derivation (tonaljs + small Krumhansl key-finder)
        │  key (+ windowed for modulation), scales, chords, roman, family, sections
        ▼
   write playable.data.sections[]  +  tonal_profile{*}  (+ drum_profile{*} if drums)
```

Precompute at ingest, store. Derive-on-read only for the rare "render this progression in key X"
case (tonaljs, cheap).

---

## 4 · `drum_profile` — facets + ONLY / OR / AND

Drum-only searchable facets, all `text[]`, all GIN-indexed. Each supports the three set operators
(same primitives as the chord searches):

| Search intent | Operator | Example |
|---------------|----------|---------|
| **ONLY** these (subset — "I can play with just these") | `<@` | `rudiments <@ ARRAY['single-paradiddle','single-stroke']` |
| **OR** any of these | `&&` | `techniques && ARRAY['shuffle','ghost-notes']` |
| **AND** all of these | `@>` | `fills @> ARRAY['tom-fill','linear']` |

`beats / fills / rudiments` are **denormalized** from the canonical pattern entities (a beat/fill/
rudiment is a Pattern playable; songs/lessons reference them via `step` / `playable_link`) — the
same dual structure as progressions (§6): canonical entity + link for the detail page, denormalized
facet array for fast search. `kit_pieces` is derived at ingest (AlphaTab notes → GM-style
note→voice map → distinct voices), matching the locked "cached voices display copy" decision.

---

## 5 · Search semantics (with SQL)

All tonal/drum filters **compose** with the universal `playable` filters via `AND` — every facet is
an indexed column, so adding a filter is one more `AND`, never a query rewrite.

```sql
-- S1 · songs I can play (chord subset)
WHERE t.chords <@ ARRAY['C','G','D','Dm','D7','E','Em','A','Am'];

-- S2 · by progression
WHERE t.progression_concrete @> ARRAY['C-G-Am-F'];   -- A exact (same key)
WHERE t.progression_roman    @> ARRAY['I-V-vi-IV'];  -- B any key (transposition)
WHERE t.progression_family   @> ARRAY['I-V-vi-IV'];  -- C same loop (any key + any start: Zombie joins)

-- S2 · section-scoped "includes" vs "exact set"
WHERE t.progression_roman @> ARRAY['I-V-vi-IV'];                                  -- includes (any section)
WHERE t.progression_roman @> ARRAY['I-V-vi-IV'] AND t.progression_roman <@ ARRAY['I-V-vi-IV'];  -- exact set

-- S3 · by scale (solo practice)
WHERE t.scales @> ARRAY['minor pentatonic'];

-- multi-key · findable by any key it touches
WHERE t.keys && ARRAY['C major'];            -- touches C major (modulating song still matches)

-- partial match · "songs I can ALMOST play" (one chord away → learning path)
WHERE cardinality(t.chords) - cardinality(t.chords & ARRAY[...my chords...]) = 1;

-- combine · Axis loop, playable with my chords, beginner
SELECT p.title
FROM tonal_profile t JOIN playable p ON p.id = t.playable_id
WHERE t.progression_family @> ARRAY['I-V-vi-IV']
  AND t.chords      <@ ARRAY['C','G','Am','F','Em','D']
  AND p.level <= 3;

-- drum ONLY/OR/AND (see §4)
WHERE d.techniques && ARRAY['shuffle'];
```

> `a & b` = array intersection (the `intarray`/array overlap helpers); for `text[]` use
> `cardinality(ARRAY(SELECT unnest(a) INTERSECT SELECT unnest(b)))` or the `&&`/`@>`/`<@` operators.
> Partial-match exact SQL finalised at build time; the intent (one-chord-away) is the contract.

### The "same loop" teaching note (for the build + UI)

`progression_family` collapses **transposition + rotation**: I-V-vi-IV, V-vi-IV-I, vi-IV-I-V, IV-I-V-vi in
**any key** all normalise to one token (`I-V-vi-IV`). So "Zombie" (vi-IV-I-V in G) is in the same
family as "Let It Be" (I-V-vi-IV in C). To *play* a medley the user picks a key (transpose) and a
start chord (rotate); the match just says "same 4-chord loop." The UI should show the
**transposed-to-target-key** chords so the relationship is visible (built into the companion page).

---

## 6 · CP-1 reconciliation (progression as entity + link + facet)

Three layers, complementary:

1. **Canonical entity** — a progression is a **composite Pattern** (`kind='pattern'`,
   `pattern_kind='progression'`), whose `step`s are chord patterns, carrying `data.roman` /
   `data.quality`. Gives a named detail page ("The Axis Progression — used in these songs").
2. **Song → progression link** — `playable_link(from=song, to=progression, relation='uses')`, m:n.
3. **Fast search index** — the denormalized `progression_concrete[] / progression_roman[] / progression_family[]` facets
   on `tonal_profile`, derived from the links/sections at ingest.

"Progression + key" = `progression_{concrete,roman,family} @> …` (on `tonal_profile`) `AND` `musical_key = …` (same row) — a
**single-row predicate, no extra join.** Same composition as BPM + Key today.

---

## 7 · Schema-evolution cost (adding a tonal/drum field later)

| New field kind | Action | Touches drums / hot table? | Cost / risk |
|----------------|--------|----------------------------|-------------|
| Long-tail / experimental | write into `*_profile.data` jsonb | no | **$0** — no DDL, no migration, no lock |
| Promote to a real filter | `ALTER TABLE *_profile ADD COLUMN` (instant, metadata-only on PG13+) + backfill from jsonb + `CREATE INDEX CONCURRENTLY` | no | **low** — backfill runs on the **small** pitched/drum-only table; the big `playable` and the drum path are never rewritten |
| (rejected) wide nullable column on `playable` | `ALTER` the big hot table incl. every drum row | **yes** | NULL sprawl + lock risk |

A field can **graduate**: born free in jsonb, promoted to a column only when it earns a filter.
This is the same pattern the locked Thin model already uses (`level` + `data.difficulty`,
`has_audio` + `data.media`).

**Joins are cheap:** a 1:0..1 join on `playable_id` (PK=FK, both indexed) is the cheapest join
Postgres does, and tonal searches *start* from the small `*_profile` (GIN filter) then join to
`playable` for display — never scanning the big table to filter.

---

## 8 · Wireframe filter coverage (filter-review.md — all 14)

| Filter | Home in this design | Change |
|--------|---------------------|--------|
| 1 Search, 2 Type, 3 Genre, 4 Kind, 5 Level, 6 Instrument, 7 Tempo, 8 Time-sig, 9 Tags, 10 Skill, 11 Pattern, 13 Sort, 14 Status | `playable` (universal) — unchanged | **none** |
| **12 Key** | **`tonal_profile.musical_key` / `keys[]`** | moves off `playable`; "hidden for drums" = "no `tonal_profile` row" |
| *new* S1 chords, S2 progression ×3, S3 scales | `tonal_profile` | added |
| *new* drum beats/fills/rudiments/techniques/kit_pieces | `drum_profile` | added |

**13 of 14 unchanged; only Key relocates (and gets cleaner).** ✅

### Confirmed ship-list facets (Leo, this brainstorm)

`tonal_profile` / `playable` facets to ship (each born in jsonb, promoted to a column when it earns
a filter): **no-barre-chords** (chord difficulty), **capo / no-capo**, **tuning** (+ transpose),
**chord-count**, **has-solo** (later in line), **scale** (S3), **key**, **progression ×3 modes**.

⚠ **Spike NH-tbd:** confirm AlphaTab exposes **capo** (tuning already proven — spike F7; transpose
AlphaTab does at playback; capo is the one unverified). Low risk.

---

## 9 · Indexing plan

```sql
CREATE INDEX idx_tonal_musical_key   ON tonal_profile (musical_key);
CREATE INDEX idx_tonal_keys  ON tonal_profile USING gin (keys);
CREATE INDEX idx_tonal_chords ON tonal_profile USING gin (chords);
CREATE INDEX idx_tonal_progression_concrete  ON tonal_profile USING gin (progression_concrete);
CREATE INDEX idx_tonal_progression_roman  ON tonal_profile USING gin (progression_roman);
CREATE INDEX idx_tonal_progression_family  ON tonal_profile USING gin (progression_family);
CREATE INDEX idx_tonal_scales ON tonal_profile USING gin (scales);

CREATE INDEX idx_drum_beats  ON drum_profile USING gin (beats);
CREATE INDEX idx_drum_fills  ON drum_profile USING gin (fills);
CREATE INDEX idx_drum_rudiments    ON drum_profile USING gin (rudiments);
CREATE INDEX idx_drum_techniques   ON drum_profile USING gin (techniques);
CREATE INDEX idx_drum_kit_pieces    ON drum_profile USING gin (kit_pieces);
```

GIN backs all `<@`/`@>`/`&&` array predicates. Add a jsonb path/GIN index only if a specific
long-tail key becomes hot (then it's a promotion candidate). Partial indexes are unnecessary —
the side-tables are already only the relevant-domain rows.

### Capacity (Neon 0.5 GB free tier)

Metadata-only rows ≈ 1–3 KB; the heavy media stays in S3 (Thin model R10, Neon holds keys). With
GIN overhead (~2×), **≈ 80k–120k songs** before 0.5 GB pressure — ample for a curated drums-first
launch. UGC/scraping at much larger scale → upgrade Postgres (Neon paid, or AWS RDS/Aurora
Serverless), or add a search engine (Postgres FTS → Typesense/OpenSearch). **Never DynamoDB for
faceted search.**

---

## 10 · Changes to the base Playable model

1. **Remove** `playable.musical_key` (→ `tonal_profile.musical_key` + `keys[]`).
2. **Add** the two side-tables + indexes (§2, §9).
3. **Extend** `playable.data.sections[]` objects with optional `bpm?, timeSignature?, key?, scale?, progression?`
   (jsonb — no DDL).
4. **Add** `playable.visibility` (`public｜private｜shared`, SD-3) + `CHECK` (curated ⇒ public).
5. **Add** `notation.upload_status` (`pending_blob｜ready｜client`, R15) + relax the one-of CHECK while not `ready`.
6. **Make** all cross-row FKs `DEFERRABLE INITIALLY IMMEDIATE` (R16).
7. **Document** `created_by` = Cognito `sub` (R1: backfill curated rows w/ admin sub; PII → omit from public DTOs).
8. **Keep** provenance column name `origin` (R2 — rename allowed); ⚠️ update ADR R2 + docs + Jira to match.
9. **Polish (2026-06-19, DBeaver review):** `genre`/`family` → `text[]` (collections; array-overlap filter like `tags`); `artist` → `author text[]` + `author_type` (`artist｜teacher｜user`; **multi-artist** — e.g. Queen + David Bowie; display attribution, **distinct from `created_by`** ownership); audit columns (`created_at/updated_at/created_by/updated_by`) standardized on **every** table.
10. **No change** to `bpm`, `time_signature_numerator/denominator`, `instruments[]`, `tags`, `skill`.

---

## 11 · Out of scope / open questions / spikes

- **Base-model reconciliation (handoff §4) — Groups A+B+R15 APPLIED** in the draft SQL (R1 created_by,
  R2 `origin` naming, R16 DEFERRABLE FKs, SD-3 visibility, R15 upload_status; PATTERNS dict already
  absent in the SQL). **Still deferred:** ULID *values* (R13 — column already `text`),
  `POST /sync/batch` (R14, M1), Group C upload UX (SD-22/SD-23).
- **Round-6 items:** `track` relation, `media` table, per-instrument difficulty curve — separate;
  this spec does not conflict (per-instrument difficulty stays a `data.difficulty(by:'instrument')`
  curve).
- **Capo extraction spike** (§8).
- **`time_signatures[]` facet** — add only if "find odd-meter songs" needs every meter (vs headline). Defer
  until a real filter demand.
- **Vocabulary reference table** — app-layer tonaljs validation for v1; promote to a DB table if we
  want FK-level integrity.

---

## 12 · Implementation order (suggested slices)

1. **S0 — DDL:** create `tonal_profile` + `drum_profile` + indexes; drop `playable.musical_key`,
   backfill `tonal_profile` from existing pitched rows.
2. **S1 — ingest derivation:** AlphaTab + tonaljs pipeline writes the facets + `data.sections[]` at
   upload (build on the NH-196 spike).
3. **S2 — read contract:** extend `CatalogueFilter` with `chords`, `progression_{concrete,roman,family}`,
   `scales`, `keys`, and drum `beats/fills/rudiments/techniques/kit_pieces` (+ ONLY/OR/AND op per
   facet); SQL adapter maps to `<@`/`&&`/`@>`.
4. **S3 — UI:** wire the new filters (conditional pitched/drum), the transposed-chord display, and
   the "songs you can almost play" partial-match.
5. **S4 — capo spike** + promote any long-tail field that earns a filter.

---

*End of spec. Companion interactive: `/tmp/nh-tonal/index.html`.*
