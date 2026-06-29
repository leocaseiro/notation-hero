import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { alignClass } from './ColumnMeta';
import type {
  Column,
  ColumnDef,
  Header,
  OnChangeFn,
  Row,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';
import type { ReactNode } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table/Table';
import { cn } from '@/lib/utils';

// Card-row cell chrome. A real <tr> ignores border-radius, so the rounded-card look lives on the
// cells: border + card bg on every cell, with the outer cells rounding the corners and drawing the
// left/right edges (spec F3). Shared by the skeleton and data rows so loading and loaded states
// stay pixel-identical.
const CARD_CELL_CHROME =
  '[&>td]:border-y [&>td]:border-border [&>td]:bg-card [&>td:first-child]:rounded-l-xl [&>td:first-child]:border-l [&>td:last-child]:rounded-r-xl [&>td:last-child]:border-r';

// Row hover glow (clickable card rows only) — the mockup's .trow:hover: lift + teal border + ONE
// soft glow around the whole row. box-shadow is a no-op on `display:table-row` in Chromium, and a
// per-<td> shadow halos every internal cell edge (the reported bleed). So the glow is a hover-gated
// full-row ::after overlay: the row goes `relative`, the overlay is inset-0, rounded to the card,
// behind the cells (-z) and pointer-events-none. Hover-gated so the resting row (and its VR
// baseline) is untouched; the teal recolor stays on the cells' outer edges.
const ROW_HOVER_GLOW =
  "hover:relative hover:after:pointer-events-none hover:after:absolute hover:after:inset-0 hover:after:-z-[1] hover:after:rounded-xl hover:after:content-[''] hover:[&>td]:border-[color-mix(in_oklch,var(--primary)_45%,var(--border))] hover:after:shadow-[0_5px_16px_color-mix(in_oklch,var(--primary)_12%,transparent)]";

export interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  /** 'cards' = gap-separated rounded card-rows (default); 'rows' = plain rows. */
  appearance?: 'cards' | 'rows';
  onRowClick?: (row: TData) => void;
  getRowId?: (row: TData) => string;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  defaultSorting?: SortingState;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: OnChangeFn<VisibilityState>;
  defaultColumnVisibility?: VisibilityState;
  isLoading?: boolean;
  emptyState?: ReactNode;
}

