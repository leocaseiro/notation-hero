# Catalog Table (NH-210) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the NH-210 click-to-sort catalog table as a reusable, data-agnostic `ui/DataTable<TData>` engine (TanStack Table) plus the catalog's cell components and a thin `catalog/CatalogTable` config — all covered by Storybook, unit tests, accessibility (axe) and visual-regression (VR), matching the locked catalog mockup.

**Architecture:** Headless TanStack Table. A generic `ui/DataTable` owns all the wiring and the NH-210 sortable headers; the table never knows the data shape — composition happens in each column's `cell` renderer. Reusable cell _contents_ are standalone components in `ui/` (`ScoreDonut`, `LevelPill`, `Cover`, `Flags`, `KindBadge`, `NewPill`, `Bpm`, `PlayButton`); only `catalog/CatalogTable` (column config) and `catalog/NameCell` (the 2-line name block) are catalog-specific.

**Tech Stack:** React 19, TypeScript 5.7, `@tanstack/react-table` v8 (to add), Tailwind v4 (`@theme` oklch tokens), shadcn primitives (`radix-vega` style), Storybook v10 (`@storybook/tanstack-react`), Vitest 4 + Testing Library, Playwright 1.61 (axe `a11y` project + `chromium` VR project), self-hosted Material Symbols.

**Source spec:** `docs/specs/2026-06-27-nh-210-catalog-table-design.md` (read it first — this plan implements it).

## Global Constraints

These apply to **every** task. Values are copied from the spec + the repo's existing conventions (`client/src/components/ui/Button/` is the precedent for every new component).

- **Working tree:** the `client/` package (`@notation-hero/client`). All commands below run from the repo root via pnpm filters, e.g. `pnpm --filter @notation-hero/client test`.
- **Toolchain:** Node 24 (`.nvmrc`), pnpm 11.5.2. Add deps with `pnpm --filter @notation-hero/client add <pkg>`.
- **Folder-per-component (the Button precedent):** every component is its own PascalCase folder under `client/src/components/{ui,catalog}/<Name>/` holding **exactly** these files (flat, no nesting):
  - `<Name>.tsx` — the component
  - `<Name>.stories.tsx` — Storybook stories (`title: 'UI/<Name>'` or `'Catalog/<Name>'`, `tags: ['autodocs']`)
  - `<Name>.story-ids.ts` — the shared kebab story-id list (so VR + a11y stay in lockstep with the stories)
  - `<Name>.test.tsx` — Vitest + Testing Library unit tests
  - `<Name>.a11y.ts` — axe sweep (Playwright `a11y` project)
  - `<Name>.vr.ts` — visual-regression snapshots (Playwright `chromium` project)
  - `<Name>.vr.ts-snapshots/` — committed baseline PNGs (generated, both `-darwin` and `-linux`)
- **Component code style** (match `Button.tsx` exactly): arrow-function components; `import { cn } from '@/lib/utils'`; class variants via `cva` from `class-variance-authority`; primitives from the unified `radix-ui` package (e.g. `import { Slot } from 'radix-ui'` → `Slot.Root`); set a `data-slot="<kebab-name>"` attribute on the root element (VR + tests locate by it); named exports.
- **Imports:** within a folder use relative (`./Button`); across folders use the `@/` alias to the full path (`@/components/ui/Badge/Badge`, `@/lib/utils`). There is **no barrel** `index.ts` — do not add one.
- **Icons:** self-hosted Material Symbols only. Render a glyph as `<span className="material-symbols-outlined" aria-hidden="true">glyph_name</span>` (the `.material-symbols-outlined` class is already defined in `src/styles.css`). The repo does **not** install `lucide-react` — when shadcn generates a primitive that imports from `lucide-react`, strip those imports and replace any icon with a Material Symbols span.
- **Colour:** consume Tailwind/theme tokens, never raw hex in components. Brand is teal; purple/orange/blue/green/gold appear **only** as score-band tokens (added in Task 4).
- **a11y is a hard CI gate:** axe (WCAG 2.0/2.1 **A + AA**) runs over every story × light/dark × resting + hover and **blocks CI**. Every non-text cell carries an accessible name; colour/shape is never the only signal. A `focus-visible` ring is required on every interactive element.
- **VR is a hard CI gate:** one screenshot per story id, per OS. Baselines are committed for **both** `-darwin` (local macOS) and `-linux` (CI, generated via the Playwright Docker image — see "VR baselines" below). CI compares against `-linux` inside `mcr.microsoft.com/playwright:v1.61.1-noble`.
- **Lint/format:** Prettier (`semi: true`, `printWidth: 100`, `singleQuote: true`, `trailingComma: 'all'`); `eslint . --max-warnings 0`. Run `pnpm --filter @notation-hero/client lint` + `typecheck` before each commit.
- **Commits:** baby commits at every green step; conventional-commit subjects scoped `feat(catalog):` / `feat(ui):`; **never** `--no-verify` (lefthook must pass). End every commit message with the trailer:

  ```
  Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
  ```

- **Locked product decisions (from the spec — do not re-litigate):**
  - **Score bands** (ring colour reinforces the always-shown number): `null` **or** `0` → empty grey ring + dash ("not attempted"); `1–49` reddish-purple; `50–69` orange; `70–88` blue; `89–99` green; `100` → gold disc + trophy glyph (**no glow**). The blue→green cut is locked at `< 89` blue / `≥ 89` green.
  - **Score aria-labels are number-only** (`"Best score: 74"`, `"Best score: 100"`, `"Not attempted"`); band _naming_ is deferred to NH-249.
  - **Sort is a 2-state toggle** (asc ⇄ desc only — not TanStack's 3-state cycle), single-column, no multi-sort.
  - **BPM sort uses TanStack's default sort** (no custom `sortingFn`); precise/ramp-aware ordering is backend work, out of scope.
  - **KindBadge** uses `Badge variant="outline"` (transparent bg, coloured border + text) — a deliberate departure from the mockup's tinted-fill badges. Fill = `#D2664A`.
  - **LevelPill Debut** (`level === 0`) is accent **text** on a neutral pill (not a filled accent pill).
  - **`kind` values are full words** (`song` / `beat` / `rudiment` / `fill`) — no abbreviations.
  - **PlayButton** has a **44×44px hit area** (visible circle 34px) — WCAG 2.5.5 (AAA), a **manual** requirement (axe stops at AA), enforced by a unit assertion. Its `onClick` calls `event.stopPropagation()` so a play tap does not also open the row.
  - **Clickable rows are keyboard-operable** (focusable, Enter/Space activate, focus-visible ring) — WCAG 2.1.1, a manual contract (axe can't catch a missing handler on a non-button).
- **Out of scope (separate tickets — do not build):** the filter row, the "Continue" resume card, the topbar, the `relevance / newest / curated` sort _dropdown_, song-slice/parts expansion, per-user Best-column sign-in gating, automatic responsive column hiding, an in-app "Columns" menu, wiring `CatalogTable` into a route, and e2e tests. The feature ships as Storybook-tested components.
- **Deliberately built ahead of a second consumer (accepted — the spec's "FYI"):** controlled column-visibility props, both `appearance` modes, and `NewPill` as its own folder.

---

## Conventions & shared test harness

Read this once; every task refers back to it. The two Playwright files (`*.a11y.ts`, `*.vr.ts`) are near-identical per component — they are shown **in full** here as templates, then each task gives the exact substitution values. The unit tests, stories, story-ids, and component code are **unique per task and shown in full** in that task.

### Story-id sanitisation (must match Storybook exactly)

Storybook derives a story id as `sanitize(title) + '--' + sanitize(exportName)`, where `sanitize` lowercases and replaces every non-alphanumeric run with a single `-` (it does **not** split camelCase). So:

| Title                  | id prefix              | Example export → story id                            |
| ---------------------- | ---------------------- | ---------------------------------------------------- |
| `UI/DataTable`         | `ui-datatable`         | `SortableHeaders` → `ui-datatable--sortable-headers` |
| `UI/ScoreDonut`        | `ui-scoredonut`        | `NotAttempted` → `ui-scoredonut--not-attempted`      |
| `UI/LevelPill`         | `ui-levelpill`         | `Debut` → `ui-levelpill--debut`                      |
| `UI/Cover`             | `ui-cover`             | `Song` → `ui-cover--song`                            |
| `UI/Flags`             | `ui-flags`             | `All` → `ui-flags--all`                              |
| `UI/KindBadge`         | `ui-kindbadge`         | `Beat` → `ui-kindbadge--beat`                        |
| `UI/NewPill`           | `ui-newpill`           | `Default` → `ui-newpill--default`                    |
| `UI/Bpm`               | `ui-bpm`               | `Range` → `ui-bpm--range`                            |
| `UI/PlayButton`        | `ui-playbutton`        | `Default` → `ui-playbutton--default`                 |
| `Catalog/NameCell`     | `catalog-namecell`     | `Song` → `catalog-namecell--song`                    |
| `Catalog/CatalogTable` | `catalog-catalogtable` | `Songs` → `catalog-catalogtable--songs`              |

The `*.story-ids.ts` list holds the **second half** (the per-story slug); the `*.a11y.ts` / `*.vr.ts` files build the full id with the prefix.

### Template — `<Name>.a11y.ts`

Identical to `client/src/components/ui/Button/Button.a11y.ts`. Substitute the four `<…>` placeholders:

- `<ID_PREFIX>` — e.g. `ui-scoredonut`
- `<STORY_IDS_CONST>` — e.g. `SCORE_DONUT_STORY_IDS`
- `<story-ids-file>` — e.g. `./ScoreDonut.story-ids`
- `<data-slot>` — e.g. `score-donut`

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { A11Y_TAGS } from '../../../a11y-tags';
import { <STORY_IDS_CONST> } from '<story-ids-file>';
import type { Page } from '@playwright/test';

const themes = ['light', 'dark'] as const;

async function expectNoA11yViolations(page: Page, label: string) {
  const { violations } = await new AxeBuilder({ page })
    .include('#storybook-root')
    .withTags([...A11Y_TAGS])
    .analyze();

  const report = violations
    .map(
      (v) =>
        `[${v.id}] ${v.help}\n` +
        v.nodes.map((n) => `    ${n.failureSummary?.replaceAll(/\s+/g, ' ').trim()}`).join('\n'),
    )
    .join('\n');

  expect(violations, `${label}\n${report}`).toEqual([]);
}

for (const theme of themes) {
  for (const story of <STORY_IDS_CONST>) {
    test(`<Name> / ${story} / ${theme}`, async ({ page }) => {
      await page.goto(`/iframe.html?id=<ID_PREFIX>--${story}&viewMode=story&globals=theme:${theme}`);
      await page.locator('#storybook-root').waitFor();
      await page.locator('[data-slot="<data-slot>"]').first().waitFor();
      if (theme === 'dark') {
        await page.locator('html.dark').waitFor();
      }
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      await page.addStyleTag({
        content:
          '*, *::before, *::after { transition: none !important; animation: none !important; }',
      });

      await expectNoA11yViolations(page, `${story}/${theme} resting`);

      await page.locator('[data-slot="<data-slot>"]').first().hover();
      await expectNoA11yViolations(page, `${story}/${theme} hover`);
    });
  }
}
```

> **Glyph stories only:** for a component that renders a Material Symbols glyph in _every_ story (`Cover`, `Flags`, `PlayButton`) add, right after `document.fonts.ready`, the Button precedent's font-load assertion so a failed font load can't pass as ligature-fallback text:
>
> ```ts
> const iconFontLoaded = await page.evaluate(() =>
>   document.fonts.check('1rem "Material Symbols Outlined Variable"'),
> );
> expect(iconFontLoaded, 'Material Symbols font failed to load').toBe(true);
> ```
>
> For `ScoreDonut` (only the `Mastered`/100 story has the trophy glyph), guard it with `if (story === 'mastered')`.

### Template — `<Name>.vr.ts`

Identical to `client/src/components/ui/Button/Button.vr.ts`. Substitute as above; `<snapshot-prefix>` is the kebab component name (e.g. `score-donut`).

```ts
import { expect, test } from '@playwright/test';

import { <STORY_IDS_CONST> } from '<story-ids-file>';

for (const story of <STORY_IDS_CONST>) {
  test(`<Name> / ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=<ID_PREFIX>--${story}&viewMode=story`);
    const target = page.locator('[data-slot="<data-slot>"]').first();
    await target.waitFor();
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await expect(target).toHaveScreenshot(`<snapshot-prefix>-${story}.png`);
  });
}
```

### VR baselines — generate BOTH OSes, then commit (every component task ends with this)

```bash
# 1. darwin baselines (local macOS):
pnpm --filter @notation-hero/client test:vr:update

# 2. linux baselines (CI parity) via the Playwright image — from the repo root:
docker run --rm \
  -v "$PWD":/work \
  -v /work/node_modules -v /work/client/node_modules -v /work/server/node_modules \
  -v /work/shared/node_modules -v /work/infra/node_modules -v /work/.pnpm-store \
  -w /work mcr.microsoft.com/playwright:v1.61.1-noble \
  bash -c "corepack enable && pnpm install --frozen-lockfile --ignore-scripts && \
    pnpm --filter @notation-hero/client exec playwright test --project=chromium --update-snapshots"

# 3. sanity-check both sets compare clean, then commit the *.vr.ts-snapshots/ PNGs:
pnpm --filter @notation-hero/client test:vr
```

> If Docker is unavailable in the execution environment, generate the `-darwin` baselines, commit them, and **log clearly** that `-linux` baselines are still required (CI's `vr` job will fail until they exist). Do not silently skip — the `-linux` set is a hard gate. **Before starting Task 1, confirm `docker run … mcr.microsoft.com/playwright:v1.61.1-noble` works** — otherwise you finish all 13 tasks and only then hit a red `vr` gate needing every component's `-linux` baselines regenerated at once.

### The full verify gate (run before every commit)

```bash
pnpm --filter @notation-hero/client typecheck
pnpm --filter @notation-hero/client lint
pnpm --filter @notation-hero/client test
pnpm --filter @notation-hero/client test:a11y   # needs Storybook; Playwright auto-starts it
pnpm --filter @notation-hero/client test:vr      # vs committed baselines
```

---

## File structure

New files, grouped by responsibility. `ui/` = reusable app-wide; `catalog/` = only meaningful in the catalog list.

| Path                                                          | Responsibility                                                             | Task |
| ------------------------------------------------------------- | -------------------------------------------------------------------------- | ---- |
| `client/src/components/ui/Table/Table.tsx`                    | shadcn table primitives (Table/Header/Body/Row/Head/Cell), lucide stripped | 1    |
| `client/src/components/ui/DataTable/DataTable.tsx`            | generic TanStack engine: card/rows appearance, sort, visibility, states    | 1–3  |
| `client/src/components/ui/DataTable/column-meta.ts`           | `ColumnMeta` align typing + `alignClass()` helper                          | 1    |
| `client/src/components/ui/ScoreDonut/ScoreDonut.tsx`          | best-score donut + locked bands + trophy                                   | 4    |
| `client/src/styles.css` (modify)                              | score-band oklch tokens (`:root` + `.dark` + `@theme inline`)              | 4    |
| `client/src/components/ui/LevelPill/LevelPill.tsx`            | level number pill (+ Debut, + ungraded)                                    | 5    |
| `client/src/components/ui/Cover/Cover.tsx`                    | rounded icon tile (song vs lesson tint)                                    | 6    |
| `client/src/components/ui/Flags/Flags.tsx`                    | audio/video/parts indicator icons                                          | 7    |
| `client/src/components/ui/Bpm/Bpm.tsx`                        | BPM formatter (number or `60→120` range) + aria-label                      | 8    |
| `client/src/components/ui/Badge/Badge.tsx`                    | shadcn badge primitive (base for KindBadge + NewPill), lucide stripped     | 9    |
| `client/src/components/ui/KindBadge/KindBadge.tsx`            | `Badge variant="outline"`: Beat / Rudiment / Fill                          | 9    |
| `client/src/components/ui/NewPill/NewPill.tsx`                | "New" pill preset over `Badge`                                             | 10   |
| `client/src/components/ui/PlayButton/PlayButton.tsx`          | ghost icon button + 44px hit area + stopPropagation                        | 11   |
| `client/src/components/catalog/catalog-row.ts`                | the `CatalogRow` shared type                                               | 12   |
| `client/src/components/catalog/NameCell/NameCell.tsx`         | 2-line name block (Cover + badges + flags)                                 | 12   |
| `client/src/components/catalog/CatalogTable/CatalogTable.tsx` | column config + data hand-off to `DataTable`                               | 13   |

Plus, per the folder convention, each component folder also gets `.stories.tsx`, `.story-ids.ts`, `.test.tsx`, `.a11y.ts`, `.vr.ts`, `.vr.ts-snapshots/`.

> **Primitive `ui/Table` is infrastructure, not a storied component.** Per the spec's Storybook plan it gets **no** standalone `.stories.tsx` / `.a11y.ts` / `.vr.ts` — it is exercised transitively via `DataTable`, and gets only `Table.tsx` + a small `Table.test.tsx` smoke test.
>
> **`ui/Badge` originally shared this exemption** (exercised via `KindBadge` + `NewPill`), but the PR #92 code-review found its `default` bright-fill variant (`bg-primary` + `text-primary-foreground`) was never axe-tested directly — neither `KindBadge` (`outline`) nor `NewPill` uses it. Badge therefore now carries the full harness (`.stories.tsx` / `.story-ids.ts` / `.a11y.ts` / `.vr.ts` + darwin/linux baselines), matching the spec's Button precedent.

---

## Tasks

### Task 1: `ui/Table` primitive + DataTable card-row de-risk

**Why first:** the spec makes the card-row VR snapshot **build step #1** — confirm a real `<table>` (kept for native `aria-sort`) reproduces the locked card-row look _before_ the rest of the engine is built. `appearance="rows"` (and, if the `<table>` can't match, a CSS-grid fallback) is the documented backstop.

**Files:**

- Create: `client/src/components/ui/Table/Table.tsx`
- Create: `client/src/components/ui/Table/Table.test.tsx`
- Create: `client/src/components/ui/DataTable/column-meta.ts`
- Create: `client/src/components/ui/DataTable/DataTable.tsx`
- Create: `client/src/components/ui/DataTable/DataTable.test.tsx`
- Create: `client/src/components/ui/DataTable/DataTable.stories.tsx`
- Create: `client/src/components/ui/DataTable/DataTable.story-ids.ts`
- Create: `client/src/components/ui/DataTable/DataTable.a11y.ts`
- Create: `client/src/components/ui/DataTable/DataTable.vr.ts`
- Create (generated): `client/src/components/ui/DataTable/DataTable.vr.ts-snapshots/`

**Interfaces:**

- Consumes: nothing (first task).
- Produces:
  - `Table, TableHeader, TableBody, TableRow, TableHead, TableCell` from `@/components/ui/Table/Table` — shadcn primitives.
  - `alignClass(align?: 'left' | 'center' | 'right'): string` from `@/components/ui/DataTable/column-meta` + a `ColumnMeta.align` module augmentation.
  - `DataTable<TData>(props: DataTableProps<TData>)` from `@/components/ui/DataTable/DataTable`. Task-1 prop surface: `{ data: TData[]; columns: ColumnDef<TData>[]; appearance?: 'cards' | 'rows'; onRowClick?: (row: TData) => void; getRowId?: (row: TData) => string }`. Root carries `data-slot="data-table"`; each body row carries `data-slot="data-table-row"`. (Tasks 2–3 extend `DataTableProps`.)

- [ ] **Step 1: Add the dependency**

```bash
pnpm --filter @notation-hero/client add @tanstack/react-table
```

Expected: `@tanstack/react-table` (v8.x) appears in `client/package.json` dependencies; lockfile updated.

- [ ] **Step 2: Generate the shadcn Table primitive, then relocate + clean it**

```bash
pnpm --filter @notation-hero/client dlx shadcn@latest add table
```

Then **move** the generated file into the folder convention and delete the default location:

- Move `client/src/components/ui/table.tsx` → `client/src/components/ui/Table/Table.tsx`.
- Keep only these six exports: `Table, TableHeader, TableBody, TableRow, TableHead, TableCell` (drop `TableFooter`/`TableCaption` — YAGNI).
- Strip any `import … from 'lucide-react'` (none expected for `table`, but verify).
- Ensure imports use `@/lib/utils`.

Final content of `client/src/components/ui/Table/Table.tsx`:

```tsx
import { cn } from '@/lib/utils';
import type * as React from 'react';

const Table = ({ className, ...props }: React.ComponentProps<'table'>) => (
  <div data-slot="table-container" className="relative w-full overflow-x-auto">
    <table
      data-slot="table"
      className={cn('w-full caption-bottom text-sm', className)}
      {...props}
    />
  </div>
);

const TableHeader = ({ className, ...props }: React.ComponentProps<'thead'>) => (
  <thead data-slot="table-header" className={cn(className)} {...props} />
);

const TableBody = ({ className, ...props }: React.ComponentProps<'tbody'>) => (
  <tbody data-slot="table-body" className={cn(className)} {...props} />
);

const TableRow = ({ className, ...props }: React.ComponentProps<'tr'>) => (
  <tr data-slot="table-row" className={cn('transition-colors', className)} {...props} />
);

const TableHead = ({ className, ...props }: React.ComponentProps<'th'>) => (
  <th
    data-slot="table-head"
    className={cn(
      'px-2 text-left align-middle font-medium text-muted-foreground whitespace-nowrap',
      className,
    )}
    {...props}
  />
);

const TableCell = ({ className, ...props }: React.ComponentProps<'td'>) => (
  <td data-slot="table-cell" className={cn('p-2 align-middle', className)} {...props} />
);

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
```

> Note: the default shadcn `TableRow` includes `hover:bg-muted/50` and `border-b`; they are removed here because `DataTable` owns row appearance (cards vs rows). The `overflow-x-auto` container can clip the card hover lift/shadow — see the Step-7 de-risk note.

- [ ] **Step 3: Write the Table primitive smoke test**

`client/src/components/ui/Table/Table.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './Table';

test('renders a semantic table with header and body cells', () => {
  render(
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Alpha</TableCell>
        </TableRow>
      </TableBody>
    </Table>,
  );
  expect(screen.getByRole('table')).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: 'Alpha' })).toBeInTheDocument();
});
```

- [ ] **Step 4: Run the Table test (expect PASS)**

Run: `pnpm --filter @notation-hero/client test Table`
Expected: PASS (1 test).

- [ ] **Step 5: Write the column-meta helper**

`client/src/components/ui/DataTable/column-meta.ts`:

```ts
import type { RowData } from '@tanstack/react-table';

