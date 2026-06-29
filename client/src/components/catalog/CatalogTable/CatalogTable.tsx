import type { CatalogRow } from '@/components/catalog/CatalogRow';
import type { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { NameCell } from '@/components/catalog/NameCell/NameCell';
import { Bpm } from '@/components/ui/Bpm/Bpm';
import { DataTable } from '@/components/ui/DataTable/DataTable';
import { LevelPill } from '@/components/ui/LevelPill/LevelPill';
import { PlayButton } from '@/components/ui/PlayButton/PlayButton';
import { ScoreDonut } from '@/components/ui/ScoreDonut/ScoreDonut';

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
    meta: { align: 'center' },
    cell: ({ getValue }) => <Bpm value={getValue<number | string>()} />,
  },
  {
    accessorKey: 'best',
    header: 'Best',
    meta: { align: 'center' },
    sortDescFirst: true, // Best sorts high-first
    cell: ({ getValue }) => <ScoreDonut score={getValue<number | null>()} />,
  },
  {
    id: 'play',
    header: '',
    enableSorting: false,
    meta: { align: 'right' },
    cell: ({ row }) => <PlayButton title={row.original.title} onClick={() => {}} />,
  },
];

export const CatalogTable = ({
  data,
  onOpen,
  onPlay,
  isLoading,
  columnVisibility,
}: Readonly<CatalogTableProps>) => {
  // Rebuild the play column per render so it closes over the current onPlay. A TanStack
  // `cell` is column-render config, not a reconciled component subtree, so the
  // unstable-nested-component heuristic is a false positive here (same idiom DataTable's
  // own disabled rules cover).
  const cols: ColumnDef<CatalogRow>[] = columns.map((c) =>
    c.id === 'play'
      ? {
          ...c,
          // eslint-disable-next-line react/no-unstable-nested-components -- TanStack cell render config, not a component
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
      // Omit (not pass `undefined`) under exactOptionalPropertyTypes.
      {...(onOpen ? { onRowClick: onOpen } : {})}
      {...(isLoading === undefined ? {} : { isLoading })}
      {...(columnVisibility ? { columnVisibility } : {})}
      emptyState="No pieces found — adjust your filters"
    />
  );
};
