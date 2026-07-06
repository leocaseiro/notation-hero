import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { TokenPicker } from './TokenPicker';
import type { FilterOption } from '@/components/ui/FacetFilter/FacetFilter';

const TAGS: FilterOption[] = [
  { value: 'ghost-notes', label: 'Ghost notes' },
  { value: 'syncopation', label: 'Syncopation' },
  { value: 'shuffle', label: 'Shuffle' },
];

const Harness = ({
  mode = 'multiple',
  initial = [],
}: Readonly<{ mode?: 'single' | 'multiple'; initial?: string[] }>) => {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <TokenPicker
      label="Tags"
      options={TAGS}
      mode={mode}
      value={value}
      onChange={setValue}
      defaultOpen
    />
  );
};

test('renders a removable badge per selected value', () => {
  render(<TokenPicker label="Tags" options={TAGS} value={['ghost-notes']} onChange={() => {}} />);
  expect(screen.getByRole('button', { name: 'Remove Ghost notes' })).toBeInTheDocument();
});

test('removing a badge drops that token', async () => {
  const user = userEvent.setup();
  render(<Harness initial={['ghost-notes', 'shuffle']} />);
  await user.click(screen.getByRole('button', { name: 'Remove Ghost notes' }));
  expect(screen.queryByRole('button', { name: 'Remove Ghost notes' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Remove Shuffle' })).toBeInTheDocument();
});

test('Backspace on the empty box removes the last token', async () => {
  const user = userEvent.setup();
  render(<Harness initial={['ghost-notes', 'shuffle']} />);
  screen.getByRole('combobox').focus();
  await user.keyboard('{Backspace}');
  expect(screen.queryByRole('button', { name: 'Remove Shuffle' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Remove Ghost notes' })).toBeInTheDocument();
});

test('Enter on a Remove button removes that chip, not a hijacked list selection', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <TokenPicker
      label="Tags"
      options={TAGS}
      value={['ghost-notes', 'shuffle']}
      onChange={onChange}
    />,
  );
  screen.getByRole('button', { name: 'Remove Shuffle' }).focus();
  await user.keyboard('{Enter}');
  expect(onChange).toHaveBeenCalledWith(['ghost-notes']);
});

test('selecting an option from the list adds it', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<TokenPicker label="Tags" options={TAGS} value={[]} onChange={onChange} defaultOpen />);
  await user.click(screen.getByRole('option', { name: /shuffle/i }));
  expect(onChange).toHaveBeenCalledWith(['shuffle']);
});

test('selecting via keyboard (Enter on the highlighted option) adds a value', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<TokenPicker label="Tags" options={TAGS} value={[]} onChange={onChange} defaultOpen />);
  screen.getByRole('combobox').focus();
  await user.keyboard('{ArrowDown}{Enter}');
  expect(onChange).toHaveBeenCalled();
});

test('the search box filters the options', async () => {
  const user = userEvent.setup();
  render(<TokenPicker label="Tags" options={TAGS} value={[]} onChange={() => {}} defaultOpen />);
  await user.type(screen.getByRole('combobox'), 'sync');
  expect(screen.getByRole('option', { name: /syncopation/i })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: /shuffle/i })).not.toBeInTheDocument();
});

test('single mode replaces the selection', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <TokenPicker
      label="Pattern"
      options={TAGS}
      mode="single"
      value={['ghost-notes']}
      onChange={onChange}
      defaultOpen
    />,
  );
  await user.click(screen.getByRole('option', { name: /shuffle/i }));
  expect(onChange).toHaveBeenCalledWith(['shuffle']);
});

test('shows a loading row, then the empty message', () => {
  const { rerender } = render(
    <TokenPicker label="Tags" options={TAGS} value={[]} onChange={() => {}} loading defaultOpen />,
  );
  expect(screen.getByText('Loading…')).toBeInTheDocument();
  rerender(
    <TokenPicker
      label="Tags"
      options={[]}
      value={[]}
      onChange={() => {}}
      defaultOpen
      emptyMessage="No tags found"
    />,
  );
  expect(screen.getByText('No tags found')).toBeInTheDocument();
});
