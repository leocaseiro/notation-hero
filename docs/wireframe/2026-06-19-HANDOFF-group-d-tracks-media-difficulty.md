---
project: notation-hero
date: 2026-06-19
status: handoff — start a fresh session for Group D
worktree: wireframe-pattern-lesson-model
branch: docs/wireframe-pattern-lesson-model
pr: https://github.com/leocaseiro/notation-hero/pull/52
home: /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model/docs/wireframe/2026-06-19-HANDOFF-group-d-tracks-media-difficulty.md
---

# Handoff — Group D: tracks · media · per-instrument difficulty

## 0 · How to start (paste into a fresh Claude Code session)

```
Working directory: /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model
Read docs/wireframe/2026-06-19-HANDOFF-group-d-tracks-media-difficulty.md (full context).

Brainstorm Group D for the catalog schema: (1) a `track` relation (a song can have
multiple tracks of the SAME instrument — guitar solo + guitar bass — which the flat
`instruments text[]` facet cannot represent), (2) a per-track + song-level `media` model
(audio/video), and (3) per-instrument difficulty (a barre chord is hard on guitar, easy on
piano — one scalar `level` is insufficient). Keep the locked Thin model + Playable umbrella +
the hybrid "facet columns + jsonb overflow" philosophy. Validate DDL on the live Postgres
scratch DB `nh_tonal_scratch` (localhost:5432) by loading the draft SQL after edits.

Run with superpowers:brainstorming + MemStack Database Architect.
```

## 1 · What is LOCKED — do NOT redo (commits on this branch / PR #52)

The tonal/drum schema work is **done, validated on Postgres, and in PR #52**. Group D builds on it; don't re-open it.

- **Spec:** `docs/wireframe/2026-06-19-tonal-drum-extensible-schema-spec.md`
- **Runnable draft SQL:** `docs/wireframe/2026-06-19-tonal-drum-schema-draft.sql` (loads clean under `psql ON_ERROR_STOP`)
- **Locked decisions:** Hybrid (C) — `tonal_profile` + `drum_profile` per-domain side-tables (zero cross-domain NULLs); D1–D7; CP-1 (progression = composite pattern + link + denormalised facets); base-model reconciliation A+B+R15 (DEFERRABLE FKs, `created_by`, `visibility`, `upload_status` incl. device-local `client`, `origin` naming); polish (`genre`/`family`→`text[]`, `author text[]`+`author_type`, audit columns everywhere, universal `description text` ≤255); tonaljs value model (store canonical strings, derive `{tonic,type,bass}` on read).
- **Guard rails (keep intact):** the **Thin** model (Neon = browse/search metadata + file keys; AlphaTab owns score internals), the **Playable umbrella** (`playable · notation · step · playable_link`), and the **hybrid** rule (hot facets = GIN-indexed columns; long-tail = jsonb; promote jsonb→column when a real filter appears).

## 2 · Group D scope (3 items — all currently DEFERRED)

### D-1 · `track` relation (the headline — "multiple tracks")

**Problem:** a song can have **multiple tracks of the same instrument** — e.g. guitar `solo` + guitar `bass`/`rhythm`, or two vocal harmonies. The flat `playable.instruments text[]` facet can't represent that, and per-track media (D-2) / per-instrument difficulty (D-3) / voicing all need a track identity.
**Recommended shape (from Round-6, not yet ratified):** a `track` relation **+ keep `instruments[]` as a derived facet** (DISTINCT instrument across tracks) for the fast catalog filter. So it's a **split**, not a rename.

```sql
-- sketch (decide in the brainstorm)
CREATE TABLE track (
  id          text PRIMARY KEY,           -- ULID at real-schema time
  playable_id text NOT NULL REFERENCES playable(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
  instrument  text NOT NULL,              -- 'drums'|'guitar'|'keys'|'bass'|...
  role        text,                       -- 'solo'|'rhythm'|'lead'|'bass'|'pad' — disambiguates same instrument
  name        text,
  sort_order  int,
  created_at  timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  created_by  text, updated_by text
);
-- keep playable.instruments text[] as the DERIVED facet (DISTINCT track.instrument), GIN-indexed.
```

**Open:** is `bass` a guitar `role` or its own `instrument` (vocab)? Per-instrument difficulty per-track or a by-instrument curve (ties to D-3)? Does a `track` carry its own `notation_id` (per-track score) or share the playable's?

### D-2 · `media` model (per-track + song-level audio/video) — relates to SD-24

