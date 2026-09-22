import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { TempoControl } from './TempoControl';

// Base UI's NumberField uses ResizeObserver internally, which jsdom lacks; it is polyfilled
// globally in vitest.setup.ts. These tests drive the field by keyboard and clicks.

const Harness = ({
  scoreTempo = 120,
  initial = 1,
}: Readonly<{ scoreTempo?: number; initial?: number }>) => {
  const [speed, setSpeed] = useState(initial);
  return <TempoControl scoreTempo={scoreTempo} speed={speed} onSpeedChange={setSpeed} />;
};

test('shows the score tempo scaled by the speed', () => {
  render(<TempoControl scoreTempo={120} speed={1} onSpeedChange={() => {}} />);
  expect(screen.getByRole('textbox', { name: 'Tempo' })).toHaveValue('120');
});

test('a half speed reads as half the BPM', () => {
  render(<TempoControl scoreTempo={120} speed={0.5} onSpeedChange={() => {}} />);
  expect(screen.getByRole('textbox', { name: 'Tempo' })).toHaveValue('60');
});

test('the increment button moves one BPM and reports a speed', async () => {
  const user = userEvent.setup();
  const onSpeedChange = vi.fn();
  render(<TempoControl scoreTempo={120} speed={1} onSpeedChange={onSpeedChange} />);

  await user.click(screen.getByRole('button', { name: 'Increase tempo' }));
  // 121 / 120 — the component owns SPEED, never BPM.
  expect(onSpeedChange).toHaveBeenCalledWith(121 / 120);
});

test('the decrement button moves one BPM down', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole('button', { name: 'Decrease tempo' }));
  expect(screen.getByRole('textbox', { name: 'Tempo' })).toHaveValue('119');
});

test('typing a BPM directly sets the speed', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const input = screen.getByRole('textbox', { name: 'Tempo' });
  await user.clear(input);
  await user.type(input, '60');
  await user.tab();
  expect(input).toHaveValue('60');
});

test('clamps to the 12.5% floor', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const input = screen.getByRole('textbox', { name: 'Tempo' });
  await user.clear(input);
  await user.type(input, '1');
  await user.tab();
  // 12.5% of 120 BPM, rounded.
  expect(input).toHaveValue('15');
});

test('clamps to the 800% ceiling', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const input = screen.getByRole('textbox', { name: 'Tempo' });
  await user.clear(input);
  await user.type(input, '2000');
  await user.tab();
  // 800% of 120 BPM.
  expect(input).toHaveValue('960');
});

// A score whose parts are written at different tempos (a verse at 90, a chorus at 120) moves
// `scoreTempo` under the component as the playhead crosses into the next part. An edit that BEGAN
// in the verse keeps the verse's numbers until it ends.
test('an edit keeps the tempo it began at when the score tempo changes under it', async () => {
  const user = userEvent.setup();
  const onSpeedChange = vi.fn();
  const { rerender } = render(
    <TempoControl scoreTempo={90} speed={1} onSpeedChange={onSpeedChange} />,
  );
  const input = screen.getByRole('textbox', { name: 'Tempo' });
  await user.click(input);
  await user.clear(input);
  // The first digit is the first change: the edit begins here, in the 90 part.
  await user.type(input, '1');
  // The playhead crosses into the 120 part while the edit is still under way.
  rerender(<TempoControl scoreTempo={120} speed={1} onSpeedChange={onSpeedChange} />);
  await user.type(input, '00');
  await user.tab();
  // Converted against the 90 the edit began at, not the 120 that arrived mid-edit.
  expect(onSpeedChange).toHaveBeenLastCalledWith(100 / 90);
});

// A score with two parts. The button stands in for the playhead crossing into the faster one.
const TwoPartScore = () => {
  const [speed, setSpeed] = useState(1);
  const [scoreTempo, setScoreTempo] = useState(90);
  return (
    <>
      <TempoControl scoreTempo={scoreTempo} speed={speed} onSpeedChange={setSpeed} />
      <button type="button" onClick={() => setScoreTempo(120)}>
        Enter the chorus
      </button>
    </>
  );
};

