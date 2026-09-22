# Schema-delta brainstorm — findings & decisions (2026-06-24)

**Scope:** consolidate every open `schema-delta` Jira ticket that genuinely touches the
catalogue DB schema, decide them **at once**, and apply them to the fresh draft schema
(`docs/wireframe/2026-06-21-per-track-profiles-and-seed-draft.sql`). There is **no DB / no
Drizzle yet** — the schema is draft SQL on a scratch database, so these are **edits to the
fresh schema**, not a migration.

**Status:** ✅ decided + applied to the draft + validated on `nh_tonal_scratch`.

---

## 1. Triage — 18 `schema-delta` tickets → 5 buckets

Only **4** genuinely change the catalogue DDL; the rest route elsewhere.

| Bucket                                 | Tickets                                                                            | Disposition                                         |
| -------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------- |
| 🟦 **Brainstorm now (schema design)**  | SD-28 (NH-219) · SD-26 (NH-218) · SD-25 (NH-217) · SD-15 (NH-213)                  | **decided below**                                   |
| 🟩 Schema-labelled but DB already done | SD-33 (NH-223) · NH-230                                                            | SD-33 → wireframe phase · NH-230 → rides in this PR |
| 🟨 Per-user → DynamoDB @ M1            | SD-12 (NH-212) · SD-20 (NH-214) · SD-21 (NH-215)                                   | out of catalogue schema                             |
| 🟧 UI / router / admin-flow            | SD-10 (NH-210) · SD-11 (NH-211) · SD-31 (NH-221) · SD-37 (NH-228)                  | no schema                                           |
| ⬜ Policy / content / flow             | SD-35 (NH-225) · SD-34 (NH-224) · SD-32 (NH-222) · SD-22 (NH-216) · SD-36 (NH-226) | no DDL                                              |

---

## 2. The 4 schema decisions

### SD-28 — lead/rhythm selector → `track.roles text[]`

- **What the user picks:** a **tri-state instrument/role tree** (parent instrument, indeterminate; children = the roles that occur). "All guitar" = OR across roles; a child = that role.
- **Schema:** `track.role text` (single) → **`track.roles text[]`** (a track can play several parts). Filter = overlap `roles && ARRAY['rhythm']` (mirrors `instruments[]`). GIN index `track_roles`.
- **Solo vs lead:** both kept as distinct role values; surfaced as **flat siblings** (no 3-level tree).
- **Display:** DB stores `role='rhythm'`; the UI shows **"Rhythm (chords)"** (UltimateGuitar convention — guitarists search _chords_, not _rhythm_). Generalised via a **display-group config** in shared monorepo code (NOT the DB): e.g. guitar → `{ Chords: [rhythm] }`, `{ Tabs/Solos: [lead, solo] }`. FE renders the tree from it and resolves a picked group → raw roles; the API filters by raw roles and stays "dumb".
- **Source:** roles are **curated/UGC** (no source format carries a "role" field — confirmed by the spike), **auto-derivable later** (single-note lines → lead, chords → rhythm).

### SD-26 — instrument family → derive in code (no column); instrument from AlphaTab

