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

// Controlled harness so add/remove round-trip through real state.
const Harness = ({
  mode = 'multiple',
  initial = [],
  allowCreate = false,
}: Readonly<{ mode?: 'single' | 'multiple'; initial?: string[]; allowCreate?: boolean }>) => {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <TokenPicker
      label="Tags"
      options={TAGS}
      mode={mode}
      allowCreate={allowCreate}
      value={value}
      onChange={setValue}
      defaultOpen
    />
  );
};

test('renders the input and a chip per selected value', () => {
  render(<TokenPicker label="Tags" options={TAGS} value={['ghost-notes']} onChange={() => {}} />);
  expect(screen.getByRole('textbox', { name: 'Tags' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Remove Ghost notes' })).toBeInTheDocument();
});

test('clicking a suggestion adds the token', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<TokenPicker label="Tags" options={TAGS} value={[]} onChange={onChange} defaultOpen />);
  await user.click(screen.getByRole('button', { name: 'Shuffle' }));
  expect(onChange).toHaveBeenCalledWith(['shuffle']);
});

test('typing filters the suggestions in memory', async () => {
  const user = userEvent.setup();
  render(<TokenPicker label="Tags" options={TAGS} value={[]} onChange={() => {}} defaultOpen />);
  await user.type(screen.getByRole('textbox', { name: 'Tags' }), 'sync');
  expect(screen.getByRole('button', { name: 'Syncopation' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Shuffle' })).not.toBeInTheDocument();
});

test('Enter adds the top suggestion', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<TokenPicker label="Tags" options={TAGS} value={[]} onChange={onChange} defaultOpen />);
  await user.type(screen.getByRole('textbox', { name: 'Tags' }), 'sync{Enter}');
  expect(onChange).toHaveBeenCalledWith(['syncopation']);
});

test('removing a chip drops just that token', async () => {
  const user = userEvent.setup();
  render(<Harness initial={['ghost-notes', 'shuffle']} />);
  await user.click(screen.getByRole('button', { name: 'Remove Ghost notes' }));
  expect(screen.queryByRole('button', { name: 'Remove Ghost notes' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Remove Shuffle' })).toBeInTheDocument();
});

test('Backspace on an empty input removes the last chip', async () => {
  const user = userEvent.setup();
  render(<Harness initial={['ghost-notes', 'shuffle']} />);
  screen.getByRole('textbox', { name: 'Tags' }).focus();
  await user.keyboard('{Backspace}');
  expect(screen.queryByRole('button', { name: 'Remove Shuffle' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Remove Ghost notes' })).toBeInTheDocument();
});

test('single mode replaces the selection', async () => {
  const user = userEvent.setup();
  render(<Harness mode="single" initial={['ghost-notes']} />);
  await user.click(screen.getByRole('button', { name: 'Shuffle' }));
  expect(screen.getByRole('button', { name: 'Remove Shuffle' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Remove Ghost notes' })).not.toBeInTheDocument();
});

test('allowCreate adds a free-text token on Enter', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <TokenPicker
      label="Tags"
      options={TAGS}
      value={[]}
      onChange={onChange}
      allowCreate
      defaultOpen
    />,
  );
  await user.type(screen.getByRole('textbox', { name: 'Tags' }), 'half-time{Enter}');
  expect(onChange).toHaveBeenCalledWith(['half-time']);
});

test('shows a loading row, then an empty message', () => {
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
