# Catalog Wireframe — low-fi flow simulation

A single-file, clickable **wireframe** of the Notation Hero catalog flow. Its job is to let us _feel_ the
flow — search → detail → steps → before-play — across the three roles, and to **pressure-test the locked
Neon schema** before we build the real app. Deliberately **low-fi** on spacing/positioning; it reuses the
approved colours + final icons so it _feels_ like the app without committing to final styling.

> Design decisions (flow, single-row filter, Songs/Lessons tabs, donut score, step model) are already
> locked — see `docs/design/2026-06-13-catalog-flow-decisions.md` and the memory notes. This wireframe
> **realises** those decisions in one connected, navigable sim and surfaces schema gaps as they appear.

## Run it

No build step, no dependencies (fonts + Material Symbols load from a CDN; they degrade gracefully offline).

```bash
# serve from this folder (any free port — 8131 is just an example)
cd docs/wireframe && python3 -m http.server 8131
```

Then open in a browser:

| Page                                                | URL                                            |
| --------------------------------------------------- | ---------------------------------------------- |
| **Main app** (the catalog flow — start here)        | <http://localhost:8131/index.html>             |
| **Model map** (the Playable-model / schema diagram) | <http://localhost:8131/model-map.html>         |
| **Notation explorer** (notation + field explorer)   | <http://localhost:8131/notation-explorer.html> |

The main app is a single-page app — reach every screen by clicking, or by deep-linking the hash:

```
#/catalog                              ← default (search + Songs/Lessons tabs)
#/song/bohemian-rhapsody               ← song detail
#/song/bohemian-rhapsody/section/2     ← section "score" page
#/part/sna-intro                       ← song part
#/lesson/funk-16ths                    ← lesson  ·  #/lesson/funk-16ths/step/1 ← lesson step
#/pattern/p-rock-8th                   ← pattern
#/play/bohemian-rhapsody               ← player stub
```

Top bar: flip **Role** (Anonymous / User / Admin) and **Inspector: Show all fields** to see the role-gated
UI and the raw JSON behind each screen.

### Regenerate the real-source data (optional)

The 5 seed songs are grounded in their real Guitar Pro files via AlphaTab.

```bash
# tools/gp-extract.mjs requires @coderline/alphatab — run from a folder where it resolves,
# e.g. copy it into ~/Sites/alphaTabWebsite/ and run there:
node gp-extract.mjs "/path/to/song.gp"      # prints objective JSON: tempo, bars, time sig, tracks, sections
```

Raw extractions are committed under `data/gp-extract-*.json`. The catalog SQL seed
`2026-06-21-per-track-profiles-and-seed-draft.sql` loads on a throwaway Postgres DB:

```bash
createdb nh_tonal_scratch    # once
psql -d nh_tonal_scratch -v ON_ERROR_STOP=1 -f 2026-06-21-per-track-profiles-and-seed-draft.sql
```

## What's in v1 (the browse flow)

Order follows the agreed priority: **① search → ② detail → ③ steps → ④ CRUD** (CRUD forms land in v2).

- **Catalog** — search, `Songs | Lessons` tabs, Lessons sub-kinds (Beats · Rudiments · Fills · Song parts),
  single-row filter + "More" advanced row, Stitch-style table (`Name · Level · BPM · Best · ▶`), continue
  banner, load-more.
- **Song detail** _(whole-piece feel)_ — hero + badges, **Your history** (per-user, role-gated), **Play full
  song**, and **Song structure / Practice in parts** (section slices → the song-breakdown lesson).
- **Lesson detail** _(steps feel — deliberately different from a song)_ — the **ordered steps** list, each with
  its start→goal **BPM ladder** and notation **source tag** (alphaTex / song-slice / upload).
- **Step** screen — the per-step before-play view (ladder + notation source).
- **Player** — a **"Player here"** stub (the play screen is a separate draft).
- **Roles / ACL** — a sign-in modal **and** a header role control morph the whole app:

  | Role                 | Sees                                       | Can do                                         |
  | -------------------- | ------------------------------------------ | ---------------------------------------------- |
  | **Anonymous**        | Browse, search, play                       | — (history & uploads gated → sign-in prompt)   |
  | **User** (signed-in) | + Best score, sessions, trend; own uploads | Upload files, save attempts                    |
  | **Admin**            | + Drafts/uploads; admin bars               | Create/Edit/Delete songs·lessons·steps, Upload |

  Role + theme persist in `localStorage`.

## Routing (deep-link · reload · back/forward)

Hash router — refresh stays on the current screen; browser back/forward work.

| Route                                                                                        | Screen                            |
| -------------------------------------------------------------------------------------------- | --------------------------------- |
| `#/catalog?tab=songs\|lessons&kind=…&q=…`                                                    | Catalog list (filters in the URL) |
| `#/song/:id`                                                                                 | Song detail                       |
| `#/lesson/:id`                                                                               | Lesson detail (steps)             |
| `#/lesson/:id/step/:n`                                                                       | Single step                       |
| `#/play/:id` · `#/play/:id/step/:n`                                                          | Player stub                       |
| `#/admin/new?type=song\|lesson\|upload` · `#/admin/edit/:id` · `#/admin/lesson/:id/step/new` | CRUD (stub in v1)                 |

## Schema findings

UI-surfaced schema questions are logged in **`2026-06-16-schema-deltas.md`** (proposed → your per-delta
approval → amend the locked spec with a changelog). Nothing in the locked schema changes without sign-off.

## Version log

- **v1** — walkable browse flow (search → detail → steps → before-play → player stub) across all 3 roles;
  hash routing; role/theme persistence. CRUD routes reachable as stubs.
- **v1.1** — matched the locked single-row filter layout (segmented Songs/Lessons inline) + design-system
  icons (real MIDI glyph, Material Symbols Outlined, brand mark) + per-row cover icons + audio/video/parts
  flags + New pill; numbered pagination; admin Edit/Delete on the step page.
- **v1.2** — **functional filters** (the schema's query contract, live): genre/kind/time **multi-select**
  (OR), instrument **single**, level/tempo **ranges** (level `0 = Debut`), tags/skill **ALL-of**, **Key**
  shown only for pitched instruments, functional **Sort**. See `filter-review.md` (per-filter review vs the
  `CatalogFilter` contract) and SD-7/8/9 in the schema-deltas ledger.
- **v1.3** — **inside-page relationships + score filter**: **Patterns** card on song & lesson detail
  (item↔pattern links; fills shown as a `pattern.kind`, SD-1); **media** links (audio/video); source / license /
  owner **metafoot** + **Private** tag on user-uploads (SD-3); **client-side score filter** + **Best-score
  sort** (SD-12, signed-in only — per-user caveat shown in-UI). Sample now includes pitched items (guitar/keys)
  - a Debut (level 0) item.
