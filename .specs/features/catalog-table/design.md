# Catalog Table (NH-210) — Design

**Ticket:** [NH-210](https://leocaseiro.atlassian.net/browse/NH-210) — _SD-10: catalog column-header sort (click to sort, asc/desc) — TanStack Table_
**Status:** Design — brainstorm complete, awaiting review → implementation plan
**Date:** 2026-06-27

## Goal

NH-210 asks for **click-to-sort column headers** (asc/desc, arrow on the active
column) on the catalog list, built on TanStack Table. We deliver that sort as the
headline interaction of a **reusable, data-agnostic table component** plus the
catalog's cell components, all covered by Storybook — so "every table view" in the
app reuses one engine rather than re-implementing sort each time.

This is the real-app implementation of the sort demoed in the wireframe (PR #88).

## Decisions (from brainstorm)

- **Scope (Tier 2):** generic `DataTable` + catalog composition + the reusable cell
  components + Storybook + tests. **Out of scope:** the filter row, "Continue" card,
  topbar, and the `relevance / newest / curated` sort _dropdown_ — those are page
  chrome with their own tickets.
- **Markup (B1):** shadcn `<Table>` primitives styled as gap-separated rounded
  **card-rows**. A real `<table>` + `aria-sort` gives accessibility for free, and the
  card look matches the locked catalog mockup.
- **Architecture:** headless TanStack engine. A generic `ui/DataTable<TData>` owns the
  wiring and the NH-210 sortable headers; `catalog/CatalogTable` is a thin column
  config. The table never knows the data shape — composition happens in each column's
  `cell` renderer.
- **Reuse / naming:** cell _contents_ are standalone reusable components with plain
  names in `ui/` (`ScoreDonut`, `LevelPill`, `Cover`, `Flags`) — never `TableCell*`.
  Only the catalog-specific `NameCell` lives in `catalog/`.
- **Storybook:** the repo `Button` pattern — `@storybook/tanstack-react`, `autodocs`,
  every prop wired as a Control + named example stories.
- **Tests:** per-component `.test.tsx` (Vitest + Testing Library), a11y (axe, blocks
  CI), VR (Playwright `toHaveScreenshot`, per-OS baselines) for **all** components.

## Architecture

TanStack Table is headless, so the engine is generic and the UI is pure composition:

```tsx
// ui/DataTable — generic, reusable, knows NOTHING about the catalog. NH-210 sort lives here.
<DataTable<TData>
  data={data}
  columns={columns}
  appearance="cards"            // "cards" (gap-separated rounded rows) | "rows" (plain)
  onRowClick={open}
/>

// ui/DataTable wraps every cell generically — no per-cell table components are written:
<TableCell className={alignFor(cell.column)}>
  {flexRender(cell.column.columnDef.cell, cell.getContext())}
</TableCell>

// catalog/CatalogTable — a thin column config that drops the reusable cells in:
const columns: ColumnDef<CatalogRow>[] = [
  { accessorKey: 'title', header: 'Name',  cell: ({ row }) => <NameCell row={row.original} /> },
  { accessorKey: 'level', header: 'Level', meta: { align: 'center' }, cell: ({ getValue }) => <LevelPill level={getValue<number | null>()} /> },
  { accessorKey: 'bpm',   header: 'BPM',   meta: { align: 'right' },  cell: ({ getValue }) => <Bpm value={getValue<number | string>()} /> },
  { accessorKey: 'best',  header: 'Best',  meta: { align: 'right' }, sortDescFirst: true, cell: ({ getValue }) => <ScoreDonut score={getValue<number | null>()} /> },
  { id: 'play', header: '', enableSorting: false, cell: ({ row }) => <PlayButton onClick={() => quickPlay(row.original)} /> },
];
```

## Components and folders

`ui/` = reusable across the app (player, song detail, history). `catalog/` = only
meaningful inside the catalog list.

| Component      | Folder                 | Source     | Notes                                                                               |
| -------------- | ---------------------- | ---------- | ----------------------------------------------------------------------------------- |
| `Table`        | `ui/Table`             | shadcn add | Table / TableHeader / TableBody / TableRow / TableHead / TableCell primitives       |
| `Badge`        | `ui/Badge`             | shadcn add | base for the badges (KindBadge + NewPill build on it)                               |
| `DataTable`    | `ui/DataTable`         | new        | generic TanStack engine + sortable headers (NH-210) + `appearance`                  |
| `ScoreDonut`   | `ui/ScoreDonut`        | new        | best-score donut, System G bands                                                    |
| `LevelPill`    | `ui/LevelPill`         | new        | level number pill (+ Debut, + none)                                                 |
| `Cover`        | `ui/Cover`             | new        | rounded icon tile (song vs lesson tint)                                             |
| `Flags`        | `ui/Flags`             | new        | audio / video / parts indicator icons                                               |
| `KindBadge`    | `ui/KindBadge`         | new        | `Badge variant="outline"` (transparent bg, colored border/text): Beat/Rudiment/Fill |
| `NewPill`      | `ui/NewPill`           | new        | preset over `Badge`: "New"                                                          |
| `Bpm`          | `ui/Bpm`               | new        | BPM formatter (number or `60→120` range) + aria-label; reusable, own tested folder  |
| `PlayButton`   | —                      | —          | just `Button size="icon" variant="ghost"` with a `play_circle` glyph; no new file   |
| `CatalogTable` | `catalog/CatalogTable` | new        | column config + data hand-off to `DataTable`                                        |
| `NameCell`     | `catalog/NameCell`     | new        | the **2-line** name block (composes Cover + badges + flags)                         |

Each component folder follows the `Button` precedent:
`Name.tsx`, `Name.stories.tsx`, `Name.story-ids.ts`, `Name.test.tsx`,
`Name.a11y.ts`, `Name.vr.ts` (+ generated `Name.vr.ts-snapshots/`).
**Flat structure, no nesting** (matches `ui/Button/`); every testable unit gets its own
folder — no untested colocated helpers.

## ui/DataTable — generic API + the NH-210 sort

```ts
interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  appearance?: 'cards' | 'rows'; // default 'cards' (both built)
  sorting?: SortingState; // controlled (optional)
  onSortingChange?: OnChangeFn<SortingState>;
  defaultSorting?: SortingState; // uncontrolled initial sort
  columnVisibility?: VisibilityState; // controlled show/hide (optional)
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  defaultColumnVisibility?: VisibilityState; // uncontrolled initial visibility
  onRowClick?: (row: TData) => void;
  getRowId?: (row: TData) => string;
  isLoading?: boolean;
  emptyState?: ReactNode;
}
```

Sort behaviour (NH-210):

- Headers where `column.getCanSort()` render a header button; click → sort by that
  column. Clicking the **active** header toggles **asc ⇄ desc only** (a 2-state
  toggle, not TanStack's default 3-state cycle — set `enableSortingRemoval: false` and
  `enableMultiSort: false`, single-column only).
- The active column shows a Material Symbol arrow (`arrow_upward` / `arrow_downward`)
  with accent text; inactive columns show none.
- `<th aria-sort="ascending | descending | none">` reflects state for screen readers.
- First-click direction per column comes from `sortDescFirst` (Best = desc-first;
  Name / Level / BPM = asc-first) — matches the wireframe defaults.
- Column alignment comes from `columnDef.meta.align` applied to the `<TableCell>`.

Column visibility (from OQ3):

- The table supports show/hide per column via TanStack `VisibilityState` (controlled
  or uncontrolled) so columns toggle easily — this also backs a future power-user
  "Columns" menu.
- A Storybook story demonstrates the toggle (controls / buttons that hide + show
  columns live).
- Narrow widths keep **Name + Level + Best + Play** and hide **BPM** first (Level is
  retained, per Leo). The automatic breakpoint-driven hide can land later; the
  visibility capability + a fixed-width narrow story (**480px, BPM hidden, title
  ellipsis**) ship now.

## Interaction & visual states

- **Card-row hover (F3 — B1 markup risk):** when `appearance="cards"` and `onRowClick`
  is set, a row lifts (`translateY(-1px)`), gains a teal-tinted border, and a soft glow
  shadow — per the locked `catalog.html` `.trow:hover`. A real `<tr>` does not take
  `transform` / `border-radius` / inter-row `gap` cleanly, so the card look needs
  `border-collapse: separate; border-spacing: 0 <gap>` with the lift + shadow on an
  inner cell wrapper. **De-risk first:** the card-row VR snapshot is build step #1 —
  confirm the real `<table>` reproduces the locked visual before the rest of the engine
  is built; `appearance="rows"` (plain grid rows) is the documented fallback.
- **Empty state:** `DataTable` default renders a single column-spanning "No results"
  cell at normal row height; `CatalogTable` passes "No pieces found — adjust your
  filters".
- **Loading state (`isLoading`):** N skeleton rows (default 5) matching the real layout
  — `NameCell` = a 40px rounded tile + two stacked bars (title ~60%, subtitle ~40%);
  Level / BPM / Best each a short centred bar.
- **Sort-header affordance:** an inactive sortable header shows its sort arrow at
  reduced opacity on hover **and** keyboard focus (a `focus-visible` ring is required —
  axe enforces it), previewing the asc-first direction before the user commits.

## Cell components (states)

- **ScoreDonut** `{ score: number | null; size?: number }` — conic-gradient ring; the
  exact number is always centred (mono, tabular). **System G bands:** `null` or `0` →
  empty grey ring + dash (not attempted, per the locked `donut.empty`); `1–49`
  reddish-purple; `50–69` orange; `70–88` blue; `89–99`
  green; `100` → gold disc + trophy glyph. Colour is reinforcement only (the number is
  authoritative → colourblind-safe by construction).
- **LevelPill** `{ level: number | null }` — `0` → "Debut" (accent); `1–10` → number
  (neutral); `null` → dashed dash.
- **Cover** `{ icon?: string; variant?: 'song' | 'lesson' }` — rounded tile, accent
  tint for songs, blue tint for lessons.
- **Flags** `{ audio?: boolean; video?: boolean; parts?: boolean }` — small icon row;
  `parts` is accent-coloured (has playable sub-sections).
- **KindBadge** `{ kind: 'beat' | 'rudiment' | 'fill' }` — shadcn `Badge variant="outline"`
  (transparent background, colored border + text): Beat (teal), Rudiment (blue), Fill
  (orange-red `#D2664A`, distinct from the score-band orange). Colors validated to WCAG
  AA contrast in both themes (darken the shade if axe flags it).
- **NameCell** `{ row: CatalogRow }` — the **2 lines**: line 1 = Cover + title +
  `KindBadge?` + `NewPill?`; line 2 = subtitle + `Flags?`.

## Accessibility (a11y)

a11y (axe WCAG A+AA, both themes, resting + hover) blocks CI, so every cell carries an
accessible name — colour/shape is never the only signal:

- **ScoreDonut** — `role="img"`; `aria-label` = `"Best score: 74, Climbing"` (number +
  band) / `"Best score: Mastered"` (100) / `"Not attempted"` (`null` or `0`); the inner
  number span is `aria-hidden`.
- **LevelPill** — `aria-label` = `"Level: 3"` / `"Debut"` (level 0) / `"Ungraded"`
  (`null`); never a bare dash character.
- **Flags** — wrapper `role="img"` with a composed label (e.g. `"Has audio, video and
parts"`); each glyph `aria-hidden`; renders nothing when no flags are set.
- **Bpm** — `aria-label` = `"BPM: 116"` / `"BPM: 60 to 120"`; the `→` glyph is
  `aria-hidden`.
- **PlayButton** — `aria-label="Play {title}"` (title from row context) + a **44×44px
  hit area** (WCAG 2.5.5) even though the visible circle stays 34px.
- **Cover** — decorative: `aria-hidden` (song vs lesson is carried by KindBadge / the
  title, not the icon tint).

## Example data shape (non-binding)

The table is generic; this is only the shape the catalog columns + stories use:

```ts
interface CatalogRow {
  id: string;
  title: string;
  subtitle: string; // pre-composed line 2, e.g. "Rock · 4/4 · drums·guitar" or "4 steps · timing"
  kind: 'song' | 'beat' | 'rudiment' | 'fill';
  icon?: string; // Material Symbol name for the cover
  isLesson?: boolean;
  level: number | null; // 0 = Debut, null = ungraded
  bpm: number | string; // 116, or "60→120" for a lesson ramp
  best: number | null; // 0–100, null = not attempted
  isNew?: boolean;
  flags?: { audio?: boolean; video?: boolean; parts?: boolean };
}
```

## Storybook plan

- `DataTable.stories.tsx` — generic demo (synthetic columns): default, `SortableHeaders`
  (interactive), `ColumnVisibilityToggle` (show/hide columns live), `Empty`, `Loading`,
  `Appearance` (cards vs rows).
- `CatalogTable.stories.tsx` — `Songs`, `Lessons`, `Empty`, `Mastered`, `Mixed`; the
  sort is exercised by the column headers.
- Each cell component — every prop as a Control + named stories for its states
  (e.g. `ScoreDonut`: NotAttempted / Low / Developing / Climbing / High / Mastered + a
  size control).

## Testing / a11y / VR

- `.test.tsx` per component (Vitest + Testing Library): sort toggling + `aria-sort`,
  band thresholds, Debut/none level, empty/loading.
- a11y — axe over every story × light/dark × resting + hover (the repo convention);
  blocks CI.
- VR — one Playwright snapshot per story id, driven by `Name.story-ids.ts` so VR + a11y
  stay in lockstep with the stories; per-OS baselines (Linux via the documented Docker
  flow). **All** components in scope.

## Tokens to add

`styles.css` has no score-band colours yet. Add them as oklch role tokens (light +
dark) + map via `@theme` so cells consume Tailwind classes, not raw hex:
`--score-low` (reddish-purple), `--score-developing` (orange), `--score-climbing`
(azure), `--score-high` (green), `--score-mastered` + `--score-mastered-foreground`
(gold). Sourced from the locked Okabe-Ito values in
`docs/mockups/catalog-donut-bands.html`.

## Dependencies

- Add `@tanstack/react-table` (not yet installed; `react-query` + `react-router` are).
- `shadcn add table badge` → move each into its folder per the repo convention.

## Out of scope (separate tickets)

Filter row (tabs, Jira-style filter dropdowns, token pickers, tempo range), the
"Continue" resume card, the topbar, the `relevance / newest / curated` sort dropdown,
song-slice / parts expansion, and the per-user Best-column sign-in gating (that is the
consumer's call via column visibility, not the table's concern).

## Resolved decisions (review gate, 2026-06-27)

1. **KindBadge / NewPill placement** → `ui/` (reusable beyond the catalog).
2. **`appearance`** → build **both** `'cards'` and `'rows'` now.
3. **Column visibility** → a first-class DataTable feature (`VisibilityState`) with a
   Storybook toggle story; narrow widths keep **Level** and hide **BPM** first; the
   automatic responsive hide + any in-app "Columns" toggle UI can land later.
4. **NewPill** → its own tiny component (gets a story + VR), wrapping `Badge`.

## Doc-review resolutions (ce-doc-review, 2026-06-27)

Five-persona review (coherence, feasibility, design-lens, scope-guardian, adversarial);
feasibility came back clean. All six actionable findings applied:

- **F1** — `ScoreDonut` `0` renders as the empty grey donut (same as `null` = not
  attempted), per the locked `catalog.html`.
- **F2** — added the cell **Accessibility** contract (section above).
- **F3** — card-row hover spec + `<table>`-vs-card-row de-risk (card-row VR snapshot is
  build step #1; `appearance="rows"` fallback).
- **F4** — specified empty / loading / sort-header-focus states.
- **F5** — `KindBadge` uses `Badge variant="outline"`; Fill = `#D2664A`, AA-validated.
- **F6** — `Bpm` is its own reusable `ui/Bpm/` component; flat folder structure
  confirmed; narrow visibility story fixed at 480px.

**FYI (acknowledged, not actioned):** scope-guardian / adversarial flagged that the
controlled column-visibility props, both `appearance` modes, and `NewPill` as its own
folder are built ahead of a second consumer — accepted as deliberate (Leo's call).

**Deferred questions:** lock the 88/89 blue→green band edge before tests encode it; is
the mastered trophy-glow in scope for `ScoreDonut`?; should the Best column show a
"sign in" placeholder for signed-out users?
