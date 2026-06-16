# Catalog Wireframe — low-fi flow simulation

A single-file, clickable **wireframe** of the Notation Hero catalog flow. Its job is to let us *feel* the
flow — search → detail → steps → before-play — across the three roles, and to **pressure-test the locked
Neon schema** before we build the real app. Deliberately **low-fi** on spacing/positioning; it reuses the
approved colours + final icons so it *feels* like the app without committing to final styling.

> Design decisions (flow, single-row filter, Songs/Lessons tabs, donut score, step model) are already
> locked — see `docs/design/2026-06-13-catalog-flow-decisions.md` and the memory notes. This wireframe
> **realises** those decisions in one connected, navigable sim and surfaces schema gaps as they appear.

## Run it

```bash
# from the repo root (or this folder)
python3 -m http.server 8780
# then open:  http://localhost:8780/docs/wireframe/
```

No build step, no dependencies (fonts + Material Symbols load from CDN; degrade gracefully offline).

## What's in v1 (the browse flow)

Order follows the agreed priority: **① search → ② detail → ③ steps → ④ CRUD** (CRUD forms land in v2).

- **Catalog** — search, `Songs | Lessons` tabs, Lessons sub-kinds (Beats · Rudiments · Fills · Song parts),
  single-row filter + "More" advanced row, Stitch-style table (`Name · Level · BPM · Best · ▶`), continue
  banner, load-more.
- **Song detail** *(whole-piece feel)* — hero + badges, **Your history** (per-user, role-gated), **Play full
  song**, and **Song structure / Practice in parts** (section slices → the song-breakdown lesson).
- **Lesson detail** *(steps feel — deliberately different from a song)* — the **ordered steps** list, each with
  its start→goal **BPM ladder** and notation **source tag** (alphaTex / song-slice / upload).
- **Step** screen — the per-step before-play view (ladder + notation source).
- **Player** — a **"Player here"** stub (the play screen is a separate draft).
- **Roles / ACL** — a sign-in modal **and** a header role control morph the whole app:

  | Role | Sees | Can do |
  |------|------|--------|
  | **Anonymous** | Browse, search, play | — (history & uploads gated → sign-in prompt) |
  | **User** (signed-in) | + Best score, sessions, trend; own uploads | Upload files, save attempts |
  | **Admin** | + Drafts/uploads; admin bars | Create/Edit/Delete songs·lessons·steps, Upload |

  Role + theme persist in `localStorage`.

## Routing (deep-link · reload · back/forward)

Hash router — refresh stays on the current screen; browser back/forward work.

| Route | Screen |
|-------|--------|
| `#/catalog?tab=songs\|lessons&kind=…&q=…` | Catalog list (filters in the URL) |
| `#/song/:id` | Song detail |
| `#/lesson/:id` | Lesson detail (steps) |
| `#/lesson/:id/step/:n` | Single step |
| `#/play/:id` · `#/play/:id/step/:n` | Player stub |
| `#/admin/new?type=song\|lesson\|upload` · `#/admin/edit/:id` · `#/admin/lesson/:id/step/new` | CRUD (stub in v1) |

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
  `CatalogueFilter` contract) and SD-7/8/9 in the schema-deltas ledger.
