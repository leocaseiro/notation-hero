# NotationHero — Player-App UI Design System

> **Status:** 🟢 **DRAFT — play screen, Tracks & Settings locked** (2026-06-05). Library / Results / Friendly view still to design.
> **Scope:** the **player app only** (the admin CMS is a separate track). Resolves the five 🎨 design-shotgun-gated decisions from the feature freeze.
> **Owner:** leocaseiro · **Companions:** [feature-freeze.md](../../pensive-boyd-6d17e3/docs/feature-freeze.md) · [scope.md](scope.md) · [stack-brainstorm.md](../../serene-grothendieck-fb5e67/stack-brainstorm.md)
> **Live mockups** (open in a browser / Launch panel): [`docs/mockups/`](mockups/) — `index.html` (feedback lab) · `player.html` (play screen, light+dark) · `player-full.html` (Tracks-left + Score-right) · `tracks-settings.html` (panels).
> **North-star:** the discontinued Roland **DT‑1 V‑Drums Tutor** (features, not palette). Reference screenshots in `~/Downloads/dt-1_ss_*.jpg`.

---

## 1. Design principles

1. **Calm by default, everything one tap away.** The DT‑1 mistake was welding every panel on, permanently, with no off switch. Here the play screen defaults to notation + a slim player; detail (score breakdown, mixer, settings) opens on demand and is remembered per song.
2. **A player, not a control panel.** Controls read like a media player: flat line-icons, one accented play, an always-visible timeline. No chunky bordered buttons.
3. **Tablet-first, landscape.** iPad + Android tablets. 44px minimum touch targets. Mouse/desktop inherit the same layout.
4. **One renderer interface (A‑7).** Standard notation (AlphaTab) and the later Friendly highway (PixiJS) are two renderers behind a single feedback-event contract. Build the interface *with* the Friendly view, not before.
5. **Feedback is redundant-coded.** Color is never the only signal — every feedback state also carries shape + position (+ direction). Accessible by construction.
6. **PWA-first.** Standard notation is the Alpha primary; the Friendly view lands at its own milestone. Architecture stays Friendly-ready.

---

## 2. Resolved 🎨 decisions

| # | Decision | Resolution |
|---|---|---|
| **D‑1** | Feedback colors (green vs blue reconcile · A‑2) | **Perfect = green.** Adopt scope intent over the fork/DT‑1 blue. Final hue = Okabe‑Ito green `#009E73` (see D‑2). |
| **D‑2** | Accessibility palette + glyph (A‑6) | **Single Okabe‑Ito palette** (no second palette / no light-vs-default toggle). On-note encoding = **Approach A: ring + directional chevron** (left = early, right = late). Redundant coding everywhere (color + shape + position + chevron). Custom color-picker = **optional / deferred**. |
| **D‑3** | Dark mode (F‑4) | **Keep + theme properly.** Standard notation defaults to light/paper with a dark option; the Friendly view is dark by nature. Theme switch (light / dark / system) lives in **Settings → Display**. |
| **D‑4** | Score display (C‑2) | **Split:** in-play = calm (Score/Combo in the top ticker; full breakdown in a toggleable right **Score sidebar**). End-of-play **Results = direction B (modern card) + per-tier bars** (to be finalized when Results is built). Tiers = **Perfect / Good / OK / Miss**. |
| **D‑5** | A/B-loop timeline UI (B‑9) | **Always-on scrubber** in the player: single row `current-time │ track │ end-time`, with **draggable A/B handles + markers** (A can fall mid-measure → no measure labels on the handles). Tap-set A/B, drag to adjust. |

### Feedback visual language (the heart of D‑1/D‑2)

The same 5 states, rendered per the locked palette + Approach A. Extra/wrong is always a **cross at the wrongly-hit position** (different shape *and* place). Miss = the notehead dims, no mark.

| State | Color (Okabe‑Ito) | On the staff (Standard) | Friendly view (later) |
|---|---|---|---|
| **Perfect** | 🟢 `#009E73` | full ring on the correct notehead | green gem burst + combo tick |
| **Early** (rushed) | 🟠 `#E69F00` | ring + chevron on the **left** edge | orange flash, gem high in the hit-window |
| **Late** (dragging) | 🟣 `#CC79A7` | ring + chevron on the **right** edge | violet flash, gem low in the window |
| **Miss** | — | notehead dims (no mark) | gem greys + slides past |
| **Extra / wrong** | 🔴 `#D55E00` | red **✗** at the wrongly-hit staff position | red flash in the wrong lane (suppressed for pedal hi-hat) |

