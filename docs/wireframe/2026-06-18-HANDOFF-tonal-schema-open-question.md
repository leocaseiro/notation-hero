---
project: notation-hero
date: 2026-06-18
status: paused — handoff for a dedicated next-session brainstorm
worktree: wireframe-pattern-lesson-model
branch: docs/wireframe-pattern-lesson-model (single Wireframe + schema design space)
home: /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model/docs/wireframe/2026-06-18-HANDOFF-tonal-schema-open-question.md
handoff_via: MemStack "💾 Project" skill (markdown-only — MEMSTACK_PATH unset, SQLite step skipped)
supersedes_context: /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model/docs/wireframe/2026-06-16-schema-deltas.md (Round 5/6 open questions)
companion_adr: /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/architecture-spec/docs/decisions/2026-06-17-architecture-decisions.md (approved NH-194)
companion_reqs: /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/architecture-spec/docs/specs/2026-06-17-data-layer-requirements.md (R1–R16)
---

# Handoff — Chord-Progression model + the **Extensible Tonal Schema** open question

## Why this handoff
We broke from the catalog wireframe to **rethink the DB** from the wireframe's Round-5/6 open
questions. We resolved the structural ones and reached the **chord-progression** model. At that point a
**bigger, more important question** surfaced — how to grow tonal/harmonic fields **without a pile of
nullable columns** — and Leo (rightly) paused to give it its **own focused brainstorm**, ideally with a
"database architect" approach. This doc hands off (1) the chord-progression model we have, and (2) that
open question, fully framed, so the next session starts strong. It lives in the
**`wireframe-pattern-lesson-model` worktree** so the Wireframe + schema design stays in one place.

---

## 1 · Decisions LOCKED this session (the "Thin" DB rethink)

**The fork — how deep does Neon reach into the music? → THIN.** Neon stores only browse/search
**metadata + the file key**. **AlphaTab owns the score internals** (tracks, notes, voices) by parsing the
`.gp`/alphaTex file at play time. Leo: *"we honestly don't need some of the internal data already in
AlphaTab. We need only to relate video/audio, and the difficulty."*

| Topic | Decision | Shape |
|---|---|---|
| **Tracks** (was: promote `instruments[]` → `track` table) | **No table.** | `instruments text[]` stays the browse facet; guitar-solo-vs-bass distinction lives in the file. |
| **Voicing** (SD-15) | **No table; cached display copy.** | `data.voices: string[]` on a playable + `data.sections[].voices: string[]` on songs. **Populated once at ingest**, display-only (no filter) — so a step/part list shows kit-voice icons **without** loading AlphaTab. |
| **Media** (M-1) | **`data.media` jsonb** (no table). | Array of `{kind,url,provider,label,instrument?,role?}`; per-instrument-ness is a tag, not a FK. Keep `has_audio`/`has_video` booleans for the fast filter. |
| **Difficulty** (D-1) | **`level` + `data.difficulty` curve.** | Headline `level smallint` for sort/filter; `data.difficulty = {by, tiers}` jsonb carries per-instrument / bpm / fingering curves (proven on the F chord in the wireframe). |
| **Repeated parts** (SD-16) | **`ranges[]` jsonb.** | One section entry `{label, ranges:[[25,40],[60,80]], voices:[…]}` → one row, one score, many ranges. |
| **Genre** | **→ `text[]`** (collection). | A song has many genres (Pop · Rock · Singer-Songwriter). Array-overlap filter, same as `tags`/`instruments`. |

**Guard rails honored:** the locked **Playable umbrella** (`playable` · `notation` · `step` ·
`playable_link`) is **unchanged** — only the layer below it was reworked. Thin matches the approved
**R10** (Neon holds only metadata + file keys, never blobs / per-user data) and **R6** (variable/nested
data → JSONB).

---

## 2 · Chord progression — the model we have (CP-1)

**Recommended (not yet ratified — Leo paused before final confirm): A — progression is a first-class,
searchable entity. No new table.**

Leo's hard requirement that reshaped this: *"we will definitely include a filter/way to find songs by
chord progression, and chord progression + key … similar that I can already search by bpm, key."* So the
abstract progression must be a **searchable entity**, not just a display tag.

