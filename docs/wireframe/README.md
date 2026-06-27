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
#/catalog                                      ← default (search + Songs/Lessons tabs)
#/song/yellow                                  ← song detail (URLs use the slug, not the opaque id)
#/song/yellow/section/2                        ← section "score" page
#/part/yellow-intro                            ← song part (NH-222)
#/lesson/learn-yellow                          ← lesson  ·  #/lesson/learn-yellow/step/1 ← step (steps = song parts)
#/fill/zoio-de-lula-tom-fill                   ← pattern — route uses the KIND (NH-221) + the slug
#/song/yellow/beat/yellow-groove-closed-hat    ← same pattern in a song's context (both slugs)
#/pattern/pat_zoio_fill                        ← legacy alias → redirects to the slug route
#/play/yellow                                  ← player stub
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
  single-row filter + "More" advanced row (incl. **flag filters** — has audio / video / parts, SD-11/NH-211),
  Stitch-style table (`Name · Level · BPM · Best · ▶`), continue banner, load-more.
- **Song detail** _(whole-piece feel)_ — hero + badges, **Your history** (per-user, role-gated), **Play full
  song**, and **Song structure / Practice in parts** (section slices → the song-breakdown lesson).
- **Lesson detail** _(steps feel — deliberately different from a song)_ — the **ordered steps** list, each with
  its start→goal **BPM ladder** and notation **source tag** (alphaTex / song-slice / upload).
- **Step** screen — the per-step before-play view (ladder + notation source).
- **Player** — a **"Player here"** stub (the play screen is a separate draft) + a **playback-source toggle**
  (synth | video | audio; synth default, video/audio enabled only when the item has them — SD-11/NH-211).
- **Roles / ACL** — a sign-in modal **and** a header role control morph the whole app:

  | Role                 | Sees                                       | Can do                                         |
  | -------------------- | ------------------------------------------ | ---------------------------------------------- |
  | **Anonymous**        | Browse, search, play                       | — (history & uploads gated → sign-in prompt)   |
  | **User** (signed-in) | + Best score, sessions, trend; own uploads | Upload files, save attempts                    |
  | **Admin**            | + Drafts/uploads; admin bars               | Create/Edit/Delete songs·lessons·steps, Upload |

  Role + theme persist in `localStorage`.

## Routing (deep-link · reload · back/forward)

Hash router — refresh stays on the current screen; browser back/forward work. Routes use the
**slug** (a friendly token derived from the title; `playable.slug` in the schema) — the opaque id
still resolves as a fallback. Patterns carry the kind too (NH-221); in a song/lesson they carry both
slugs (`#/song/:slug/:kind/:cslug`).

| Route                                                                           | Screen                                     |
| ------------------------------------------------------------------------------- | ------------------------------------------ |
| `#/catalog?tab=songs\|lessons&kind=…&q=…`                                       | Catalog list (filters in the URL)          |
| `#/song/:slug` · `#/song/:slug/section/:n`                                      | Song detail · section "score"              |
| `#/part/:slug`                                                                  | Song part                                  |
| `#/lesson/:slug` · `#/lesson/:slug/step/:n`                                     | Lesson detail · single step                |
| `#/:kind/:slug` (beat·fill·rudiment·scale·chord)                                | Pattern — standalone (NH-221/SD-31)        |
| `#/song/:slug/:kind/:cslug` · `#/lesson/:slug/:kind/:cslug`                     | Pattern in a song/lesson context           |
| `#/pattern/:slug`                                                               | Legacy → redirects to the kind route       |
| `#/play/:slug` · `#/play/:slug/step/:n`                                         | Player stub                                |
| `#/new?type=song\|lesson\|upload` · `#/<item>/edit` · `#/lesson/:slug/step/new` | CRUD (stub) — edit at each item, no /admin |

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
