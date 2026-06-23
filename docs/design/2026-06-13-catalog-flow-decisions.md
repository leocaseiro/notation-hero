# Catalog — UI Flow Decisions (low-fi brainstorm)

> **Status:** 🟢 FLOW LOCKED (2026-06-13) — ready for the design pass (positions, polish, motion).
> **Artifact:** served mockup `docs/mockups/catalog-flow.html` (`python3 -m http.server 8780` → `/docs/mockups/catalog-flow.html`).
> **Schema:** `docs/specs/2026-06-10-catalog-schema.md` (authoritative).
> **Design system:** PR #23 (teal `#2DD4BF`/`#0F766E` · D3 type · states · components).
> **Owner:** leocaseiro

## North star

The catalog's job is **"find a piece to play"** — search / discovery of songs & lessons by type — **not** a progress dashboard. Score & progress are a **garnish** (per-user, from DynamoDB), shown on the **detail** screen, never on the list spine. *(This corrects the earlier "macro-progress home" framing in the design-system handoff.)*

## Locked flow

- **Unified search**, browsable by intent: top-level **Songs | Lessons**; Lessons → **Beats · Rudiments · Fills**.
- **Stitch-style table** list: `Name · Level · BPM · Best · ▶` (no row number).
- **Tap a row → detail first** (Fork B). The row **▶** is a quick-play shortcut.
- **Song-breakdowns** are reached *through* the song ("Practice in parts"), not a separate shelf.
- **Detail-first**: song/lesson detail carries the actions + **Your history** (best, top tempo, sessions, recent attempts, trend). Patterns will get the same later.
- **CMS = the same UI**, with admin-gated actions (Upload / Add / Edit). Lesson steps are authored on the same surface.

## Decisions

- **Fork B** = detail view first — per-item best/history live there.
- **Fills** = a lesson type → **schema tweak: add `lesson_type='fill'`** (open vocab; §7 already anticipates it).
- **Level** = a numeric **grade bullet** (accent ring), handles 1–2 digits. **Scale = 1–10 for now** (F-2; industry 1–8 deferred).
- **Status via BEST**, not pills: `—` (new) · `X%` (learning) · **`100%`** highlighted (mastered).
- **Notation source per step** (schema-correct): exactly one of **alphaTex** (`notation_tex`, CMS-authored, **admin-only**) · **upload** (`notation_key`) · **song-slice** (`source_item_id` + bars). **Users only upload.**
- **Logo** = ring + right arrow + music note (now a real inline SVG; final polish in the design pass).

## Open / TBD / deferred

- **🔴 Song-slice ("From a song" step — bar range from→to) is TBD / unspiked.** Partial Guitar Pro loading is unproven (AlphaTab likely supports a *playback range* on a fully-loaded file — needs a spike). **→ raise a Jira ticket.** Until then, steps use alphaTex (admin) or upload.
- **Step editor → accordion or modal** (not a separate back-and-forth screen) — Leo's preference; for the **design consultant** to shape.
- **Filter placement** — squished inline; collapsed to a button for now; final placement → design consultant.
- **Patterns** get their own detail + history — near-next (not built).
- **Pagination** — keyset/cursor, not `OFFSET` (perf at scale).
- **Trend chart** data = last ~6–8 session scores (from the attempt history).
- **MIDI** button → design-system MIDI icons (currently a placeholder).
- **F-2 grade scale** — 1–10 vs industry 1–8 (+Debut) — revisit.

## Version history (mockup)

`catalog-flow.html` iterated v1 (cards) → v2 (Stitch table) → v3 (G-1..G-20) → step editor + SVG logo. Each version committed.
