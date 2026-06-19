---
project: notation-hero
date: 2026-06-20
status: draft — for Leo review (brainstorm output)
worktree: wireframe-pattern-lesson-model
branch: docs/wireframe-pattern-lesson-model
builds_on: docs/wireframe/2026-06-19-tonal-drum-extensible-schema-spec.md (locked tonal/drum schema, PR #52)
runnable_ddl: docs/wireframe/2026-06-20-group-d-track-media-difficulty-draft.sql (validated on nh_tonal_scratch)
relates:
  - docs/wireframe/2026-06-16-schema-deltas.md (SD ledger — Round-6 track/media/difficulty)
  - keen-neumann-0405de/docs/spikes/2026-06-19-gp-tonal/FINDINGS.md (NH-196 GP→tonal; F7 tuning)
  - nh-200-smart-structure-spike/docs/spikes/2026-06-20-smart-structure/FINDINGS.md (NH-200 — tracks addressable in shared Score)
  - agent-a6595b9997a45d9bc/docs/spikes/2026-06-19-nh137-song-slice/FINDINGS.md (NH-137 — reference, don't split)
deciders: Leo (driver), Claude (brainstorm) + MemStack Database Architect
---

# Group D — Track · Media · Per-instrument Difficulty — design spec

How Notation Hero models, on top of the locked Playable + tonal/drum schema (PR #52):

1. **tracks** — a playable can have **multiple tracks of the same instrument** (guitar lead + guitar rhythm; two vocal harmonies), each a place to hang media / difficulty / voicing;
2. **media** — **audio/video at the song level AND per track**, from **three sources** (embedded-in-`.gp`, external S3, YouTube), with the NH-137 shared full-song audio referenced once;
3. **difficulty** — honest **per-instrument and per-section** difficulty, not one scalar.

All three keep the **Thin** model (Neon = browse/search metadata + file keys; AlphaTab owns score internals) and the **hybrid** rule (hot facets = typed/GIN columns; long-tail = `jsonb`; promote on demand).

---

## 0 · Decisions (locked this brainstorm)

| # | Decision | Choice |
|---|----------|--------|
| **D-1a** | Track model | **`track` relation + keep `playable.instruments text[]` as a DERIVED facet** (`DISTINCT track.instrument`, GIN). A **split**, not a rename. (Architect: normalize the detail; denormalize only the hot filter path.) |
| **D-1b** | Instrument vocabulary | **`instrument` = the real instrument** someone learns (drums, guitar, **bass**, keys, vocals, ukulele…). **Flat, open** vocab (no CHECK). `role` = same-instrument variant (solo/rhythm/lead/pad/harmony). Bass is its own instrument, not a guitar role. |
| **D-1c** | Track ↔ score | **Share + thin pointer.** A track shares the playable's `notation` by default; `notation_track_index` = which track inside that file; nullable `notation_id` = optional per-track override. Covers shared-file / own-file / metadata-only in one table. (Spikes NH-200 + NH-137; no new spike.) |
| **D-1d** | Per-track long-tail | **`track.data jsonb`** (tuning, capo, …). Promote to a typed facet only when a real filter appears. Tuning does **not** affect tonal search (NH-196 F7 — key uses sounding pitch). |
| **D-2** | Media model | **A `media` table** keyed by `playable_id` + **optional `track_id`** (NULL = song-level). Many per scope. **3 sources** via `provider` + a location `CHECK`: `gp-embedded` \| `s3` \| `youtube`. `has_audio`/`has_video` become **derived facets**. NH-137 audioRef = a song-level row; slices resolve via `parent_id`. |
| **D-3** | Per-instrument difficulty | **3 layers.** L1 `playable.level` (browse headline, derivable). L2 `track.level` (per-instrument; a track *is* one instrument). L3 `data.sections[i].tracks[]` (per-section × per-track grid `{track, level, techniques[]}`). Curve axes renamed: `by:'fingering'`→**`by:'technique'`**, `by:'bpm'`→**`by:'tempo'`**. |
| **D-3-inv** | Track invariant | **Every playable owns ≥ 1 track** (song/part/lesson/pattern). App-layer invariant (Postgres can't cheaply enforce "≥1 child row"). ⇒ `instruments[]` is always derived; difficulty always has a track home. |

**Guard rails honoured:** Thin model + Playable umbrella unchanged; ULID `text` PKs (R13); `DEFERRABLE INITIALLY IMMEDIATE` FKs (R16); `created_by`/audit columns (R1); no RLS / no Data-API GRANTs (Neon behind Lambda, not Supabase).

---

## 1 · Scope

**In scope:** the `track` and `media` tables, `track.level`, the per-section×track difficulty grid, the derived `instruments[]` and `has_audio`/`has_video` facets, the 3-source media model, the NH-137 audio-resolution path, and the curve renames — all validated on the live scratch DB.

**Out of scope → follow-ups (see §7):** the **searchable per-instrument technique facet** for guitar/bass/piano (reconcile with `drum_profile.techniques[]`); the **Rockschool grounding** pass (level calibration + technique vocab); the **instrument family** grouping (guitar→electric/acoustic; wind; brass); the **gp-embedded → S3 extraction** ingest policy.

---

## 2 · The shape

```
                  ┌────────────────────────────────────────┐
                  │ playable (universal facets)             │
                  │  id · kind · title · level (L1 headline) │
                  │  instruments[]  ← DERIVED (DISTINCT      │
                  │                   track.instrument, GIN) │
                  │  has_audio/has_video ← DERIVED (media)   │
                  │  data.sections[].tracks[]  ← L3 grid     │
                  └────────────────────────────────────────┘
                    ▲ 0..1        ▲ 0..1        ▲ 1..N  (invariant ≥1)
            ┌───────┴──────┐ ┌────┴────────┐ ┌──┴──────────────────────────┐
            │ tonal_profile│ │ drum_profile│ │ track (D-1)                 │
            │ (pitched)    │ │ techniques[]│ │  instrument · role · name   │
            └──────────────┘ └─────────────┘ │  level (L2 per-instrument)  │
                                             │  notation_track_index       │
                                             │  notation_id? (override)    │
                                             │  data (tuning, …)           │
                                             └──┬──────────────────────────┘
                                                │ 1
                                                │ 0..N   (track_id NULL = song-level)
                                       ┌────────┴───────────────────────────┐
                                       │ media (D-2)                         │
                                       │  kind(audio|video) · provider       │
                                       │  url · s3_key · label · sort_order  │
                                       │  data(syncPoints, msOffsetBaseline) │
                                       │  provider ∈ {gp-embedded,s3,youtube}│
                                       └─────────────────────────────────────┘
```

Full runnable DDL + sample data + poke queries: **`docs/wireframe/2026-06-20-group-d-track-media-difficulty-draft.sql`**.

---

## 3 · `track` (D-1)

A song has N tracks; **multiple may share an instrument**, disambiguated by `role`.

- `instrument text NOT NULL` (flat open vocab) · `role text` (same-instrument variant) · `name` · `sort_order int NOT NULL`.
- `level smallint` (D-3 L2; CHECK 0–10) · `data jsonb` (D-1d long-tail: tuning, capo).
- **Score link (D-1c):** `notation_track_index int` (which track inside the shared file) + nullable `notation_id` (per-track override, `ON DELETE SET NULL`).
- FKs `DEFERRABLE INITIALLY IMMEDIATE`; indexes on `playable_id`, `notation_id`, `instrument`, `(instrument, level)`, `UNIQUE(playable_id, sort_order)`.
- **Derived facet:** `playable.instruments := array_agg(DISTINCT track.instrument)` recomputed on every track write (app-layer; no trigger). Keeps the O(1) catalogue filter.

**Why a table, not jsonb:** tracks are a one-to-many collection with joins (media, difficulty, voicing) and lifecycle — the normalize-first call. `instruments[]` is the single justified denormalization (the hot filter).

---

## 4 · `media` (D-2)

`media(playable_id, track_id?, kind, provider, url, s3_key, label, sort_order, data, +audit)`.

- `track_id` NULL = **song-level**; set = **per-track**. **Many per scope** (drumless / drums-only / full mix / drum-cam).
- **Three sources**, enforced by a location `CHECK`:
  - `gp-embedded` — audio lives inside the playable's/track's `.gp`; no `s3_key`/`url`. (NH-137: 7.9 MB blob; ingest may **extract to S3** → see §7.)
  - `s3` — external file (`s3_key` set). The NH-137 **shared full-song audioRef** is one such **song-level** row; sync points live in `media.data`.
  - `youtube` — external link (`url` set). Extensible (add `vimeo`… via `ALTER` of the CHECK).
- `has_audio`/`has_video` become **derived facets** (`EXISTS over media`), recomputed on write — same pattern as `instruments[]`. Kept as columns for the fast list filter.
- **NH-137 tie-in:** a slice (`kind='part'`) carries **no media** — it resolves the source song's audio via `parent_id`. No per-slice copy. (memory `notation-hero-song-slice-storage`.)

---

## 5 · Per-instrument difficulty (D-3)

Difficulty is **per-track** (a track is one instrument) **and per-section** — three layers:

| Layer | What it answers | Home | Type |
|---|---|---|---|
| **L1** | "easiest first" (catalogue sort) | `playable.level` | `smallint` (derivable from track levels) |
| **L2** | "easy **on guitar**"; sort a song's tracks by hardness | `track.level` | `smallint` (nullable, 0–10) |
| **L3** | verse-easy / chorus-hard, per part, + techniques used | `data.sections[i].tracks[] = [{track, level, techniques[]}]` | `jsonb` (detail) |

- **Curve** (other axes) stays in `data.difficulty{by,tiers}`. **Renames:** `by:'fingering'`→`by:'technique'`, `by:'bpm'`→`by:'tempo'`.
- **Leaf patterns** that vary by instrument are modelled as **one track per instrument** (F chord = guitar `track.level=3` + piano `track.level=1`) — the unified model, no separate jsonb curve needed for the instrument axis.
- **Techniques** get a home **now** in the L3 cell (`techniques[]`). The **searchable** cross-catalogue technique facet is a follow-up (§7).

---

## 6 · Validation (live scratch DB `nh_tonal_scratch`)

Loaded base + Group D under `psql ON_ERROR_STOP=1` (clean). Proof queries (in the draft SQL):

- **D-1:** SNA shows two `guitar` tracks (lead + rhythm) + bass + drums; `instruments[] == DISTINCT track.instrument`; GIN filter `@> ARRAY['bass']` matches; vocals override (own `notation_id`); per-track tuning in `data`.
- **D-2:** all 3 sources on one song; drums track with 2 media (stem + cam); song-level (4) + per-track (3); `has_audio/has_video` flip true; a slice resolves the source's audio via `parent_id`; location CHECK holds per provider.
- **D-3:** per-instrument track levels; "easy on guitar" (≤L3); F chord guitar L3 / piano L1; SNA chorus grid with levels + techniques; `by:'tempo'` + `by:'technique'` curves; lesson owns a track; headline vs max-track.

---

## 7 · Follow-ups (not Group D — captured here)

1. **Searchable per-instrument technique facet** (guitar/bass/piano) — design where pitched techniques live (a per-track `techniques[]`? a profile facet?) and **reconcile with `drum_profile.techniques[]`**. L3 cell techniques are the *descriptive* home; this is the *searchable* one (promote when the filter is real).
2. **Rockschool grounding** — read the piano/guitar/bass syllabi (`~/Sites/notation-hero-resources/Rockschool/`) to calibrate the 0–10 levels and fix the per-instrument technique vocabulary, the way drums were grounded. Pairs with (1).
3. **Instrument family grouping** (future) — guitar→electric/acoustic; families (strings/wind/brass). Flat vocab + GIN facet stays for now.
4. **gp-embedded → S3 extraction** — ingest policy: extract the embedded `.gp` audio to S3 (`provider='s3'`) vs keep `provider='gp-embedded'`. Schema supports both.

---

## 8 · Status / changelog

- **2026-06-20** — Group D brainstormed (D-1a/b/c/d, D-2, D-3 + invariant), DDL validated on `nh_tonal_scratch`, committed `051df31` (track), `a8d0288` (media), `804b735` (difficulty). Draft for Leo review.
- Resolves the Round-6 `track` / `media` / per-instrument-difficulty items in the SD ledger (`docs/wireframe/2026-06-16-schema-deltas.md`).
