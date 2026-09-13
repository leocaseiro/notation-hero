---
lap: 1
last_applied: P0
re-lap: declined 2026-09-13 — leocaseiro closed the review at lap 1
---

# v0.1 — settings panel

|            |                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------- |
| **Date**   | 2026-09-11                                                                                        |
| **Status** | 🟡 draft — reviewed 2026-09-13 (doc-review lap 1, 16 findings applied)                            |
| **Epic**   | [NH-291](https://leocaseiro.atlassian.net/browse/NH-291) (v0 player — this is the next milestone) |
| **Parent** | [`2026-09-10-v0-local-file-player-design.md`](2026-09-10-v0-local-file-player-design.md) §10      |

## 1. Why this exists, and when

v0 already ships the settings themselves — a popover on the header gear, with accordion sections and
the prototype's full option set, presented as one flat list. v0.1 adds **two** things over that
list: **search**, and the **category tabs** that group the sections — v0 has neither, since
`Dialog` and `Tabs` both dropped out of v0 and `Accordion` was its only new component. That is this
**v0.1** milestone, landing right after the player works and **ahead of** the v0.2 scoring layer,
because search is what makes a large settings set usable day-to-day.

This document captures the design while it is fresh. It is not a build plan.

## 2. Shape

The **same non-blocking popover v0 ships — not a modal** (settled 2026-09-12). Search at the top,
category tabs beneath it, accordion sections inside each tab. v0 chose a popover because it never
blocks the player, and v0.1 keeps that property.

```text
┌─ settings popover ───────────────────────────────┐
│ [✕]   🔍  Search settings                        │  close + full-width search
├──────────────────────────────────────────────────┤
│   Audio   │   MIDI   │   Notation  ◄ active      │  tabs, underline on active
├──────────────────────────────────────────────────┤
│  General:                                  ▶     │  accordion, collapsed
│  Metronome:                                ▼     │  accordion, expanded
│     Enable metronome                  [✓]        │
│     Output                    (?)     [Both ▾]   │
│     Note                              [76]       │
│       ──────────────●──────                      │  slider under its number
│     Volume                            [0.1]      │
│       ──●──────────────────                      │
│  Playback:                                 ▶     │
└──────────────────────────────────────────────────┘
```

The tab names above are illustrative. Our real categories are the prototype's own groups, settled
2026-09-12 (§7 S1).

## 3. Behaviour

### Tabs

Top-level categories. One active at a time, marked with an underline indicator. Base UI `Tabs`
supports `activateOnFocus` and `loopFocus`, both of which we want for keyboard use.

### Accordions

Each tab holds several collapsible sections. Section labels read as `Name:` — the trailing colon is
part of the label. A chevron shows state: `▶` collapsed, `▼` expanded.

Whether more than one section may be open at once is undecided (§7).

### Search — the part that carries the design

Typing in the search box changes the whole panel:

1. **The tabs disappear.** They are replaced by a flat result list.
2. **Results group under breadcrumb headers** showing where each setting lives — `Audio > Metronome`,
   `Audio > Background track`. Headers are underlined and read as jump links.
3. **Search is global across every tab**, not scoped to the active one. That is the entire reason
   the breadcrumb exists: a result may come from a tab you are not on.
4. **Controls stay live in the results.** Sliders and inputs are editable directly in the result
   list — they are not previews that send you elsewhere. Action rows (§4) are invocable there too.
5. **A clear control (`✕`) appears** in the search box and returns you to the tab view.
6. **A query that matches nothing** shows a short "No settings found" message in place of the
   result list. The search box and its clear control stay active.

This means every setting must be reachable from a flat, searchable index — label, section and tab —
built independently of which tab is rendered. That index is a flat projection of the per-row
accessor schema v0 already builds (parent §7), so v0.1's genuinely new engineering is the result
view that renders those same live controls outside their own tab, plus its focus and screen-reader
model (S5).

## 4. Row grammar

Every setting is one row with a consistent shape:

| Part    | Placement                            | Notes                                                                                                                      |
| ------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Label   | left                                 | plain text                                                                                                                 |
| Help    | immediately after the label          | a `(?)` icon opening a tooltip; optional                                                                                   |
| Control | right-aligned                        | checkbox, select, or number input                                                                                          |
| Slider  | its own line, beneath the row        | only for numeric settings, paired with the number input                                                                    |
| Action  | right-aligned, in place of a control | a button that runs a command instead of editing a value — the Tools group is two of these (Export MIDI, Export Guitar Pro) |

The paired number-plus-slider is worth keeping: the number gives a precise, typeable value while the
slider gives coarse, fast adjustment. Both edit the same value.

## 5. Components

**Components:**

| Component   | Source              | Notes                                                                        |
| ----------- | ------------------- | ---------------------------------------------------------------------------- |
| `Dialog`    | Base UI `Dialog`    | **Not needed.** v0.1 keeps v0's non-blocking `Popover` (settled 2026-09-12). |
| `Accordion` | Base UI `Accordion` | Built in v0; holds the sections.                                             |

**Already built and reusable:** `Tabs`, `SearchInput`, `Checkbox`, `NativeSelect`, `Slider`,
`Input`, `Tooltip`, `Field`, `Separator`, `ScrollArea`. The single-value `Slider` is built in v0
alongside `Accordion`; `RangeSlider` is dual-thumb only (`value: [number, number]`), so it cannot
serve §4's slider line.

**`Tabs` is reusable in behaviour, not in appearance.** The built component is a segment control —
the active trigger takes a solid fill on a pill track — and it does not wrap Base UI's
`Tabs.Indicator`. §3's underline needs an `underline` variant plus a wrapped `Tabs.Indicator` added
to the `client/` component, so the tab chrome stays inside the visual-regression and accessibility
gates that block merge.

**No new layout piece is needed.** The settings row is `Field` with `orientation="horizontal"`,
which already gives the label-left / control-right layout (parent §7).

`Accordion` comes from `@base-ui/react`, which is already the decided library, so this adds no new
dependency.

## 6. Prior art, and staying original

This is the standard searchable-settings pattern, shipped by **VS Code** (`⌘,` — search results
render as live controls under breadcrumb category paths), **macOS System Settings**, **Windows
Settings**, **Chrome**, **Firefox** and the **JetBrains** IDEs. It is an industry convention, not
anyone's proprietary design, and copyright protects expression rather than functional layout
patterns.

To stay clearly original, four rules apply when building it:

1. **Write our own label copy.** Do not lift strings from any reference product.
2. **Use our own icons and styling** — self-hosted Material Symbols and the brand teal tokens, which
   the design system already provides.
3. **Our category structure is our own prototype's, not any reference product's.** The groups stay
   exactly as the prototype has them (settled 2026-09-12, §7 S1); drum-specific categories were
   considered and rejected, and any divergence comes later.
4. **Copy no files or file fragments from the `rhythm-game` prototype fork.** It is MPL-2.0 and
   this repo is not, so its patterns are ported with the fork open for reference only (D4,
   clean-room).

## 7. Open questions

| #   | Question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Notes                                                                                                                                                                                                                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | ~~What are the actual categories?~~ **Settled 2026-09-12:** the prototype's own groups — Display ▸ General, Colors, Fonts, Paddings, Notation, Player, Stylesheet, Tools — kept as-is. MIDI becomes a new tab in a later version, with the Web MIDI work. **Two-level mapping (2026-09-13):** the `▸` in the settled names is the split — the tabs are Display, Notation, Player, Stylesheet and Tools; Display holds the General, Colors, Fonts and Paddings sections, and each remaining tab holds one section of its own name. | —                                                                                                                                                                                                                                                                                                                                |
| S2  | May multiple accordion sections be open at once, or does opening one close the others?                                                                                                                                                                                                                                                                                                                                                                                                                                            | Not observable from the reference screenshots.                                                                                                                                                                                                                                                                                   |
| S3  | ~~Does search match labels only, or also help text and option values?~~ **Settled 2026-09-13:** labels only — §3's index carries label, section and tab. Matching help text or option values is a later extension that widens every index entry, not a matcher change.                                                                                                                                                                                                                                                            | —                                                                                                                                                                                                                                                                                                                                |
| S4  | ~~Where do settings persist?~~ **Settled 2026-09-12:** one `localStorage` key holding AlphaTab's settings JSON plus a `version` integer. Restore goes through `Settings.fillFromJson`, merges per key against the shipped defaults, falls back to defaults on a corrupt or stale value, and toasts when a value is discarded.                                                                                                                                                                                                     | —                                                                                                                                                                                                                                                                                                                                |
| S5  | Keyboard and screen-reader behaviour for the search-results view                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | The results view has no tabs, so focus order changes. Two things the pass must cover: an ARIA live region announcing the result count when the query changes (WCAG 4.1.3 Status Messages), and adding the results view to the `web/` axe lane — that lane only checks the states it enumerates, and v0's four do not include it. |
| S6  | Is a better approach worth a spike?                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Noted as acceptable: this pattern is good enough to adopt now, and can be revisited later.                                                                                                                                                                                                                                       |

## 8. Not in scope

- **Per-song state.** Nothing song-scoped is saved as a global preference: the chart's own tempo and
  the A–B loop points belong to the player. The global 12.5–200% playback-speed slider is a
  different thing — it is a Player-group row inside this panel (parent §7) and is indexed by search
  like every other row.
- **Any setting that needs a backend.** v0.1 remains local-only, consistent with v0.
- **Scoring settings** — hit windows, latency compensation, input device. Those arrive with v0.2 and
  will add a category here rather than change this design.
