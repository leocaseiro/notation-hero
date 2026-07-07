import { render, screen, waitFor } from '@testing-library/react';
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

test('the search box exposes an accessible name', () => {
  render(<TokenPicker label="Tags" options={TAGS} value={[]} onChange={() => {}} />);
  expect(screen.getByRole('combobox', { name: 'Tags' })).toBeInTheDocument();
});

// KNOWN GAP (see ADR docs/decisions/2026-07-07-radix-to-base-ui-migration.md): with the input
// rendered outside the popup (this chips pattern), Base UI forces modal focus management while the
// list is open (`ComboboxPopup`: `focusManagerModal = !inputInsidePopup || modal`). Its `markOthers`
// utility protects only the `<input>` node itself (Base UI's floating `reference`), not its sibling
// Chip elements — so chip Remove buttons get `aria-hidden` while the list is open. Functionally
// still clickable (jsdom doesn't enforce aria-hidden pointer-blocking), so these two tests use
// `{ hidden: true }` to query past it — but this needs real-browser axe verification (flagged as a
// follow-up: TokenPicker's chip-removal-while-list-open path may trip the a11y gate for real).
test('removing a badge drops that token', async () => {
  const user = userEvent.setup();
  render(<Harness initial={['ghost-notes', 'shuffle']} />);
  await user.click(screen.getByRole('button', { name: 'Remove Ghost notes', hidden: true }));
  expect(
    screen.queryByRole('button', { name: 'Remove Ghost notes', hidden: true }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Remove Shuffle', hidden: true })).toBeInTheDocument();
});

test('Backspace on the empty box removes the last token', async () => {
  const user = userEvent.setup();
  render(<Harness initial={['ghost-notes', 'shuffle']} />);
  screen.getByRole('combobox').focus();
  await user.keyboard('{Backspace}');
  expect(
    screen.queryByRole('button', { name: 'Remove Shuffle', hidden: true }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Remove Ghost notes', hidden: true }),
  ).toBeInTheDocument();
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

test('single mode closes the list after selecting', async () => {
  const user = userEvent.setup();
  render(
    <TokenPicker
      label="Pattern"
      options={TAGS}
      mode="single"
      value={['ghost-notes']}
      onChange={() => {}}
      defaultOpen
    />,
  );
  expect(screen.getByRole('option', { name: /shuffle/i })).toBeInTheDocument();
  await user.click(screen.getByRole('option', { name: /shuffle/i }));
  await waitFor(() => {
    expect(screen.queryByRole('option', { name: /shuffle/i })).not.toBeInTheDocument();
  });
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
  // Combobox.Empty's live-region text can carry an invisible word-joiner character, so match by
  // substring instead of exact equality.
  expect(screen.getByText(/No tags found/)).toBeInTheDocument();
});