// Lets a column declare horizontal alignment via `meta: { align: 'right' }`.
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TData/TValue are required by the augmented interface signature
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: 'left' | 'center' | 'right';
  }
}

export function alignClass(align?: 'left' | 'center' | 'right'): string {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
}
```

- [ ] **Step 6: Write the DataTable skeleton failing test**

`client/src/components/ui/DataTable/DataTable.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable } from './DataTable';
import type { ColumnDef } from '@tanstack/react-table';

interface Row {
  id: string;
  name: string;
  n: number;
}

const data: Row[] = [
  { id: 'a', name: 'Alpha', n: 1 },
  { id: 'b', name: 'Beta', n: 2 },
];

const columns: ColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'Name', cell: ({ getValue }) => getValue<string>() },
  {
    accessorKey: 'n',
    header: 'N',
    meta: { align: 'right' },
    cell: ({ getValue }) => getValue<number>(),
  },
];

test('renders a row per datum with its cell content + column headers', () => {
  render(<DataTable data={data} columns={columns} getRowId={(r) => r.id} />);
  expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
  expect(screen.getByText('Alpha')).toBeInTheDocument();
  expect(screen.getByText('Beta')).toBeInTheDocument();
});

test('fires onRowClick with the row datum on click', () => {
  const onRowClick = vi.fn();
  const { container } = render(
    <DataTable data={data} columns={columns} onRowClick={onRowClick} getRowId={(r) => r.id} />,
  );
  const rows = container.querySelectorAll<HTMLElement>('[data-slot="data-table-row"]');
  fireEvent.click(rows[0]);
  expect(onRowClick).toHaveBeenCalledWith(data[0]);
});

test('fires onRowClick on Enter and Space when a row is focused', async () => {
  const user = userEvent.setup();
  const onRowClick = vi.fn();
  const { container } = render(
    <DataTable data={data} columns={columns} onRowClick={onRowClick} getRowId={(r) => r.id} />,
  );
  const row = container.querySelector<HTMLElement>('[data-slot="data-table-row"]')!;
  row.focus();
  await user.keyboard('[Enter]');
  await user.keyboard('[Space]');
  expect(onRowClick).toHaveBeenCalledTimes(2);
});

test('rows are not focusable when onRowClick is absent', () => {
  const { container } = render(<DataTable data={data} columns={columns} getRowId={(r) => r.id} />);
  const row = container.querySelector('[data-slot="data-table-row"]')!;
  expect(row).not.toHaveAttribute('tabindex');
});
```

Run: `pnpm --filter @notation-hero/client test DataTable`
Expected: FAIL ("Cannot find module './DataTable'" / `DataTable is not defined`).

- [ ] **Step 7: Implement the DataTable skeleton**

`client/src/components/ui/DataTable/DataTable.tsx`:

```tsx
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table/Table';
import { alignClass } from './column-meta';
import type { ColumnDef } from '@tanstack/react-table';

export interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  /** 'cards' = gap-separated rounded card-rows (default); 'rows' = plain rows. */
  appearance?: 'cards' | 'rows';
  onRowClick?: (row: TData) => void;
  getRowId?: (row: TData) => string;
}

