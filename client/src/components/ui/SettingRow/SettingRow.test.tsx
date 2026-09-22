import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { SettingRow } from './SettingRow';
import type { SettingValue } from './SettingRow';

test('a toggle row exposes a named checkbox and reports a boolean', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <SettingRow
      id="cursor"
      label="Show cursors"
      control={{ kind: 'toggle' }}
      value={false}
      onChange={onChange}
    />,
  );

  const box = screen.getByRole('checkbox', { name: 'Show cursors' });
  await user.click(box);
  expect(onChange).toHaveBeenCalledWith(true);
});

test('a select row exposes a named combobox listing every option', () => {
  render(
    <SettingRow
      id="layout"
      label="Layout mode"
      control={{
        kind: 'select',
        options: [
          { value: 'page', label: 'Page' },
          { value: 'horizontal', label: 'Horizontal' },
        ],
      }}
      value="page"
      onChange={() => {}}
    />,
  );

  const select = screen.getByRole('combobox', { name: 'Layout mode' });
  expect(select).toHaveValue('page');
  expect(screen.getAllByRole('option')).toHaveLength(2);
});

// The number input is a controlled field, so a bare spy never changes `value` and a keystroke
// gets undone by React on every render — typing '2' would append to '1' instead of replacing it.
// A stateful harness (the TempoControl.test.tsx precedent) makes the field genuinely editable,
// the way a real caller does.
const NumberHarness = ({ onChange }: Readonly<{ onChange: (next: SettingValue) => void }>) => {
  const [value, setValue] = useState<SettingValue>(1);
  return (
    <SettingRow
      id="scale"
      label="Scale"
      control={{ kind: 'number', step: 0.1 }}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
};

test('a number row reports a NUMBER, not the input string', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<NumberHarness onChange={onChange} />);

  const input = screen.getByRole('spinbutton', { name: 'Scale' });
  // A native number input rejects setSelectionRange (the API user.clear() needs), so select the
  // text with a triple-click instead — HTMLInputElement.select() works on every input type.
  await user.tripleClick(input);
  await user.keyboard('2');
  expect(onChange).toHaveBeenLastCalledWith(2);
});

// A blank field must not push anything into the settings tree — neither NaN nor a silent 0 —
// where it would break rendering.
test('a number row reports nothing while the field is blank', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <SettingRow
      id="scale"
      label="Scale"
      control={{ kind: 'number' }}
      value={1}
      onChange={onChange}
    />,
  );

  await user.clear(screen.getByRole('spinbutton', { name: 'Scale' }));
  expect(onChange).not.toHaveBeenCalled();
});

// "Numeric values pair a number input in the row with a slider on the line beneath."
test('a range row renders both a number input and a named slider', () => {
  render(
    <SettingRow
      id="speed"
      label="Playback speed (%)"
      control={{ kind: 'range', min: 12.5, max: 800, step: 0.5 }}
      value={100}
      onChange={() => {}}
    />,
  );

  expect(screen.getByRole('spinbutton', { name: 'Playback speed (%)' })).toBeInTheDocument();
  expect(screen.getByRole('slider', { name: 'Playback speed (%)' })).toBeInTheDocument();
});

// The text row commits on blur or Enter, never per keystroke — so the assertion that nothing has
// reported yet has to land BEFORE the Enter, not only after it.
test('reports the raw string on Enter, never per keystroke', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <SettingRow
      id="staff-color"
      label="Staff line colour"
      control={{ kind: 'text' }}
      value="#2DD4BF"
      onChange={onChange}
    />,
  );

  const input = screen.getByRole('textbox', { name: 'Staff line colour' });
  await user.type(input, '!');
  expect(onChange).not.toHaveBeenCalled();
  await user.type(input, '{Enter}');
  expect(onChange).toHaveBeenLastCalledWith('#2DD4BF!');
});

// The Export group: a row whose control is a command, not a value.
test('an action row renders a named button and reports the press, never a value', async () => {
  const user = userEvent.setup();
  const onAction = vi.fn();
  const onChange = vi.fn();
  render(
    <SettingRow
      id="export-midi"
      label="MIDI file"
      control={{ kind: 'action', actionLabel: 'Export MIDI' }}
      value=""
      onChange={onChange}
      onAction={onAction}
    />,
  );

  await user.click(screen.getByRole('button', { name: 'Export MIDI' }));
  expect(onAction).toHaveBeenCalledTimes(1);
  expect(onChange).not.toHaveBeenCalled();
});

// A settings change re-lays-out the whole score. Base UI reports every pointer move, so a range
// row holds the value it is being dragged through and reports ONCE, when the gesture ends. A
// keystroke is a whole gesture, so each one reports.
test('a range row reports a keyboard step once, as a committed value', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <SettingRow
      id="zoom"
      label="Zoom"
      control={{ kind: 'range', min: 0.25, max: 3, step: 0.05 }}
      value={1}
      onChange={onChange}
    />,
  );

  // Click the thumb (rather than an imperative .focus()) so the focus lands inside act().
  await user.click(screen.getByRole('slider', { name: 'Zoom' }));
  await user.keyboard('{ArrowRight}');
  expect(onChange).toHaveBeenCalledTimes(1);
  // closeTo, not an exact 1.05: the step arithmetic is floating point.
  expect(onChange).toHaveBeenLastCalledWith(expect.closeTo(1.05, 5));
});

// Same controlled-input problem as the plain `number` kind's harness above: a bare spy never
// changes `value`, so the field would revert before the Enter keystroke ever saw the typed digit.
const RangeHarness = ({ onChange }: Readonly<{ onChange: (next: SettingValue) => void }>) => {
  const [value, setValue] = useState<SettingValue>(1);
  return (
    <SettingRow
      id="zoom"
      label="Zoom"
      control={{ kind: 'range', min: 0.25, max: 3, step: 1 }}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
};

// A half-typed or overshot value in the range row's number input must not sit there unclamped
// until the next edit — it clamps to the control's own bounds the moment the edit commits.
test('a range row clamps an out-of-range value on commit', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<RangeHarness onChange={onChange} />);

  const input = screen.getByRole('spinbutton', { name: 'Zoom' });
  await user.tripleClick(input);
  await user.type(input, '9');
  await user.keyboard('{Enter}');
  expect(onChange).toHaveBeenLastCalledWith(3);
});
