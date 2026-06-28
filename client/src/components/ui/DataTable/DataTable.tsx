import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { alignClass } from './ColumnMeta';
import type { Column, ColumnDef, Header, OnChangeFn, SortingState } from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table/Table';
import { cn } from '@/lib/utils';

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
}: Readonly<DataTableProps<TData>>) => {
  const [internalSorting, setInternalSorting] = useState<SortingState>(defaultSorting ?? []);
  const sortingState = sorting ?? internalSorting;

  // TanStack Table manages its own memoization; React Compiler can't memoize its
  // returned functions, so it skips this component — expected, not a bug.
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table owns its memoization
  const table = useReactTable({
    data,
    columns,
    // Omit (not pass `undefined`) under exactOptionalPropertyTypes.
    ...(getRowId ? { getRowId } : {}),
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
};

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

// Active column: solid accent arrow. Sortable-but-inactive: a persistent neutral
// `unfold_more` at rest that, on hover/focus, previews this column's first-click
// direction (arrow_downward for desc-first columns, arrow_upward otherwise).
const SortGlyph = <TData,>({ column }: Readonly<{ column: Column<TData, unknown> }>) => {
  const sorted = column.getIsSorted();
  if (sorted) {
    return (
      <span className="material-symbols-outlined text-primary" aria-hidden="true">
        {sorted === 'asc' ? 'arrow_upward' : 'arrow_downward'}
      </span>
    );
  }
  const previewArrow = column.getNextSortingOrder() === 'desc' ? 'arrow_downward' : 'arrow_upward';
  // `.material-symbols-outlined` is unlayered and forces `display: inline-block`, which beats
  // Tailwind's layered `hidden`/`inline`; so the show/hide toggle lives on plain wrapper spans
  // (not the icon-font element) — those wrappers respond to `hidden`/`inline` normally.
  return (
    <span className="relative inline-flex text-muted-foreground" aria-hidden="true">
      <span className="inline opacity-50 group-hover/sort:hidden group-focus-visible/sort:hidden">
        <span className="material-symbols-outlined">unfold_more</span>
      </span>
      <span className="hidden opacity-70 group-hover/sort:inline group-focus-visible/sort:inline">
        <span className="material-symbols-outlined">{previewArrow}</span>
      </span>
    </span>
  );
};
