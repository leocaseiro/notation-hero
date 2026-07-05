import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from './Command';

const Menu = ({ onSelect = () => {} }: Readonly<{ onSelect?: (value: string) => void }>) => (
  <Command aria-label="Commands">
    <CommandInput aria-label="Search commands" placeholder="Type…" />
    <CommandList>
      <CommandEmpty>No results.</CommandEmpty>
      <CommandItem onSelect={onSelect}>Search the catalog</CommandItem>
      <CommandItem onSelect={onSelect}>Play a random piece</CommandItem>
    </CommandList>
  </Command>
);

test('renders items as options in a listbox', () => {
  render(<Menu />);
  expect(screen.getByRole('option', { name: 'Search the catalog' })).toBeInTheDocument();
});

test('typing filters the options', async () => {
  const user = userEvent.setup();
  render(<Menu />);
  await user.type(screen.getByPlaceholderText('Type…'), 'random');
  expect(screen.getByRole('option', { name: 'Play a random piece' })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Search the catalog' })).not.toBeInTheDocument();
});

test('shows the empty state when nothing matches', async () => {
  const user = userEvent.setup();
  render(<Menu />);
  await user.type(screen.getByPlaceholderText('Type…'), 'zzzzz');
  expect(screen.getByText('No results.')).toBeInTheDocument();
});

test('Enter runs the highlighted item', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  render(<Menu onSelect={onSelect} />);
  screen.getByPlaceholderText('Type…').focus();
  await user.keyboard('{ArrowDown}{Enter}');
  expect(onSelect).toHaveBeenCalled();
});

test('clicking an item runs it', async () => {
  const user = userEvent.setup();
  const onSelect = vi.fn();
  render(<Menu onSelect={onSelect} />);
  await user.click(screen.getByRole('option', { name: 'Search the catalog' }));
  expect(onSelect).toHaveBeenCalled();
});
