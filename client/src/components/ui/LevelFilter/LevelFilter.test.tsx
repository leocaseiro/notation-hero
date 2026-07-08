import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LevelFilter } from './LevelFilter';

const noop = () => {};

test('trigger reads "Level" when unset', () => {
  render(<LevelFilter value={{ min: null, max: null }} onChange={noop} />);
  expect(screen.getByRole('button', { name: /^Level$/ })).toBeInTheDocument();
});

test('trigger reads "Level ≤ 4" with a max only', () => {
  render(<LevelFilter value={{ min: null, max: 4 }} onChange={noop} />);
  expect(screen.getByRole('button', { name: 'Level ≤ 4' })).toBeInTheDocument();
});

test('trigger reads "Level ≥ 2" with a min only', () => {
  render(<LevelFilter value={{ min: 2, max: null }} onChange={noop} />);
  expect(screen.getByRole('button', { name: 'Level ≥ 2' })).toBeInTheDocument();
});

test('trigger reads "Level: only 3" when min == max', () => {
  render(<LevelFilter value={{ min: 3, max: 3 }} onChange={noop} />);
  expect(screen.getByRole('button', { name: 'Level: only 3' })).toBeInTheDocument();
});

test('trigger reads "Level: 2–6" for a range', () => {
  render(<LevelFilter value={{ min: 2, max: 6 }} onChange={noop} />);
  expect(screen.getByRole('button', { name: 'Level: 2–6' })).toBeInTheDocument();
});

test('an inverted range (min > max) still reads ascending', () => {
  render(<LevelFilter value={{ min: 8, max: 2 }} onChange={noop} />);
  expect(screen.getByRole('button', { name: 'Level: 2–8' })).toBeInTheDocument();
});

test('trigger reads "Level ≤ Debut" for a Debut max', () => {
  render(<LevelFilter value={{ min: null, max: 0 }} onChange={noop} />);
  expect(screen.getByRole('button', { name: 'Level ≤ Debut' })).toBeInTheDocument();
});

test('changing the Max select emits the new max bound', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<LevelFilter value={{ min: null, max: null }} onChange={onChange} defaultOpen />);
  await user.selectOptions(screen.getByRole('combobox', { name: 'Maximum level' }), '4');
  expect(onChange).toHaveBeenCalledWith({ min: null, max: 4 });
});

test('changing the Min select emits the new min bound', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<LevelFilter value={{ min: null, max: 6 }} onChange={onChange} defaultOpen />);
  await user.selectOptions(screen.getByRole('combobox', { name: 'Minimum level' }), '2');
  expect(onChange).toHaveBeenCalledWith({ min: 2, max: 6 });
});

test('Clear resets both bounds to null', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<LevelFilter value={{ min: 2, max: 6 }} onChange={onChange} defaultOpen />);
  await user.click(screen.getByRole('button', { name: 'Clear' }));
  expect(onChange).toHaveBeenCalledWith({ min: null, max: null });
});

test('no Clear button when unset', () => {
  render(<LevelFilter value={{ min: null, max: null }} onChange={noop} defaultOpen />);
  expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
});
