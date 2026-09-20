import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Slider } from './Slider';

// Base UI Slider measures its track with ResizeObserver and uses pointer-capture on the thumb —
// neither exists in jsdom. Both are polyfilled globally in vitest.setup.ts; these tests drive the
// slider by keyboard.

const Harness = ({
  initial = 50,
  ...props
}: Readonly<{ initial?: number } & Partial<Parameters<typeof Slider>[0]>>) => {
  const [value, setValue] = useState(initial);
  return <Slider {...props} value={value} onChange={setValue} />;
};

test('renders one named slider', () => {
  render(<Slider value={50} onChange={() => {}} label="Volume" />);
  expect(screen.getByRole('slider', { name: 'Volume' })).toBeInTheDocument();
});

test('exposes min / max / aria-valuenow', () => {
  render(<Slider value={30} onChange={() => {}} min={0} max={60} label="Volume" />);
  const thumb = screen.getByRole('slider', { name: 'Volume' });
  // Base UI renders the thumb as a real (visually-hidden) <input type="range"> and sets ONLY
  // aria-valuenow on it — the bounds live on the native min/max attributes. RangeSlider.test.tsx
  // already asserts them this way; do not add redundant aria-* to the thumb to satisfy a test.
  expect(thumb).toHaveAttribute('min', '0');
  expect(thumb).toHaveAttribute('max', '60');
  expect(thumb).toHaveAttribute('aria-valuenow', '30');
});

test('arrow keys step the value through the controlled parent', async () => {
  const user = userEvent.setup();
  render(<Harness initial={50} label="Volume" step={5} />);
  const thumb = screen.getByRole('slider', { name: 'Volume' });

  await user.click(thumb);
  await user.keyboard('{ArrowRight}');
  expect(thumb).toHaveAttribute('aria-valuenow', '55');

  await user.keyboard('{ArrowLeft}{ArrowLeft}');
  expect(thumb).toHaveAttribute('aria-valuenow', '45');
});

test('formats the visible readout without touching the thumb semantics', () => {
  render(
    <Slider
      value={90}
      onChange={() => {}}
      label="Tempo"
      formatValue={(v) => `${v}`}
      unit="BPM"
      showReadout
    />,
  );
  // The readout is aria-hidden so a screen reader hears the thumb, not a duplicated line.
  expect(screen.getByText('90 BPM')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getByRole('slider', { name: 'Tempo' })).toHaveAttribute('aria-valuenow', '90');
});

test('disabled marks the thumb disabled', () => {
  render(<Slider value={50} onChange={() => {}} label="Volume" disabled />);
  expect(screen.getByRole('slider', { name: 'Volume' })).toBeDisabled();
});
