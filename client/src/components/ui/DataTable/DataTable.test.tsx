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
  const row = container.querySelector<HTMLElement>('[data-slot="data-table-row"]')!;
  fireEvent.click(row);
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
