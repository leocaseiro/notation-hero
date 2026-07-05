import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { RangeSlider } from './RangeSlider';

// Radix Slider measures its track with ResizeObserver and uses pointer-capture on the thumb —
// neither exists in jsdom (the DOM lib types them as always-present, so these shims are assigned
// unconditionally). Stub them so the component mounts; the tests then drive it by keyboard.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
globalThis.ResizeObserver = ResizeObserverStub;
Element.prototype.hasPointerCapture = () => false;
Element.prototype.setPointerCapture = () => {};
Element.prototype.releasePointerCapture = () => {};

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

test('exposes aria-valuemin / max / now on each thumb', () => {
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

  // minStepsBetweenThumbs=0 lets the thumbs cross, so Radix reports the full track bounds on both;
  // only aria-valuenow differs per thumb.
  expect(low).toHaveAttribute('aria-valuemin', '0');
  expect(low).toHaveAttribute('aria-valuemax', '100');
  expect(low).toHaveAttribute('aria-valuenow', '20');

  expect(high).toHaveAttribute('aria-valuemin', '0');
  expect(high).toHaveAttribute('aria-valuemax', '100');
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
