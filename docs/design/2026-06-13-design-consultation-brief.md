# 🎨 Design-consultation brief — Catalog: donut colour system + layout polish

**For:** the next session running `/design-consultation`.
**Date:** 2026-06-13 · **Branch:** `claude/epic-easley-b661e6`
**Scope it tightly.** This is a _refinement_ pass on two specific things — **NOT** a redesign of the locked system.

---

## Paste-ready prompt

> Run a design consultation on the **NotationHero catalog** — a drums-practice / rhythm-game web app. The catalog is a dense list of songs & lessons (name · level · BPM · best-score · play). The flow, layout direction, and design tokens are **already locked** (see "Locked — do not re-open" below). I want a focused consultation on exactly two things:
>
> 1. **A "best-score" donut colour system.** Today every score donut is uniform brand-teal with the number inside (filled trophy at 100%, empty ring + `—` for not-attempted). Question: should the ring colour **vary by performance band** to signal progress at a glance, or stay uniform? If it varies, propose a **palette that lives inside the brand** (teal-forward, **no purple/violet/indigo**), with band thresholds, and a rule for the mastered + not-attempted states. It must be **colourblind-safe** — the number always carries the exact value, so colour is reinforcement only. Show the bands rendered on a 24–30px donut across the score range.
> 2. **Catalog layout polish.** Density, spacing, rhythm, and hierarchy of the list — the filter row + "More" advanced panel, the table columns, the "Continue" banner, and the empty / loading states. Tighten what's there; don't restructure it.
>
> Respect the **locked teal/D3 design system** (PR #23): colours, typography (Hanken Grotesk UI / Bricolage Grotesque display / Geist Mono numerals), and the variant-A single-filter-row flow are settled. Propose refinements and previews, not a new system.

---

## Product context (1 paragraph)

NotationHero teaches drums via a rhythm-game loop. The **catalog** is the "find a piece to play" surface — search/discovery of songs & lessons by type, **not** a progress dashboard. Score/mastery is a _garnish_ shown per row, never the spine. The category wedge is a well-known practice app; we deliberately differentiate from its look (that's why we dropped stars — see below).

## ✅ Decided this session (build on these)

- **Score cell = donut.** Ring fills by best-%, number centred inside (Geist Mono). **100% = solid teal donut with a filled Material `trophy`** (`font-variation-settings: 'FILL' 1`). **Not-attempted = empty grey ring + `–`.**
  - Crisp rendering matters: the hole is a real `::before` circle with `inset:5px` (CSS gradient holes pixelate on Brave/Chromium GPUs — do not reintroduce a `radial-gradient`/`conic` hole).
- **Level = neutral rounded pill** (`.lg-c` style: `panel2` bg, muted text, hairline border). Soft on purpose, so the teal donut is the only accent per row. Sits 2-digit levels (`10`) well.
- **Stars rejected.** A `% + ★★★★☆` treatment tested well but reads too close to the category competitor's catalog (gestalt risk). Avoid.
- **Pie rejected** in favour of the donut.

## 🔒 Locked — do NOT re-open

- **Brand colour:** teal — `#0F766E` (light) / `#2DD4BF` (dark). **Avoid purple / violet / indigo entirely** (reads as a close competitor).
- **Design tokens / system:** PR #23 teal/D3 tokens (`--bg --panel --panel2 --elevate --ink --muted --faint --line --accent --onaccent` etc., light + dark).
- **Type:** Hanken Grotesk (UI), Bricolage Grotesque (display), Geist Mono (numerals).
- **Catalog flow:** variant A — single filter row (`Songs/Lessons · dynamic · Level · Instrument · More`) + a **More→advanced panel** with inline controls (range + chips + token-pickers, **no dropdowns** in the advanced panel).

## 🎯 What I want out of the consultation

1. **Donut colour system** — uniform vs banded; if banded, the exact palette (teal-safe), thresholds, mastered/empty rules, dark-mode variants, accessibility note. Rendered previews on the donut.
2. **Layout polish** — concrete spacing/density/hierarchy refinements for the list, filter row, advanced panel, Continue banner, and empty/loading states.

## 🖥 Reference (serve + view)

```bash
# from the epic-easley worktree root
python3 -m http.server 8780
```

- `docs/mockups/catalog.html` — the canonical single-layout catalog (theme toggle in topbar).
- `docs/mockups/catalog-score-options.html` — the score-cell compare board (8 treatments) + the level-pill picker; **donut is the chosen one**, neutral level pill is chosen.
- `docs/mockups/catalog-variants.html` — A/B/C history (reference only).
- `docs/mockups/catalog-flow.html` — production clickable flow (has Load-more pagination).

## ❓ Still open (not for the consultation, just FYI)

- Port the **Load-more** pagination (`showing X of 24` + button, lives in `catalog-flow.html`) into `catalog.html`.
- Apply the final donut + neutral-level-pill + trophy treatment back into `catalog.html`'s real rows (the score-options board is the lab; `catalog.html` still shows the old `%`/`🏆` cell).