export function DataTable<TData>({
  data,
  columns,
  appearance = 'cards',
  onRowClick,
  getRowId,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
  });

  const clickable = Boolean(onRowClick);

  return (
    <Table
      data-slot="data-table"
      data-appearance={appearance}
      className={cn(
        'w-full text-sm',
        // Card-rows need separated borders so rows can have a vertical gap (a real
        // <table> can't gap <tr> directly). border-spacing-y matches the mockup's 7px.
        appearance === 'cards' && 'border-separate border-spacing-y-[7px]',
      )}
    >
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => (
              <TableHead
                key={header.id}
                className={cn(
                  'h-auto px-3.5 pb-2 text-[10.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase',
                  alignClass(header.column.columnDef.meta?.align),
                )}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow
            key={row.id}
            data-slot="data-table-row"
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? () => onRowClick?.(row.original) : undefined}
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onRowClick?.(row.original);
                    }
                  }
                : undefined
            }
            className={cn(
              'transition-all',
              // Card chrome lives on the cells (a <tr> ignores border-radius), so the card
              // look does NOT depend on per-row border-radius (spec F3).
              appearance === 'cards' &&
                '[&>td]:border-y [&>td]:border-border [&>td]:bg-card [&>td:first-child]:rounded-l-xl [&>td:first-child]:border-l [&>td:last-child]:rounded-r-xl [&>td:last-child]:border-r',
              appearance === 'rows' && 'border-b border-border',
              clickable &&
                'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring hover:-translate-y-px',
              // teal-tinted border + soft glow on hover (mockup .trow:hover)
              clickable &&
                appearance === 'cards' &&
                'hover:[&>td]:border-[color-mix(in_oklch,var(--primary)_45%,var(--border))] hover:[&>td]:shadow-[0_5px_16px_color-mix(in_oklch,var(--primary)_12%,transparent)]',
            )}
          >
            {row.getVisibleCells().map((cell) => (
              <TableCell
                key={cell.id}
                className={cn(
                  'px-3.5 py-3 align-middle',
                  alignClass(cell.column.columnDef.meta?.align),
                )}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

> **De-risk watch-outs** (resolve before declaring the card look done — these are _why_ this is step #1): (a) the shadcn `overflow-x-auto` container lives in `Table.tsx`, **not** `DataTable` (which only styles the inner `<table>`), and `overflow-x: auto` forces `overflow-y: auto`, clipping the `-translate-y-px` lift + glow — if the snapshot shows clipping, fix it **in `Table.tsx`**: change that wrapper to `overflow-x-auto overflow-y-visible` (or give it vertical padding) for the cards look; (b) `transform`/`box-shadow` on `<tr>`/`<td>` renders in Chromium (our VR + CI engine) but verify the lift reads correctly; (c) if the real `<table>` still can't match the locked mockup, switch the default to `appearance="rows"` and implement the CSS-grid fallback (the mockup's `.trow { display:grid; grid-template-columns: 1fr 56px 78px 92px 44px }`), recording the decision in the spec.

- [ ] **Step 8: Run the DataTable tests (expect PASS)**

Run: `pnpm --filter @notation-hero/client test DataTable`
Expected: PASS (4 tests).

- [ ] **Step 9: Write the de-risk stories**

`client/src/components/ui/DataTable/DataTable.stories.tsx`:

```tsx
import { DataTable } from './DataTable';
import type { Meta, StoryObj } from '@storybook/tanstack-react';
import type { ColumnDef } from '@tanstack/react-table';

interface DemoRow {
  id: string;
  title: string;
  level: number;
  bpm: number;
}

const demo: DemoRow[] = [
  { id: '1', title: 'Billie Jean', level: 3, bpm: 117 },
  { id: '2', title: 'Seven Nation Army', level: 1, bpm: 124 },
  { id: '3', title: 'Rosanna', level: 8, bpm: 132 },
  { id: '4', title: 'Take Five', level: 6, bpm: 174 },
];

const columns: ColumnDef<DemoRow>[] = [
  { accessorKey: 'title', header: 'Name', cell: ({ getValue }) => getValue<string>() },
  {
    accessorKey: 'level',
    header: 'Level',
    meta: { align: 'center' },
    cell: ({ getValue }) => getValue<number>(),
  },
  {
    accessorKey: 'bpm',
    header: 'BPM',
    meta: { align: 'right' },
    cell: ({ getValue }) => getValue<number>(),
  },
];

// Generic-component CSF: type the meta against a concrete instantiation. If TS objects
// to `typeof DataTable<DemoRow>`, fall back to `Meta<typeof DataTable>` and keep `args`.
const meta: Meta<typeof DataTable<DemoRow>> = {
  title: 'UI/DataTable',
  component: DataTable,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DataTable<DemoRow>>;

export const Default: Story = {
  args: { data: demo, columns, appearance: 'cards', onRowClick: () => {} },
};

export const Rows: Story = {
  args: { data: demo, columns, appearance: 'rows', onRowClick: () => {} },
};
```

> `Default` (cards) + `Rows` (rows) together fulfill the spec's "Appearance (cards vs rows)" Storybook entry — two focused stories instead of one combined; both are covered by VR + a11y.

- [ ] **Step 10: Write the story-ids list**

`client/src/components/ui/DataTable/DataTable.story-ids.ts` (Tasks 2–3 append to this list):

```ts
// Shared DataTable story IDs (kebab) — keeps VR (DataTable.vr.ts) + a11y (DataTable.a11y.ts)
// in lockstep with DataTable.stories.tsx. Add a story once; both gates pick it up.
export const DATA_TABLE_STORY_IDS = ['default', 'rows'] as const;
```

- [ ] **Step 11: Write the a11y + VR specs (from the templates in Conventions)**

Create `client/src/components/ui/DataTable/DataTable.a11y.ts` from the **a11y template** with: `<Name>`=`DataTable`, `<ID_PREFIX>`=`ui-datatable`, `<STORY_IDS_CONST>`=`DATA_TABLE_STORY_IDS`, `<story-ids-file>`=`./DataTable.story-ids`, `<data-slot>`=`data-table`. (No glyph-font assertion — DataTable renders no Material Symbols itself.)

Create `client/src/components/ui/DataTable/DataTable.vr.ts` from the **VR template** with the same values and `<snapshot-prefix>`=`data-table`.

- [ ] **Step 12: Run a11y + generate VR baselines (the de-risk gate)**

```bash
pnpm --filter @notation-hero/client typecheck
pnpm --filter @notation-hero/client lint
pnpm --filter @notation-hero/client test:a11y   # DataTable stories must pass axe (light/dark, rest+hover)
```

Then generate **both** OS baselines (see "VR baselines" in Conventions) and confirm `test:vr` is green. **Open `DataTable.vr.ts-snapshots/data-table-default-*.png` and compare to `docs/mockups/catalog.html`** — this is the card-row de-risk. If it doesn't match, apply the watch-outs in Step 7 before continuing.

- [ ] **Step 13: Commit**

```bash
git add client/package.json pnpm-lock.yaml client/src/components/ui/Table client/src/components/ui/DataTable
git commit \
  -m "feat(ui): DataTable card-row skeleton + Table primitive (NH-210)" \
  -m "De-risk build step #1: a real <table> rendered as gap-separated card-rows, plus the shadcn Table primitive and the column align helper. Sort + states follow." \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: DataTable sortable headers — the NH-210 core

**Files:**

- Modify: `client/src/components/ui/DataTable/DataTable.tsx`
- Modify: `client/src/components/ui/DataTable/DataTable.test.tsx`
- Modify: `client/src/components/ui/DataTable/DataTable.stories.tsx`
- Modify: `client/src/components/ui/DataTable/DataTable.story-ids.ts`

**Interfaces:**

- Consumes: `DataTable` + props from Task 1.
- Produces: `DataTableProps<TData>` gains `sorting?: SortingState`, `onSortingChange?: OnChangeFn<SortingState>`, `defaultSorting?: SortingState`. Sortable `<th>` carries `aria-sort` and renders a header `<button>`. Columns opt into desc-first via `columnDef.sortDescFirst`; non-sortable columns set `enableSorting: false`.

- [ ] **Step 1: Add the failing sort tests**

Append to `client/src/components/ui/DataTable/DataTable.test.tsx`:

```tsx
import type { ColumnDef } from '@tanstack/react-table';

const unsorted: Row[] = [
  { id: 'b', name: 'Beta', n: 2 },
  { id: 'a', name: 'Alpha', n: 1 },
];

const sortableColumns: ColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'Name', cell: ({ getValue }) => getValue<string>() },
  {
    accessorKey: 'n',
    header: 'N',
    meta: { align: 'right' },
    sortDescFirst: true,
    cell: ({ getValue }) => getValue<number>(),
  },
];

function firstColumnText(container: HTMLElement): string[] {
  return [...container.querySelectorAll('[data-slot="data-table-row"] td:first-child')].map(
    (c) => c.textContent ?? '',
  );
}

test('clicking a sortable header toggles asc -> desc -> asc (2-state, never unsorted)', async () => {
  const user = userEvent.setup();
  render(<DataTable data={unsorted} columns={sortableColumns} getRowId={(r) => r.id} />);
  const button = screen.getByRole('button', { name: /name/i });
  const header = () => screen.getByRole('columnheader', { name: /name/i });
  expect(header()).toHaveAttribute('aria-sort', 'none');
  await user.click(button);
  expect(header()).toHaveAttribute('aria-sort', 'ascending');
  await user.click(button);
  expect(header()).toHaveAttribute('aria-sort', 'descending');
  await user.click(button);
  expect(header()).toHaveAttribute('aria-sort', 'ascending'); // back to asc, NOT none
});

test('sorting reorders the rows', async () => {
  const user = userEvent.setup();
  const { container } = render(
    <DataTable data={unsorted} columns={sortableColumns} getRowId={(r) => r.id} />,
  );
  await user.click(screen.getByRole('button', { name: /name/i }));
  expect(firstColumnText(container)).toEqual(['Alpha', 'Beta']);
});

test('a sortDescFirst column sorts descending on the first click', async () => {
  const user = userEvent.setup();
  render(<DataTable data={unsorted} columns={sortableColumns} getRowId={(r) => r.id} />);
  await user.click(screen.getByRole('button', { name: /^n$/i }));
  expect(screen.getByRole('columnheader', { name: /^n$/i })).toHaveAttribute(
    'aria-sort',
    'descending',
  );
});

test('a non-sortable column has no sort button and no aria-sort', () => {
  render(
    <DataTable
      data={unsorted}
      getRowId={(r) => r.id}
      columns={[
        {
          accessorKey: 'name',
          header: 'Name',
          enableSorting: false,
          cell: ({ getValue }) => getValue<string>(),
        },
      ]}
    />,
  );
  expect(screen.queryByRole('button', { name: /name/i })).not.toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: /name/i })).not.toHaveAttribute('aria-sort');
});

test('uncontrolled defaultSorting sets the initial order', () => {
  const { container } = render(
    <DataTable
      data={unsorted}
      columns={sortableColumns}
      getRowId={(r) => r.id}
      defaultSorting={[{ id: 'name', desc: false }]}
    />,
  );
  expect(firstColumnText(container)).toEqual(['Alpha', 'Beta']);
});
```

Run: `pnpm --filter @notation-hero/client test DataTable`
Expected: FAIL (no `aria-sort`, no header button yet).

- [ ] **Step 2: Implement sorting in DataTable**

Edit `client/src/components/ui/DataTable/DataTable.tsx`. Add imports + state + table options, replace the header-cell render, and add the two helpers.

Imports — add `getSortedRowModel` and the React `useState`, plus types:

```tsx
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import type { Column, ColumnDef, OnChangeFn, SortingState } from '@tanstack/react-table';
```

Extend `DataTableProps<TData>` with:

```tsx
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  defaultSorting?: SortingState;
```

Destructure the new props (`sorting`, `onSortingChange`, `defaultSorting`) and wire state + the table:

```tsx
const [internalSorting, setInternalSorting] = useState<SortingState>(defaultSorting ?? []);
const sortingState = sorting ?? internalSorting;

const table = useReactTable({
  data,
  columns,
  getRowId,
  state: { sorting: sortingState },
  onSortingChange: (updater) => {
    setInternalSorting((prev) => (typeof updater === 'function' ? updater(prev) : updater));
    onSortingChange?.(updater);
  },
  // NH-210: 2-state asc <-> desc toggle (no "unsorted" in the cycle), single column only.
  enableSortingRemoval: false,
  enableMultiSort: false,
  sortDescFirst: false, // generic default is asc-first; columns opt into desc via sortDescFirst
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
});
```

Replace the `<TableHead>` body (the header `flexRender`) with a sort-aware version:

```tsx
<TableHead
  key={header.id}
  aria-sort={ariaSort(header.column)}
  className={cn(
    'h-auto px-3.5 pb-2 text-[10.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase',
    alignClass(header.column.columnDef.meta?.align),
  )}
>
  {header.isPlaceholder ? null : header.column.getCanSort() ? (
    <button
      type="button"
      onClick={header.column.getToggleSortingHandler()}
      className={cn(
        'group/sort inline-flex items-center gap-1 rounded outline-none focus-visible:ring-2 focus-visible:ring-ring',
        header.column.columnDef.meta?.align === 'right' && 'flex-row-reverse',
      )}
    >
      {flexRender(header.column.columnDef.header, header.getContext())}
      <SortGlyph column={header.column} />
    </button>
  ) : (
    flexRender(header.column.columnDef.header, header.getContext())
  )}
</TableHead>
```

Add these two helpers at module scope (below the component):

```tsx
function ariaSort<TData>(
  column: Column<TData, unknown>,
): 'ascending' | 'descending' | 'none' | undefined {
  if (!column.getCanSort()) return undefined;
  const sorted = column.getIsSorted();
  if (sorted === 'asc') return 'ascending';
  if (sorted === 'desc') return 'descending';
  return 'none';
}

// Active column: solid accent arrow. Sortable-but-inactive: a persistent neutral
// `unfold_more` at rest that, on hover/focus, previews this column's first-click
// direction (arrow_downward for desc-first columns, arrow_upward otherwise).
function SortGlyph<TData>({ column }: { column: Column<TData, unknown> }) {
  const sorted = column.getIsSorted();
  if (sorted) {
    return (
      <span className="material-symbols-outlined text-primary" aria-hidden="true">
        {sorted === 'asc' ? 'arrow_upward' : 'arrow_downward'}
      </span>
    );
  }
  const previewArrow = column.getNextSortingOrder() === 'desc' ? 'arrow_downward' : 'arrow_upward';
  return (
    <span className="relative inline-flex text-muted-foreground" aria-hidden="true">
      <span className="material-symbols-outlined opacity-50 group-hover/sort:hidden group-focus-visible/sort:hidden">
        unfold_more
      </span>
      <span className="material-symbols-outlined hidden opacity-70 group-hover/sort:inline group-focus-visible/sort:inline">
        {previewArrow}
      </span>
    </span>
  );
}
```

> The Material Symbols span is fixed at `1.25rem` by `.material-symbols-outlined` (an unlayered rule that wins over Tailwind `text-*`); that size reads fine in the header. To shrink it later, override with an inline `style={{ fontSize: '1rem' }}`, not a `text-*` class.

- [ ] **Step 3: Run the sort tests (expect PASS)**

Run: `pnpm --filter @notation-hero/client test DataTable`
Expected: PASS (Task-1 tests + the 5 new sort tests).

- [ ] **Step 4: Add the `SortableHeaders` story**

Append to `client/src/components/ui/DataTable/DataTable.stories.tsx`:

```tsx
export const SortableHeaders: Story = {
  args: {
    data: demo,
    columns: [
      { accessorKey: 'title', header: 'Name', cell: ({ getValue }) => getValue<string>() },
      {
        accessorKey: 'level',
        header: 'Level',
        meta: { align: 'center' },
        cell: ({ getValue }) => getValue<number>(),
      },
      {
        accessorKey: 'bpm',
        header: 'BPM',
        meta: { align: 'right' },
        sortDescFirst: true,
        cell: ({ getValue }) => getValue<number>(),
      },
    ],
    appearance: 'cards',
    defaultSorting: [{ id: 'title', desc: false }],
  },
};
```

- [ ] **Step 5: Register the new story id**

Update `DATA_TABLE_STORY_IDS` in `client/src/components/ui/DataTable/DataTable.story-ids.ts`:

```ts
export const DATA_TABLE_STORY_IDS = ['default', 'rows', 'sortable-headers'] as const;
```

- [ ] **Step 6: Verify, regenerate VR baselines, commit**

```bash
pnpm --filter @notation-hero/client typecheck
pnpm --filter @notation-hero/client lint
pnpm --filter @notation-hero/client test DataTable
pnpm --filter @notation-hero/client test:a11y   # incl. the sorted-header states
```

Regenerate both-OS VR baselines (Conventions → "VR baselines"); confirm `test:vr` green. Then:

```bash
git add client/src/components/ui/DataTable
git commit \
  -m "feat(ui): DataTable click-to-sort headers, asc/desc toggle (NH-210)" \
  -m "Sortable column headers with a 2-state asc<->desc toggle, aria-sort, active accent arrow, and a persistent unfold_more affordance that previews first-click direction on hover/focus. Single-column, no multi-sort." \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: DataTable column visibility + empty + loading states