**Why it's accessible:** `#CC79A7` is itself an Okabe‑Ito color, so the set stays distinguishable across deuteranopia / protanopia / tritanopia. And color is redundant: perfect/early/late are *rings on the correct note* (early vs late split by which side the chevron sits), extra is a *cross elsewhere*, miss is *absence*. Readable in greyscale. See `docs/mockups/index.html` for the lab.

> Optional future: a feedback **color picker** for per-user remap. Deferred — the single Okabe‑Ito set covers the need.

---

## 3. Design tokens

### Color

| Token | Light | Dark | Use |
|---|---|---|---|
| `--accent` | `#10B6A6` | `#10B6A6` | brand teal — play, active toggles, scrubber fill, focus |
| `--accent2` | `#2F6DF6` | `#2F6DF6` | playhead line |
| `--ink` | `#0F151C` | `#E8EDF3` | primary text / noteheads |
| `--muted` | `#67707E` | `#9AA6B4` | secondary text, idle icons |
| `--faint` | `#9AA3B1` | `#6C7889` | labels, hints |
| `--line` | `#E5EAF1` | `#222C39` | borders, dividers |
| `--panel` | `#FBFCFE` | `#121821` | bars, sidebars, modals |
| `--bg` / paper | `#FFFFFF` | `#0C1117` | notation paper / app bg |
| **Feedback** | colors are **theme-independent** (Okabe‑Ito) | | perfect `#009E73` · early `#E69F00` · late `#CC79A7` · extra `#D55E00` · miss `#9AA0A6` |
| `--solo` | `#F0A500` | — | solo-armed (amber) |

### Type · spacing · shape

- **Font:** system stack (`-apple-system, "Segoe UI", Inter, Roboto`). Tabular numerals for scores, BPM, times.
- **Radius:** controls 8–11px · cards/panels 12–16px · device frame 20px · pills 999px.
- **Spacing:** 6 / 9 / 12 / 16 / 22px rhythm.
- **Shadow:** `0 1px 2px rgba(16,21,28,.05), 0 16px 44px rgba(16,21,28,.13)` (panels/modals).
- **Touch targets:** ≥ 44px for any tap target (transport, toggles, handles, sliders).
- **Icons:** flat **line icons**, monochrome `currentColor`, ~20–22px. One accented element per region (the teal play).

---

## 4. Component inventory

