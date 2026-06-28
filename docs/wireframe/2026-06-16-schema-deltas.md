# Catalog schema — UI-surfaced deltas (running ledger)

Findings from the catalog **wireframe** (`docs/wireframe/index.html`) that touch the **locked** schema
(`docs/specs/2026-06-10-catalog-schema.md`).

**Model:** wireframe surfaces a gap → logged here as a numbered delta → **you approve each one** → only then
is the locked spec amended (with a changelog line). Unapproved gaps stay open or live in `data jsonb`.
Nothing changes unilaterally.

**Status legend:** 🔵 open (needs your call) · 🟢 approved → applied · ⚪ confirmed, no change · ⛔ rejected

---

## ✅ Current status — 2026-06-19 reconciliation (READ THIS FIRST)

The round-by-round log below is **historical**. After the locked Playable model (C1–C5) and the
2026-06-19 tonal/drum schema pass, here is the **current truth** for every SD. Resolutions point to
`2026-06-19-tonal-drum-schema-draft.sql` + `2026-06-19-tonal-drum-extensible-schema-spec.md`.

| SD                        | Status            | Current resolution                                                                                                                                                                                                                                                                                                                      |
| ------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SD-1                      | ✅ resolved       | `lesson_type` **dropped** (C5); fills = `pattern_kind='fill'`; lesson kind derived from its step patterns. The Round-4 "add `lesson_type='fill'`" is **moot** (no `lesson_type` at all).                                                                                                                                                |
| SD-2                      | ✅ no DDL         | breakdown found by reverse query (`parent_id` for parts / `step` for lessons).                                                                                                                                                                                                                                                          |
| SD-3                      | ✅ resolved       | owner = `created_by` (R1); `visibility` (public｜private｜shared) column added.                                                                                                                                                                                                                                                         |
| SD-4                      | ✅ no change      | per-user score/history → DynamoDB, joined client-side.                                                                                                                                                                                                                                                                                  |
| SD-5                      | ✅ resolved       | hasParts/hasSteps derived (no column).                                                                                                                                                                                                                                                                                                  |
| SD-6                      | ✅ resolved       | numbered pagination (OFFSET+COUNT).                                                                                                                                                                                                                                                                                                     |
| SD-7                      | ✅ resolved       | `level BETWEEN 0 AND 10` (0 = Debut).                                                                                                                                                                                                                                                                                                   |
| SD-8                      | ✅ evolved        | `genre`/`family` are now `text[]` collections (overlap filter) — supersedes "columns stay single" for those two.                                                                                                                                                                                                                        |
| SD-9                      | ✅ evolved        | `musical_key` moved to `tonal_profile` (D2); "hidden for drums" = no `tonal_profile` row.                                                                                                                                                                                                                                               |
| SD-10                     | 🔵 deferred       | sort direction (asc/desc) — v1.3 UI.                                                                                                                                                                                                                                                                                                    |
| SD-11                     | 🔵 deferred       | flag filters (audio/video/parts) — v1.3.                                                                                                                                                                                                                                                                                                |
| SD-12                     | 🔵 deferred       | score filter/sort → per-user (DynamoDB), with the scores build.                                                                                                                                                                                                                                                                         |
| SD-13                     | ✅ evolved        | `artist` → `author text[]` + `author_type`; filterable (GIN).                                                                                                                                                                                                                                                                           |
| SD-14                     | ✅ resolved       | patterns are first-class playables; "Used in" = reverse `playable_link`; browse = a read view.                                                                                                                                                                                                                                          |
| SD-15                     | 🟡 partial        | `track` relation now EXISTS (Group D D-1) — the track identity SD-15 needed. **Unify:** per-section voicing folds into the D-3 grid cell → `data.sections[].tracks[]` = {track, level, techniques[], **voices[]**}. Deep note/voice_map decomposition still deferred (notes in AlphaTab — Thin). See Group D reconciliation 2026-06-20. |
| SD-16                     | ✅ resolved       | repeated parts = `data.sections[].ranges[[s,e],…]` jsonb.                                                                                                                                                                                                                                                                               |
| SD-17                     | 🔵 small/deferred | step description → `step.data.description` (not yet added).                                                                                                                                                                                                                                                                             |
| SD-18                     | ✅ no change      | items w/o steps/sections — UI/validation only.                                                                                                                                                                                                                                                                                          |
| SD-19                     | ✅ resolved       | lesson description → `data.description` (jsonb).                                                                                                                                                                                                                                                                                        |
| SD-20                     | 🔵 deferred       | per-part/step score → per-user (DynamoDB).                                                                                                                                                                                                                                                                                              |
| SD-21                     | 🔵 deferred       | completed flag + reset → per-user (DynamoDB).                                                                                                                                                                                                                                                                                           |
| SD-22                     | 🔵 open (Group C) | load-and-go upload — pairs with `notation.upload_status` (seam added).                                                                                                                                                                                                                                                                  |
| SD-23                     | 🔵 open (Group C) | GP file = song or pattern — upload must classify.                                                                                                                                                                                                                                                                                       |
| Lesson↔Step↔Pattern model | ✅ resolved       | locked Playable model (umbrella + `step` junction + parts first-class + `lesson_type` dropped) settled the tangle; GP-file role (SD-23) remains for Group C.                                                                                                                                                                            |

**Pending status (2026-06-23) — READ THIS for current state.** Every open delta is now either **resolved** or **filed as a Jira ticket** (all labelled `schema-delta` in NH). The table below is the authoritative current view; the historical round-by-round log further down is kept for provenance only. **Group D** (track/media/difficulty) — ✅ resolved 2026-06-20.

### ✅ 2026-06-24 — schema-delta brainstorm RESOLVED (4 deltas → PR)

Full decisions: `docs/wireframe/2026-06-24-schema-delta-decisions.md`. The fresh draft schema
(`2026-06-21-per-track-profiles-and-seed-draft.sql`) was edited + re-validated on `nh_tonal_scratch`.