**Files:**

- Modify: `client/src/components/ui/DataTable/DataTable.tsx`
- Modify: `client/src/components/ui/DataTable/DataTable.test.tsx`
- Modify: `client/src/components/ui/DataTable/DataTable.stories.tsx`
- Modify: `client/src/components/ui/DataTable/DataTable.story-ids.ts`

**Interfaces:**

- Consumes: `DataTable` + props from Tasks 1–2.
- Produces: `DataTableProps<TData>` gains `columnVisibility?: VisibilityState`, `onColumnVisibilityChange?: OnChangeFn<VisibilityState>`, `defaultColumnVisibility?: VisibilityState`, `isLoading?: boolean`, `emptyState?: ReactNode`. Skeleton rows carry `data-slot="data-table-skeleton-row"`; the empty row carries `data-slot="data-table-empty"`. Loading shows a fixed 5 skeleton rows.

- [ ] **Step 1: Add the failing state tests**

Append to `client/src/components/ui/DataTable/DataTable.test.tsx`:

```tsx
test('renders the empty state text when there is no data', () => {
  render(<DataTable data={[]} columns={columns} emptyState="No pieces found" />);
  expect(screen.getByText('No pieces found')).toBeInTheDocument();
});

test('renders a default empty message when none is provided', () => {
  render(<DataTable data={[]} columns={columns} />);
  expect(screen.getByText('No results')).toBeInTheDocument();
});

test('renders 5 skeleton rows when loading and hides the data', () => {
  const { container } = render(
    <DataTable data={data} columns={columns} isLoading getRowId={(r) => r.id} />,
  );
  expect(container.querySelectorAll('[data-slot="data-table-skeleton-row"]')).toHaveLength(5);
  expect(screen.queryByText('Alpha')).not.toBeInTheDocument();
});

test('announces loading to assistive tech (aria-busy + a status region)', () => {
  render(<DataTable data={data} columns={columns} isLoading getRowId={(r) => r.id} />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading');
  expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
});

test('hides a column via uncontrolled defaultColumnVisibility', () => {
  render(
    <DataTable
      data={data}
      columns={columns}
      getRowId={(r) => r.id}
      defaultColumnVisibility={{ n: false }}
    />,
  );
  expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
  expect(screen.queryByRole('columnheader', { name: 'N' })).not.toBeInTheDocument();
});

test('hides a column via controlled columnVisibility', () => {
  render(
    <DataTable
      data={data}
      columns={columns}
      getRowId={(r) => r.id}
      columnVisibility={{ n: false }}
    />,
  );
  expect(screen.queryByRole('columnheader', { name: 'N' })).not.toBeInTheDocument();
});
```

Run: `pnpm --filter @notation-hero/client test DataTable`
Expected: FAIL (props not implemented).

- [ ] **Step 2: Implement visibility + empty + loading**

Edit `client/src/components/ui/DataTable/DataTable.tsx`.

Add imports/types:

```tsx
import type { OnChangeFn, SortingState, VisibilityState } from '@tanstack/react-table';
import type { ReactNode } from 'react';
```

Extend `DataTableProps<TData>`:

```tsx
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  defaultColumnVisibility?: VisibilityState;
  isLoading?: boolean;
  emptyState?: ReactNode;
```

Wire visibility state (mirror the sorting pattern) and add it to the table `state` + options:

```tsx
const [internalVisibility, setInternalVisibility] = useState<VisibilityState>(
  defaultColumnVisibility ?? {},
);
const visibilityState = columnVisibility ?? internalVisibility;
```

In `useReactTable`, add to `state`: `columnVisibility: visibilityState`, and add:

```tsx
    onColumnVisibilityChange: (updater) => {
      setInternalVisibility((prev) => (typeof updater === 'function' ? updater(prev) : updater));
      onColumnVisibilityChange?.(updater);
    },
```

Replace the `<TableBody>` contents with a loading / empty / data switch:

```tsx
<TableBody>
  {isLoading ? (
    Array.from({ length: 5 }).map((_, i) => (
      <TableRow
        key={`skeleton-${i}`}
        data-slot="data-table-skeleton-row"
        className={cn(
          appearance === 'cards' &&
            '[&>td]:border-y [&>td]:border-border [&>td]:bg-card [&>td:first-child]:rounded-l-xl [&>td:first-child]:border-l [&>td:last-child]:rounded-r-xl [&>td:last-child]:border-r',
        )}
      >
        {table.getVisibleLeafColumns().map((col) => (
          <TableCell
            key={col.id}
            className={cn('px-3.5 py-3', alignClass(col.columnDef.meta?.align))}
          >
            <div
              className={cn(
                'h-4 animate-pulse rounded bg-muted',
                col.columnDef.meta?.align === 'right' && 'ml-auto w-12',
                col.columnDef.meta?.align === 'center' && 'mx-auto w-8',
                !col.columnDef.meta?.align && 'w-3/5',
              )}
            />
          </TableCell>
        ))}
      </TableRow>
    ))
  ) : table.getRowModel().rows.length === 0 ? (
    <TableRow
      data-slot="data-table-empty"
      className={cn(
        appearance === 'cards' &&
          '[&>td]:rounded-xl [&>td]:border [&>td]:border-border [&>td]:bg-card',
      )}
    >
      <TableCell
        colSpan={table.getVisibleLeafColumns().length}
        className="px-3.5 py-8 text-center text-muted-foreground"
      >
        {emptyState ?? 'No results'}
      </TableCell>
    </TableRow>
  ) : (
    table.getRowModel().rows.map((row) => (
      /* ...the existing data-row render from Task 1, unchanged... */
      <TableRow key={row.id} data-slot="data-table-row" /* ...rest unchanged... */>
        {row.getVisibleCells().map((cell) => (
          <TableCell
            key={cell.id}
            className={cn(
              'px-3.5 py-3 align-middle',
              alignClass(cell.column.columnDef.meta?.align),
            )}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    ))
  )}
</TableBody>
```

> Keep the existing data-row `<TableRow>` attributes (the `tabIndex`/`onClick`/`onKeyDown`/`className` block from Task 1) exactly as they were — only the surrounding loading/empty branches are new.

