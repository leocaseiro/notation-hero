import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ToggleChipGroup } from './ToggleChipGroup';
import type { ChipOption } from './ToggleChipGroup';

const TIME_SIGNATURES: readonly ChipOption[] = [
  { value: '4/4', label: '4/4' },
  { value: '3/4', label: '3/4' },
  { value: '6/8', label: '6/8' },
];

// Controlled harness so selecting round-trips through real state, like a container would.
const Harness = ({
  type = 'multiple',
  initial = [],
}: Readonly<{ type?: 'single' | 'multiple'; initial?: string[] }>) => {
  const [value, setValue] = useState<string[]>(initial);
  return (
    <ToggleChipGroup
      options={TIME_SIGNATURES}
      value={value}
      onChange={setValue}
      type={type}
      aria-label="Time signature"
    />
  );
};

test('renders a labelled group of pressable chips', () => {
  // Base UI's ToggleGroup root is a generic group (not Radix's toolbar); each chip is a button
  // with aria-pressed, in both single and multiple mode (Base UI has no separate radio-group
  // semantics for single-select — see the single-mode tests below).
  render(<Harness />);
  expect(screen.getByRole('group', { name: 'Time signature' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '4/4' })).toHaveAttribute('aria-pressed', 'false');
});

test('clicking a chip adds its value (payload is string[])', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <ToggleChipGroup
      options={TIME_SIGNATURES}
      value={[]}
      onChange={onChange}
      aria-label="Time signature"
    />,
  );
  await user.click(screen.getByRole('button', { name: '3/4' }));
  expect(onChange).toHaveBeenCalledWith(['3/4']);
});

test('clicking an on chip removes its value', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <ToggleChipGroup
      options={TIME_SIGNATURES}
      value={['3/4']}
      onChange={onChange}
      aria-label="Time signature"
    />,
  );
  await user.click(screen.getByRole('button', { name: '3/4' }));
  expect(onChange).toHaveBeenCalledWith([]);
});

test('multiple mode keeps earlier selections when adding another', async () => {
  const user = userEvent.setup();
  render(<Harness initial={['4/4']} />);
  await user.click(screen.getByRole('button', { name: '6/8' }));
  expect(screen.getByRole('button', { name: '4/4' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: '6/8' })).toHaveAttribute('aria-pressed', 'true');
});

test('single mode emits a length<=1 payload and deselects the previous chip', async () => {
  // Base UI has no separate radio-group semantics for single-select — `multiple={false}` still
  // renders plain toggle buttons (aria-pressed), and enforces at-most-one-pressed itself.
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <ToggleChipGroup
      options={TIME_SIGNATURES}
      value={['4/4']}
      onChange={onChange}
      type="single"
      aria-label="Time signature"
    />,
  );
  await user.click(screen.getByRole('button', { name: '6/8' }));

  expect(onChange).toHaveBeenCalledWith(['6/8']);
  const payload = onChange.mock.calls[0]?.[0] as string[];
  expect(payload.length).toBeLessThanOrEqual(1);
});

test('single mode marks the selected chip pressed and the rest unpressed', async () => {
  const user = userEvent.setup();
  render(<Harness type="single" initial={['4/4']} />);
  await user.click(screen.getByRole('button', { name: '6/8' }));

  expect(screen.getByRole('button', { name: '4/4' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByRole('button', { name: '6/8' })).toHaveAttribute('aria-pressed', 'true');
});

test('disabled group renders no pressable chips', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <ToggleChipGroup
      options={TIME_SIGNATURES}
      value={['4/4']}
      onChange={onChange}
      disabled
      aria-label="Time signature"
    />,
  );
  for (const chip of screen.getAllByRole('button')) {
    expect(chip).toBeDisabled();
  }
  await user.click(screen.getByRole('button', { name: '4/4' }));
  expect(onChange).not.toHaveBeenCalled();
});

test('ArrowRight moves roving focus to the next chip', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const first = screen.getByRole('button', { name: '4/4' });
  first.focus();
  expect(first).toHaveFocus();
  await user.keyboard('{ArrowRight}');
  expect(screen.getByRole('button', { name: '3/4' })).toHaveFocus();
});
