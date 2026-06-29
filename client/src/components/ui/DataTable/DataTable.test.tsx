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
    (c) => c.textContent,
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

test('the rest sort glyph reflects the column sort state (unsorted/asc/desc)', async () => {
  const user = userEvent.setup();
  render(<DataTable data={unsorted} columns={sortableColumns} getRowId={(r) => r.id} />);
  // The visible (rest) glyph is in the `.inline` wrapper; the hover-preview glyph is in the
  // sibling `.hidden` wrapper, so scope to `.inline`. Re-query each time — sorting re-renders.
  const restGlyph = () =>
    screen
      .getByRole('button', { name: /name/i })
      .querySelector('.inline .material-symbols-outlined');
  expect(restGlyph()).toHaveTextContent('unfold_more');
  await user.click(screen.getByRole('button', { name: /name/i }));
  expect(restGlyph()).toHaveTextContent('arrow_upward');
  await user.click(screen.getByRole('button', { name: /name/i }));
  expect(restGlyph()).toHaveTextContent('arrow_downward');
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
