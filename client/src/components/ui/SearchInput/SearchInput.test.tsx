import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { SearchInput } from './SearchInput';

// Controlled harness so typing / clearing round-trips through real state, like a container would.
const Harness = ({ initial = '' }: Readonly<{ initial?: string }>) => {
  const [value, setValue] = useState(initial);
  return <SearchInput value={value} onChange={setValue} label="Search" />;
};

test('renders a labelled search box', () => {
  render(<Harness />);
  expect(screen.getByRole('searchbox', { name: 'Search' })).toBeInTheDocument();
});

test('emits each keystroke via onChange', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<SearchInput value="" onChange={onChange} label="Search" />);
  await user.type(screen.getByRole('searchbox'), 'r');
  expect(onChange).toHaveBeenCalledWith('r');
});

test('shows the clear button only when there is a value', () => {
  const { rerender } = render(<SearchInput value="" onChange={() => {}} label="Search" />);
  expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  rerender(<SearchInput value="rock" onChange={() => {}} label="Search" />);
  expect(screen.getByRole('button', { name: 'Clear search' })).toBeInTheDocument();
});

test('clear empties the value and refocuses the input', async () => {
  const user = userEvent.setup();
  render(<Harness initial="rock" />);
  await user.click(screen.getByRole('button', { name: 'Clear search' }));
  const box = screen.getByRole('searchbox');
  expect(box).toHaveValue('');
  expect(box).toHaveFocus();
});

test('runs the onClear side effect on clear', async () => {
  const user = userEvent.setup();
  const onClear = vi.fn();
  render(<SearchInput value="rock" onChange={() => {}} onClear={onClear} label="Search" />);
  await user.click(screen.getByRole('button', { name: 'Clear search' }));
  expect(onClear).toHaveBeenCalledTimes(1);
});

test('renders no clear button when disabled', () => {
  render(<SearchInput value="rock" onChange={() => {}} disabled label="Search" />);
  expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
});
