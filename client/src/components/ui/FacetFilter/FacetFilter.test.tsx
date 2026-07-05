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

// Controlled harness for the toggle/replace tests so selection round-trips through real state.
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

test('opens the popover from the trigger', async () => {
  const user = userEvent.setup();
  render(<FacetFilter label="Genre" options={GENRES} value={[]} onChange={() => {}} />);
  expect(screen.queryByRole('group', { name: 'Genre' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: /genre/i }));
  expect(screen.getByRole('group', { name: 'Genre' })).toBeInTheDocument();
});

test('checking an option adds its value', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<FacetFilter label="Genre" options={GENRES} value={[]} onChange={onChange} defaultOpen />);
  await user.click(screen.getByRole('checkbox', { name: 'Rock' }));
  expect(onChange).toHaveBeenCalledWith(['rock']);
});

test('unchecking a selected option removes its value', async () => {
  const user = userEvent.setup();
  render(<Harness initial={['rock']} />);
  await user.click(screen.getByRole('checkbox', { name: 'Rock' }));
  expect(screen.getByRole('checkbox', { name: 'Rock' })).not.toBeChecked();
});

test('single mode uses radios and replaces the selection', async () => {
  const user = userEvent.setup();
  render(<Harness mode="single" initial={['rock']} />);
  const jazz = screen.getByRole('radio', { name: 'Jazz' });
  await user.click(jazz);
  expect(jazz).toBeChecked();
  expect(screen.getByRole('radio', { name: 'Rock' })).not.toBeChecked();
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

test('search filters the options in memory', async () => {
  const user = userEvent.setup();
  render(<FacetFilter label="Genre" options={GENRES} value={[]} onChange={() => {}} defaultOpen />);
  await user.type(screen.getByRole('textbox', { name: 'Search Genre' }), 'ja');
  expect(screen.getByRole('checkbox', { name: 'Jazz' })).toBeInTheDocument();
  expect(screen.queryByRole('checkbox', { name: 'Rock' })).not.toBeInTheDocument();
});

test('with shouldFilter=false the list stays put but onQueryChange fires (fetch mode)', async () => {
  const user = userEvent.setup();
  const onQueryChange = vi.fn();
  render(
    <FacetFilter
      label="Genre"
      options={GENRES}
      value={[]}
      onChange={() => {}}
      shouldFilter={false}
      onQueryChange={onQueryChange}
      defaultOpen
    />,
  );
  await user.type(screen.getByRole('textbox', { name: 'Search Genre' }), 'z');
  expect(onQueryChange).toHaveBeenCalledWith('z');
  expect(screen.getByRole('checkbox', { name: 'Rock' })).toBeInTheDocument();
});

test('shows the empty message when there are no options', () => {
  render(
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

test('shows a loading row in fetch mode', () => {
  render(
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
});
