import { useState } from 'react';
import { DataTable } from './DataTable';
import type { Meta, StoryObj } from '@storybook/tanstack-react';
import type { ColumnDef, VisibilityState } from '@tanstack/react-table';

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
