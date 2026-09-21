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

// Base UI has ONE `step` for the pointer and the keyboard. A fine pointer step (1 ms on a seek bar)
// would make an arrow key useless, so `keyStep` gives the arrow keys their own amount.
test('keyStep moves an arrow key by its own amount and commits it', async () => {
  const user = userEvent.setup();
  const onCommit = vi.fn();
  render(
    <Harness initial={1500} min={0} max={10_000} step={1} keyStep={1000} onCommit={onCommit} />,
  );
  const thumb = screen.getByRole('slider', { name: 'Value' });

  await user.click(thumb);
  await user.keyboard('{ArrowRight}');
  expect(thumb).toHaveAttribute('aria-valuenow', '2500');
  expect(onCommit).toHaveBeenLastCalledWith(2500);

  await user.keyboard('{ArrowLeft}{ArrowLeft}');
  expect(thumb).toHaveAttribute('aria-valuenow', '500');
  expect(onCommit).toHaveBeenLastCalledWith(500);
});

test('keyStep stops at the ends instead of overshooting', async () => {
  const user = userEvent.setup();
  render(<Harness initial={9600} min={0} max={10_000} step={1} keyStep={1000} />);
  const thumb = screen.getByRole('slider', { name: 'Value' });

  await user.click(thumb);
  await user.keyboard('{ArrowRight}');
  expect(thumb).toHaveAttribute('aria-valuenow', '10000');
});

test('largeStep is what Shift+Arrow and PageUp move by', async () => {
  const user = userEvent.setup();
  render(<Harness initial={0} min={0} max={60_000} step={1} keyStep={1000} largeStep={10_000} />);
  const thumb = screen.getByRole('slider', { name: 'Value' });

  await user.click(thumb);
  await user.keyboard('{PageUp}');
  expect(thumb).toHaveAttribute('aria-valuenow', '10000');
  await user.keyboard('{Shift>}{ArrowRight}{/Shift}');
  expect(thumb).toHaveAttribute('aria-valuenow', '20000');
});

test('valueText is what a screen reader hears instead of the raw number', () => {
  render(<Slider value={102_000} onChange={() => {}} max={260_000} valueText="01:42 of 04:20" />);
  expect(screen.getByRole('slider', { name: 'Value' })).toHaveAttribute(
    'aria-valuetext',
    '01:42 of 04:20',
  );
});

// web/e2e/a11y.e2e.ts finds the 44 px pointer target by this data-slot — the Control, not the
// Root, because Base UI puts the click handling there. That gate used to select the Tailwind
// class it was measuring, so renaming the class emptied the match and a merge-blocking assertion
// passed on nothing. Assert the hook in the package that owns it: removing it now fails here,
// rather than silently over in web/.
test('the Control carries the data-slot the hit-area gate selects', () => {
  render(<Slider value={0} onChange={() => {}} min={0} max={100} label="Seek" />);
  expect(document.querySelector('[data-slot="slider-control"]')).toBeInTheDocument();
});