| Component | Spec |
|---|---|
| **Transport** | Flat line-icons. Play/pause is the only accented control (teal, **no circle**). Trimmed to **go-to-start + play/pause** (no prev/next). |
| **Timeline scrubber** | Always on. One row: `current │ track │ end`. Teal fill, white playhead knob, faint position markers, two draggable **A/B handles** + shaded loop region. = D‑5. |
| **BPM control** | `– 120 +` stepper; `%` shown **only while adjusting**. Small **auto ⟳** glyph *inside* the block (teal = auto-speed on, grey/hidden = off). = E‑3 indicator. |
| **Bottom toggles** | Icon + tiny label, teal when on: `METRO · COUNT‑IN · LOOP`. Left: **folder** (open file). Right: **Tracks · Settings**. |
| **Top bar** | back · song · centered **SCORE / COMBO** (borderless; tap → Score sidebar) · view toggle (♪ Standard / ▦ Friendly) · MIDI. Icon-only. |
| **Score sidebar** (right, toggle) | `%` + 5★, per-tier **Perfect/Good/OK/Miss** bars, current/longest streak + accuracy, reserved **drum-kit** slot (J‑6). |
| **Tracks sidebar** (left, toggle) | Quick **Drums only / Minus drums** (solo-mine / mute-mine). Per track: **eye** (show/hide) · **headphones** (solo) · **speaker** (mute) · volume · **notation switch** (Standard / Tab / Slash / #). Master at bottom. |
| **Settings modal** | Sectioned: **Input & MIDI · Timing · Practice · Display · About**. Left nav + scannable groups. |
| **Switches / segmented / sliders** | iOS-style switch; segmented control (teal active); slider = teal fill + white knob (44px hit area). |

---

## 5. Navigation & screen map

```
Library ──tap song──▶ Play screen ──finish (game)──▶ Results ──retry / next──▶ (Play / Library)
   ▲                     │  ├─ top ticker: SCORE/COMBO (tap ▶ Score sidebar, left)
   │                     │  ├─ right sidebar: Tracks      (toggle, by its bottom-bar button)
   └──── back ───────────┘  ├─ left sidebar:  Score       (toggle)
                            ├─ Settings / MIDI: modal overlay
                            └─ view toggle: Standard ⇄ Friendly  (one renderer interface, A‑7)
```

- **Sidebars vs modals:** Tracks (**right**, by its bottom-bar button) and Score (**left**) are **persistent sidebars** — usable *alongside* gameplay; either closes to widen the staff. Settings + MIDI are **modals** (you're configuring, not playing).
- **Memory mode** is armed in **pre-play setup**, never toggled mid-play.
- **Focus** (distraction-free) = a mode that hides chrome; not a permanent panel.

---

## 6. Key screens

### 6.1 Play screen — `docs/mockups/player.html` (light + dark), `player-full.html` (both sidebars)
Top ticker · center notation (feedback per §2) · always-on scrubber + minimalist controls · Tracks-right / Score-left sidebars on demand. Light/paper default; dark themed. **Locked.**

### 6.2 Tracks (right sidebar) — `docs/mockups/player-full.html`
Mixer + solo/mute-mine + per-track notation style. Each track: eye (show/hide) · solo · mute · volume · **multi-select notation chips** (Standard / Tab / Slash / # — independently combinable, e.g. Standard **+** Tab on one track). Quick Drums-only / Minus-drums on top; Master at the bottom. Soft-filled controls (no bordered segmented controls — deliberately un-"Bootstrap"). **Locked.**

> The notation chips are **multi-toggle**, not a single-select dropdown — a track can render in more than one staff style at once.

### 6.3 Settings (modal) — `docs/mockups/tracks-settings.html`
Input&MIDI (device, I-play, mapping preset + edit, latency slider, multi-device warn) · Timing (Perfect/Good ms, count-in) · Practice (Practice/Game, Memory arm, auto-speed target+step) · Display (theme light/dark/system, notation scale, feedback palette) · About. **Locked.**

### 6.4 Library / song-select — *to design (next)*
Lesson/song list with level (★), tempo, last score; open-file; search; entry to Play.

### 6.5 Results — *to design*
Direction **B (modern)** — % completion ring + 5★ + **per-tier bars** (Perfect/Good/OK/Miss) + streak; graft the DT‑1 Target‑vs‑You bar as a secondary. Dedicated screen, so density is free.

### 6.6 Friendly view — *to design (design-gated milestone)*
Horizontal highway (primary) + vertical falling-notes (alt). Gem feedback carries the same 5-state language + a11y. Dark by nature.

---

## 7. Feature → UI mapping (feature-freeze IDs)

| Where | Feature IDs |
|---|---|
| Notation + feedback | A‑1 render · A‑2/A‑2‑a ring+chevron · A‑3 miss · A‑4 extra ✗ · A‑6 a11y · A‑7 renderer interface · A‑8 pedal-hat forgiveness |
| Transport / scrubber | B‑2 transport · B‑3 loop · B‑5 count-in · B‑6 metronome · B‑7 tempo (BPM/%) · **B‑9 A/B timeline (D‑5)** · B‑1 open file (folder) |
| Tracks sidebar | B‑10 volume mixer · B‑10‑a solo/mute-mine · B‑11 instrument · B‑8 notation display switch |
| Score sidebar / Results | C‑2 score% · C‑3 5★ · C‑4 streak · per-tier breakdown |
| Settings modal | D‑1 MIDI device · D‑2 mapping · F‑1 latency · F‑2 timing windows · F‑4 theme · E‑3 auto-speed · E‑4 memory (arm) |

---

## 8. Open items / next

- **Build:** Results → Friendly stub. *(Library ✅ · compact Tracks rows ✅)*
- **Settings tabs** — only Input&MIDI is drawn; render Timing / Practice / Display content.
- **Dark theme** for Tracks/Settings panels (inherit app theme).
- **Drum-kit (J‑6)** slot reserved in the Score sidebar; design when built.
- **Color picker (D‑2)** — optional; revisit only if a user needs remap beyond Okabe‑Ito.
- **Settings cog glyph** — finalized to a proper cog (was sun-like); keep an eye on icon clarity across the set.

---

## 9. Changelog
- **2026-06-05** — Play screen, Tracks, Settings designed & locked through 6 iterations. All five 🎨 decisions resolved. Feedback lab + player (light/dark) + full-view + panels mockups in `docs/mockups/`.
