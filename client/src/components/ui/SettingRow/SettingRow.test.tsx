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

// The row grammar is two lines, not three: label and number input TOGETHER on the first line,
// the slider on the one beneath. A regression back to a vertical Field stacks the label alone,
// then the number input, then the slider — three lines instead of two.
test('a range row keeps its label and number input on one line, the slider on the next', () => {
  render(
    <SettingRow
      id="speed"
      label="Playback speed (%)"
      control={{ kind: 'range', min: 12.5, max: 800, step: 0.5 }}
      value={100}
      onChange={() => {}}
    />,
  );

  const line = screen
    .getByRole('spinbutton', { name: 'Playback speed (%)' })
    .closest('[data-slot="setting-row-line"]');
  expect(line).not.toBeNull();
  expect(line).toContainElement(screen.getByText('Playback speed (%)'));
  // The slider is a SEPARATE line, never inside the label-and-input container above.
  expect(line).not.toContainElement(screen.getByRole('slider', { name: 'Playback speed (%)' }));
});

// A description is prose ABOUT the row — its own full-width line beneath the label-and-control
// pair, never a third flex item competing with the control for horizontal space. The fourteen
// MIDI rows carry the full sentence that makes this fatal if it ever regresses: label crushed
// into a narrow column, the control squeezed, the description running off the popover edge.
test('the description renders outside the label-and-control line, not beside it', () => {
  render(
    <SettingRow
      id="vibrato-length"
      label="Wide note vibrato: length"
      control={{ kind: 'number', min: 0 }}
      value={240}
      onChange={() => {}}
      description="Rebuilds the MIDI to take effect — this stops playback and rewinds to the start."
    />,
  );

  const line = screen
    .getByRole('spinbutton', { name: 'Wide note vibrato: length' })
    .closest('[data-slot="setting-row-line"]');
  const description = screen.getByText(/Rebuilds the MIDI/);
  expect(line).not.toBeNull();
  expect(line).not.toContainElement(description);
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

// The `validate` gate, which every one of the thirteen validated rows depends on — the twelve font
// rows and the secondary-voice colour. Both of its branches are covered here, because a row that
// silently accepted a rejected draft would put the value straight into the engine and into storage:
// the font validator is what refuses an apostrophe or an angle bracket, and AlphaTab builds its
// `<text style='font:…'>` as a SINGLE-quoted attribute assigned as markup.
test('a text row REFUSES a draft its validator rejects, and visibly reverts', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  const validate = vi.fn(() => false);
  render(
    <SettingRow
      id="title-font"
      label="Title font"
      control={{ kind: 'text', validate }}
      value='12px "Times New Roman"'
      onChange={onChange}
    />,
  );

  const input = screen.getByRole('textbox', { name: 'Title font' });
  await user.clear(input);
  await user.type(input, '12px <image onerror=x>');
  await user.tab(); // blur commits

  expect(validate).toHaveBeenCalledWith('12px <image onerror=x>');
  // Never reported, so it reaches neither the engine nor storage.
  expect(onChange).not.toHaveBeenCalled();
  // And the row shows the old value again, so a rejected draft cannot look applied.
  expect(input).toHaveValue('12px "Times New Roman"');
});

test('a text row ACCEPTS a draft its validator allows, and reports the typed string', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <SettingRow
      id="title-font"
      label="Title font"
      control={{ kind: 'text', validate: () => true }}
      value="12px serif"
      onChange={onChange}
    />,
  );

  const input = screen.getByRole('textbox', { name: 'Title font' });
  await user.clear(input);
  await user.type(input, '14px monospace');
  await user.tab();

  expect(onChange).toHaveBeenCalledWith('14px monospace');
});

// Pasting a colour from somewhere else almost always brings a space with it, and the validator
// judges the TRIMMED draft — so an untrimmed commit is approved by the field and then returns null
// from Color.fromJson without throwing, which nothing downstream can catch.
test('a text row commits the trimmed value it validated, not the raw draft', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  const validate = vi.fn((draft: string) => draft.trim().startsWith('#'));
  render(
    <SettingRow
      id="secondary"
      label="Secondary voices"
      control={{ kind: 'text', validate }}
      value="#000000"
      onChange={onChange}
    />,
  );

  const input = screen.getByRole('textbox', { name: 'Secondary voices' });
  await user.clear(input);
  await user.type(input, ' #2DD4BF ');
  await user.tab();

  expect(onChange).toHaveBeenCalledWith('#2DD4BF');
  expect(onChange).not.toHaveBeenCalledWith(' #2DD4BF ');
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
