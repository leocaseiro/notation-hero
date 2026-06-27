---
project: notation-hero
date: 2026-06-20
status: handoff — Group D wireframe DONE; next = schema↔wireframe reconciliation (audit-first, then 1-by-1)
worktree: wireframe-pattern-lesson-model
branch: docs/wireframe-pattern-lesson-model
pr: https://github.com/leocaseiro/notation-hero/pull/52
home: /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model/docs/wireframe/2026-06-20-HANDOFF-schema-reconciliation.md
---

# Handoff — schema ↔ wireframe reconciliation (audit-first, then 1-by-1)

## 0 · How to start (paste into a fresh Claude Code session — SAME worktree)

```
Working directory: /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model
Use the same worktree (do NOT branch off master). Read
docs/wireframe/2026-06-20-HANDOFF-schema-reconciliation.md (this file) FIRST, then the two schema
drafts it references.

Task: reconcile the interactive wireframe (docs/wireframe/index.html) with the LATEST validated schema
so we verify BOTH directions — the wireframe surfaces everything the schema has, AND the schema suits
the wireframe. The wireframe (esp. the "Show all fields" inspector JSON) is the schema TEST surface.

ORDER (Leo's directive — do not skip step 1):
  1. TRIAGE THE SCHEMA first. Re-read 2026-06-19-tonal-drum-schema-draft.sql (+ its spec) and
     2026-06-20-group-d-track-media-difficulty-draft.sql (+ spec). Sanity-check the model for gaps /
     inconsistencies BEFORE touching the wireframe. Surface anything questionable.
  2. Then the AUDIT (scope = C, audit-only): produce/confirm the Data-vs-UI gap list (§3 below) — what
     the UI/wireframe is missing vs the schema, AND what the schema is missing vs wireframe needs.
     DO NOT implement fixes yet — just the list.
  3. Then resolve the gaps 1 BY 1 with Leo (AskUserQuestion per gap).

Follow Leo's collaboration rules: AskUserQuestion per decision; long/important input via a normal chat
message NOT the picker "Other" box; chunked findings (📖) with a lean picker referencing them;
section-by-section; full absolute paths incl. worktree; commit BEFORE asking for review; baby commits at
every green step; lowercase-led commit subjects (commitlint); never --no-verify. Validate visually
(serve + screenshot) before claiming done — Leo decides design visually.
```

## 1 · What is DONE this session (PR #52 · committed · NOT pushed · 7 baby commits)

Group D wireframe pass — the **instrument-lens / single-track-per-page** model Leo defined:

- A song detail is scoped to ONE **track** via an instrument+track dropdown (drums included), defaulting
  to the catalog instrument filter else the first track.
- Home/catalog Level shows the **range** across tracks (e.g. `L2–5`), or the lens instrument's level.
- Per-section **level + techniques** folded into the existing **Song structure** table (Techniques column
  between title & bars; Level column after bars; "—" = track silent in that section).
- **Media** = song-level + per-track, with the 3 source badges (YouTube / S3 file / in .gp).
- **Inspector** ("Show all fields") = **formatted JSON** of the playable + its joins (notation, tracks[],
  media[], data.sections[].tracks[]). This is the schema test surface.
- Model map (model-map.html) gained `track` + `media` boxes + derived-facet edges.

Commits (oldest→newest): `bda0003` OQ2 doc · `1bb343d` SNA→Group D data + helpers · `98fd3d1` render
(lens/difficulty/media/inspector) · `7087306` model-map track+media · `287beb8` fold difficulty into
Song-structure rows · `9e67927` techniques own column · `18e23d7` inspector=JSON + drum techniques.

Also: **OQ2** (guitar multi-track — which track the user learns) parked in `notation-model-open-questions.md`
(needs its own brainstorm; wireframe ships the simple single-track selector). **SD-27** (per-track
tonal/drum profiles) logged in `2026-06-16-schema-deltas.md`.

## 2 · Order of work (do this, in this order)

**1. Triage schema → 2. Audit (Data vs UI gap list) → 3. Resolve 1-by-1.**

## 3 · Reconciliation gap-list (AUDIT SEED — verify/refine during triage; do NOT implement yet)

The wireframe's Group D layer is current, but its **base** fields predate the 2026-06-19 tonal/drum schema.