- **Instrument identity** comes from the **AlphaTab General-MIDI program (0–127)**, never UGC — even admins pick from a controlled vocab, never free-type. `track.instrument` stays `text` but ingest only writes controlled values (coarse: `guitar`/`bass`/`piano`/`drums`…). The fine GM detail (steel vs electric) is kept in provenance (§4).
- **Family** (plucked/keyboards/percussion…) is **NOT stored** — it's a **code map** `family → [instruments]`, expanded in the query over the existing `playable.instruments[]` GIN: `WHERE instruments && ARRAY['guitar','bass','ukulele',…]`. GM already standardises the families (Piano 1–8, Guitar 25–32, Bass 33–40, Strings 41–48…), so it's a range lookup; reuse AlphaTab's `GeneralMidi` mapping if exported.
- **Why not materialise `instrument_families[]`?** Instrument is the _hot_ primary filter (worth materialising); family is _colder_ and fully derivable — derive in-query. ⚠️ Do **not** overload `playable.family[]` (that's the _musical_ family `{Rock}`); if ever materialised, name it `instrument_families[]`.
- **Indexing note:** GM program is **0-based** in AlphaTab (0–127); the GM spec page is 1-based (1–128). Same list, shifted by one — the family map must use the 0-based numbers.

### SD-25 — technique facet → `track.techniques text[]` (unified on the track)

- **Add `track.techniques text[]`** (GIN) — one technique facet for **every** instrument, per-track (a guitar track with tapping vs one without; bass slap vs guitar sweep).
- **Migrate** `drum_profile.techniques` → `track.techniques`, then **remove `drum_profile.techniques`**. `drum_profile` keeps `beats`/`fills`/`rudiments`/`kit_pieces`; `tonal_profile` needs no techniques column.
- **Source:** many techniques are **structured AlphaTab note/beat effects** (`tap`, `slap`, `harmonics`, `bends`, `slides`, `palmMute`…) → auto-extract; higher-level ones (sweep, economy picking) stay curated. Open `text[]` + controlled starter + "Other".
- This mirrors `track.roles`: both are per-track, instrument-agnostic-shape facets on `track`; the profiles keep only the domain-specific searchable attributes.

### SD-15 — voicing decomposition → stay Thin (no DDL)

- **No `note` / `voice_map` tables.** Notes live in AlphaTab (the locked Thin model). Voices = the `drum_profile.kit_pieces[]` facet (search) + the jsonb section grid `data.sections[].tracks[].voices[]` (display) + runtime AlphaTab compute (~35 ms, per the NH-137 spike) for precise per-slice voicing.
- The only thing that would justify Deep is SQL note-level querying — and scoring is runtime + per-user DynamoDB, so that need doesn't exist. Flip only if note-level catalogue search is ever required.

---

## 3. Grounding — the instrument-identity spike (2026-06-24)

Full doc: `docs/spikes/2026-06-24-instrument-identity-and-role-from-source-formats.md`.

- **General MIDI program (0–127) is the universal hub** — GuitarPro, MIDI, MusicXML, MuseScore all cross-walk through it.
- **Via AlphaTab** we get `track.playbackInfo.program` (GM) + a percussion flag (`primaryChannel === 9`) + tunings — _not_ GP's raw `InstrumentSet.Type` (AlphaTab folds Type into the GM program). AlphaTab ships a `GeneralMidi` class + `isGuitar/isBass/isPiano()` helpers.
- **Names fail in 3 of 5** real seed songs (Angra/Zoio player-named tracks, Yellow gear strings) — the structured program + percussion flag would succeed in all 5. **This is why instrument must derive from the program, not the name.**
- **Role** has **no** structured field in any format → confirmed UGC/derived (open `text[]` + governance).

---

## 4. New delta surfaced — `track` provenance

`track.source_instrument_id text` + `track.source_instrument_kind text`
(`gm-program` | `musicxml-sound` | `musescore-id` | `name-parse`).

Makes the derived `instrument`/`family` **reproducible + auditable** — an admin can query
`WHERE source_instrument_kind = 'name-parse'` to find the low-confidence rows. Cheap (2
nullable text columns, no index; CHECK on the kind). "Well-architected even at tiny scale."

---

## 5. Dispositions (no DDL) + new tickets

- **SD-22 (NH-216) load-and-go upload** → confirm-and-defer. The `notation` table already supports it (`upload_status IN ('ready','pending_blob','client')` + the relaxed `notation_one_of` CHECK + `checksum`/`bytes`). Only real dependency = client-minted ULID PKs (NH-183). Findings recorded on NH-216.
- **SD-33 (NH-223) artist→author[]** → DB already has `author text[]` + `author_type` (SD-13). Wireframe + seed alignment is the **next phase** (after this PR).
- **NH-230 origin field** → already in the draft schema; **rides in this PR**. No separate PR.
- **🆕 NH-232** — `gp-extract.mjs` to read `playbackInfo.program` (+ percussion + bank) **and** note/beat technique effects → feeds the GM-derivation + `track.techniques`.
- **🆕 NH-233** — spike: confirm the GM program covers our needs; PR AlphaTab + `patch-package` only if a real, non-reconstructable gap appears.

---

## 6. Net schema change (the fresh schema is _born_ this way)

**`track`** — adds `roles text[]`, `techniques text[]`, `source_instrument_id text`,
`source_instrument_kind text`; **no `role` column**; GIN indexes `track_roles`,
`track_techniques`; CHECK on `source_instrument_kind`.
**`drum_profile`** — born **without** `techniques` (+ its GIN index removed).
**No** instrument-family column · **no** `note`/`voice_map` tables.

**Not schema (ingest + app layer):** instrument derived from the AlphaTab GM program ·
family = code-only map · roles/techniques auto-extracted + curated · the display-group
config in shared monorepo code · voicing stays runtime.

**Validation:** loads clean on `nh_tonal_scratch` (ON_ERROR_STOP); poke queries pass —
`track.techniques @> ['double-bass']` → Angra; `roles && ['rhythm']` (guitar) → all 5 songs;
moved techniques intact; `drum_profile.techniques` gone.

---

## 7. Next (separate work, not this PR)

1. **Wireframe alignment** — reflect `roles[]`/`techniques`/instrument-from-GM + the
   display-groups + `artist→author[]` (SD-33) in `index.html` + the model map.
2. **NH-232 / NH-233** — extractor + AlphaTab spike.
3. **Rockschool grounding (NH-226)** — calibrate the 0–10 bands + per-instrument technique vocab.
4. **First real Drizzle schema** — when the backend lands, this draft becomes the first migration.
