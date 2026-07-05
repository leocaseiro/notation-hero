import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LevelFilter } from './LevelFilter';

test('trigger reads "Level" with no bound', () => {
  render(<LevelFilter value={null} onChange={() => {}} />);
  expect(screen.getByRole('button', { name: /^Level$/ })).toBeInTheDocument();
});

test('trigger shows the numeric bound', () => {
  render(<LevelFilter value={4} onChange={() => {}} />);
  expect(screen.getByRole('button', { name: 'Level ≤ 4' })).toBeInTheDocument();
});

test('trigger shows Debut for level 0', () => {
  render(<LevelFilter value={0} onChange={() => {}} />);
  expect(screen.getByRole('button', { name: 'Level ≤ Debut' })).toBeInTheDocument();
});

test('selecting a level emits its number', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<LevelFilter value={null} onChange={onChange} defaultOpen />);
  await user.click(screen.getByRole('radio', { name: 'Level 4' }));
  expect(onChange).toHaveBeenCalledWith(4);
});

test('the Debut pill selects level 0', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<LevelFilter value={null} onChange={onChange} defaultOpen />);
  await user.click(screen.getByRole('radio', { name: 'Debut' }));
  expect(onChange).toHaveBeenCalledWith(0);
});

test('clear resets the bound to null', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<LevelFilter value={4} onChange={onChange} defaultOpen />);
  await user.click(screen.getByRole('button', { name: 'Clear' }));
  expect(onChange).toHaveBeenCalledWith(null);
});

test('no Clear button when there is no bound', () => {
  render(<LevelFilter value={null} onChange={() => {}} defaultOpen />);
  expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
});
