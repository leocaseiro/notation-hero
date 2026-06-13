# 🤝 Handoff — Catalog: next session = **review + steps**

> **⚠ Score-cell + level visuals SUPERSEDED (2026-06-13)** — the "grade bullet (accent ring)" and the `—` / `X%` / `🏆 100%` status cell described below are replaced by the **best-score donut** (System G spectrum + **gold-100 trophy**, glow pending) and the **neutral level pill**. See [`2026-06-13-donut-spectrum-handoff.md`](2026-06-13-donut-spectrum-handoff.md).

This session designed the **catalogue UI** (the "find a piece to play" surface). Flow is locked, the look/filter direction is chosen. The next session does **(1) another design review** and **(2) the lesson-steps work**.

Branch: `claude/epic-easley-b661e6` · all work committed (baby commits, all green).

---

## How to see it (served mockups)
`python3 -m http.server 8780` in the worktree, then open:
- **`/docs/mockups/catalog-variants.html`** — **variant A is the LOCKED direction** (single filter row). Switch A/B/C at top to compare; B/C are reference only. 🌙 = theme. **Step modal** button (top-right) = the accordion/modal step editor (Leo's pref).
- **`/docs/mockups/catalog-flow.html`** — the production **clickable flow**: Catalog → tap row → **Song/Lesson detail + Your history** → Player/Results stubs; **+ Add → CMS form → step editor**. Built on PR #23 teal/D3 tokens. *(Still has the OLD "Filters" button — port the single-row filter into it, see Job 1.)*
- Decisions doc: `docs/design/2026-06-13-catalog-flow-decisions.md`.

## North star
Catalogue = **"find a piece to play"** — search/discovery of songs & lessons by type. **NOT** a progress dashboard. Score/progress is a **garnish** (per-user, DynamoDB) shown on the **detail** screen, never the list spine.

---

## ✅ Locked — the filter pattern (single row, Jira-style)

**One row:** `Songs/Lessons | <dynamic> | Level | Instrument | More`
- **`<dynamic>`** swaps by tab: **Songs → Genre(s)**, **Lessons → Kind(s)** (Beats · Rudiments · Fills, each with its icon).
- **Chip face = clean label** (`Level: ≤ 4 ▾`, `Kind: Beats +1 ▾`). The **menu is rich** (Jira): operator row (`is at most ≤` / `is any of`) + **multi-select checkboxes with icons** + **Clear selection**.
- **More** toggles a 2nd **Advanced** row (`Tempo · Time · Tags · Skill · Pattern · Key`); click again to hide.
- **Upload** lives in the **topbar** (between search and the MIDI button).

## ✅ Locked — everything else
- **Layout:** Stitch-style **table** (`Name · Level · BPM · Best · ▶`, no row #). Tap row → **detail-first**; row ▶ = quick-play.
- **Grade bullet:** accent ring, numeric, 1–2 digits. **Scale = 1–10 for now** (F-2 open).
- **Status via BEST:** `—` new · `X%` learning · **`🏆 100%`** mastered (no separate pills).
- **Detail-first:** song/lesson detail carries **Your history** (best · top-tempo · sessions · recent attempts · trend). Patterns get the same later.
- **Song-breakdowns** reached *through* the song ("Practice in parts"), not a shelf.
- **CMS = same UI**, admin-gated (Upload / Add / Edit). **Fills = add `lesson_type='fill'`** (schema tweak).
- **Logo:** SVG ring + right arrow + music-note. **Brand stays clear of purple** (teal only).

---

## 🔜 Job 1 — another review (positions/polish)
- **Port variant A's single-row filter** into `catalog-flow.html` (it still has the old Filters-button + panel).
- Review **positions, spacing, both themes**; tighten the production flow end-to-end.
- Confirm the single row holds at narrower widths (it's `flex-wrap` today).

## 🔜 Job 2 — lesson **steps**
- Make the step editor a **modal or accordion** (NOT a separate back-and-forth screen) — see the **Step modal** demo in `catalog-variants.html`. `catalog-flow.html` still has the old separate `#addstep` screen → replace it.
- Step **notation source** (schema-correct, exactly one): **alphaTex** (`notation_tex`, CMS-authored, **admin-only**) · **upload** (`notation_key`) · **song-slice** (`source_item_id` + bars).
- Each step has **Start → Goal BPM** (the practice ladder), title, ordering.

## 🔴 Open / TBD
- **Song-slice** ("From a song" — bar-range partial Guitar Pro load) is **unspiked → raise a Jira ticket.** AlphaTab likely supports a *playback range* on a fully-loaded file; needs a spike. Steps default to alphaTex / upload until then.
- **Patterns** get their own detail + history (near-next).
- **Pagination** = keyset/cursor, not `OFFSET`.
- **Trend chart** data = last ~6–8 session scores.
- **F-2 grade scale** — 1–10 vs industry 1–8 (+Debut).
- **Filter final positions** + narrow-width behaviour.

## Reference
- Schema (authoritative): `docs/specs/2026-06-10-catalogue-schema.md`.
- Design system (PR #23, teal/D3/states/components): tokens are inline in the mockups; full system in PR #23 branch `claude/hungry-chatterjee-a46716`.
- Memory: [[notation_hero_catalog_ui]], [[notation_hero_design_system]], [[catalog_feature_state]] (backend Area-K — separate).

## Working style (Leo)
- **Decides visually** — serve a localhost URL he can click (not tiny widgets); render the change, let him pick.
- **AskUserQuestion** for decisions — tag `[Q-x]`, batch related (≤4), include a Defer option, lean question text referencing prose chunks.
- **Commit every green step** (baby commits); commit before asking for review; never `--no-verify`. Commit subjects must start lowercase (commitlint `subject-case`).
- **Full absolute paths** in handoffs/refs. **Brand clear of purple.**
