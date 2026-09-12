# v0.1 — settings panel

|            |                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------- |
| **Date**   | 2026-09-11                                                                                        |
| **Status** | 🟡 draft — captured from design discussion, not yet reviewed                                      |
| **Epic**   | [NH-291](https://leocaseiro.atlassian.net/browse/NH-291) (v0 player — this is the next milestone) |
| **Parent** | [`2026-09-10-v0-local-file-player-design.md`](2026-09-10-v0-local-file-player-design.md) §10      |

## 1. Why this exists, and when

v0 already ships the settings themselves — a popover on the header gear, with accordion sections and
the prototype's full option set. What v0 lacks is **search**. That is this **v0.1** milestone,
landing right after the player works and **ahead of** the v0.2 scoring layer, because search is what
makes a large settings set usable day-to-day.

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

The tab names above are illustrative. Our real categories are an open question (§7).

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
   list — they are not previews that send you elsewhere.
5. **A clear control (`✕`) appears** in the search box and returns you to the tab view.

This means every setting must be reachable from a flat, searchable index — label, section and tab —
built independently of which tab is rendered. That index is the one genuinely non-trivial piece of
engineering in this panel.

## 4. Row grammar

Every setting is one row with a consistent shape:

| Part    | Placement                     | Notes                                                   |
| ------- | ----------------------------- | ------------------------------------------------------- |
| Label   | left                          | plain text                                              |
| Help    | immediately after the label   | a `(?)` icon opening a tooltip; optional                |
| Control | right-aligned                 | checkbox, select, or number input                       |
| Slider  | its own line, beneath the row | only for numeric settings, paired with the number input |

The paired number-plus-slider is worth keeping: the number gives a precise, typeable value while the
slider gives coarse, fast adjustment. Both edit the same value.

## 5. Components

**Components:**

| Component   | Source              | Notes                                                                        |
| ----------- | ------------------- | ---------------------------------------------------------------------------- |
| `Dialog`    | Base UI `Dialog`    | **Not needed.** v0.1 keeps v0's non-blocking `Popover` (settled 2026-09-12). |
| `Accordion` | Base UI `Accordion` | Built in v0; holds the sections.                                             |

**Already built and reusable:** `Tabs`, `SearchInput`, `Checkbox`, `NativeSelect`, `RangeSlider`,
`Input`, `Tooltip`, `Field`, `Separator`, `ScrollArea`.

**Probably one new layout piece:** a settings row (label + optional help + right-aligned control).
Check whether `Field` already covers this before building anything new — it may.

Both components come from `@base-ui/react`, which is already the decided library, so this adds no new
dependency.

## 6. Prior art, and staying original

This is the standard searchable-settings pattern, shipped by **VS Code** (`⌘,` — search results
render as live controls under breadcrumb category paths), **macOS System Settings**, **Windows
Settings**, **Chrome**, **Firefox** and the **JetBrains** IDEs. It is an industry convention, not
anyone's proprietary design, and copyright protects expression rather than functional layout
patterns.

To stay clearly original, three rules apply when building it:

1. **Write our own label copy.** Do not lift strings from any reference product.
2. **Use our own icons and styling** — self-hosted Material Symbols and the brand teal tokens, which
   the design system already provides.
3. **Use our own category structure.** Ours is drum-specific and will diverge naturally.

## 7. Open questions

| #   | Question                                                                                                                                                                                                                                                  | Notes                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| S1  | ~~What are the actual categories?~~ **Settled 2026-09-12:** the prototype's own groups — Display ▸ General, Colors, Fonts, Paddings, Notation, Player, Stylesheet, Tools — kept as-is. MIDI becomes a new tab in a later version, with the Web MIDI work. | —                                                                                                                            |
| S2  | May multiple accordion sections be open at once, or does opening one close the others?                                                                                                                                                                    | Not observable from the reference screenshots.                                                                               |
| S3  | Does search match labels only, or also help text and option values?                                                                                                                                                                                       | Matching help text finds more but produces confusing hits. Labels-only is the cheaper start.                                 |
| S4  | Where do settings persist?                                                                                                                                                                                                                                | `localStorage` is simplest; IndexedDB is already in the stack for recent files. Pick one when the first real setting exists. |
| S5  | Keyboard and screen-reader behaviour for the search-results view                                                                                                                                                                                          | The results view has no tabs, so focus order changes. Needs an accessibility pass, which the repo gates on anyway.           |
| S6  | Is a better approach worth a spike?                                                                                                                                                                                                                       | Noted as acceptable: this pattern is good enough to adopt now, and can be revisited later.                                   |

## 8. Not in scope

- **Per-song settings.** Everything here is global preference. Song-scoped state (tempo, loop points)
  belongs to the player, not this panel.
- **Any setting that needs a backend.** v0.1 remains local-only, consistent with v0.
- **Scoring settings** — hit windows, latency compensation, input device. Those arrive with v0.2 and
  will add a category here rather than change this design.