**Today:** song-level only — `playable.has_audio`/`has_video` booleans + `data.media` jsonb (Thin model). **F7 wants** each **track** to carry its own n audio + n video (drum-cam, bass stem, lead-guitar cam…).
**Decision to make:** keep `data.media` jsonb vs promote to a `media` table keyed by `playable_id` + optional `track_id` (NULL = song-level). A table makes per-track media + the source song's shared `audioRef` (the SD-24 slice resolves it via `parent_id`, not a per-slice copy) first-class; jsonb stays lightest.

```sql
-- sketch (decide in the brainstorm)
CREATE TABLE media (
  id text PRIMARY KEY, playable_id text NOT NULL REFERENCES playable(id) ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE,
  track_id text REFERENCES track(id) ON DELETE CASCADE,   -- NULL = song-level media
  kind text NOT NULL,  -- 'audio'|'video'
  provider text, url text, s3_key text, label text, sort_order int
);
```

**Tie-in:** the **NH-137 song-slice** (SD-24) is **positions-only** — its shared `audioRef` (one S3 key / `youtubeId` for the FULL-song audio) lives on the **source song**, and the sliced alphaTex + rebased sync are **derived at runtime, not stored** (memory `notation-hero-song-slice-storage`). So D-2 should give the **source** a clean home for that shared audio ref + its sync points (media row vs `notation.data`); the slice resolves it via `parent_id`. No per-slice media.

### D-3 · per-instrument difficulty

**Problem:** one scalar `playable.level` is insufficient — the **same** chord/notation is hard on guitar (CMaj7 / F-barre, L4–6) and easy on piano (L1). The wireframe proved a `data.difficulty(by:'instrument', tiers:[{when:'piano',level},{when:'guitar',level}])` curve on the F chord.
**Options:** (a) keep the `data.difficulty` curve (jsonb, by:'instrument'); (b) `level_by_instrument jsonb`; (c) per-`track` level column (if D-1 lands). Keep the headline `level smallint` for the fast sort/filter; the per-instrument detail is the long tail.

## 3 · Method + guard rails

- **superpowers:brainstorming** (one decision at a time → design → approval → spec) **+ MemStack Database Architect** (note: it is Supabase-flavoured — Notation Hero is **Neon behind Lambda**, **ULID `text` PKs (R13)**, **no RLS / no Data-API GRANTs**; take its structural guidance, drop the Supabase specifics).
- **Validate every DDL change on the live scratch DB** (see §5) before claiming it works — that caught a real bug this session.
- Follow Leo's collaboration rules (AskUserQuestion per decision, chunked findings, full paths, commit before review).

## 4 · Key files (full paths)

- Spec: `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model/docs/wireframe/2026-06-19-tonal-drum-extensible-schema-spec.md`
- Draft SQL: `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model/docs/wireframe/2026-06-19-tonal-drum-schema-draft.sql`
- SD ledger (Current-status table + Round-6 + SD-24): `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model/docs/wireframe/2026-06-16-schema-deltas.md`
- v3 Round-6 DDL sketches (track/media/difficulty): `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model/docs/wireframe/2026-06-17-notation-model-draft.sql` (bottom)
- GP→tonal spike (NH-196): `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/keen-neumann-0405de/docs/spikes/2026-06-19-gp-tonal/FINDINGS.md`
- Song-slice spike (NH-137, SD-24): `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/agent-a6595b9997a45d9bc/docs/spikes/2026-06-19-nh137-song-slice/FINDINGS.md`
- ADR + data-layer requirements: `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/architecture-spec/docs/decisions/2026-06-17-architecture-decisions.md` · `.../docs/specs/2026-06-17-data-layer-requirements.md`
- PR: https://github.com/leocaseiro/notation-hero/pull/52

## 5 · The live scratch DB

A local Postgres 14 is running; the draft schema is loaded into a **throwaway** DB:

```
host localhost · port 5432 · db nh_tonal_scratch · user leocaseiro
reload after edits:  psql -d nh_tonal_scratch -v ON_ERROR_STOP=1 -f docs/wireframe/2026-06-19-tonal-drum-schema-draft.sql
```

Poke-around queries are at the bottom of the `.sql`.

## 6 · Related open threads (NOT Group D — don't pull them in)

- **Group C** — upload/ingest UX (SD-22 load-and-go, SD-23 GP-file = song or pattern); pairs with the `upload_status` seam.
- **SD-24 / NH-137** — song slice (its own thread); only the `audioRef`/media reconciliation overlaps D-2.
- **Per-user (DynamoDB), not catalog:** SD-12 score filter/sort, SD-20 per-step score, SD-21 completed flag.
- **Minor/deferred:** SD-10 sort direction, SD-11 flag filters, SD-17 step description, SD-15 deep voicing (note/voice_map).
- **`origin` naming** — ADR/Jira amended (commit f5f7171 on `docs/architecture-decisions`, NH-194 comment); a PR to land it on master is still pending.