Finally, announce loading to assistive tech (axe stops at AA and won't catch a silent loading state): set `aria-busy={isLoading}` on the root `<Table>` and add a visually-hidden live region. Wrap DataTable's return in a fragment:

```tsx
return (
  <>
    <span role="status" aria-live="polite" className="sr-only">
      {isLoading ? 'Loading…' : ''}
    </span>
    <Table
      data-slot="data-table"
      data-appearance={appearance}
      aria-busy={isLoading}
      className={cn(/* …unchanged from Task 1… */)}
    >
      {/* header + the loading / empty / data TableBody from above */}
    </Table>
  </>
);
```

- [ ] **Step 3: Run the state tests (expect PASS)**

Run: `pnpm --filter @notation-hero/client test DataTable`
Expected: PASS (all prior + 5 new).

- [ ] **Step 4: Add the `ColumnVisibilityToggle`, `Empty`, `Loading` stories**

Append to `client/src/components/ui/DataTable/DataTable.stories.tsx` (the toggle story uses local state + buttons so the hide/show is live):

```tsx
import { useState } from 'react';
import type { VisibilityState } from '@tanstack/react-table';

export const ColumnVisibilityToggle: Story = {
  render: () => {
    const [visibility, setVisibility] = useState<VisibilityState>({});
    return (
      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          {(['level', 'bpm'] as const).map((id) => (
            <button
              key={id}
              type="button"
              className="rounded border border-border px-2 py-1 text-xs"
              onClick={() => setVisibility((v) => ({ ...v, [id]: v[id] === false ? true : false }))}
            >
              Toggle {id}
            </button>
          ))}
        </div>
        <DataTable
          data={demo}
          columns={columns}
          columnVisibility={visibility}
          onColumnVisibilityChange={setVisibility}
        />
      </div>
    );
  },
};

export const Empty: Story = {
  args: { data: [], columns, emptyState: 'No pieces found — adjust your filters' },
};

export const Loading: Story = {
  args: { data: demo, columns, isLoading: true },
};
```

- [ ] **Step 5: Register the new story ids**

```ts
export const DATA_TABLE_STORY_IDS = [
  'default',
  'rows',
  'sortable-headers',
  'column-visibility-toggle',
  'empty',
  'loading',
] as const;
```

- [ ] **Step 6: Verify, regenerate VR baselines, commit**

```bash
pnpm --filter @notation-hero/client typecheck
pnpm --filter @notation-hero/client lint
pnpm --filter @notation-hero/client test DataTable
pnpm --filter @notation-hero/client test:a11y
```

Regenerate both-OS VR baselines; confirm `test:vr` green. Then:

```bash
git add client/src/components/ui/DataTable
git commit \
  -m "feat(ui): DataTable column visibility + empty + loading states (NH-210)" \
  -m "Controlled + uncontrolled column visibility (VisibilityState), a column-spanning empty state, and 5 skeleton rows while loading. Completes the generic DataTable API." \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: score-band tokens + `ui/ScoreDonut`

**Files:**

- Modify: `client/src/styles.css`
- Create: `client/src/components/ui/ScoreDonut/ScoreDonut.tsx`
- Create: `client/src/components/ui/ScoreDonut/ScoreDonut.test.tsx`
- Create: `client/src/components/ui/ScoreDonut/ScoreDonut.stories.tsx`
- Create: `client/src/components/ui/ScoreDonut/ScoreDonut.story-ids.ts`
- Create: `client/src/components/ui/ScoreDonut/ScoreDonut.a11y.ts`
- Create: `client/src/components/ui/ScoreDonut/ScoreDonut.vr.ts`
- Create (generated): `client/src/components/ui/ScoreDonut/ScoreDonut.vr.ts-snapshots/`

**Interfaces:**

- Consumes: the score-band tokens added to `styles.css`.
- Produces: `ScoreDonut({ score, size }: { score: number | null; size?: number })` from `@/components/ui/ScoreDonut/ScoreDonut`. Root carries `data-slot="score-donut"`, `role="img"`, `aria-label`, and `data-band` (`low|developing|climbing|high|mastered|none`).

- [ ] **Step 1: Add the score-band tokens to `styles.css`**

In `:root` (after `--ring: …;`), add — oklch conversions of the locked Okabe-Ito hex from `docs/mockups/catalog-donut-bands.html` (System C), hex in the trailing comment:

```css
--score-low: oklch(67.9% 0.118 346.3deg); /* #cc79a7 reddish-purple */
--score-developing: oklch(75.3% 0.158 76.8deg); /* #e69f00 orange */
--score-climbing: oklch(53.2% 0.131 244deg); /* #0072b2 azure */
--score-high: oklch(62% 0.13 165.5deg); /* #009e73 green */
--score-mastered: oklch(65.2% 0.132 81.6deg); /* #b8860b gold */
--score-mastered-foreground: oklch(97.4% 0.034 90.5deg); /* #fff6dd cream */
```

In `.dark` (after its `--ring: …;`), add the dark variants:

```css
--score-low: oklch(77.3% 0.098 344.4deg); /* #e29cc4 */
--score-developing: oklch(78.4% 0.152 75.6deg); /* #f0a92e */
--score-climbing: oklch(73.5% 0.117 236.2deg); /* #56b4e9 */
--score-high: oklch(71.6% 0.143 166.2deg); /* #1fbf8f */
--score-mastered: oklch(88% 0.155 90.1deg); /* #ffd24a */
--score-mastered-foreground: oklch(24.8% 0.051 91.8deg); /* #2a2000 */
```

In `@theme inline` (alongside the other `--color-*` mappings), add so cells can use `bg-score-*` / `text-score-*` classes:

```css
--color-score-low: var(--score-low);
--color-score-developing: var(--score-developing);
--color-score-climbing: var(--score-climbing);
--color-score-high: var(--score-high);
--color-score-mastered: var(--score-mastered);
--color-score-mastered-foreground: var(--score-mastered-foreground);
```

- [ ] **Step 2: Write the failing ScoreDonut test**

`client/src/components/ui/ScoreDonut/ScoreDonut.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { ScoreDonut } from './ScoreDonut';

test('renders the score number with a "Best score" label', () => {
  render(<ScoreDonut score={74} />);
  const donut = screen.getByRole('img', { name: 'Best score: 74' });
  expect(donut).toBeInTheDocument();
  expect(donut).toHaveTextContent('74');
});

test('null is "Not attempted" and shows a dash', () => {
  render(<ScoreDonut score={null} />);
  const donut = screen.getByRole('img', { name: 'Not attempted' });
  expect(donut).toHaveAttribute('data-band', 'none');
  expect(donut).toHaveTextContent('–');
});

test('zero renders the same empty state as null (spec F1)', () => {
  render(<ScoreDonut score={0} />);
  const donut = screen.getByRole('img', { name: 'Not attempted' });
  expect(donut).toHaveAttribute('data-band', 'none');
});

test('100 is mastered: "Best score: 100", gold band, trophy glyph, no number', () => {
  render(<ScoreDonut score={100} />);
  const donut = screen.getByRole('img', { name: 'Best score: 100' });
  expect(donut).toHaveAttribute('data-band', 'mastered');
  expect(donut).toHaveTextContent('trophy'); // Material Symbols ligature
  expect(donut).not.toHaveTextContent('100');
});

test('band thresholds: 49 low, 50 developing, 69 developing, 70 climbing', () => {
  const { rerender } = render(<ScoreDonut score={49} />);
  expect(screen.getByRole('img')).toHaveAttribute('data-band', 'low');
  rerender(<ScoreDonut score={50} />);
  expect(screen.getByRole('img')).toHaveAttribute('data-band', 'developing');
  rerender(<ScoreDonut score={69} />);
  expect(screen.getByRole('img')).toHaveAttribute('data-band', 'developing');
  rerender(<ScoreDonut score={70} />);
  expect(screen.getByRole('img')).toHaveAttribute('data-band', 'climbing');
});

test('locks the 88/89 cut: 88 climbing, 89 high', () => {
  const { rerender } = render(<ScoreDonut score={88} />);
  expect(screen.getByRole('img')).toHaveAttribute('data-band', 'climbing');
  rerender(<ScoreDonut score={89} />);
  expect(screen.getByRole('img')).toHaveAttribute('data-band', 'high');
});
```

Run: `pnpm --filter @notation-hero/client test ScoreDonut`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement ScoreDonut**

`client/src/components/ui/ScoreDonut/ScoreDonut.tsx`:

```tsx
import { cn } from '@/lib/utils';

interface ScoreDonutProps {
  score: number | null;
  size?: number;
}

// Locked bands (spec): 1–49 low, 50–69 developing, 70–88 climbing, 89–99 high.
function band(score: number): 'low' | 'developing' | 'climbing' | 'high' {
  if (score <= 49) return 'low';
  if (score <= 69) return 'developing';
  if (score <= 88) return 'climbing';
  return 'high';
}

export function ScoreDonut({ score, size = 28 }: ScoreDonutProps) {
  // 100 = mastered: gold disc + trophy glyph (no ring, no number, no glow).
  if (score === 100) {
    return (
      <span
        data-slot="score-donut"
        data-band="mastered"
        role="img"
        aria-label="Best score: 100"
        className="inline-grid place-items-center rounded-full bg-score-mastered text-score-mastered-foreground"
        style={{ width: size, height: size }}
      >
        <span
          className="material-symbols-outlined"
          aria-hidden="true"
          style={{ fontSize: size * 0.56 }}
        >
          trophy
        </span>
      </span>
    );
  }

  // null OR 0 = not attempted: empty grey ring + dash.
  const value = score === 0 ? null : score;
  const label = value === null ? 'Not attempted' : `Best score: ${value}`;
  const background =
    value === null
      ? 'var(--muted)'
      : `conic-gradient(var(--score-${band(value)}) calc(${value} * 1%), var(--muted) 0)`;

  return (
    <span
      data-slot="score-donut"
      data-band={value === null ? 'none' : band(value)}
      role="img"
      aria-label={label}
      className="relative inline-grid place-items-center rounded-full"
      style={{ width: size, height: size, background }}
    >
      {/* crisp inner hole — matches the mockup's ::before (inset ~18% of the diameter) */}
      <span
        aria-hidden="true"
        className="absolute rounded-full bg-card"
        style={{ inset: Math.round(size * 0.18) }}
      />
      <span
        aria-hidden="true"
        className={cn(
          'relative font-mono font-bold tabular-nums',
          value === null ? 'text-muted-foreground' : 'text-foreground',
        )}
        style={{ fontSize: Math.round(size * 0.33) }}
      >
        {value === null ? '–' : value}
      </span>
    </span>
  );
}
```

> Colour only _reinforces_ the always-shown number, so the donut is colourblind-safe by construction; aria-labels are number-only (band naming deferred to NH-249). The number uses the system mono stack (`font-mono`) + `tabular-nums` — the mockup's Geist Mono is not installed; swap later if a brand mono lands.

- [ ] **Step 4: Run the ScoreDonut test (expect PASS)**

Run: `pnpm --filter @notation-hero/client test ScoreDonut`
Expected: PASS (6 tests).

- [ ] **Step 5: Write stories + story-ids**

`client/src/components/ui/ScoreDonut/ScoreDonut.stories.tsx`:

```tsx
import { ScoreDonut } from './ScoreDonut';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/ScoreDonut',
  component: ScoreDonut,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: { size: { control: { type: 'range', min: 20, max: 96, step: 4 } } },
} satisfies Meta<typeof ScoreDonut>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotAttempted: Story = { args: { score: null } };
export const JustStarted: Story = { args: { score: 1 } }; // smallest arc — locks the ~1% ring vs empty
export const Low: Story = { args: { score: 35 } };
export const Developing: Story = { args: { score: 60 } };
export const Climbing: Story = { args: { score: 78 } };
export const High: Story = { args: { score: 94 } };
export const Mastered: Story = { args: { score: 100 } };
```

`client/src/components/ui/ScoreDonut/ScoreDonut.story-ids.ts`:

```ts
export const SCORE_DONUT_STORY_IDS = [
  'not-attempted',
  'just-started',
  'low',
  'developing',
  'climbing',
  'high',
  'mastered',
] as const;
```

- [ ] **Step 6: Write the a11y + VR specs**

Create `ScoreDonut.a11y.ts` from the **a11y template** with: `<Name>`=`ScoreDonut`, `<ID_PREFIX>`=`ui-scoredonut`, `<STORY_IDS_CONST>`=`SCORE_DONUT_STORY_IDS`, `<story-ids-file>`=`./ScoreDonut.story-ids`, `<data-slot>`=`score-donut`. Add the glyph-font assertion **guarded** by `if (story === 'mastered')` (only that story renders the trophy). **Verify `trophy` is a real glyph in `@fontsource-variable/material-symbols-outlined@5.2.45` (else use `emoji_events`)** — the unit test only checks the source string, so the VR snapshot is the real guard against a missing glyph rendering as literal text.

Create `ScoreDonut.vr.ts` from the **VR template** with the same values and `<snapshot-prefix>`=`score-donut`.

- [ ] **Step 7: Verify, generate VR baselines, commit**

```bash
pnpm --filter @notation-hero/client typecheck
pnpm --filter @notation-hero/client lint
pnpm --filter @notation-hero/client test ScoreDonut
pnpm --filter @notation-hero/client test:a11y
```

Generate both-OS VR baselines; confirm `test:vr` green. Then:

```bash
git add client/src/styles.css client/src/components/ui/ScoreDonut
git commit \
  -m "feat(ui): ScoreDonut best-score donut + score-band tokens (NH-210)" \
  -m "Conic-gradient best-score donut with the locked Okabe-Ito bands (88/89 cut), gold+trophy at 100, empty grey at null/0; number-only aria-labels. Adds oklch score-band role tokens to styles.css." \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: `ui/LevelPill`

**Files:** `client/src/components/ui/LevelPill/LevelPill.{tsx,test.tsx,stories.tsx,story-ids.ts,a11y.ts,vr.ts}` (+ `.vr.ts-snapshots/`).

**Interfaces:**

- Consumes: nothing.
- Produces: `LevelPill({ level }: { level: number | null })` from `@/components/ui/LevelPill/LevelPill`. Root carries `data-slot="level-pill"`, `role="img"`, `aria-label`.

- [ ] **Step 1: Failing test** — `LevelPill.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { LevelPill } from './LevelPill';

test('shows the level number with a "Level" label', () => {
  render(<LevelPill level={3} />);
  expect(screen.getByRole('img', { name: 'Level: 3' })).toHaveTextContent('3');
});

test('level 0 is Debut — accent text on a neutral pill', () => {
  render(<LevelPill level={0} />);
  const pill = screen.getByRole('img', { name: 'Debut' });
  expect(pill).toHaveTextContent('Debut');
  expect(pill).toHaveClass('text-primary');
});

test('null is Ungraded (never a bare dash as the accessible name)', () => {
  render(<LevelPill level={null} />);
  expect(screen.getByRole('img', { name: 'Ungraded' })).toHaveTextContent('–');
});
```

Run: `pnpm --filter @notation-hero/client test LevelPill` → FAIL.

- [ ] **Step 2: Implement** — `LevelPill.tsx`:

```tsx
import { cn } from '@/lib/utils';

interface LevelPillProps {
  level: number | null;
}

export function LevelPill({ level }: LevelPillProps) {
  const isUngraded = level === null;
  const isDebut = level === 0;
  const label = isUngraded ? 'Ungraded' : isDebut ? 'Debut' : `Level: ${level}`;

  return (
    <span
      data-slot="level-pill"
      role="img"
      aria-label={label}
      className={cn(
        'inline-flex min-w-7 items-center justify-center rounded-full border px-2 py-0.5 font-mono text-xs font-semibold tabular-nums',
        isUngraded ? 'border-dashed border-border text-muted-foreground' : 'border-border bg-muted',
        isDebut && 'text-primary', // Debut = accent TEXT only (neutral pill)
      )}
    >
      <span aria-hidden="true">{isUngraded ? '–' : isDebut ? 'Debut' : level}</span>
    </span>
  );
}
```

Run the test → PASS.

- [ ] **Step 3: Stories + story-ids**

`LevelPill.stories.tsx`:

```tsx
import { LevelPill } from './LevelPill';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/LevelPill',
  component: LevelPill,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof LevelPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ungraded: Story = { args: { level: null } };
export const Debut: Story = { args: { level: 0 } };
export const Mid: Story = { args: { level: 5 } };
export const Max: Story = { args: { level: 10 } };
```

`LevelPill.story-ids.ts`:

```ts
export const LEVEL_PILL_STORY_IDS = ['ungraded', 'debut', 'mid', 'max'] as const;
```

- [ ] **Step 4: a11y + VR** — create `LevelPill.a11y.ts` / `LevelPill.vr.ts` from the templates: `<Name>`=`LevelPill`, `<ID_PREFIX>`=`ui-levelpill`, `<STORY_IDS_CONST>`=`LEVEL_PILL_STORY_IDS`, `<story-ids-file>`=`./LevelPill.story-ids`, `<data-slot>`=`level-pill`, `<snapshot-prefix>`=`level-pill`. No glyph-font assertion (no Material Symbols).

- [ ] **Step 5: Verify, baselines, commit**

```bash
pnpm --filter @notation-hero/client typecheck && pnpm --filter @notation-hero/client lint && pnpm --filter @notation-hero/client test LevelPill && pnpm --filter @notation-hero/client test:a11y
```

Generate both-OS VR baselines; `test:vr` green. Then:

```bash
git add client/src/components/ui/LevelPill
git commit \
  -m "feat(ui): LevelPill (Debut / number / ungraded) (NH-210)" \
  -m "Level pill: Debut (level 0) as accent text on a neutral pill, 1–10 as a neutral number, null as a dashed ungraded pill; accessible name is never a bare dash." \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: `ui/Cover`

**Files:** `client/src/components/ui/Cover/Cover.{tsx,test.tsx,stories.tsx,story-ids.ts,a11y.ts,vr.ts}` (+ `.vr.ts-snapshots/`).

**Interfaces:**

- Consumes: nothing.
- Produces: `Cover({ icon, variant }: { icon?: string; variant?: 'song' | 'lesson' })` from `@/components/ui/Cover/Cover`. Root carries `data-slot="cover"`, `data-variant`, and is **decorative** (`aria-hidden="true"`, no role).

- [ ] **Step 1: Failing test** — `Cover.test.tsx`:

```tsx
import { render } from '@testing-library/react';
import { Cover } from './Cover';

test('renders the given Material Symbols icon', () => {
  const { container } = render(<Cover icon="piano" />);
  expect(container.querySelector('[data-slot="cover"]')).toHaveTextContent('piano');
});

test('is decorative — aria-hidden, exposes no accessible name', () => {
  const { container } = render(<Cover />);
  const cover = container.querySelector('[data-slot="cover"]');
  expect(cover).toHaveAttribute('aria-hidden', 'true');
});

test('reflects the lesson variant', () => {
  const { container } = render(<Cover variant="lesson" />);
  expect(container.querySelector('[data-slot="cover"]')).toHaveAttribute('data-variant', 'lesson');
});
```

Run → FAIL.

- [ ] **Step 2: Implement** — `Cover.tsx`:

```tsx
import { cn } from '@/lib/utils';

interface CoverProps {
  icon?: string;
  variant?: 'song' | 'lesson';
}

export function Cover({ icon = 'music_note', variant = 'song' }: CoverProps) {
  return (
    <span
      data-slot="cover"
      data-variant={variant}
      aria-hidden="true"
      className={cn(
        'inline-grid size-10 place-items-center rounded-xl',
        variant === 'lesson'
          ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400' // lessons: blue tint (functional, not brand)
          : 'bg-primary/15 text-primary', // songs: teal accent tint
      )}
    >
      <span className="material-symbols-outlined">{icon}</span>
    </span>
  );
}
```

> Cover is decorative (song-vs-lesson is carried by `KindBadge` / the title, not the tint), so it is `aria-hidden` and the blue tint needs no AA contrast. `sky-*` is Tailwind's built-in palette; if a `--learn` brand token lands later, swap to it.

Run the test → PASS.

- [ ] **Step 3: Stories + story-ids**

`Cover.stories.tsx`:

```tsx
import { Cover } from './Cover';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Cover',
  component: Cover,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Cover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Song: Story = { args: { variant: 'song', icon: 'music_note' } };