Worked example (Leo's data — also rendered at `/tmp/nh-progression/index.html`, served on `:8781`):

> **The Axis Progression (I–V–vi–IV, Major)** is used by:
> Girlfriend / Avril Lavigne / key **G** · Someone Like You / Adele / key **A** ·
> Grenade / Bruno Mars / key **G** · I'm Yours / Jason Mraz / key **B**
> Ref: hooktheory advanced-search `chordString=I+V+vi+IV`

**Mapping to the locked model (Thin):**
- **The progression** = a `playable` — `kind='pattern'`, `pattern_kind='progression'`,
  `title='The Axis Progression'`, `data.roman=['I','V','vi','IV']`, `data.quality='Major'`.
- **Songs link to it** = `playable_link(from_id=song, to_id=progression, relation='uses')` — **m:n** (a
  song uses 1+ progressions; a progression spans many songs/keys).
- **Key stays `musical_key`** on the song. So **"progression + key"** = two independent filters combined,
  exactly like BPM + Key today.
- **Fast filter (optional):** a denormalised `progressions text[]` facet on the song (GIN-indexed),
  derived from the links — mirrors `instruments[]`. Or filter via an `EXISTS` join on `playable_link`.
  (Decide at spec time.)
- **Concrete chords-in-a-key** (C→G→Am→F) are **only** built later for a progression *lesson* (a composite
  whose steps are chord playables) — **not** needed for search.

**Alternative B (rejected-ish):** progression as a `progressions text[]` tag only — filterable, but no
canonical name / detail page ("used in these songs") and nothing to teach later.

> ⚠️ **This decision is entangled with the open question below.** Progression is one of the *tonal,
> pitched-only* fields (key/scale/mode/progression) that are NULL for drums. The extensible-schema
> brainstorm should settle the **general** approach first, then slot progression into it. If we adopt
> tonaljs-based derivation, **abstract-store + derive concrete chords per key (old option B)** becomes
> feasible without hand-building a theory engine — revisit CP-1 in that light.

---

## 3 · ⭐ OPEN QUESTION → the next brainstorm: an **extensible tonal schema without a pile of nulls**

### The problem
`playable` carries many typed facet columns. Several apply only to *some* kinds/instruments:
- **Pitched-only** (guitar/keys): `musical_key`, and soon **`scale`, `mode`, chord/progression,
  modulation, …** → **NULL for every drum row.**
- Drums are the app's **main focus now**, so the dominant content would carry a growing column of tonal
  NULLs. Leo: *"a different type of relationship that would help with these particular fields and searches,
  without the bunch of nulls."*

### Why now
- **Drums first** (current focus), **but strong future intention** (Leo's friends want it): **search songs
  by tonal attributes** — key, scale, mode, **chord progression**, harmony. This is a real roadmap item,
  not a maybe.
- As tonal search grows, **more pitched-only fields appear**, multiplying sparse NULLs and ALTER TABLEs.

### What Leo explicitly asked the brainstorm to deliver
1. A **"different type of relationship"** for these tonal fields + searches, **without the NULL sprawl**.
2. A way to **expand a table without disturbing the current data**.
3. Understand the **cost/impact of adding *yet another* field in the future** (schema-evolution analysis).

### Solution space to weigh (starting point — not a decision)
1. **Wide table + nullable columns (status quo):** simplest, fast indexed filters; but sparse NULLs grow
   and every new field = an `ALTER TABLE` on the big hot table.
2. **JSONB attribute bag** (`data.tonal = {key, scale, mode, progressions:[]}`): no ALTER for new fields;
   but first-class *filter* facets in JSONB need expression/GIN indexes and are less ergonomic to query.
3. **EAV** (`attribute(playable_id, key, value)`): infinitely extensible, zero NULLs — but classic EAV
   pain (typing, indexing, join explosion). Usually wrong for query-heavy facets.
4. **Typed tonal side-table / vertical partition** (e.g. `tonal_profile(playable_id PK, musical_key,
   scale, mode, …)` that exists **only for pitched playables**): **drums simply have no row → no NULLs**;
   adding a tonal field = ALTER the *small* tonal table, touching only pitched rows. **This most directly
   answers Leo's three asks.** Progression handled via the m:n link (CP-1).
5. **Hybrid:** hot must-filter facets as columns or the typed side-table (key, progression-link);
   long-tail/experimental attributes in JSONB; promote JSONB→column when a field becomes a real filter.

Leo's hints ("different *relationship*", "without the nulls", "expand without disturbing data") point
toward **(4)/(5)**.

### Tools to bring in
- **tonaljs** — https://github.com/tonaljs/tonal — music-theory library (notes, intervals, **scales,
  chords, keys, modes, roman-numeral progressions**). Use for: (a) the **controlled vocabulary** (valid
  keys/scales/modes/chord qualities/roman progressions); (b) **derivation/validation** — e.g. roman ⇄
  concrete chords per key (I–V–vi–IV ⇄ C–G–Am–F in C). This is what makes "store abstract + derive
  concrete" viable for CP-1 **without** a hand-built theory engine.
- **hooktheory** (TheoryTab) — progression **vocabulary + seed data** + the **search UX model** (their
  advanced-search by `chordString=I+V+vi+IV` is literally the feature Leo wants). Use for canonical
  progression names + a starter dataset + UI inspiration.

### Questions the brainstorm must answer
- Which approach (1–5) — and does it differ for *hot filters* (key, progression) vs *long-tail*?
- 1:0..1 `tonal_profile` side-table vs JSONB vs hybrid — with the **add-a-field migration cost** quantified.
- Vocabulary: what does tonaljs define vs what we store; how much do we precompute at ingest vs derive on read.
- Fold **CP-1** in: keep progression as an entity+link, and/or store abstract roman + derive concrete via tonaljs.
- Indexing/filter plan for "by progression" and "progression + key" (GIN facet vs join).
- Drums-first guard: nothing tonal should bloat or slow the drum content path.

---

## 4 · Still PENDING (not done — don't lose these)
The **reconciliation pass** against the approved ADR
(`/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/architecture-spec/docs/decisions/2026-06-17-architecture-decisions.md`)
still has to happen (was the next batch when we paused):
- **`created_by`** (R1, the Cognito `sub`) on the catalogue item — ownership seam.
- **Client-minted ULID `text` PKs** (R13) — current draft SQL uses human slugs (`sna`, `hihat-8`); the
  real schema needs ULIDs for offline-first idempotent upserts.
- **`source` vs `origin` naming** — ADR R2 says `source`; the draft renamed it `origin`. Pick the canonical name.
- **`notation.upload_status`** (`pending_blob｜ready`) + relaxed one-of CHECK (R15).
- **`DEFERRABLE INITIALLY IMMEDIATE`** on cross-row FKs (R16).
- **Drop the vestigial `PATTERNS` dict** — the id-duality wart (vocabulary slugs vs pattern-playable ids).

---

## 5 · Next session — how to run it

**Recommended setup:**
- **`superpowers:brainstorming`** to run the session (one decision at a time, design → approval → spec).
- **MemStack `Migration Planner`** skill for the **add-a-field / expand-without-disturbing-data** cost
  analysis (there is **no skill literally named "Database Architect"**; Migration Planner is the on-point
  match; `RLS Guardian` also relevant for Postgres table safety).
- *Optional* — a MemStack **`agent_run`** with a custom **"Database Architect"** role
  (`agents:{architect:{role:"Database Architect", prompt:"…"}}`) if you want the autonomous multi-agent treatment.

**--- PASTE INTO NEXT CC SESSION ---**
```
Working directory: /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model
Read docs/wireframe/2026-06-18-HANDOFF-tonal-schema-open-question.md (full context + decisions).

Brainstorm: an EXTENSIBLE schema for tonal/harmonic attributes (key, scale, mode, chord
progression, harmony) that grows over time WITHOUT a pile of nullable columns — drums (no
tonal data) must not carry tonal NULLs. Decide the relationship shape (typed tonal
side-table vs JSONB bag vs hybrid), define the vocabulary with tonaljs + hooktheory, fold
the chord-progression model (CP-1, §2) into it, and quantify the cost of adding a new tonal
field later. Keep the locked "Thin" model (§1) and the Playable umbrella intact.

Run with superpowers:brainstorming + MemStack Migration Planner. tonaljs:
https://github.com/tonaljs/tonal · hooktheory advanced-search by chordString.
```
**--- END HANDOFF ---**

---

## 6 · Key files / references (full paths)
- **This handoff:** `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model/docs/wireframe/2026-06-18-HANDOFF-tonal-schema-open-question.md`
- **Open-question source (Round 5/6):** `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model/docs/wireframe/2026-06-16-schema-deltas.md`
- **Locked Playable model + draft SQL:** `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model/docs/wireframe/2026-06-17-notation-model-draft.sql`
- **Model map (source of truth):** `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model/docs/wireframe/model-map.html`
- **Sibling handoff (wireframe review):** `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model/docs/wireframe/2026-06-18-HANDOFF-wireframe-review-done.md`
- **Approved ADR (NH-194):** `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/architecture-spec/docs/decisions/2026-06-17-architecture-decisions.md`
- **Data-layer requirements R1–R16:** `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/architecture-spec/docs/specs/2026-06-17-data-layer-requirements.md`
- **Chord-progression worked example (throwaway):** `/tmp/nh-progression/index.html` (served on `:8781`)
- **tonaljs:** https://github.com/tonaljs/tonal · **hooktheory** TheoryTab advanced-search
