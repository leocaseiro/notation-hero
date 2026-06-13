# 🤝 Handoff — Catalogue best-score **donut colour system** (decided) + layout polish (next)

> **Status:** 🟢 Q1 DONE (donut colour = **System G "Spectrum"**, approved by Leo 2026-06-13) · 🔜 Q2 layout polish NOT started.
> **Jira:** [KAN-161](https://leocaseiro.atlassian.net/browse/KAN-161) (Catalogue UI design) · related KAN-27 (score display), KAN-49 (design-shotgun).
> **Branch:** `claude/epic-easley-b661e6` · all work committed (baby commits, all green).
> **Worktree:** `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/epic-easley-b661e6` (work happens HERE, not the repo root).

This session ran `/design-consultation` on the catalogue's **best-score donut**, scoped tightly to two brief questions: (Q1) donut colour system, (Q2) layout polish. **Only Q1 was completed.**

---

## How to see it (served mockups)
```bash
# from the epic-easley worktree root
cd /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/epic-easley-b661e6
python3 -m http.server 8780
```
- **`docs/mockups/catalog-donut-bands.html`** — the donut colour lab (this session). `🌙` toggles light/dark. Shows **★ Spectrum** (the pick) vs `(was red)` vs `Uniform`, across the full score range, a 24–30px size check, in-context rows, and a thresholds legend.
- `docs/mockups/catalog-score-options.html` — the older score-cell compare board (8 treatments; donut + neutral level pill were chosen here).
- `docs/mockups/catalog.html` — the canonical catalogue layout (⚠ still shows the OLD `%`/🏆 score cell + circular grade bullet — see "apply-back" below).

---

## ✅ Q1 DONE — best-score donut colour system

Score cell = **donut**: ring fills by best-%, exact number centred (Geist Mono). The ring now **bands by performance band** — **System G "Spectrum"**. Every hue is a genuine **Okabe-Ito** colourblind-safe member.

| Band | Score | Ring colour | Token |
|------|-------|-------------|-------|
| Low | `1–49` | reddish-purple `#CC79A7` (light) / `#E29CC4` (dark) | `--oi-purple` |
| Developing | `50–69` | orange `#E69F00` / `#F0A92E` | `--oi-orange` |
| Climbing | `70–88` | blue `#0072B2` / `#56B4E9` | `--score-blue` |
| High | `89–99` | green `#009E73` / `#1FBF8F` | `--oi-green` |
| **Mastered** | `100` | **gold disc + filled `trophy`** — deep antique `#B8860B` (light) / bright `#FFD24A` (dark) | `--gold` |
| Not attempted | `null` | **grey ring + `–`** | `--track` |

**Why this shape:**
- **Banded, not uniform** — Leo wanted bands clearly distinct (the earlier teal ramps were "too similar to the 80+").
- **Purple low, not red** — vermillion/red read as "fail/alarm" for a learner's weakest pieces; **purple is gentler and maximally distinct**. Leo's call.
- **Gold for 100, not teal** — a rare 100% deserves its own **champion reward colour**. Teal was too close to the 89–99 green, so colour did no work. Gold = the universal medal signal. Light uses a **deep antique gold** (`#B8860B`) so it separates from the orange 50–69 band by lightness; dark uses **bright gold** (`#FFD24A`). The solid-disc-+-trophy form also keeps it distinct from the orange thin-ring.
- **a11y** — the centred number always carries the exact value, so colour is **reinforcement only** → CVD-safe by construction. Verified light + dark.
- **Thresholds** reuse the app's existing grade model (`gradeOf()` cuts) folded into the 5 bands. The `88/89` blue→green edge is a judgement call (tunable).

### 🎨 Brand clarification (IMPORTANT — update old assumptions)
**Purple is fine as a functional/score colour. It is only avoided as the _brand_ identity colour** (brand stays teal `#2DD4BF`/`#0F766E`). The earlier "avoid purple entirely" was too strong — it's a brand-colour rule, not a blanket ban.

### Crisp-rendering rules (locked — do NOT regress)
- Donut hole = a real `::before` circle with `inset:5px` (CSS gradient/conic holes pixelate on Brave/Chromium GPUs).
- Mastered disc fills the `::before` too (solid disc), trophy is `material-symbols-filled` with `font-variation-settings:'FILL' 1`.
- **Trophy centering:** `.tro` has `position:relative; top:1px` — the glyph sits 1px high optically without it (fixed this session per Leo).

---

## 🔜 Q2 NOT started — layout polish (next session)
The brief's second half. Concrete refinements for `catalog.html`:
- **List density / spacing / hierarchy** of the table rows.
- **Single filter row + advanced ("More") panel** — positions, wrap behaviour at narrow widths.
- **Continue banner** — density.
- **Empty / loading states — THESE DON'T EXIST YET** (need designing: skeleton rows for loading; a friendly "no results + clear filters" empty state).

## 🔜 Apply-back (separate, mechanical)
`catalog.html` still renders the **old** score cell (`92%` / `🏆 100%` / `—`) and the **circular accent grade bullet** for Level. Port in:
1. The **donut + System G spectrum** (from `catalog-donut-bands.html`).
2. The **neutral rounded level pill** (`.lvlpill.neutral` — chosen in the score-options lab).
3. The filled-trophy mastered state.

### ⚠ Doc contradiction to resolve
- Older `2026-06-13-catalog-handoff.md` says **Level = "grade bullet (accent ring), numeric."**
- Newer `2026-06-13-design-consultation-brief.md` locks **Level = "neutral rounded pill."**
- **The brief (newer) wins → neutral pill.** Flagging so the next session doesn't reintroduce the bullet.

---

## Files touched this session
- **NEW** `docs/mockups/catalog-donut-bands.html` — the donut colour lab (the deliverable).
- **NEW** `docs/design/2026-06-13-donut-spectrum-handoff.md` — this file.
- Commits: `catalog-donut-bands.html` evolved A→B→C→E→F→**G** (each committed); trophy-centre fix last.

## Working style (Leo) — reminders for next session
- **Decides visually** — serve a localhost URL he clicks (not tiny widgets); render the change, let him pick.
- **AskUserQuestion** for decisions — tag `[Q-x]`, batch related (≤4), include a Defer option, lean question text referencing prose chunks; **two-message pattern** (chunks, then the picker).
- **Commit every green step** (baby commits); **commit before asking for review**; never `--no-verify`. Commit subjects start lowercase; keep them short (commitlint `header-max-length`).
- **Full absolute paths** in handoffs/refs (incl. the worktree subpath).