export const Lesson: Story = { args: { variant: 'lesson', icon: 'school' } };
```

`Cover.story-ids.ts`:

```ts
export const COVER_STORY_IDS = ['song', 'lesson'] as const;
```

- [ ] **Step 4: a11y + VR** — create from the templates: `<Name>`=`Cover`, `<ID_PREFIX>`=`ui-cover`, `<STORY_IDS_CONST>`=`COVER_STORY_IDS`, `<story-ids-file>`=`./Cover.story-ids`, `<data-slot>`=`cover`, `<snapshot-prefix>`=`cover`. **Add the glyph-font assertion to every story** (both render a glyph).

- [ ] **Step 5: Verify, baselines, commit**

```bash
pnpm --filter @notation-hero/client typecheck && pnpm --filter @notation-hero/client lint && pnpm --filter @notation-hero/client test Cover && pnpm --filter @notation-hero/client test:a11y
```

Generate both-OS VR baselines; `test:vr` green. Then:

```bash
git add client/src/components/ui/Cover
git commit \
  -m "feat(ui): Cover icon tile (song/lesson tint) (NH-210)" \
  -m "Rounded Material Symbols cover tile, teal tint for songs and blue tint for lessons; decorative (aria-hidden)." \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: `ui/Flags`

**Files:** `client/src/components/ui/Flags/Flags.{tsx,test.tsx,stories.tsx,story-ids.ts,a11y.ts,vr.ts}` (+ `.vr.ts-snapshots/`).

**Interfaces:**

- Consumes: nothing.
- Produces: `Flags({ audio, video, parts }: { audio?: boolean; video?: boolean; parts?: boolean })` from `@/components/ui/Flags/Flags`. Renders `null` when no flag is set; otherwise root carries `data-slot="flags"`, `role="img"`, composed `aria-label`.

- [ ] **Step 1: Failing test** — `Flags.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { Flags } from './Flags';

test('composes a label across every set flag', () => {
  render(<Flags audio video parts />);
  expect(screen.getByRole('img', { name: 'Has audio, video and parts' })).toBeInTheDocument();
});

test('single-flag label has no comma or "and"', () => {
  render(<Flags audio />);
  expect(screen.getByRole('img', { name: 'Has audio' })).toBeInTheDocument();
});

test('renders nothing when no flags are set', () => {
  const { container } = render(<Flags />);
  expect(container).toBeEmptyDOMElement();
});
```

Run → FAIL.

- [ ] **Step 2: Implement** — `Flags.tsx`:

```tsx
import { cn } from '@/lib/utils';

interface FlagsProps {
  audio?: boolean;
  video?: boolean;
  parts?: boolean;
}

type Flag = 'audio' | 'video' | 'parts';
const ICON: Record<Flag, string> = { audio: 'volume_up', video: 'videocam', parts: 'account_tree' };

export function Flags({ audio, video, parts }: FlagsProps) {
  const active: Flag[] = [];
  if (audio) active.push('audio');
  if (video) active.push('video');
  if (parts) active.push('parts');

  if (active.length === 0) return null;

  const label =
    active.length === 1
      ? active[0]
      : `${active.slice(0, -1).join(', ')} and ${active[active.length - 1]}`;

  return (
    <span
      data-slot="flags"
      role="img"
      aria-label={`Has ${label}`}
      className="inline-flex items-center gap-1 text-muted-foreground"
    >
      {active.map((flag) => (
        <span
          key={flag}
          aria-hidden="true"
          className={cn('material-symbols-outlined', flag === 'parts' && 'text-primary')}
          style={{ fontSize: '1rem' }}
        >
          {ICON[flag]}
        </span>
      ))}
    </span>
  );
}
```

Run the test → PASS.

- [ ] **Step 3: Stories + story-ids**

`Flags.stories.tsx`:

```tsx
import { Flags } from './Flags';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Flags',
  component: Flags,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Flags>;

export default meta;
type Story = StoryObj<typeof meta>;

export const All: Story = { args: { audio: true, video: true, parts: true } };
export const AudioOnly: Story = { args: { audio: true } };
export const PartsOnly: Story = { args: { parts: true } };
```

`Flags.story-ids.ts`:

```ts
export const FLAGS_STORY_IDS = ['all', 'audio-only', 'parts-only'] as const;
```

- [ ] **Step 4: a11y + VR** — create from the templates: `<Name>`=`Flags`, `<ID_PREFIX>`=`ui-flags`, `<STORY_IDS_CONST>`=`FLAGS_STORY_IDS`, `<story-ids-file>`=`./Flags.story-ids`, `<data-slot>`=`flags`, `<snapshot-prefix>`=`flags`. **Add the glyph-font assertion to every story.**

- [ ] **Step 5: Verify, baselines, commit**

```bash
pnpm --filter @notation-hero/client typecheck && pnpm --filter @notation-hero/client lint && pnpm --filter @notation-hero/client test Flags && pnpm --filter @notation-hero/client test:a11y
```

Generate both-OS VR baselines; `test:vr` green. Then:

```bash
git add client/src/components/ui/Flags
git commit \
  -m "feat(ui): Flags audio/video/parts indicators (NH-210)" \
  -m "Icon row for audio/video/parts with a single composed aria-label (\"Has audio, video and parts\"); parts is accent-coloured; renders nothing when no flag is set." \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: `ui/Bpm`

**Files:** `client/src/components/ui/Bpm/Bpm.{tsx,test.tsx,stories.tsx,story-ids.ts,a11y.ts,vr.ts}` (+ `.vr.ts-snapshots/`).

**Interfaces:**

- Consumes: nothing.
- Produces: `Bpm({ value }: { value: number | string })` from `@/components/ui/Bpm/Bpm`. Root carries `data-slot="bpm"`, `role="img"`, `aria-label`. A `"60→120"` string renders as a range with a spoken "to".

- [ ] **Step 1: Failing test** — `Bpm.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { Bpm } from './Bpm';

test('formats a numeric bpm', () => {
  render(<Bpm value={116} />);
  expect(screen.getByRole('img', { name: 'BPM: 116' })).toHaveTextContent('116');
});

test('formats a ramp range with a spoken "to"', () => {
  render(<Bpm value="60→120" />);
  expect(screen.getByRole('img', { name: 'BPM: 60 to 120' })).toBeInTheDocument();
});
```

Run → FAIL.

- [ ] **Step 2: Implement** — `Bpm.tsx`:

```tsx
interface BpmProps {
  value: number | string;
}

export function Bpm({ value }: BpmProps) {
  const range = typeof value === 'string' ? value.split('→').map((p) => p.trim()) : null;
  const isRange = range !== null && range.length === 2;
  const label = isRange ? `BPM: ${range[0]} to ${range[1]}` : `BPM: ${value}`;

  return (
    <span data-slot="bpm" role="img" aria-label={label} className="tabular-nums">
      <span aria-hidden="true">
        {isRange ? (
          <>
            {range[0]}
            <span className="material-symbols-outlined align-middle" style={{ fontSize: '0.9rem' }}>
              arrow_right_alt
            </span>
            {range[1]}
          </>
        ) : (
          value
        )}
      </span>
    </span>
  );
}
```

Run the test → PASS.

- [ ] **Step 3: Stories + story-ids**

`Bpm.stories.tsx`:

```tsx
import { Bpm } from './Bpm';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Bpm',
  component: Bpm,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Bpm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = { args: { value: 116 } };
export const Range: Story = { args: { value: '60→120' } };
```

`Bpm.story-ids.ts`:

```ts
export const BPM_STORY_IDS = ['single', 'range'] as const;
```

- [ ] **Step 4: a11y + VR** — create from the templates: `<Name>`=`Bpm`, `<ID_PREFIX>`=`ui-bpm`, `<STORY_IDS_CONST>`=`BPM_STORY_IDS`, `<story-ids-file>`=`./Bpm.story-ids`, `<data-slot>`=`bpm`, `<snapshot-prefix>`=`bpm`. Guard the glyph-font assertion with `if (story === 'range')` (only the range renders an arrow glyph).

- [ ] **Step 5: Verify, baselines, commit**

```bash
pnpm --filter @notation-hero/client typecheck && pnpm --filter @notation-hero/client lint && pnpm --filter @notation-hero/client test Bpm && pnpm --filter @notation-hero/client test:a11y
```

Generate both-OS VR baselines; `test:vr` green. Then:

```bash
git add client/src/components/ui/Bpm
git commit \
  -m "feat(ui): Bpm formatter (number or ramp range) (NH-210)" \
  -m "BPM cell: a plain number, or a \"60→120\" ramp rendered with an arrow glyph and a spoken \"BPM: 60 to 120\" label." \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: `ui/Badge` primitive + `ui/KindBadge`

**Files:**

- Modify: `client/src/styles.css` (add the `--kind-fill` token)
- Create: `client/src/components/ui/Badge/Badge.tsx`, `client/src/components/ui/Badge/Badge.test.tsx`
- Create: `client/src/components/ui/KindBadge/KindBadge.{tsx,test.tsx,stories.tsx,story-ids.ts,a11y.ts,vr.ts}` (+ `.vr.ts-snapshots/`)

**Interfaces:**

- Consumes: nothing.
- Produces: `Badge` + `badgeVariants` from `@/components/ui/Badge/Badge` (variants `default | secondary | destructive | outline`; root `data-slot="badge"`); `KindBadge({ kind }: { kind: 'beat' | 'rudiment' | 'fill' })` from `@/components/ui/KindBadge/KindBadge` (root `data-slot="kind-badge"`).

- [ ] **Step 1: Generate + relocate the shadcn Badge**

```bash
pnpm --filter @notation-hero/client dlx shadcn@latest add badge
```

Move `client/src/components/ui/badge.tsx` → `client/src/components/ui/Badge/Badge.tsx`; strip any `lucide-react` import; ensure `@/lib/utils` + the unified `radix-ui` `Slot`. Final `Badge.tsx`:

```tsx
import { cva } from 'class-variance-authority';
import { Slot } from 'radix-ui';
import type { VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive/10 text-destructive',
        outline: 'border-border bg-transparent text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

const Badge = ({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) => {
  const Comp = asChild ? Slot.Root : 'span';
  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
};

export { Badge, badgeVariants };
```

- [ ] **Step 2: Badge smoke test** — `Badge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

test('renders content with the badge slot', () => {
  render(<Badge variant="outline">New</Badge>);
  const badge = screen.getByText('New');
  expect(badge).toHaveAttribute('data-slot', 'badge');
  expect(badge).toHaveClass('bg-transparent');
});
```

Run: `pnpm --filter @notation-hero/client test Badge` → PASS.

- [ ] **Step 3: KindBadge failing test** — `KindBadge.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { KindBadge } from './KindBadge';

test('renders the full kind word (no abbreviations)', () => {
  render(<KindBadge kind="rudiment" />);
  expect(screen.getByText('Rudiment')).toBeInTheDocument();
});

test('carries the kind-badge slot and outline styling', () => {
  const { container } = render(<KindBadge kind="beat" />);
  const el = container.querySelector('[data-slot="kind-badge"]');
  expect(el).toHaveTextContent('Beat');
  expect(el).toHaveClass('bg-transparent');
});
```

Run → FAIL.

- [ ] **Step 4: Add the Fill token + implement KindBadge**

Beat (brand) and Rudiment (sky) already have tokens; only Fill needs one. Add to `client/src/styles.css` — in `:root`: `--kind-fill: oklch(63.4% 0.143 35.6deg); /* #D2664A */`; in `.dark`: `--kind-fill: oklch(68.8% 0.133 35.8deg); /* #e07a5f */`; in `@theme inline`: `--color-kind-fill: var(--kind-fill);`. Then `KindBadge.tsx`:

```tsx
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge/Badge';

type Kind = 'beat' | 'rudiment' | 'fill';

interface KindBadgeProps {
  kind: Kind;
}

const LABEL: Record<Kind, string> = { beat: 'Beat', rudiment: 'Rudiment', fill: 'Fill' };

// Outline style (deliberate departure from the mockup's tinted fill). Colours must pass
// axe AA in BOTH themes — darken if axe flags. Beat reuses the brand text tokens
// (brand-700 = AA on white; brand-600 = dark-mode accent text); Fill uses the
// --kind-fill token (added in Step 4) so no raw hex lives in the component.
const COLOR: Record<Kind, string> = {
  beat: 'border-brand-700 text-brand-700 dark:border-brand-600 dark:text-brand-600',
  rudiment: 'border-sky-700 text-sky-700 dark:border-sky-400 dark:text-sky-400',
  fill: 'border-kind-fill text-kind-fill',
};

export function KindBadge({ kind }: KindBadgeProps) {
  return (
    <Badge variant="outline" data-slot="kind-badge" className={cn('font-semibold', COLOR[kind])}>
      {LABEL[kind]}
    </Badge>
  );
}
```

> The Fill identity lives in the `--kind-fill` token (`#D2664A` light / `#e07a5f` dark) — no raw hex in the component, per the plan's colour constraint. If `test:a11y` flags AA in either theme, **darken that one token value** (keep the hue) until axe is green — do not change the other kinds.

Run the KindBadge test → PASS.

- [ ] **Step 5: Stories + story-ids**

`KindBadge.stories.tsx`:

```tsx
import { KindBadge } from './KindBadge';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/KindBadge',
  component: KindBadge,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: { kind: { control: 'select', options: ['beat', 'rudiment', 'fill'] } },
} satisfies Meta<typeof KindBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Beat: Story = { args: { kind: 'beat' } };
export const Rudiment: Story = { args: { kind: 'rudiment' } };
export const Fill: Story = { args: { kind: 'fill' } };
```