| SD                 | Resolution                                                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SD-28** (NH-219) | `track.role text` → **`track.roles text[]`** (overlap filter, GIN). Tri-state instrument/role tree; flat solo/lead siblings; display-groups ("Rhythm (chords)" / "Tabs") in shared code; role is curated/UGC. |
| **SD-26** (NH-218) | instrument **derived from the AlphaTab GM program** (never UGC); **family = code-only map** over the existing `instruments[]` (no column; don't overload musical `family[]`).                                 |
| **SD-25** (NH-217) | **`track.techniques text[]`** (GIN) for ALL instruments; `drum_profile.techniques` **removed** (moved to track); auto-extract from AlphaTab effects + curate.                                                 |
| **SD-15** (NH-213) | **stay Thin** — no `note`/`voice_map`; voicing = `kit_pieces[]` + jsonb grid + runtime AlphaTab.                                                                                                              |
| 🆕 provenance      | **`track.source_instrument_id` + `source_instrument_kind`** — auditable instrument derivation.                                                                                                                |
| **SD-22** (NH-216) | confirm-and-defer — `notation` upload seam already covers it; dep = ULID (NH-183). Findings on NH-216.                                                                                                        |
| **SD-33** (NH-223) | DB already done (`author[]` via SD-13) → **wireframe phase** (after this PR).                                                                                                                                 |
| **NH-230**         | origin field rides in this PR (already in the draft).                                                                                                                                                         |
| 🆕 NH-232 / NH-233 | extractor reads GM program + technique effects · AlphaTab-gap spike (PR + patch-package if needed).                                                                                                           |

### 🎫 Pending deltas → Jira (2026-06-23)

| SD              | Jira                                                     | Disposition                                                                                                                                                        |
| --------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SD-10           | [NH-210](https://leocaseiro.atlassian.net/browse/NH-210) | catalog column-header sort — click to sort, asc/desc (TanStack Table)                                                                                              |
| SD-11           | [NH-211](https://leocaseiro.atlassian.net/browse/NH-211) | flag filters + playback-source toggle (synth/video/audio)                                                                                                          |
| SD-12           | [NH-212](https://leocaseiro.atlassian.net/browse/NH-212) | per-user score filter+sort (DynamoDB, M1)                                                                                                                          |
| SD-15           | [NH-213](https://leocaseiro.atlassian.net/browse/NH-213) | brainstorm — deep voicing decomposition · `schema`                                                                                                                 |
| SD-17           | —                                                        | ✅ resolved — universal `description` field (every playable) covers it                                                                                             |
| SD-20           | [NH-214](https://leocaseiro.atlassian.net/browse/NH-214) | brainstorm — per-part/step score model                                                                                                                             |
| SD-21           | [NH-215](https://leocaseiro.atlassian.net/browse/NH-215) | brainstorm — completed flag + reset                                                                                                                                |
| SD-22           | [NH-216](https://leocaseiro.atlassian.net/browse/NH-216) | brainstorm — load-and-go upload (Group C)                                                                                                                          |
| SD-23           | —                                                        | ✅ resolved — manual song/lesson choice on upload (edit-mode only)                                                                                                 |
| SD-24           | [NH-137](https://leocaseiro.atlassian.net/browse/NH-137) | ✅ defined — song slice = positions-only part (NH-137)                                                                                                             |
| SD-25           | [NH-217](https://leocaseiro.atlassian.net/browse/NH-217) | technique facet · `schema`                                                                                                                                         |
| SD-26           | [NH-218](https://leocaseiro.atlassian.net/browse/NH-218) | instrument family facet · `schema`                                                                                                                                 |
| SD-27           | —                                                        | ✅ resolved — per-track tonal/drum profiles (PR #52)                                                                                                               |
| SD-28           | [NH-219](https://leocaseiro.atlassian.net/browse/NH-219) | lead vs rhythm selector · `schema`                                                                                                                                 |
| SD-29           | —                                                        | ✅ resolved — component voices `listable:false`                                                                                                                    |
| SD-30           | —                                                        | ✅ resolved — playable_link relation vocabulary (uses/variation/similar)                                                                                           |
| 🔤 Rename       | [NH-220](https://leocaseiro.atlassian.net/browse/NH-220) | "catalog" (USA) spelling — wireframe swept 2026-06-23; repo-wide doc files + `CatalogFilter` type remain                                                           |
| SD-31           | [NH-221](https://leocaseiro.atlassian.net/browse/NH-221) | router/UI uses `pattern_kind`, not `pattern` (e.g. `#/fill/123`, not `#/pattern/123`) — a "Router TODO" warning is shown on the pattern page so it's not forgotten |
| SD-32           | [NH-222](https://leocaseiro.atlassian.net/browse/NH-222) | structured song learning — a Lesson that `uses` a Song (F5); wireframe example gated on Song Parts                                                                 |
| SD-33           | [NH-223](https://leocaseiro.atlassian.net/browse/NH-223) | wireframe `artist` → `author[]` (schema already did via SD-13) · `schema`                                                                                          |
| SD-34           | [NH-224](https://leocaseiro.atlassian.net/browse/NH-224) | per-instrument lesson-kind taxonomy · relates NH-218/NH-219                                                                                                        |
| SD-35           | [NH-225](https://leocaseiro.atlassian.net/browse/NH-225) | gp-embedded audio → S3 ingest policy · `schema`                                                                                                                    |
| SD-36           | [NH-226](https://leocaseiro.atlassian.net/browse/NH-226) | Rockschool 0–10 level + technique-vocab calibration                                                                                                                |
| SD-37           | [NH-228](https://leocaseiro.atlassian.net/browse/NH-228) | standalone pattern authoring (admin create a beat/fill/rudiment)                                                                                                   |
| ULID (R13)      | [NH-183](https://leocaseiro.atlassian.net/browse/NH-183) | client-minted ULID PKs → folded into the Offline Sync epic (comment)                                                                                               |
| `notation_tex`  | rename branch                                            | `notation_tex`/`alphatex` → `notation_alphaTex` — on `chore/nh-220-catalog-to-catalog`                                                                             |
| Play-next       | [NH-229](https://leocaseiro.atlassian.net/browse/NH-229) | play-next on the (future) play screen                                                                                                                              |
| origin land     | [NH-230](https://leocaseiro.atlassian.net/browse/NH-230) | land the `origin` decision on master (name **kept**, R2)                                                                                                           |
| `PATTERNS` dict | —                                                        | note: drop the vestigial `PATTERNS = {}` const + fallback refs when next touching the data layer (cleanup)                                                         |

> **Future note (per Leo, 2026-06-23):** a per-**relationship** description may be wanted later (a note on _why_ two playables are `similar`, or a teaching note on a `uses` link). Cheapest path when needed: a `note` text field on `playable_link` — no new table. Not added yet (YAGNI).

### 🆕 New deltas (2026-06-19 pm)

- `**description` (universal field) — ✅ added.\*\* Every playable gets `description text` (≤255 via CHECK) — a one-liner under the title. Supersedes the per-lesson/step `data.description` idea (SD-17/SD-19); applied to the draft SQL.
- **SD-24 — Song slice as a _derived_ part (NH-137).** Spike: `agent-a6595b9997a45d9bc/docs/spikes/2026-06-19-nh137-song-slice/FINDINGS.md`. **Decided shape (memory `notation-hero-song-slice-storage`): positions-only + pointers, NO per-slice notation or blob.** A slice (bars A–B) = a `**kind='part'**` playable (`parent_id`=source + `start_bar`/`end_bar`=range — **existing** fields). The shared media ref (`audioRef` = one S3 key for the FULL-song audio, or `youtubeId`) lives on the **source song** (not duplicated per slice). The sliced **alphaTex + rebased sync points are derived at runtime** (AlphaTab ~35 ms) — **not stored**; optionally _cache_ them in the part's `data` purely to skip re-slicing. `msOffsetBaseline` is optional/derivable. **No new columns;** the rhythm-game Score stays separate. **Open (OQ-1..6):** audio-storage shape · A0 read-only "play a part" as a separate cheaper feature · alphaTex fidelity on a broader corpus · AlphaTab version pin (1.8.3 vs the site's 1.7.0-alpha) · repeats/alternate-endings crossing the cut. **Not Group D** — its own NH-137 thread (only the source's shared `audioRef` home overlaps D-2).

### 🆕 Group D resolved + delta reconciliation (2026-06-20)

Group D (track · media · per-instrument difficulty) is **designed, validated on `nh_tonal_scratch`, on PR #52** — spec `docs/wireframe/2026-06-20-group-d-spec.md`, DDL `docs/wireframe/2026-06-20-group-d-track-media-difficulty-draft.sql`. This **resolves the Round-6 track/media/difficulty items**:

- **Round-6 · Tracks → ✅ RESOLVED (D-1).** `track` relation (multi-track same instrument via `role`) + `playable.instruments text[]` kept as a DERIVED facet (`DISTINCT track.instrument`, GIN). bass = own instrument; share + `notation_track_index` + nullable `notation_id` override; `track.data` for tuning (NH-196 F7: tuning ≠ tonal search). **Invariant: every playable owns ≥1 track.**
- **Round-6 · Media (F7) → ✅ RESOLVED (D-2).** `media(playable_id, track_id?)` — song-level + per-track, many per scope; **3 sources** (`gp-embedded` | `s3` | `youtube`) via a location CHECK; `has_audio`/`has_video` now DERIVED facets; NH-137 shared audioRef = a song-level row, slices resolve via `parent_id`.
- **Round-6 · Per-instrument difficulty → ✅ RESOLVED (D-3).** 3 layers — `playable.level` (browse headline) / `track.level` (per-instrument) / `data.sections[].tracks[]` (per-section × per-track grid `{track, level, techniques[]}`). Curve renames: `by:'fingering'`→`'technique'`, `by:'bpm'`→`'tempo'`.

**Delta check — interactions + new items surfaced:**

- **SD-15 (voicing) advanced.** The `track` identity SD-15 needed now exists (D-1). **Unify:** per-section voicing folds into the D-3 grid cell → `data.sections[].tracks[]` = `{track, level, techniques[], voices[]}` (one per-(section,track) record; supersedes a separate `data.sections[].voices`). Deep note/voice_map decomposition stays deferred (notes in AlphaTab — Thin model).
- **🆕 SD-25 (deferred) — searchable per-instrument technique facet.** Guitar/bass/piano want a searchable `techniques[]` like `drum_profile.techniques[]` ("find slap-bass songs"). The L3 grid cell is the _descriptive_ home; this is the _searchable_ facet — design where pitched techniques live + reconcile with drums. Pairs with Rockschool.
- **🆕 SD-26 (deferred) — instrument family grouping.** guitar→electric/acoustic; families (strings/wind/brass). Flat open vocab + GIN facet stays for now.
- **Ingest note (not a numbered SD):** `gp-embedded` audio (7.9 MB in the `.gp`) — ingest policy to extract to S3 (`provider='s3'`) vs keep embedded; schema supports both.

**Confirmed still-open (unchanged — correctly OUT of Group D scope):** SD-10/SD-11 (v1.3 UI), SD-12/SD-20/SD-21 (per-user → DynamoDB), SD-17 (step description, tiny), **Group C** SD-22/SD-23 (upload UX). **No catalog-schema delta is missing** — Group D closed the Round-6 structural items; the remainder are per-user, UI-only, or upload-flow.

---

## ✅ SD-1 — Are **Fills** a `lesson_type` or only a `pattern.kind`? _(resolved 2026-06-19 — `lesson_type` dropped; see Current status)_

- **What the UI needs:** the Lessons tab shows sub-kinds **Beats · Rudiments · Fills** (locked UI). To list a
  "Fill" as a browsable lesson, an item needs `lesson_type='fill'`.
- **Schema today:** `catalog_item.lesson_type` open vocab = `'song-breakdown' | 'beat' | 'rudiment'`.
  `'fill'` exists only as `pattern.kind='fill'` (a reusable vocabulary entry, not a browsable lesson).
- **Why it matters:** without `lesson_type='fill'`, the Fills sub-tab has nothing to list (or must query
  `pattern`, which is a different entity with no steps/BPM-ladder).
- **Proposed change:** add `'fill'` to the `lesson_type` open vocab (no DDL change — it's a free-text column;
  just a documented value + a seed). Keep `pattern.kind='fill'` for the reusable-vocabulary role.
- **Cheapest alternative:** point the Fills sub-tab at `pattern` rows instead of lessons (changes what "Fills"
  means — vocabulary, not practiceable lessons).
- **Prior art:** the catalog-UI memory already flagged _"Fills → add `lesson_type='fill'` (schema tweak, open_
  _vocab)."_ This delta just formalises the decision.

## ✅ SD-2 — How does a **Song** find its "Practice in parts" lesson? _(resolved — reverse query; see Current status)_

- **What the UI needs:** Song detail shows **Practice in parts** → a song-breakdown lesson whose steps slice
  that song.
- **Schema today:** the link is _one-way_ — a song-breakdown `exercise` points **up** to the song via
  `source_item_id`. There's no pointer **down** from the song to its breakdown lesson(s).
- **Why it matters:** to render the button, the app must reverse-query `exercise WHERE source_item_id = :song`
  and group by `lesson_id` (works, but it's an implicit relationship the K-3 list projection doesn't carry).
- **Proposed change:** none to DDL — document the reverse lookup as the supported pattern, and (optionally)
  expose a `breakdownLessonIds[]` convenience field on `GET /catalog/{id}` computed at read time.
- **Cheapest alternative:** keep it purely query-driven (current assumption). ⚪ leaning no-change.

## ✅ SD-3 — Where does a **user-upload's owner** live (for the "my uploads" view)? _(resolved 2026-06-19 — created_by + visibility; see Current status)_

- **What the UI needs:** a signed-in **User** sees their own uploaded drafts (e.g. _"My practice loop"_) that
  aren't in the shared published catalog; **Admin** sees all.
- **Schema today:** `catalog_item.source='user-upload'` + `status` exist, but there is **no `owner` / `uploader_id**`
  columnPhase 1 — a thin deployable AWS slice. Deferred-slots note says user files are _"keyed by uploader, never auto-published"_ — but doesn't say
  where the uploader key lives.
- **Why it matters:** filtering "items owned by _this_ user" needs an owner reference somewhere queryable.
- **Proposed change (options to decide):** (a) add `owner_id text` to `catalog_item` (NULL for curated);
  (b) keep user-upload pointers **per-user in DynamoDB** and never list them from the catalog query; (c) a
  separate `user_upload` table.
- **Cheapest alternative:** (b) — matches "per-user data → DynamoDB"; the catalog stays curated-only. Likely
  the right call, but it changes how the User role's library is assembled (two sources merged client-side).

## ⚪ SD-4 — Per-user score/history on list + detail (confirmed, no change)

- Best score, sessions, trend, top-BPM are **per-user (DynamoDB)**, joined **client-side** — never in the
  catalog tables. The wireframe fakes them on the item for demo only. The K-3 list projection (catalog fields
  only) + client-side join **holds** under the UI. **No schema change.**

## ⚪ SD-5 — Row flags `hasParts` / `hasSteps` (no new column — derive)

- **What the UI needs:** row indicators for audio / video / "has parts-or-steps" (`volume_up` · `smart_display`
  · `splitscreen`).
- **Decision (you, 2026-06-16):** **no extra schema flag.** `has_audio` / `has_video` are already columns (and
  in the K-3 projection). "Has parts" = a song has `data.sections[]`; "has steps" = a lesson has `exercise`
  rows — both **derivable**. To show them in the _list_ without shipping `data jsonb`, the **K-3 projection**
  **computes two booleans** at read time: `has_parts := jsonb_array_length(data->'sections') > 0` (songs) and
  `has_steps := EXISTS(SELECT 1 FROM exercise WHERE lesson_id = ci.id)` (lessons). **No DDL change.**

## 🟢 SD-6 — Pagination = numbered (`OFFSET` + `COUNT`), not load-more/keyset

- **What the UI needs (you, 2026-06-16):** **numbered** pagination, not "load more".
- **Feasible?** Yes — JSONB doesn't block it. Numbered pages = `SELECT … LIMIT :n OFFSET :(page-1)*n` plus a
  `SELECT COUNT(*)` for the page count, over the **typed/indexed** filter columns (`ci_btree_filters`, GIN,
  FTS). Fine at catalog scale (hundreds–low thousands).
- **Supersedes:** the earlier "pagination = keyset/cursor" note (a scale optimisation). **v1 = OFFSET+COUNT**
  **numbered**; revisit keyset only if the catalog grows large enough that deep `OFFSET` hurts. **No DDL change.**

## 🟢 SD-7 — Level `0 = Debut` (extend the grade scale to 0–10)

- **Decision (you, 2026-06-16):** add a **Debut** tier as `level = 0` (below grade 1). Keeps a single integer
  scale; `NULL` stays "ungraded" and **distinct** from Debut.
- **Schema change:** `ci_level CHECK (level BETWEEN 1 AND 10)` → `**BETWEEN 0 AND 10**`. UI renders `0` as a
  "Debut" pill. The bounded-level filter still excludes ungraded `NULL` by design (§9).

## 🟢 SD-8 — Multi-select _filter_ over single-valued columns (genre / time / kind)

- **Decision (you, 2026-06-16):** the **item columns stay single-valued** (a song has one genre, a lesson one
  `lesson_type`, one `time_sig`) — _schema unchanged_. Only the **filter contract** gains list inputs so the
  user can OR-match several.
- **Filter-contract change:** `genre`, `timeSig`, `lessonType` go `string → string[]` in `CatalogFilter`;
  the SQL adapter maps them to `col = ANY($1)` (OR). `instruments` stays single-select for now (`@> ARRAY[$1]`).
  Tags/Skill keep **ALL-of** (`@>`). No `catalog_item` column changes.

## 🟢 SD-9 — Add `musicalKey` filter, instrument-conditional (drums vs pitched)

- **Decision (you, 2026-06-16):** add `**musicalKey**` to the filter contract — the `musical_key` column
  already exists; it was just missing from `CatalogFilter`. Expose it **only when the instrument filter is a**
  **pitched one** (guitar / keys); **drums are unpitched** (no key/scale) so Key is hidden for drums / "Any".
- **Filter-contract change:** add `musicalKey?: string[]` → `musical_key = ANY($1)` (OR). Conditional UI only;
  no column change. A future `scale`/`mode` filter can join it for piano content (§13 "controlled list with
  piano content").

## 🔵 SD-10 — Sort **direction** (ASC / DESC) — `$10` _(deferred — v1.3 UI, not built; corrected from 🟢 2026-06-19)_

- **What the UI needs:** a direction toggle next to Sort. _Relevance_ and _Curated_ have a natural order
  (relevance = best-match DESC; curated = `sort_order` ASC) → no toggle. _Level / BPM / Newest / A–Z_ get an
  ASC/DESC switch.
- **Filter-contract change:** add `sortDir?: 'asc' | 'desc'` (default per field). No column change. **Build in v1.3.**

## 🔵 SD-11 — Filter by **flags** (has audio / video / parts-or-steps) — `$11` _(deferred — v1.3; corrected from 🟢 2026-06-19)_

- **What the UI needs:** toggle filters matching the row flags. `has_audio` / `has_video` are **columns** →
  `has_audio = true`. "Has parts/steps" = derived (SD-5) → `EXISTS(...)` / `jsonb_array_length(...) > 0`.
- **Filter-contract change:** add `hasAudio?` / `hasVideo?` / `hasParts?` booleans. No new column. **Build in v1.3.**

## 🔵 SD-12 — Filter **and sort by score** — `$12` ⚠️ crosses the catalog / per-user boundary

- **What the UI needs:** "show all below 90%", sort by best-score.
- **The catch:** best-score is **per-user (DynamoDB)** — **not in the catalog** (SD-4) and not in the K-3 query.
  A pure catalog query _cannot_ filter/sort by it.
- **Options:** (a) **client-side** post-filter/sort of the fetched page (simple, but breaks server-side
  pagination + global sort — only sorts the current page); (b) a **per-user "my library" index** in DynamoDB
  (proper: query scores → ids, then hydrate from catalog) — more work, belongs with the scores/player build;
  (c) **defer** until per-user data is wired. **Recommend (c)/defer** — revisit with the DynamoDB scores work.
- **No catalog column change either way.**

---

## Filter / UI notes (not schema changes)

- **N-13 (`$13`) — show Key for drums / no-instrument too?** You're reconsidering SD-9's strict hide-for-drums.
  Likely: show Key when **no instrument is selected** (mixed catalog) and for pitched; hide only when
  instrument = drums. _Explore later_ — flagged on SD-9.
- **N-14 (`$14`) — group levels into named bands** via `<optgroup>` in the Level picker. **Display only**
  (level stays a 0–10 integer). **✅ RESOLVED (Leo, 2026-06-21) — band ranges fixed:**
  **Debut 0 · Beginner 1–3 · Intermediate 4–6 · Advanced 7–8 · Expert 9–10** (Rockschool grades 0–8 + an
  Expert tier for the extended 9–10). Implemented in `index.html` `levelPop()` (optgroup). Seed covers
  Debut→Advanced with 2 rudiments per group; Expert via the Angra song's drums track (L9).
- **N-15 (`$15`) — range UI = from-to selects** (min/max), **confirmed** — no dual-handle slider needed in the
  wireframe (already built this way). Documented here + in `filter-review.md`.

---

## Round-2 resolutions (2026-06-16)

- **SD-1 → RESOLVED:** Fills = `**pattern.kind**`, _not_ a `lesson_type`. _UI follow-up:_ drop "Fills" from the
  Lessons **Kind** filter; patterns (beats / fills / rudiments) get a future **Patterns browse** (the `pattern`
  table already exists). Wireframe keeps a placeholder until that browse is designed.
- **SD-3 → DIRECTION:** add `**owner_id**` + a `**visibility**` enum to user-uploads — `public` (curated /
  shared) · `private` (owner-only) · `shared` / friends _(TBD)_. This is the per-item ACL. Full model lands
  with auth / CRUD; wireframe shows a "Private" tag on a user's own uploads.
- **SD-10 → OPEN QUESTIONS:** sort direction (asc / desc) deferred (your call).
- **SD-11 → v1.3 (deferred):** flag filters (audio / video / parts) — batched, not now.
- **SD-12 → BUILDING (client-side):** score filter + sort-by-score wireframed client-side (per-user caveat
  shown in-UI); the real impl needs the DynamoDB join (per SD-4).
- **N-16 — indexes (your PS):** per-sort indexes + (if keyset is ever revisited) e.g.
  `CREATE INDEX ci_keyset ON catalog_item (updated_at DESC, id DESC)` — go in the spec when deltas are
  applied. We chose numbered `OFFSET` pagination (SD-6), so keyset is optional.

## Round-3 — inside-page deltas (2026-06-16, from READ-page review)

- **SD-13 — Artist as filter + clickable.** `artist` is a column and already FTS-weighted (B), but there's **no**
  **artist facet** in `CatalogFilter`. Add `artist?: string` (or `string[]`); clicking an artist on a row/detail
  sets the filter. _No item-schema change_ (column exists).
- **SD-14 — Patterns are STANDALONE + need a browse/detail.** `pattern` is a first-class table; `item_pattern`
  links are optional (0..n) → a pattern can exist with no parent. Add a **Pattern detail** (route + clickable
  links from song/lesson) with a **reverse `item_pattern` lookup** ("Used in: songs + lessons"). Resolves SD-1's
  deferred Patterns browse. _No schema change_ — it's a new read view + the existing m:n.
- **SD-15 — ⭐ Per-part / per-step VOICING (NEW, biggest).** Which kit voices are active per section/step
  (hi-hat · kick · snare · crash · toms · ride …). Enables "intro = hats+kick; chorus = +snare+crash" and
  partial-groove lessons. **Not in schema today** — `data.sections[]` = `{label,startBar,endBar}` only.
  _Proposed:_ add `voices: string[]` to each section AND to `exercise` (steps). Open: controlled vocab for kit
  voices? per-instrument (drums vs guitar pieces)? Affects ingest + CRUD. **Needs design.**
- **SD-16 — Repeated parts.** A section label can occur at multiple bar ranges (Chorus = 25–40 **and** 60–80).
  _Proposed:_ either allow repeated `{label}` entries in `data.sections[]`, or group as
  `{label, ranges:[[s,e],…]}`. Affects how a song-breakdown step maps to a repeated section.
- **SD-17 — Step description.** Add a short `description` to `exercise` (or `exercise.data.description`) — a
  one-liner under the step title ("Hit on the 1 & 3"). Tiny.
- **SD-18 — Items without multiple steps/sections.** A 1-step lesson (no ladder emphasis) / a song with no
  sections (no "Practice in parts"). UI adapts; publish gate unchanged (a lesson needs ≥1 `exercise`). UI +
  validation note, not a structural change.

## Round-4 — fill-lessons, descriptions, per-step scores (2026-06-16)

- **SD-1 REFINED (reopen):** a **lesson can teach a fill**, like a beat/rudiment — so `**lesson_type` \*does**\*
  **include `'fill'**` (what the lesson drills) **AND** `pattern.kind='fill'` is the pattern entity it links to.
  They **coexist** (not either/or). _Action:_ restore the **Fills** Lessons sub-kind + fill-lessons (the v1.2
  removal over-corrected). `lesson_type ∈ {beat, rudiment, fill, song-breakdown}`; `pattern.kind ∈ {beat, fill, rudiment, …}`.
- **SD-19 — Lesson description ("what you'll learn").** Lesson-level blurb (distinct from per-step SD-17). Add
  `description` to `catalog_item` (or `data.description`); shown on lesson detail.
- **SD-20 — ⭐ Per-PART / per-STEP score (per-user).** Best-score is per _item_ today; show the donut on **each**
  **song part** + **each lesson step**. Implies per-user scoring at **section/step granularity** (DynamoDB, e.g.
  `user#item#step`), joined client-side — not catalog. Also **Play → "Continue"** when partially done.
- **SD-21 — Per-user 'completed' flag + reset-score-keep-history.** Mark items/steps completed; let a user
  **clear the current best but keep attempt history**. Per-user (DynamoDB) — extra joins, not catalog.
- **SD-15 note (voicing legend):** kit-piece icons (hi-hat·kick·snare·toms·crash·ride) marking active voices per
  part/step — built as **our own** glyphs (teal/Material), **not** a copy of any competitor's; competitor names
  stay out of repo docs (project rule).

---

## ⏸ PAUSED — Lesson ↔ Step ↔ Pattern model needs a brainstorm (2026-06-16)

The READ-page review surfaced a model tangle worth a dedicated brainstorm (Leo's call; resuming tomorrow). See
`**2026-06-16-brainstorm-prep-patterns-lessons.md**` for the framing. **v1.4 build is PAUSED** — building
lesson/pattern UI on a fuzzy model = wasted work. v1.3 (songs + catalog/search/filters + READ) is solid.

- **Core tension:** schema has `pattern` standalone + `item_pattern` (m:n) + `exercise` steps; Leo's UI model is
  **"a Lesson = 1+ patterns"** (no standalone-pattern browse; Lessons = the browse: drums beats/fills/rudiments,
  piano scales). Reconcile `exercise` (step) vs `pattern`.
- **SD-22 — Load & go (OPEN):** drop a `.gp` → play now (private/draft, no required fields). Ties to SD-23.
- **SD-23 — GP file = song OR pattern (flaw, OPEN):** a GuitarPro file isn't always a song — it can be a
  pattern/groove. "Upload → always song" is too narrow. Upload must decide song vs pattern vs step.

---

### 🧠 Tomorrow: brainstorm Lesson↔Step↔Pattern + the GP-file role, THEN build v1.4 on the settled model

### ✅ Resolved: SD-4 · SD-5 · SD-6 · SD-7 (Debut=0) · SD-8 (multi-filter) · SD-9 (key conditional)

### 🔵 Open _(2026-06-16 snapshot — SUPERSEDED by the "Current status" table at the top, 2026-06-19; SD-2/3/16 now resolved)_: SD-2 · SD-3 · SD-12 · SD-15 · SD-16 · SD-20 · SD-21 · SD-22 · SD-23 + the patterns/lessons model

_(**Applying** resolved deltas to the locked spec is a SEPARATE deliberate pass — on your go, a changelog line_
_each, likely after CRUD. The item schema stayed almost entirely intact, as you predicted — most changes are_
_filter-side.)_

---

## Round-5 — wireframe migrated to the locked Playable model + DB notes (2026-06-18)

The catalog wireframe (`index.html`) was migrated to the **locked Playable model** (commits C1–C5) and a batch
of UX deltas were built (E1–E6) on branch `docs/wireframe-pattern-lesson-model`. The locked DDL was **NOT**
changed — DB-side items that surfaced are written down here for the separate spec-apply pass.

### SD-15 — voicing model (per Leo, 2026-06-18). UI **placeholder shipped** (a `voices[]` chip line on parts). DB model

- A **playable has N tracks**; a **track has N notes (MIDI)**. A **voice** is _derived_ from the MIDI note
  numbers via a **note→voice map** (General-MIDI style) — voices are **not** stored per note.
- Example drum map (a voice can cover several notes): `snare: 37,38,39,40` · `hi-hat foot: 44` · `bass drum: 35,36`.
- "Active voices for a part/step" = the distinct voices present across that slice's track notes — **computed**.
- DDL sketch (for the spec pass):

  ```sql
  -- track     (id, notation_id -> notation, instrument, name, channel)
  -- note      (id, track_id -> track, midi int, start_tick, dur_tick, velocity)
  -- voice_map (instrument, voice, midi int[])   -- e.g. ('drums','snare','{37,38,39,40}')
  -- voices(slice) := SELECT DISTINCT vm.voice
  --                  FROM note n JOIN track t ON t.id=n.track_id
  --                  JOIN voice_map vm ON n.midi = ANY(vm.midi)
  --                  WHERE <part/step bar range>;
  ```

### SD-16 — repeated parts. UI **shipped** (a part renders >1 bar range). DB options to choose at spec time

- **(a) multiple `part` rows** sharing a label, each its own row + range — simplest; each range independently scorable.
- **(b) one part with `ranges jsonb = [[s,e],…]**` — one row, one score, many ranges.
- The wireframe used (b) as a `ranges[]` display field on the part. Decide (a) vs (b) when applying.

### Play-next on the **score / play screen** (Leo, 2026-06-18) — write-down

- The play/score screen (separate draft; stubbed here) should offer **"play next"** — chain to the next
  part / step / lesson without returning to the catalog. Step/part **prev-next** live on the _detail_ views;
  the player itself stays minimal and is exited via the topbar **back** button.

### Wart — PATTERNS-dict vs pattern-playable id duality (noticed during E5)

- Lessons/songs reference vocabulary patterns via `patterns:['rock-8th']` (a PATTERNS lookup) while the `step`
  junction references **pattern playables** (`p-rock-8th`, …) — two id namespaces. `usedIn()` unions both so
  relationships render, but the real model should pick **one** (pattern playables). Reconcile in the spec pass.

---

## Round-6 — chords / progressions, media, per-instrument difficulty (2026-06-18, wireframe review 2)

UX deltas F1–F7 built on branch `docs/wireframe-pattern-lesson-model`. New DB-side notes for the spec pass:

### $N / $CP1 — chord vs chord progression + per-instrument difficulty

- A **chord** is a single pattern (`pattern_kind='chord'`); a **chord progression** is a **sequence** of chords —
  modelled as a **composite pattern** whose `step`s are the chords, exactly like a composite groove. Built in the
  wireframe: chords C/G/Am/F + the composite `I–V–vi–IV (C major)` + a chord-progression lesson.
- **Abstract vs concrete:** a progression is abstract (I–V–vi–IV) but realised per key (C→G→Am→F in C; G→D→Em→C in
  G; F→C→Dm→B♭ in F). Open: store the abstract roman-numeral progression once + derive concrete chords per key, OR
  store each key's concrete progression as its own composite. (Wireframe stored one concrete C-major composite.)
- **Songs use progressions** — via the same m:n / `playable_link` as any pattern (wireframe: `clocks` → the progression).
- **⭐ Per-instrument difficulty (the real find):** the same chord/notation plays on **keys AND guitar**
  (`instruments[]` — no DB change for that). BUT **difficulty/level differs by instrument** (CMaj6 / F-barre is hard
  on guitar L4–6, easy on piano L1). So a single scalar `level` is **insufficient** — level (and the difficulty
  curve) likely needs to be **per-instrument**. Options: `level → level_by_instrument jsonb`, or a
  `difficulty(by:'instrument', tiers:[{when:'piano',level},{when:'guitar',level}])` curve (wireframe used the latter
  on the F chord). **Decide in the spec pass.**

### Media (F7) — multi-level

- A playable (song) has **n media** (audio/video) at the **playable level**, AND it has **n tracks** (instruments),
  each track carrying its **own n media**. DB: a `media` table keyed by `**playable_id` + optional `track_id**`
  (NULL track_id = song-level); a `track` table (`playable_id`, `instrument`, …). Wireframe: song-level media[] +
  `tracks:[{instrument, media:[]}]`.

### $S7 — time signature / key: UI-vs-storage (no gap)

- UI shows a single `4/4` and a `Key` badge; the model stores time signature as **numerator + denominator** (two
  columns) and `musical_key` separately. Display-vs-storage difference; both surface in the field inspector. No change.

### Reconciled (F2a) — patterns[] now reference real pattern playables

- Songs' `patterns[]` repointed from PATTERNS-dict ids to **pattern-playable ids** (`p-rock-8th` …) so each shows
  its own score + links to its playable; `usedIn()` spans songs (patterns[]) + lessons (steps). The PATTERNS dict is
  now largely vestigial — drop it in the spec pass. (Partially resolves the Round-5 wart.)

### 4b coverage — scales/chords now have relationships

- The chord lesson/progression gave chords real Used-in relationships; the earlier "empty relationships" was on
  scale patterns that nothing referenced yet.

### ⭐ Tracks — `instruments[]` → a track relation (brainstorm, 2026-06-18)

**Ask (Leo):** rename `instruments text[]` → `tracks`. **Catch:** a song can have MULTIPLE tracks of the SAME
instrument — e.g. guitar `solo` + guitar `bass`/`rhythm`. A flat `instruments text[]` can't represent that, and
per-track media (F7) / voicing (SD-15) / per-instrument difficulty ($N) all need a track identity.

- **A — `track` relation (RECOMMENDED):** `track(id, playable_id, instrument, role, name?, sort_order)`. Two
  same-instrument tracks = two rows, same `instrument`, different `role` (+ id). Media → `media.track_id`,
  voicing → notes per track. **Keep a denormalised `playable.instruments text[]` (DISTINCT instrument across**
  **tracks)** for the fast catalog filter (`@> ARRAY[$1]`), derived from tracks. So the "rename" is really a
  **split**: promote the detail into a `track` table, keep `instruments[]` as a derived facet.
- **B — `tracks jsonb**` `[{instrument, role, media}]` on the playable (matches the wireframe's current shape):
  simplest, no join, but weak for filtering/indexing and for joining media/notes by track.
- **C — instrument vocab only** (treat `bass` as its own instrument): solves bass-vs-guitar but NOT two of the
  same (lead + rhythm guitar, two vocal harmonies). Insufficient alone.

**Recommendation: A.** `role` (+ id) disambiguates same-instrument tracks; `instruments[]` stays the derived
filter facet. Wireframe now demonstrates it — SNA tracks = drums(kit) · guitar(solo) · guitar(bass) · keys(pad),
while its `instruments` facet stays `[drums, guitar, keys]`. **Open:** is `bass` a guitar `role` or its own
instrument (vocab)? Per-instrument difficulty per-track or a by-instrument curve? DDL sketch in
`2026-06-17-notation-model-draft.sql` (Round-6).

### SD-27 — per-track tonal/drum profiles? (2026-06-20)

**Catch (wireframe ↔ schema reconciliation):** `tonal_profile` and `drum_profile` attach to the
**playable** (the whole song), but Group D added a `**track**` relation (e.g. guitar `lead` + guitar
`rhythm` + bass + drums on one song). So the _chords / progressions_ belong to the pitched tracks and
the _techniques / kit_pieces_ to the drums track — yet the profiles sit on the song, not the track.

- **For search** ("songs using I–V–vi–IV", "songs with a shuffle") per-song facets are sufficient and cheap.
- **For per-instrument precision** ("the BASS plays these notes", "the guitar uses these chords") the
  per-song profile is lossy.

~~\*\*Open~~ ✅ RESOLVED (Leo, 2026-06-21) — move them per-track.**`tonal_profile` + `drum_profile` re-key
from `playable_id` PK → `**track_id`PK**`REFERENCES track(id)`. A track is one instrument, so the
chords/progressions hang off each pitched track (the bass carries its own notes) and the beats/fills/
kit_pieces off the drums track. **Shape unchanged — only the key flips.** The instrument-conditional
ownership (a drums track may own a `drum_profile`, a pitched track a `tonal_profile`, never both) is an
**app-layer invariant** keyed off `track.instrument`(Postgres can't cheaply enforce the cross-FK match).
Search now joins via`track` (one extra join; no per-song rollup needed at v1 scale).

- **DDL + seed:** `docs/wireframe/2026-06-21-per-track-profiles-and-seed-draft.sql` — validated on
  `nh_tonal_scratch` (profile-instrument invariant holds 0/0/0; poke queries pass: "max on guitar",
  per-track bass notes, double-bass search, I–V–vi–IV search).
- Still pairs with **SD-25** (searchable per-instrument _technique_ facet for pitched) and **OQ2**
  (multi-track which-to-learn) — both remain open and orthogonal.

---

### SD-28 — lead vs rhythm: the required instrument selector (2026-06-21)

**Context (Leo, 2026-06-21):** every Notation Hero search has a **required single instrument** field
(default Drums, user-settings-overridable) — like Songsterr/UltimateGuitar/CifraClub defaulting to guitar.
The model already disambiguates same-instrument variants via `**track.role**` (lead/rhythm/solo/pad/harmony).

**Open (parked — needs its own brainstorm):** what exactly does the user pick? Is the selector just the
**instrument** (`guitar`), or **instrument + role** (`guitar — lead` vs `guitar — rhythm`)? For now we ship
"**choose lead OR rhythm**" (Yousician-style) — one selection resolves to one track. Decide later whether
role is a second selector, a sub-filter, or folded into the instrument list. Pairs with **SD-27** (per-track
profiles now make "the lead guitar's chords" addressable) and **OQ2**.

---

### SD-29 — component patterns hidden from browse via `listable:false` (2026-06-23)

**Context (Leo, 2026-06-23):** the composed **voice leaves** of the composite beat
(`pat_voice_hh` / `pat_voice_sn` / `pat_voice_kick` — the hi-hat/snare/kick that build `pat_rock_composite`
via `step`) were appearing as standalone rows in the catalog browse. They are building blocks, not
destinations.

**Resolved:** set **`listable:false`** on the three voices. No new column — reuses the existing `listable`
seam (song parts already use it; `matches()` excludes `listable===false` from browse). The voices stay
reachable **inside** their composite (the Steps card) and by deep-link, but never clutter the list.
Generalises to: any pure building-block playable is `listable:false`.

**Resolved (2026-06-23):** merged — `pat_rock_composite` renamed to the canonical `pat_basic_rock` (keeps
its 3 voice-steps via `step`); the standalone duplicate removed. One Basic Rock Beat, voice breakdown intact.

---

### SD-30 — playable_link relation vocabulary: uses / variation / similar (2026-06-23)

**Context (Leo, 2026-06-23):** the wireframe needed real song↔pattern relationships, plus an **n-n** way to
relate _any_ playables regardless of hierarchy (similar songs, similar patterns that aren't otherwise linked).

**Resolved:** `playable_link` (the existing `{from, to, relation}` row) carries a small relation vocabulary —
no new table:

- **`uses`** — hierarchical, directional. Song → beat, song → fill, **fill → rudiment** (the
  `song → fill → rudiment` chain — Zoio tom fill → Single Stroke Roll), song → lesson.
- **`variation`** — symmetric. Same groove, different articulation (Yellow's closed- vs open-hi-hat beats).
  The pair are also the two steps of one lesson (`lesson_yellow_groove`).
- **`similar`** — symmetric **n-n affinity**, non-hierarchical: "these are alike" with no parent/child meaning
  (Yellow ↔ I'm Yours songs; Yellow groove ↔ Basic Rock Beat). Can later be auto-populated from the
  skeleton/fuzzy match in **NH-208**.

UI: `uses` renders directional (`uses →` / `← used by`); `variation`/`similar` render symmetric (`↔`), via a
shared `relatedCard()` on both the song and pattern pages. Song→beat/fill still uses the `patterns[]` m:n (the
"Patterns" card); `playable_link` carries the cross/affinity links.

---

### TS-4 — seed data log (2026-06-21)

First real catalog seed: `docs/wireframe/2026-06-21-per-track-profiles-and-seed-draft.sql` (validated on
`nh_tonal_scratch`). **19 playables / 37 tracks / 17 tonal / 19 drum / 7 media.**

- **Drum patterns (real, from `groovescribe-import.json`):** 8 leveled rudiments — **2 per group**,
  Debut→Advanced (Single/Double Stroke Roll Debut · Single Stroke Roll L2 · Single Stroke Four L3 · Five
  Stroke Roll L4 · Seven Stroke Roll L6 · Swiss Army Triplet L7 · Single Stroke Roll L8) + 1 beat (Basic
  Rock) + 1 fill (16th Snare L4) + 1 **composite beat** built from hi-hat/snare/kick **voice leaves via**
  `**step**` (real masked views of Basic Rock). Each stores its GrooveScribe share URL in `playable.data`;
  patterns use `notation_id` NULL (no fabricated alphaTex — backfill via the groovescribe skill later).
- **Songs:** Bohemian Rhapsody, Yellow, Zoio de Lula, I'm Yours (single I–V–vi–IV progression), Angra –
  Nothing To Say (Expert drums L9). Per-instrument `track.level` (headline = MAX per selected instrument)
  - per-track `tonal_profile`/`drum_profile`. Only Angra has a real `.gp`; others are catalog rows with
    placeholder s3 keys.
- **Expert (9–10):** **two** examples — Angra (Nothing To Say, drums + lead L9) + Zoio de Lula (**drums L9**;
  guitar only L3–4 — the per-instrument point: hard on drums, easy on guitar). Zoio's drums set Expert per
  Leo, 2026-06-21. The 8 rudiments cover Debut→Advanced (source tops out at L8).
- **Open follow-ups:** (a) **Zoio** artist (Charlie Brown Jr.) unconfirmed; (b) the non-Angra song levels are
  estimates (Bohemian 8 · Yellow 3 · I'm Yours 2) — calibrate in the Rockschool grounding pass; (c) real
  alphaTex/`.gp` blobs for the non-Angra songs and the drum patterns when ingest is built.

---

### TS-4 grounding — real `.gp` source data (2026-06-21, autonomous /lfg)

The 5 seed songs are now grounded in their **real Guitar Pro files** via
`docs/wireframe/tools/gp-extract.mjs` (`@coderline/alphatab`, run from
`~/Sites/alphaTabWebsite`). Raw extractions: `docs/wireframe/data/gp-extract-*.json`.
Objective fields are now real in **both** the wireframe (`index.html`) and the SQL seed.

**Real values applied (high confidence):** tempo, bar count, time signature, full track
list (names + percussion flag), section markers + bar ranges.

| Song      | tempo | bars | tracks (real)                     | sections            | note                                       |
| --------- | ----- | ---- | --------------------------------- | ------------------- | ------------------------------------------ |
| Bohemian  | 72    | 139  | 13 (5 gtrs + 2 print-dupe pianos) | 3 informal          | mapped 6 primaries                         |
| Yellow    | 87    | 97   | 8                                 | 10                  | +keys +vocals added                        |
| Zoio      | 76    | 79   | 5                                 | **0 (marker-less)** | no vocals track; NH-200 case               |
| I'm Yours | 73    | 76   | 5                                 | 11                  | classical+electric guitar, **not ukulele** |
| Angra     | 138   | 221  | 9 (+1 empty)                      | 15 (E→G modulation) | +vocals; player-named tracks               |

**Guesses corrected by the real files:** Zoio **140→76** bpm; I'm Yours 75→73; Angra
150→138; Zoio's fabricated **vocals** track removed; I'm Yours' fabricated **ukulele**
→ real classical + electric guitar; Yellow & Angra were missing **keys/vocals**.

**OPEN ITEMS — flagged + SKIPPED (no assumptions acted on):**

1. **Per-track difficulty levels (0–10) + techniques are HUMAN ESTIMATES, not extracted.**
   AlphaTab does not carry difficulty. Seed levels (Zoio drums L9 / guitar L3–4 per Leo;
   Bohemian guitar lead L7; etc.) are estimates pending calibration (Rockschool / NH-196).
   Do **not** present them as real-extracted.
2. **Musical key is LOW CONFIDENCE (GP defaults).** File keys read as defaults: Yellow→C
   (really B major), Zoio→C, Angra→C (but it modulates **E→G** per its section labels).
   Wireframe/SQL keep prior key estimates; the file key field is unreliable. Raw key per
   song is in the JSON. → real tonal analysis (NH-196) deferred.
3. **Aux / FX / print-duplicate tracks have no model home.** Bohemian = 5 guitars + 2
   print-only pianos; Yellow = an "Overdrive" FX layer + separate Strings + Piano; Angra
   = 3 keyboards + 1 empty track. The seed maps **primary instruments only** (KTD-5) and
   folds/omits the rest. **Open Q:** should the model carry multi-track-same-instrument
   (5 guitars) and FX layers as first-class? → skipped, logged.
4. **Bohemian sections are sparse/informal** — only 3 markers ("gtrs enter", "tempo 144",
   "tempo 207"), covering bars 42–139 only (1–41 unmarked); not clean verse/chorus. Used
   verbatim. (Contrast Angra's 15 clean sections.)
5. **Zoio is marker-less (0 sections)** — exactly the **NH-200** smart-structure-inference
   case. Left empty (`markerless:true`); inferring sections is a separate spike, not extraction.
6. **"We no longer need sections" vs the with-sections file.** Leo said sections were no
   longer needed, then provided `Bohemian Rhapsody with sections.gp` + asked to use the
   original sources. Resolved by extracting the real markers (the provided file IS the
   decided source). Flag if this should be reverted.
7. **Per-section × per-track difficulty grid (`data.sections[].tracks[]`) NOT populated.**
   The section UI can show per-section per-track level + techniques (D-3), but those are
   subjective and not in the file. Sections carry **label + bar range only**; grid cells
   render "—". → needs human authoring, skipped.
8. **Zoio + I'm Yours carry no embedded title/artist** in the file (Zoio title empty);
   artist comes from the filename. Zoio artist (Charlie Brown Jr.) still unconfirmed.

**Available but NOT imported (decided seed is the 5 above):** the folder
`/Users/leocaseiro/Music/AlphaTab-RhythmGame/` also has real `.gp` for Toto – Africa,
Hotel California, Black Sabbath – Paranoid, Bob Marley – Is This Love, Green Day, Michael
Jackson – Man In The Mirror, Mamonas, etc. → catalog-expansion follow-up.

**Raw JSON for UI/DB verification (R4):** `docs/wireframe/data/gp-extract-{bohemian,yellow,zoio,imyours,angra}.json`.
