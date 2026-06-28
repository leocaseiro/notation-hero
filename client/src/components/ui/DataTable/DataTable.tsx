import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { alignClass } from './ColumnMeta';
import type { ColumnDef } from '@tanstack/react-table';

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
}

export const DataTable = <TData,>({
  data,
  columns,
  appearance = 'cards',
  onRowClick,
  getRowId,
}: Readonly<DataTableProps<TData>>) => {
  // TanStack Table manages its own memoization; React Compiler can't memoize its
  // returned functions, so it skips this component — expected, not a bug.
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table owns its memoization
  const table = useReactTable({
    data,
    columns,
    // Omit (not pass `undefined`) under exactOptionalPropertyTypes.
    ...(getRowId ? { getRowId } : {}),
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
};