export const DataTable = <TData,>({
  data,
  columns,
  appearance = 'cards',
  onRowClick,
  getRowId,
  sorting,
  onSortingChange,
  defaultSorting,
  columnVisibility,
  onColumnVisibilityChange,
  defaultColumnVisibility,
  isLoading,
  emptyState,
}: Readonly<DataTableProps<TData>>) => {
  const [internalSorting, setInternalSorting] = useState<SortingState>(defaultSorting ?? []);
  const sortingState = sorting ?? internalSorting;

  const [internalVisibility, setInternalVisibility] = useState<VisibilityState>(
    defaultColumnVisibility ?? {},
  );
  const visibilityState = columnVisibility ?? internalVisibility;

  // TanStack Table manages its own memoization; React Compiler can't memoize its
  // returned functions, so it skips this component — expected, not a bug.
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table owns its memoization
  const table = useReactTable({
    data,
    columns,
    // Omit (not pass `undefined`) under exactOptionalPropertyTypes.
    ...(getRowId ? { getRowId } : {}),
    state: { sorting: sortingState, columnVisibility: visibilityState },
    onSortingChange: (updater) => {
      setInternalSorting((prev) => (typeof updater === 'function' ? updater(prev) : updater));
      onSortingChange?.(updater);
    },
    onColumnVisibilityChange: (updater) => {
      setInternalVisibility((prev) => (typeof updater === 'function' ? updater(prev) : updater));
      onColumnVisibilityChange?.(updater);
    },
    // NH-210: 2-state asc <-> desc toggle (no "unsorted" in the cycle), single column only.
    enableSortingRemoval: false,
    enableMultiSort: false,
    sortDescFirst: false, // generic default is asc-first; columns opt into desc via sortDescFirst
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const clickable = Boolean(onRowClick);
  const rows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();

  return (
    <>
      <span role="status" aria-live="polite" className="sr-only">
        {isLoading ? 'Loading…' : ''}
      </span>
      <Table
        data-slot="data-table"
        data-appearance={appearance}
        aria-busy={isLoading}
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
                  aria-sort={ariaSort(header.column)}
                  className={cn(
                    'h-auto px-3.5 pb-2 text-[10.5px] font-bold tracking-[0.06em] text-muted-foreground uppercase',
                    alignClass(header.column.columnDef.meta?.align),
                  )}
                >
                  {header.isPlaceholder ? null : <HeaderLabel header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {renderBody({
            isLoading,
            appearance,
            rows,
            visibleColumns,
            clickable,
            onRowClick,
            emptyState,
          })}
        </TableBody>
      </Table>
    </>
  );
};

// Body branches: loading -> skeleton rows; no rows -> empty cell; else data rows.
// Extracted to a function (early returns) so the three-way choice isn't a nested
// ternary in JSX (sonarjs/no-nested-conditional).
interface BodyProps<TData> {
  isLoading: boolean | undefined;
  appearance: 'cards' | 'rows';
  rows: Row<TData>[];
  visibleColumns: Column<TData, unknown>[];
  clickable: boolean;
  onRowClick: ((row: TData) => void) | undefined;
  emptyState: ReactNode;
}

function renderBody<TData>({
  isLoading,
  appearance,
  rows,
  visibleColumns,
  clickable,
  onRowClick,
  emptyState,
}: BodyProps<TData>): ReactNode {
  if (isLoading) {
    return <SkeletonRows appearance={appearance} columns={visibleColumns} />;
  }
  if (rows.length === 0) {
    return (
      <EmptyRow appearance={appearance} colSpan={visibleColumns.length} content={emptyState} />
    );
  }
  return (
    <DataRows
      appearance={appearance}
      rows={rows}
      clickable={clickable}
      {...(onRowClick ? { onRowClick } : {})}
    />
  );
}

const SkeletonRows = <TData,>({
  appearance,
  columns,
}: Readonly<{ appearance: 'cards' | 'rows'; columns: Column<TData, unknown>[] }>) => (
  <>
    {Array.from({ length: 5 }).map((_, i) => (
      <TableRow
        // Static placeholder rows with no identity/reordering; index key is correct here.
        // eslint-disable-next-line react/no-array-index-key -- fixed-length skeleton, no stable id
        key={`skeleton-${i}`}
        data-slot="data-table-skeleton-row"
        className={cn(appearance === 'cards' && CARD_CELL_CHROME)}
      >
        {columns.map((col) => (
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
    ))}
  </>
);

const EmptyRow = ({
  appearance,
  colSpan,
  content,
}: Readonly<{ appearance: 'cards' | 'rows'; colSpan: number; content: ReactNode }>) => (
  <TableRow
    data-slot="data-table-empty"
    className={cn(
      appearance === 'cards' &&
        '[&>td]:rounded-xl [&>td]:border [&>td]:border-border [&>td]:bg-card',
    )}
  >
    <TableCell colSpan={colSpan} className="px-3.5 py-8 text-center text-muted-foreground">
      {content ?? 'No results'}
    </TableCell>
  </TableRow>
);

const DataRows = <TData,>({
  appearance,
  rows,
  clickable,
  onRowClick,
}: Readonly<{
  appearance: 'cards' | 'rows';
  rows: Row<TData>[];
  clickable: boolean;
  onRowClick?: (row: TData) => void;
}>) => (
  <>
    {rows.map((row) => (
      <TableRow
        key={row.id}
        data-slot="data-table-row"
        tabIndex={clickable ? 0 : undefined}
        // A clickable row activates on clicks bubbling up from its cells, so any in-row
        // interactive control (e.g. PlayButton) MUST stopPropagation to avoid also opening the
        // row. (The keyboard path below can't rely on that, so it guards on the event target.)
        onClick={
          clickable
            ? () => {
                // Don't open the row when the click ends a text selection — drag-to-select
                // fires a click on mouseup, and navigating away would lose the selection.
                if (globalThis.getSelection()?.toString()) return;
                onRowClick?.(row.original);
              }
            : undefined
        }
        onKeyDown={
          clickable
            ? (e) => {
                // Only the row itself activates; ignore keys bubbling up from focusable cell
                // content (e.g. the in-row Play button). Without this, Enter/Space on an
                // in-row control fires its action AND the row's onRowClick (double-trigger).
                if (e.target !== e.currentTarget) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRowClick?.(row.original);
                }
              }
            : undefined
        }
        className={cn(
          'transition-all',
          appearance === 'cards' && CARD_CELL_CHROME,
          appearance === 'rows' && 'border-b border-border',
          clickable &&
            'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring hover:-translate-y-px',
          clickable && appearance === 'cards' && ROW_HOVER_GLOW,
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
  </>
);

function ariaSort<TData>(
  column: Column<TData, unknown>,
): 'ascending' | 'descending' | 'none' | undefined {
  if (!column.getCanSort()) return undefined;
  const sorted = column.getIsSorted();
  if (sorted === 'asc') return 'ascending';
  if (sorted === 'desc') return 'descending';
  return 'none';
}

// Sortable columns render a header button (click toggles asc<->desc) with the sort
// glyph; non-sortable columns render the bare header label.
const HeaderLabel = <TData,>({ header }: Readonly<{ header: Header<TData, unknown> }>) => {
  // Opt out of React Compiler memoization: this renders from column.getIsSorted() (external,
  // mutable table state the compiler can't track), so a memoized version would keep the
  // initial glyph after a click sorts the column. Re-render every time the table does.
  'use no memo';
  if (!header.column.getCanSort()) {
    return <>{flexRender(header.column.columnDef.header, header.getContext())}</>;
  }
  return (
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
  );
};

// Rest glyph reflects the column's CURRENT sort: arrow_upward (asc), arrow_downward
// (desc), or a neutral unfold_more when unsorted. Split out so the JSX stays free of a
// nested ternary (sonarjs/no-nested-conditional).
function restSortIcon(sorted: false | 'asc' | 'desc'): string {
  if (sorted === 'asc') return 'arrow_upward';
  if (sorted === 'desc') return 'arrow_downward';
  return 'unfold_more';
}

// At rest the glyph shows the column's current sort state (above); on hover/focus it
// previews the direction the NEXT click produces — for an inactive column that's its
// first-click direction (arrow_downward for sortDescFirst cols, else arrow_upward); for
// the active column it's the toggle (asc previews desc, desc previews asc). Both come from
// getNextSortingOrder() since enableSortingRemoval is off. The active column is accented.
const SortGlyph = <TData,>({ column }: Readonly<{ column: Column<TData, unknown> }>) => {
  // Same reason as HeaderLabel: the glyph derives from getIsSorted()/getNextSortingOrder(),
  // so memoizing on the stable `column` ref would freeze it at the first-render value.
  'use no memo';
  const sorted = column.getIsSorted();
  const active = Boolean(sorted);
  const previewIcon = column.getNextSortingOrder() === 'desc' ? 'arrow_downward' : 'arrow_upward';
  // `.material-symbols-outlined` is unlayered and forces `display: inline-block`, which beats
  // Tailwind's layered `hidden`/`inline`; so the show/hide toggle lives on plain wrapper spans
  // (not the icon-font element) — those wrappers respond to `hidden`/`inline` normally.
  return (
    <span
      className={cn('relative inline-flex', active ? 'text-primary' : 'text-muted-foreground')}
      aria-hidden="true"
    >
      <span
        className={cn(
          'inline group-hover/sort:hidden group-focus-visible/sort:hidden',
          active ? 'opacity-100' : 'opacity-50',
        )}
      >
        <span className="material-symbols-outlined">{restSortIcon(sorted)}</span>
      </span>
      <span className="hidden opacity-70 group-hover/sort:inline group-focus-visible/sort:inline">
        <span className="material-symbols-outlined">{previewIcon}</span>
      </span>
    </span>
  );
};
