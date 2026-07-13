'use client';

import { DataTable, LevelPill } from '@notation-hero/client';
import type { ColumnDef } from '@notation-hero/client';

export interface CatalogItem {
  id: string;
  slug: string;
  title: string;
  kind: 'song' | 'pattern' | 'lesson';
  difficulty: string;
  level: number | null;
}

const columns: ColumnDef<CatalogItem>[] = [
  { accessorKey: 'title', header: 'Name' },
  { accessorKey: 'kind', header: 'Kind', meta: { align: 'center' as const } },
  {
    accessorKey: 'level',
    header: 'Level',
    meta: { align: 'center' as const },
    cell: ({ getValue }) => <LevelPill level={getValue<number | null>()} />,
  },
  { accessorKey: 'difficulty', header: 'Difficulty', meta: { align: 'center' as const } },
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