`KindBadge.story-ids.ts`:

```ts
export const KIND_BADGE_STORY_IDS = ['beat', 'rudiment', 'fill'] as const;
```

- [ ] **Step 6: a11y + VR** — create from the templates: `<Name>`=`KindBadge`, `<ID_PREFIX>`=`ui-kindbadge`, `<STORY_IDS_CONST>`=`KIND_BADGE_STORY_IDS`, `<story-ids-file>`=`./KindBadge.story-ids`, `<data-slot>`=`kind-badge`, `<snapshot-prefix>`=`kind-badge`. No glyph-font assertion. **This a11y run is the AA validation gate for the three kind colours.**

- [ ] **Step 7: Verify, baselines, commit**

```bash
pnpm --filter @notation-hero/client typecheck && pnpm --filter @notation-hero/client lint && pnpm --filter @notation-hero/client test Badge KindBadge && pnpm --filter @notation-hero/client test:a11y
```

Generate both-OS VR baselines; `test:vr` green. Then:

```bash
git add client/src/components/ui/Badge client/src/components/ui/KindBadge
git commit \
  -m "feat(ui): Badge primitive + KindBadge (Beat/Rudiment/Fill) (NH-210)" \
  -m "shadcn Badge primitive plus KindBadge as an outline badge (teal/blue/orange-red), full kind words, AA-validated in both themes." \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: `ui/NewPill`

**Files:** `client/src/components/ui/NewPill/NewPill.{tsx,test.tsx,stories.tsx,story-ids.ts,a11y.ts,vr.ts}` (+ `.vr.ts-snapshots/`).

**Interfaces:**

- Consumes: `Badge` from `@/components/ui/Badge/Badge`.
- Produces: `NewPill()` from `@/components/ui/NewPill/NewPill`. Root carries `data-slot="new-pill"`.

- [ ] **Step 1: Failing test** — `NewPill.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { NewPill } from './NewPill';

test('renders a "New" pill', () => {
  render(<NewPill />);
  const pill = screen.getByText('New');
  expect(pill).toHaveAttribute('data-slot', 'new-pill');
});
```

Run → FAIL.

- [ ] **Step 2: Implement** — `NewPill.tsx`:

```tsx
import { Badge } from '@/components/ui/Badge/Badge';

export function NewPill() {
  return (
    <Badge data-slot="new-pill" className="font-semibold">
      New
    </Badge>
  );
}
```

Run → PASS.

- [ ] **Step 3: Stories + story-ids**

`NewPill.stories.tsx`:

```tsx
import { NewPill } from './NewPill';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/NewPill',
  component: NewPill,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof NewPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
```

`NewPill.story-ids.ts`:

```ts
export const NEW_PILL_STORY_IDS = ['default'] as const;
```

- [ ] **Step 4: a11y + VR** — create from the templates: `<Name>`=`NewPill`, `<ID_PREFIX>`=`ui-newpill`, `<STORY_IDS_CONST>`=`NEW_PILL_STORY_IDS`, `<story-ids-file>`=`./NewPill.story-ids`, `<data-slot>`=`new-pill`, `<snapshot-prefix>`=`new-pill`. No glyph-font assertion.

- [ ] **Step 5: Verify, baselines, commit**

```bash
pnpm --filter @notation-hero/client typecheck && pnpm --filter @notation-hero/client lint && pnpm --filter @notation-hero/client test NewPill && pnpm --filter @notation-hero/client test:a11y
```

Generate both-OS VR baselines; `test:vr` green. Then:

```bash
git add client/src/components/ui/NewPill
git commit \
  -m "feat(ui): NewPill (NH-210)" \
  -m "Small \"New\" pill preset over Badge; its own folder + story + VR (built ahead of a second consumer, per the spec's accepted FYI)." \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: `ui/PlayButton`

**Files:** `client/src/components/ui/PlayButton/PlayButton.{tsx,test.tsx,stories.tsx,story-ids.ts,a11y.ts,vr.ts}` (+ `.vr.ts-snapshots/`).

**Interfaces:**

- Consumes: `Button` from `@/components/ui/Button/Button`.
- Produces: `PlayButton({ title, onClick }: { title: string; onClick?: () => void })` from `@/components/ui/PlayButton/PlayButton`. Renders a `Button` (so root `data-slot="button"`), `aria-label="Play {title}"`, a 44×44 hit area (`size-11`), and calls `event.stopPropagation()` before `onClick`.

- [ ] **Step 1: Failing test** — `PlayButton.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayButton } from './PlayButton';

test('has an accessible "Play {title}" name', () => {
  render(<PlayButton title="Billie Jean" />);
  expect(screen.getByRole('button', { name: 'Play Billie Jean' })).toBeInTheDocument();
});

test('exposes a 44px hit area (WCAG 2.5.5, AAA — manual requirement)', () => {
  render(<PlayButton title="X" />);
  expect(screen.getByRole('button', { name: 'Play X' })).toHaveClass('size-11');
});

test('plays and stops propagation so the row does not also open', async () => {
  const user = userEvent.setup();
  const onPlay = vi.fn();
  const onRow = vi.fn();
  render(
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events -- test-only row stand-in
    <div onClick={onRow}>
      <PlayButton title="X" onClick={onPlay} />
    </div>,
  );
  await user.click(screen.getByRole('button', { name: 'Play X' }));
  expect(onPlay).toHaveBeenCalledTimes(1);
  expect(onRow).not.toHaveBeenCalled();
});
```

Run → FAIL.

- [ ] **Step 2: Implement** — `PlayButton.tsx`:

```tsx
import { Button } from '@/components/ui/Button/Button';

interface PlayButtonProps {
  title: string;
  onClick?: () => void;
}

export function PlayButton({ title, onClick }: PlayButtonProps) {
  return (
    <Button
      size="icon"
      variant="ghost"
      aria-label={`Play ${title}`}
      // 44x44 hit area (WCAG 2.5.5) even though the visible play_circle glyph is ~34px.
      className="size-11 rounded-full text-primary"
      onClick={(event) => {
        event.stopPropagation(); // a play tap must not also trigger the row's onRowClick
        onClick?.();
      }}
    >
      <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 34 }}>
        play_circle
      </span>
    </Button>
  );
}
```

> The 44px target is WCAG 2.5.5 (Level AAA) — the axe gate stops at AA, so this is a **manual** requirement: the `size-11` unit assertion above is its enforcement, and the VR snapshot captures the visible size. Do not drop `size-11`.

Run → PASS.

- [ ] **Step 3: Stories + story-ids**

`PlayButton.stories.tsx`:

```tsx
import { PlayButton } from './PlayButton';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/PlayButton',
  component: PlayButton,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: { title: 'Billie Jean' },
} satisfies Meta<typeof PlayButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
```

`PlayButton.story-ids.ts`:

```ts
export const PLAY_BUTTON_STORY_IDS = ['default'] as const;
```

- [ ] **Step 4: a11y + VR** — create from the templates: `<Name>`=`PlayButton`, `<ID_PREFIX>`=`ui-playbutton`, `<STORY_IDS_CONST>`=`PLAY_BUTTON_STORY_IDS`, `<story-ids-file>`=`./PlayButton.story-ids`, `<data-slot>`=`button` (PlayButton renders a `Button`), `<snapshot-prefix>`=`play-button`. **Add the glyph-font assertion** (the play_circle glyph).

- [ ] **Step 5: Verify, baselines, commit**

```bash
pnpm --filter @notation-hero/client typecheck && pnpm --filter @notation-hero/client lint && pnpm --filter @notation-hero/client test PlayButton && pnpm --filter @notation-hero/client test:a11y
```

Generate both-OS VR baselines; `test:vr` green. Then:

```bash
git add client/src/components/ui/PlayButton
git commit \
  -m "feat(ui): PlayButton ghost icon button (44px target, stopPropagation) (NH-210)" \
  -m "Ghost play_circle icon button with a 44x44 hit area (WCAG 2.5.5) and stopPropagation so a play tap does not also open the row." \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 12: `catalog/catalog-row.ts` + `catalog/NameCell`

**Files:**

- Create: `client/src/components/catalog/catalog-row.ts`
- Create: `client/src/components/catalog/NameCell/NameCell.{tsx,test.tsx,stories.tsx,story-ids.ts,a11y.ts,vr.ts}` (+ `.vr.ts-snapshots/`)

**Interfaces:**

- Consumes: `Cover`, `Flags`, `KindBadge`, `NewPill` (from `@/components/ui/...`).
- Produces: the `CatalogRow` type from `@/components/catalog/catalog-row`; `NameCell({ row }: { row: CatalogRow })` from `@/components/catalog/NameCell/NameCell`. Root carries `data-slot="name-cell"`. A `KindBadge` shows only for non-`song` kinds; title + subtitle truncate with ellipsis.

- [ ] **Step 1: Define the shared CatalogRow type** — `client/src/components/catalog/catalog-row.ts`:

```ts
// The row shape the catalog columns + NameCell consume. DataTable itself is generic and
// never sees this type. Mirrors the spec's "Example data shape".
export interface CatalogRow {
  id: string;
  title: string;
  subtitle: string; // pre-composed line 2, e.g. "Rock · 4/4 · drums·guitar" or "4 steps · timing"
  kind: 'song' | 'beat' | 'rudiment' | 'fill'; // full words only — no abbreviations
  icon?: string; // Material Symbol name for the cover
  isLesson?: boolean;
  level: number | null; // 0 = Debut, null = ungraded
  bpm: number | string; // 116, or "60→120" for a lesson ramp
  best: number | null; // 0–100, null = not attempted
  isNew?: boolean;
  flags?: { audio?: boolean; video?: boolean; parts?: boolean };
}
```

- [ ] **Step 2: Failing test** — `NameCell.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { NameCell } from './NameCell';
import type { CatalogRow } from '../catalog-row';

const base: CatalogRow = {
  id: '1',
  title: 'Billie Jean',
  subtitle: 'Pop · 4/4',
  kind: 'song',
  level: 3,
  bpm: 117,
  best: 74,
};

test('renders the title and subtitle (the two lines)', () => {
  render(<NameCell row={base} />);
  expect(screen.getByText('Billie Jean')).toBeInTheDocument();
  expect(screen.getByText('Pop · 4/4')).toBeInTheDocument();
});

test('shows a KindBadge for non-song kinds only', () => {
  const { rerender } = render(<NameCell row={base} />);
  expect(screen.queryByText('Beat')).not.toBeInTheDocument();
  rerender(<NameCell row={{ ...base, kind: 'beat' }} />);
  expect(screen.getByText('Beat')).toBeInTheDocument();
});

test('shows the New pill when isNew', () => {
  render(<NameCell row={{ ...base, isNew: true }} />);
  expect(screen.getByText('New')).toBeInTheDocument();
});

test('renders flags from row.flags', () => {
  render(<NameCell row={{ ...base, flags: { audio: true, parts: true } }} />);
  expect(screen.getByRole('img', { name: 'Has audio and parts' })).toBeInTheDocument();
});
```

Run → FAIL.

- [ ] **Step 3: Implement** — `NameCell.tsx`:

```tsx
import { Cover } from '@/components/ui/Cover/Cover';
import { Flags } from '@/components/ui/Flags/Flags';
import { KindBadge } from '@/components/ui/KindBadge/KindBadge';
import { NewPill } from '@/components/ui/NewPill/NewPill';
import type { CatalogRow } from '../catalog-row';

interface NameCellProps {
  row: CatalogRow;
}

export function NameCell({ row }: NameCellProps) {
  return (
    <div data-slot="name-cell" className="flex min-w-0 items-center gap-3 text-left">
      <Cover icon={row.icon} variant={row.isLesson ? 'lesson' : 'song'} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-semibold text-foreground">{row.title}</span>
          {/* inline condition (not a boolean alias) so TS narrows kind to the non-song union */}
          {row.kind !== 'song' ? <KindBadge kind={row.kind} /> : null}
          {row.isNew ? <NewPill /> : null}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="truncate">{row.subtitle}</span>
          <Flags audio={row.flags?.audio} video={row.flags?.video} parts={row.flags?.parts} />
        </div>
      </div>
    </div>
  );
}
```

Run → PASS.

- [ ] **Step 4: Stories + story-ids** — `NameCell.stories.tsx`:

```tsx
import { NameCell } from './NameCell';
import type { Meta, StoryObj } from '@storybook/tanstack-react';
import type { CatalogRow } from '../catalog-row';

const song: CatalogRow = {
  id: '1',
  title: 'Billie Jean',
  subtitle: 'Pop · 4/4 · drums·bass',
  kind: 'song',
  icon: 'music_note',
  level: 3,
  bpm: 117,
  best: 74,
  flags: { audio: true, video: true },
};