**A. `playable` fields the wireframe has stale/wrong:**

| Latest schema                                           | Wireframe now                         | Action                           |
| ------------------------------------------------------- | ------------------------------------- | -------------------------------- |
| `author text[]` + `author_type` (artist\|teacher\|user) | `artist` (string)                     | rename → author[] + author\*type |
| `genre text[]`                                          | `genre` (string)                      | → array                          |
| `family text[]`                                         | `family` (string)                     | → array                          |
| `musical_key` REMOVED (→ tonal_profile)                 | `musical_key` on playable             | move into tonal_profile          |
| `visibility` public\|private\|shared                    | only "private" used; not in inspector | surface it                       |
| `description ≤255`, `time_signature*\*`                 | present (derived)                     | ok                               |

**B. `tonal_profile` (pitched, 1:0..1) — MISSING from the wireframe entirely.**
`musical_key, keys[], scales[], chords[], progression_concrete[], progression_roman[], progression_family[]`.
The whole tonal search (chords / progressions / scales) is absent. Add to sample + inspector (+ filters in step 3).

**C. `drum_profile` (drums, 1:0..1) — MISSING.**
`beats[], fills[], rudiments[], techniques[], kit_pieces[]`. Wireframe only has `voices` (≈ kit_pieces) on parts + `pattern_kind`.

**D. Per-section timeline — partial.** Schema `data.sections[]` can carry `{key, scale, bpm, timeSignature,
progression}` (multi-key/tempo/meter — e.g. Bohemian Rhapsody). Wireframe sections only have Group D `tracks[]`.

**E. notation — minor.** `upload_status, checksum, bytes` not surfaced.

**Schema-suits-wireframe (other direction):** mostly covered (`skill[]`, `tags[]`, `instruments[]`, `step`,
`playable_link` ≈ the wireframe's `patterns[]`). Main open catch → **SD-27 (per-track tonal/drum profiles)**:
profiles sit on the playable, but Group D added per-track; per-instrument tonal/drum content is currently lossy.

## 4 · Key files (full absolute paths)

- Wireframe: `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/wireframe-pattern-lesson-model/docs/wireframe/index.html`
- Model map: `.../docs/wireframe/model-map.html`
- Latest base schema: `.../docs/wireframe/2026-06-19-tonal-drum-schema-draft.sql` + spec `.../2026-06-19-tonal-drum-extensible-schema-spec.md`
- Group D: `.../docs/wireframe/2026-06-20-group-d-track-media-difficulty-draft.sql` + spec `.../2026-06-20-group-d-spec.md`
- SD ledger: `.../docs/wireframe/2026-06-16-schema-deltas.md` (newest = SD-27)
- Open questions: `.../docs/wireframe/notation-model-open-questions.md` (OQ2)

## 5 · Serve + screenshot tooling (this session's setup — reuse it)

- Serve: `cd .../docs/wireframe && python3 -m http.server 8131` → `http://localhost:8131/index.html` (+ `/model-map.html`). (Was left running this session on :8131.)
- Screenshots via Chrome over CDP — Node 24 has a global `WebSocket`, no Playwright/Puppeteer needed:
  - Launch once: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --remote-debugging-port=9222 "--remote-allow-origins=*" --user-data-dir=/tmp/nh-cdp --disable-gpu &` (quote the `*` — zsh globs it)
  - Capture: `node /tmp/cdp-shot.mjs "<url>" /tmp/out.png "<evalJs>" <width>` — `evalJs` runs before capture, e.g. `state.track='t-sna-lead'; render();` to switch the lens, or `state.q='Seven'; state.showAll=true; document.body.classList.add('showall'); render();` for the inspector. (Script at `/tmp/cdp-shot.mjs`; recreate if gone — see git history of this session or rewrite a ~40-line CDP driver.)
- Syntax-check the inline JS before each commit: extract the `<script>` block → `node --check`.

## 6 · Guardrails

- The wireframe + inspector JSON are the schema TEST surface — the JSON should mirror the schema. No DDL
  changes in the wireframe pass; real schema changes go via a new SD in `2026-06-16-schema-deltas.md`.
- Keep the **Thin** model + **hybrid** rule, and the **instrument-lens / single-track-per-page** model.
- Commit on every green step and BEFORE asking Leo to review.
