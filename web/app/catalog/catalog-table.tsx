'use client';

import { DataTable, LevelPill } from '@notation-hero/client';
import type { ColumnDef } from '@notation-hero/client';
import type { CatalogItem } from '@notation-hero/shared';

// Nulls-last numeric compare: ungraded (level === null) always sinks to the bottom on an ASCENDING
// sort. Deliberately the simple version — the desc flag is NOT threaded, so a descending sort puts
// ungraded on top, which is acceptable (NH-279 items 4 + 5).
function compareLevelNullsLast(av: number | null, bv: number | null): number {
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;
  return av - bv;
}

const columns: ColumnDef<CatalogItem>[] = [
  { accessorKey: 'title', header: 'Name' },
  { accessorKey: 'kind', header: 'Kind', meta: { align: 'center' as const } },
  {
    accessorKey: 'level',
    header: 'Level',
    meta: { align: 'center' as const },
    cell: ({ getValue }) => <LevelPill level={getValue<number | null>()} />,
    // level is number | null; TanStack's default floats null above 0 on ascending — sort nulls last.
    sortingFn: (a, b, id) =>
      compareLevelNullsLast(a.getValue<number | null>(id), b.getValue<number | null>(id)),
  },
  {
    accessorKey: 'difficulty',
    header: 'Difficulty',
    meta: { align: 'center' as const },
    // The cell shows the band LABEL (Debut / Beginner ...), but sort by the numeric level it derives
    // from (server toDifficulty) so the order is by rank, not alphabetical (Advanced < Beginner ...).
    sortingFn: (a, b) => compareLevelNullsLast(a.original.level, b.original.level),
  },
];

export function CatalogDataTable({ data }: Readonly<{ data: CatalogItem[] }>) {
  return (
    <DataTable
      data={data}
      columns={columns}
      appearance="cards"
      getRowId={(r) => r.id}
      emptyState="No pieces found"
    />
  );
}
