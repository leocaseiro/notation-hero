import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { FacetFilter } from './FacetFilter';
import type { FilterOption } from './FacetFilter';

const GENRES: FilterOption[] = [
  { value: 'rock', label: 'Rock' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'pop', label: 'Pop' },
];

// Controlled harness so selection round-trips through real state.
const Harness = ({
  mode = 'multiple',
  initial = [],
}: Readonly<{ mode?: 'single' | 'multiple'; initial?: string[] }>) => {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <FacetFilter
      label="Genre"
      options={GENRES}
      mode={mode}
      value={value}
      onChange={setValue}
      defaultOpen
    />
  );
};

test('opens the combobox from the trigger', async () => {
  const user = userEvent.setup();
  render(<FacetFilter label="Genre" options={GENRES} value={[]} onChange={() => {}} />);
  expect(screen.queryByRole('option', { name: /rock/i })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /genre/i }));
  expect(screen.getByRole('option', { name: /rock/i })).toBeInTheDocument();
});

test('clicking an option adds its value', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<FacetFilter label="Genre" options={GENRES} value={[]} onChange={onChange} defaultOpen />);
  await user.click(screen.getByRole('option', { name: /rock/i }));
  expect(onChange).toHaveBeenCalledWith(['rock']);
});

test('selecting via keyboard (Enter on the highlighted option) adds a value', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<FacetFilter label="Genre" options={GENRES} value={[]} onChange={onChange} defaultOpen />);
  const input = screen.getByPlaceholderText('Search…');
  input.focus();
  await user.keyboard('{ArrowDown}{Enter}');
  expect(onChange).toHaveBeenCalled();
});

test('a selected option is announced and can be toggled off', async () => {
  const user = userEvent.setup();
  render(<Harness initial={['rock']} />);
  // sr-only ", selected" is part of the accessible name.
  expect(screen.getByRole('option', { name: /rock, selected/i })).toBeInTheDocument();
  await user.click(screen.getByRole('option', { name: /rock/i }));
  expect(screen.getByRole('option', { name: 'Rock' })).toBeInTheDocument();
});

test('the search box filters options in memory', async () => {
  const user = userEvent.setup();
  render(<FacetFilter label="Genre" options={GENRES} value={[]} onChange={() => {}} defaultOpen />);
  await user.type(screen.getByPlaceholderText('Search…'), 'ja');
  expect(screen.getByRole('option', { name: /jazz/i })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /rock/i })).not.toBeInTheDocument();
});

test('single mode replaces the selection', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <FacetFilter
      label="Genre"
      options={GENRES}
      mode="single"
      value={['rock']}
      onChange={onChange}
      defaultOpen
    />,
  );
  await user.click(screen.getByRole('option', { name: /jazz/i }));
  expect(onChange).toHaveBeenCalledWith(['jazz']);
});

test('clear resets the selection', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <FacetFilter label="Genre" options={GENRES} value={['rock']} onChange={onChange} defaultOpen />,
  );
  await user.click(screen.getByRole('button', { name: 'Clear' }));
  expect(onChange).toHaveBeenCalledWith([]);
});

test('shows a loading row, then the empty message', () => {
  const { rerender } = render(
    <FacetFilter
      label="Genre"
      options={GENRES}
      value={[]}
      onChange={() => {}}
      loading
      defaultOpen
    />,
  );
  expect(screen.getByText('Loading…')).toBeInTheDocument();
  rerender(
    <FacetFilter
      label="Genre"
      options={[]}
      value={[]}
      onChange={() => {}}
      defaultOpen
      emptyMessage="No genres found"
    />,
  );
  expect(screen.getByText('No genres found')).toBeInTheDocument();
});
