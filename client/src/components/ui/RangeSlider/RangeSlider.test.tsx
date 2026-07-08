import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { RangeSlider } from './RangeSlider';

// Base UI Slider measures its track with ResizeObserver and uses pointer-capture on the thumb —
// neither exists in jsdom. Both are polyfilled globally in vitest.setup.ts; the tests drive the
// slider by keyboard.

// Controlled harness so arrow-key moves round-trip through real state, like a container would.
const Harness = ({
  initial = [20, 80],
  ...props
}: Readonly<{ initial?: [number, number] } & Partial<Parameters<typeof RangeSlider>[0]>>) => {
  const [value, setValue] = useState<[number, number]>(initial);
  return <RangeSlider {...props} value={value} onChange={setValue} />;
};

test('renders both thumbs as named sliders', () => {
  render(<RangeSlider value={[20, 80]} onChange={() => {}} minLabel="Low" maxLabel="High" />);
  expect(screen.getByRole('slider', { name: 'Low' })).toBeInTheDocument();
  expect(screen.getByRole('slider', { name: 'High' })).toBeInTheDocument();
});

test('exposes min / max / aria-valuenow on each thumb', () => {
  render(
    <RangeSlider
      value={[20, 80]}
      onChange={() => {}}
      min={0}
      max={100}
      minLabel="Low"
      maxLabel="High"
    />,
  );
  const low = screen.getByRole('slider', { name: 'Low' });
  const high = screen.getByRole('slider', { name: 'High' });

  // Each thumb is a native `<input type="range">` (Base UI renders the accessible slider as a
  // real range input, unlike Radix's span[role=slider]) — min/max come from the native `min`/`max`
  // HTML attributes, not `aria-valuemin`/`aria-valuemax`; `aria-valuenow` is still set explicitly.
  // minStepsBetweenValues=0 lets the thumbs MEET (share a value), so both report the full track
  // bounds as their native min/max; only aria-valuenow differs per thumb. (They meet but never
  // cross — Base UI clamps each thumb at its neighbour; the clamp test below locks that.)
  expect(low).toHaveAttribute('min', '0');
  expect(low).toHaveAttribute('max', '100');
  expect(low).toHaveAttribute('aria-valuenow', '20');

  expect(high).toHaveAttribute('min', '0');
  expect(high).toHaveAttribute('max', '100');
  expect(high).toHaveAttribute('aria-valuenow', '80');
});

test('ArrowRight on the low thumb raises its value via onChange', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <RangeSlider value={[20, 80]} onChange={onChange} step={1} minLabel="Low" maxLabel="High" />,
  );
  const low = screen.getByRole('slider', { name: 'Low' });
  low.focus();
  await user.keyboard('{ArrowRight}');
  expect(onChange).toHaveBeenCalledWith([21, 80]);
});

test('ArrowLeft on the high thumb lowers its value via onChange', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <RangeSlider value={[20, 80]} onChange={onChange} step={1} minLabel="Low" maxLabel="High" />,
  );
  const high = screen.getByRole('slider', { name: 'High' });
  high.focus();
  await user.keyboard('{ArrowLeft}');
  expect(onChange).toHaveBeenCalledWith([20, 79]);
});

test('arrow keys round-trip through controlled state', async () => {
  const user = userEvent.setup();
  render(<Harness initial={[20, 80]} minLabel="Low" maxLabel="High" />);
  const low = screen.getByRole('slider', { name: 'Low' });
  low.focus();
  await user.keyboard('{ArrowRight}{ArrowRight}');
  expect(low).toHaveAttribute('aria-valuenow', '22');
});

test('the low thumb clamps at the high thumb — they meet but never cross', async () => {
  // minStepsBetweenValues=0 lets the thumbs share a value; Base UI clamps the low thumb at the high
  // one so it never surfaces low > high (an invalid [min, max]). A controlled harness (value must
  // round-trip for the thumb to actually advance) drives low far past high (from 20 toward 100, past
  // high=40) and asserts it stops at 40 and every emitted tuple stays ordered.
  const user = userEvent.setup();
  const emitted: Array<[number, number]> = [];
  const Spy = () => {
    const [value, setValue] = useState<[number, number]>([20, 40]);
    return (
      <RangeSlider
        value={value}
        onChange={(next) => {
          emitted.push(next);
          setValue(next);
        }}
        min={0}
        max={100}
        step={1}
        minLabel="Low"
        maxLabel="High"
      />
    );
  };
  render(<Spy />);
  const low = screen.getByRole('slider', { name: 'Low' });
  low.focus();
  // 30 presses would reach 50 unclamped; the low thumb must stop at the high value (40).
  await user.keyboard('{ArrowRight>30/}');
  expect(low).toHaveAttribute('aria-valuenow', '40');
  // Every emitted tuple is ordered low <= high — the slider never surfaces an inverted range.
  for (const [emittedLow, emittedHigh] of emitted) {
    expect(emittedLow).toBeLessThanOrEqual(emittedHigh);
  }
});

test('a disabled slider does not emit onChange on arrow keys', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <RangeSlider value={[20, 80]} onChange={onChange} disabled minLabel="Low" maxLabel="High" />,
  );
  const low = screen.getByRole('slider', { name: 'Low' });
  low.focus();
  await user.keyboard('{ArrowRight}');
  expect(onChange).not.toHaveBeenCalled();
});