const meta = {
  title: 'Catalog/NameCell',
  component: NameCell,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof NameCell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Song: Story = { args: { row: song } };
export const Lesson: Story = {
  args: {
    row: {
      ...song,
      title: 'Single-stroke timing',
      subtitle: '4 steps · timing',
      kind: 'rudiment',
      isLesson: true,
      icon: 'school',
      bpm: '60→120',
      flags: { parts: true },
    },
  },
};
export const Beat: Story = {
  args: {
    row: { ...song, title: 'Four-on-the-floor', subtitle: 'House · 4/4', kind: 'beat', best: null },
  },
};
export const New: Story = { args: { row: { ...song, isNew: true } } };
export const Narrow: Story = {
  render: () => (
    <div style={{ width: 240 }}>
      <NameCell
        row={{
          ...song,
          title: 'A very long song title that should truncate',
          subtitle: 'And a long subtitle that also truncates to one line',
        }}
      />
    </div>
  ),
};
```

`NameCell.story-ids.ts`:

```ts
export const NAME_CELL_STORY_IDS = ['song', 'lesson', 'beat', 'new', 'narrow'] as const;
```

- [ ] **Step 5: a11y + VR** — create from the templates: `<Name>`=`NameCell`, `<ID_PREFIX>`=`catalog-namecell`, `<STORY_IDS_CONST>`=`NAME_CELL_STORY_IDS`, `<story-ids-file>`=`./NameCell.story-ids`, `<data-slot>`=`name-cell`, `<snapshot-prefix>`=`name-cell`. **Add the glyph-font assertion** (every story renders the Cover glyph).

- [ ] **Step 6: Verify, baselines, commit**

```bash
pnpm --filter @notation-hero/client typecheck && pnpm --filter @notation-hero/client lint && pnpm --filter @notation-hero/client test NameCell && pnpm --filter @notation-hero/client test:a11y
```

Generate both-OS VR baselines; `test:vr` green. Then:

```bash
git add client/src/components/catalog/catalog-row.ts client/src/components/catalog/NameCell
git commit \
  -m "feat(catalog): NameCell 2-line name block + CatalogRow type (NH-210)" \
  -m "Name cell composing Cover + title + KindBadge (non-song only) + NewPill on line 1 and subtitle + Flags on line 2; title/subtitle truncate. Adds the shared CatalogRow type." \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 13: `catalog/CatalogTable`

**Files:** `client/src/components/catalog/CatalogTable/CatalogTable.{tsx,test.tsx,stories.tsx,story-ids.ts,a11y.ts,vr.ts}` (+ `.vr.ts-snapshots/`).

**Interfaces:**

- Consumes: `DataTable` (+ `ColumnMeta.align`), `NameCell`, `LevelPill`, `Bpm`, `ScoreDonut`, `PlayButton`, `CatalogRow`.
- Produces: `CatalogTable(props: CatalogTableProps)` from `@/components/catalog/CatalogTable/CatalogTable`, where `CatalogTableProps = { data: CatalogRow[]; onOpen?: (row: CatalogRow) => void; onPlay?: (row: CatalogRow) => void; isLoading?: boolean; columnVisibility?: VisibilityState }`. Renders a `DataTable` (root `data-slot="data-table"`).

- [ ] **Step 1: Failing test** — `CatalogTable.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CatalogTable } from './CatalogTable';
import type { CatalogRow } from '../catalog-row';

const rows: CatalogRow[] = [
  { id: '1', title: 'Billie Jean', subtitle: 'Pop', kind: 'song', level: 3, bpm: 117, best: 74 },
  {
    id: '2',
    title: 'Paradiddle',
    subtitle: 'Rudiment',
    kind: 'rudiment',
    level: 1,
    bpm: '60→120',
    best: null,
  },
];

test('renders a row per catalog piece', () => {
  render(<CatalogTable data={rows} />);
  expect(screen.getByText('Billie Jean')).toBeInTheDocument();
  expect(screen.getByText('Paradiddle')).toBeInTheDocument();
});

test('shows the catalog empty message', () => {
  render(<CatalogTable data={[]} />);
  expect(screen.getByText('No pieces found — adjust your filters')).toBeInTheDocument();
});

test('row click opens the piece', async () => {
  const user = userEvent.setup();
  const onOpen = vi.fn();
  render(<CatalogTable data={rows} onOpen={onOpen} />);
  await user.click(screen.getByText('Billie Jean'));
  expect(onOpen).toHaveBeenCalledWith(rows[0]);
});

test('play click plays without also opening the row', async () => {
  const user = userEvent.setup();
  const onOpen = vi.fn();
  const onPlay = vi.fn();
  render(<CatalogTable data={rows} onOpen={onOpen} onPlay={onPlay} />);
  await user.click(screen.getByRole('button', { name: 'Play Billie Jean' }));
  expect(onPlay).toHaveBeenCalledWith(rows[0]);
  expect(onOpen).not.toHaveBeenCalled();
});
```

Run → FAIL.

- [ ] **Step 2: Implement** — `CatalogTable.tsx`:

```tsx
import { Bpm } from '@/components/ui/Bpm/Bpm';
import { DataTable } from '@/components/ui/DataTable/DataTable';
import { LevelPill } from '@/components/ui/LevelPill/LevelPill';
import { PlayButton } from '@/components/ui/PlayButton/PlayButton';
import { ScoreDonut } from '@/components/ui/ScoreDonut/ScoreDonut';
import { NameCell } from '../NameCell/NameCell';
import type { CatalogRow } from '../catalog-row';
import type { ColumnDef, VisibilityState } from '@tanstack/react-table';

interface CatalogTableProps {
  data: CatalogRow[];
  onOpen?: (row: CatalogRow) => void;
  onPlay?: (row: CatalogRow) => void;
  isLoading?: boolean;
  columnVisibility?: VisibilityState;
}

const columns: ColumnDef<CatalogRow>[] = [
  { accessorKey: 'title', header: 'Name', cell: ({ row }) => <NameCell row={row.original} /> },
  {
    accessorKey: 'level',
    header: 'Level',
    meta: { align: 'center' },
    cell: ({ getValue }) => <LevelPill level={getValue<number | null>()} />,
  },
  {
    accessorKey: 'bpm',
    header: 'BPM',
    meta: { align: 'right' },
    cell: ({ getValue }) => <Bpm value={getValue<number | string>()} />,
  },
  {
    accessorKey: 'best',
    header: 'Best',
    meta: { align: 'right' },
    sortDescFirst: true, // Best sorts high-first
    cell: ({ getValue }) => <ScoreDonut score={getValue<number | null>()} />,
  },
  {
    id: 'play',
    header: '',
    enableSorting: false,
    meta: { align: 'right' },
    cell: ({ row }) => <PlayButton title={row.original.title} onClick={() => undefined} />,
  },
];

export function CatalogTable({
  data,
  onOpen,
  onPlay,
  isLoading,
  columnVisibility,
}: CatalogTableProps) {
  // Rebuild the play column per render so it closes over the current onPlay.
  const cols: ColumnDef<CatalogRow>[] = columns.map((c) =>
    c.id === 'play'
      ? {
          ...c,
          cell: ({ row }) => (
            <PlayButton title={row.original.title} onClick={() => onPlay?.(row.original)} />
          ),
        }
      : c,
  );

  return (
    <DataTable
      data={data}
      columns={cols}
      appearance="cards"
      getRowId={(r) => r.id}
      onRowClick={onOpen}
      isLoading={isLoading}
      columnVisibility={columnVisibility}
      emptyState="No pieces found — adjust your filters"
    />
  );
}
```

> The static `columns` array keeps the column config stable; only the `play` column is re-bound per render so it captures the latest `onPlay`. The Best column is `sortDescFirst`; BPM uses the default sort (ramp/precise ordering is backend, out of scope).

Run → PASS.

- [ ] **Step 3: Stories + story-ids** — `CatalogTable.stories.tsx`:

```tsx
import { CatalogTable } from './CatalogTable';
import type { Meta, StoryObj } from '@storybook/tanstack-react';
import type { CatalogRow } from '../catalog-row';

const songs: CatalogRow[] = [
  {
    id: '1',
    title: 'Billie Jean',
    subtitle: 'Pop · 4/4',
    kind: 'song',
    icon: 'music_note',
    level: 3,
    bpm: 117,
    best: 74,
    flags: { audio: true, video: true },
  },
  {
    id: '2',
    title: 'Seven Nation Army',
    subtitle: 'Rock · 4/4',
    kind: 'song',
    icon: 'music_note',
    level: 1,
    bpm: 124,
    best: 96,
    isNew: true,
  },
  {
    id: '3',
    title: 'Take Five',
    subtitle: 'Jazz · 5/4',
    kind: 'song',
    icon: 'music_note',
    level: 8,
    bpm: 174,
    best: null,
    flags: { audio: true },
  },
];

const lessons: CatalogRow[] = [
  {
    id: 'l1',
    title: 'Single-stroke timing',
    subtitle: '4 steps · timing',
    kind: 'rudiment',
    isLesson: true,
    icon: 'school',
    level: 0,
    bpm: '60→120',
    best: 40,
    flags: { parts: true },
  },
  {
    id: 'l2',
    title: 'Four-on-the-floor',
    subtitle: 'House groove',
    kind: 'beat',
    isLesson: true,
    icon: 'school',
    level: 2,
    bpm: 120,
    best: 100,
  },
];

const meta = {
  title: 'Catalog/CatalogTable',
  component: CatalogTable,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
} satisfies Meta<typeof CatalogTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Songs: Story = { args: { data: songs, onOpen: () => {}, onPlay: () => {} } };
export const Lessons: Story = { args: { data: lessons, onOpen: () => {}, onPlay: () => {} } };
export const Empty: Story = { args: { data: [] } };
export const Mastered: Story = {
  args: { data: [{ ...songs[1], best: 100 }], onOpen: () => {}, onPlay: () => {} },
};
export const Mixed: Story = {
  args: { data: [...songs, ...lessons], onOpen: () => {}, onPlay: () => {} },
};
export const Narrow: Story = {
  render: () => (
    <div style={{ width: 480 }}>
      <CatalogTable
        data={[...songs, ...lessons]}
        columnVisibility={{ bpm: false }}
        onOpen={() => {}}
        onPlay={() => {}}
      />
    </div>
  ),
};
```

`CatalogTable.story-ids.ts`:

```ts
export const CATALOG_TABLE_STORY_IDS = [
  'songs',
  'lessons',
  'empty',
  'mastered',
  'mixed',
  'narrow',
] as const;
```

- [ ] **Step 4: a11y + VR** — create from the templates: `<Name>`=`CatalogTable`, `<ID_PREFIX>`=`catalog-catalogtable`, `<STORY_IDS_CONST>`=`CATALOG_TABLE_STORY_IDS`, `<story-ids-file>`=`./CatalogTable.story-ids`, `<data-slot>`=`data-table`, `<snapshot-prefix>`=`catalog-table`. **Add the glyph-font assertion** (covers/play render glyphs). This is the **full-table integration a11y gate** (every cell, both themes, rest + hover).

> The `Empty` story has no clickable rows and no glyph; if the glyph-font assertion false-fails there, guard it with `if (story !== 'empty')`.

- [ ] **Step 5: Verify, baselines, commit**

```bash
pnpm --filter @notation-hero/client typecheck && pnpm --filter @notation-hero/client lint && pnpm --filter @notation-hero/client test CatalogTable && pnpm --filter @notation-hero/client test:a11y
```

Generate both-OS VR baselines; confirm `test:vr` green. Then run the **whole** client gate once more (`typecheck && lint && test && test:a11y && test:vr`) so the full suite is green, and:

```bash
git add client/src/components/catalog/CatalogTable
git commit \
  -m "feat(catalog): CatalogTable column config over DataTable (NH-210)" \
  -m "Thin catalog column config (Name/Level/BPM/Best/Play) handed to the generic DataTable: NH-210 click-to-sort with Best desc-first, row-open + play (stopPropagation), catalog empty copy, and a 480px narrow story with BPM hidden." \
  -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Spec coverage (self-review traceability)

Every spec section maps to a task (run this as the final check before execution):

| Spec section                                                                             | Covered by                                                  |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Goal / Architecture (generic engine + cells)                                             | Tasks 1–3 (engine), 4–11 (cells), 12–13 (catalog)           |
| `ui/DataTable` API + NH-210 sort                                                         | Tasks 1–2                                                   |
| Column visibility (OQ3)                                                                  | Task 3                                                      |
| Interaction & visual states (card hover, empty, loading, sort-header 3-state affordance) | Tasks 1 (hover), 2 (affordance), 3 (empty/loading)          |
| ScoreDonut + bands + tokens                                                              | Task 4                                                      |
| LevelPill / Cover / Flags / Bpm                                                          | Tasks 5 / 6 / 7 / 8                                         |
| KindBadge (outline, Fill #D2664A) / NewPill                                              | Tasks 9 / 10                                                |
| PlayButton (44px, stopPropagation)                                                       | Task 11                                                     |
| Accessibility (per-cell labels, clickable rows, 44px)                                    | Tasks 1 (rows), 4–13 (labels), 11 (44px) + every `.a11y.ts` |
| Example data shape (CatalogRow)                                                          | Task 12                                                     |
| NameCell (2-line)                                                                        | Task 12                                                     |
| CatalogTable column config + narrow 480px                                                | Task 13                                                     |
| Storybook plan (DataTable/CatalogTable/cells)                                            | stories in every task                                       |
| Testing / a11y / VR (per-component, both OS)                                             | every task + Conventions                                    |
| Dependencies (`@tanstack/react-table`; shadcn table+badge; strip lucide)                 | Tasks 1, 9                                                  |
| Out of scope (filter row, topbar, dropdown, route wiring, e2e)                           | Global Constraints (not built)                              |

**Placeholder scan:** no `TBD`/`add appropriate…`/"similar to Task N" remain — every code/test/command step is concrete; the only intentionally-parameterised files are `*.a11y.ts` / `*.vr.ts`, whose full templates are in Conventions with exact per-task substitutions.

**Type-consistency check:** `DataTableProps<TData>` grows monotonically (Tasks 1→2→3) and is the same shape `CatalogTable` consumes in Task 13; `CatalogRow` (Task 12) is the single source for `NameCell` + `CatalogTable`; cell prop names (`score`, `level`, `value`, `kind`, `title`, `row`) match between each cell's definition and its use in `CatalogTable`'s `cell` renderers.

## Execution

After this plan is reviewed (the spec + plan ship together in PR #91), implement with **superpowers:subagent-driven-development** — one fresh subagent per task, two-stage review between tasks — or **superpowers:executing-plans** for inline batch execution. Tasks are ordered by dependency: 1→3 build the engine, 4→11 the cells (independent of each other), 12→13 the catalog composition. Each task ends green (`typecheck && lint && test && test:a11y && test:vr`) and is its own baby commit.