// The held-button case is the one that compounds: Base UI steps from the DISPLAYED value every
// 60 ms, so a display that followed the new part over a divisor that stayed in the old one ran
// 101 -> 181 -> 240 in two ticks. Both must stay in the part the press began in.
describe('a held press across a change of score tempo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test('moves one BPM per tick, in the part the press began in', () => {
    render(<TwoPartScore />);
    const input = screen.getByRole('textbox', { name: 'Tempo' });
    const plus = screen.getByRole('button', { name: 'Increase tempo' });

    fireEvent.pointerDown(plus, { pointerType: 'mouse', button: 0 });
    // Base UI steps once at once, waits 400 ms, then ticks every 60 ms.
    act(() => vi.advanceTimersByTime(400 + 60 * 2));
    expect(input).toHaveValue('92');

    fireEvent.click(screen.getByRole('button', { name: 'Enter the chorus' }));
    // Still the 90 part's number: the playhead moved, the person did not.
    expect(input).toHaveValue('92');

    act(() => vi.advanceTimersByTime(60));
    expect(input).toHaveValue('93');
    act(() => vi.advanceTimersByTime(60));
    expect(input).toHaveValue('94');

    fireEvent.pointerUp(plus, { pointerType: 'mouse', button: 0 });
  });

  test('follows the playing part again once the changes stop', () => {
    render(<TwoPartScore />);
    const input = screen.getByRole('textbox', { name: 'Tempo' });
    const plus = screen.getByRole('button', { name: 'Increase tempo' });

    fireEvent.pointerDown(plus, { pointerType: 'mouse', button: 0 });
    fireEvent.pointerUp(plus, { pointerType: 'mouse', button: 0 });
    expect(input).toHaveValue('91');

    fireEvent.click(screen.getByRole('button', { name: 'Enter the chorus' }));
    expect(input).toHaveValue('91');

    // One second with no new value ends the edit. The speed is a percentage, so it carries into
    // the 120 part unchanged: 120 x (91 / 90) = 121.3.
    act(() => vi.advanceTimersByTime(1000));
    expect(input).toHaveValue('121');
  });
});

// F-22 rule 4: at written speed there is nothing to report, so the percentage is never rendered
// visible — not on hover, not on focus.
test('renders no percentage at exactly 100%', () => {
  render(<TempoControl scoreTempo={120} speed={1} onSpeedChange={() => {}} />);
  expect(screen.getByTestId('tempo-control')).toHaveAttribute('data-off-speed', 'false');
});

test('marks itself off-speed when the speed is not 1', () => {
  render(<TempoControl scoreTempo={120} speed={0.5} onSpeedChange={() => {}} />);
  expect(screen.getByTestId('tempo-control')).toHaveAttribute('data-off-speed', 'true');
  expect(screen.getByTestId('tempo-percent')).toHaveTextContent('50%');
});

// F-13: the value changes as a side effect of pressing a button, which a text input does not
// announce on its own.
test('announces the new tempo in a live region', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole('button', { name: 'Increase tempo' }));
  expect(screen.getByRole('status')).toHaveTextContent('121 BPM');
});

test('the live announcement carries the percentage when off written speed', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  await user.click(screen.getByRole('button', { name: 'Increase tempo' }));
  // 121/120 is off written speed, so the spoken line says so; the visible % is aria-hidden.
  expect(screen.getByRole('status')).toHaveTextContent('121 BPM, 101% of written speed');
});

// The field must behave like a native number input for the mouse: click to place the caret, drag
// or double-click to select. Base UI's ScrubArea (its drag-sideways-to-change gesture) once wrapped
// this input; it cancels pointerdown and sets `user-select: none` on everything inside it, so the
// number could not be selected with the mouse at all.
test('nothing around the input switches text selection off', () => {
  render(<TempoControl scoreTempo={120} speed={1} onSpeedChange={() => {}} />);
  const input = screen.getByRole('textbox', { name: 'Tempo' });
  for (let node = input.parentElement; node; node = node.parentElement) {
    expect(node.style.userSelect).not.toBe('none');
  }
});

test('disabled blocks both steppers and the input', () => {
  render(<TempoControl scoreTempo={120} speed={1} onSpeedChange={() => {}} disabled />);
  // Base UI keeps a disabled stepper in the tab order (useNumberFieldStepperButton passes
  // focusableWhenDisabled), so it renders aria-disabled, never the native attribute — the same
  // convention as the design system's Button. The input itself IS natively disabled.
  expect(screen.getByRole('button', { name: 'Increase tempo' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  expect(screen.getByRole('button', { name: 'Decrease tempo' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  expect(screen.getByRole('textbox', { name: 'Tempo' })).toBeDisabled();
});
