'use client';

import { useState } from 'react';

import { Button } from '../Button/Button';
import { Checkbox } from '../Checkbox/Checkbox';
import { Field, FieldDescription, FieldLabel } from '../Field/Field';
import { Input } from '../Input/Input';
import { NativeSelect } from '../NativeSelect/NativeSelect';
import { Slider } from '../Slider/Slider';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export type SettingControl =
  | { kind: 'toggle' }
  | { kind: 'number'; min?: number; max?: number; step?: number }
  | { kind: 'range'; min: number; max: number; step?: number }
  | { kind: 'text'; validate?: (draft: string) => boolean }
  | { kind: 'color' }
  | { kind: 'select'; options: readonly { value: string; label: string }[] }
  | { kind: 'action'; actionLabel: string };

export type SettingValue = string | number | boolean;

interface SettingRowProps extends Omit<ComponentProps<'div'>, 'onChange' | 'children' | 'id'> {
  /** Unique within the popover; ties the label to its control. */
  id: string;
  label: string;
  control: SettingControl;
  /** Ignored by an `action` row, which has no value. */
  value: SettingValue;
  onChange: (next: SettingValue) => void;
  /** Called by an `action` row's button. Every other kind ignores it. */
  onAction?: () => void;
  description?: string;
  disabled?: boolean;
}

// One row of a settings group: label left, control right. It takes a PLAIN descriptor and plain
// option arrays — never an AlphaTab enum object — which is what lets a Storybook story render
// every control kind with honest data and keeps the VR and axe baselines meaningful. The caller
// (in web/) turns an enum into { value, label } pairs before it gets here.
//
// Colours use the `color` kind, NOT `text`. This supersedes the spec's "Colors are plain text
// inputs for now": AlphaTab's Color.fromJson returns null for a half-typed hex and the canvas
// then throws on `.rgba`, so a text field breaks the score while someone types into it. The
// reference panel uses a swatch picker for the same reason. Text rows (the fonts) commit on blur
// or Enter and validate before reporting.
const SettingRow = ({
  id,
  label,
  control,
  value,
  onChange,
  onAction,
  description,
  disabled = false,
  className,
  ...rest
}: Readonly<SettingRowProps>) => {
  const labelId = `${id}-label`;

  // While a slider is being dragged, the row shows the value under the pointer and reports
  // nothing. A settings change re-lays-out the whole score, and Base UI reports every pointer
  // move — so the report waits for the gesture to end. null = not dragging.
  const [draft, setDraft] = useState<number | null>(null);

  // A half-typed or cleared number field yields NaN; pushing that into the settings tree breaks
  // rendering WITHOUT throwing, so drop it and keep the last good value.
  //
  // The declared min/max are NOT enforced per keystroke. They reach the DOM as native attributes,
  // which constrain the stepper and nothing else, so a typed 0 in a row declared min 0.25 is
  // reported, pushed to the engine and persisted — and the next visit restores it before the
  // clamp runs again. But clamping on every keystroke is worse: the field is controlled, so
  // typing "0.5" into that row would rewrite itself to "0.25" at the first character, and "100"
  // into the speed row (min 12.5) would rewrite to "12.5". So the clamp waits for the commit —
  // blur or Enter — the same boundary the text rows already use, and only for rows that declare a
  // bound.
  const clampToControl = (n: number) => {
    const { min, max } = control as { min?: number; max?: number };
    return Math.min(max ?? n, Math.max(min ?? n, n));
  };
  const reportNumber = (raw: string, commit = false) => {
    const parsed = Number(raw);
    if (raw.trim() === '' || Number.isNaN(parsed)) return;
    onChange(commit ? clampToControl(parsed) : parsed);
  };

  // A text row's in-progress string. null = not being edited, so the row shows `value`. Nothing
  // reaches the caller until blur or Enter, and then only if the caller's `validate` accepts it —
  // the engine's parsers throw or return null on almost every partial string, and the settings
  // funnel has no try/catch on the edit path.
  const [textDraft, setTextDraft] = useState<string | null>(null);

  const commitText = () => {
    if (textDraft === null) return;
    const accepted =
      control.kind === 'text' && control.validate ? control.validate(textDraft) : true;
    if (accepted) onChange(textDraft);
    // Rejected or accepted, stop editing: the row falls back to showing `value`, so a bad draft
    // visibly reverts instead of sitting there looking applied.
    setTextDraft(null);
  };

  return (
    <Field
      data-slot="setting-row"
      orientation={control.kind === 'range' ? 'vertical' : 'horizontal'}
      // min-h-11 = the 44px minimum. The row is the floor; each control below reaches it too.
      // A range row is a column (number input, then the slider beneath), so it must not centre.
      className={cn(
        'min-h-11',
        control.kind !== 'range' && 'items-center justify-between',
        className,
      )}
      {...rest}
    >
      {/* min-h-11/min-w-11 because a <label for> IS a hit target: pressing it focuses or toggles
          its control, and the lane's hit-area gate measures it. On a toggle row the checkbox sits
          INSIDE the label, so the whole 44px row toggles it — the box itself is 16px and could
          never pass alone. An action row gets NO `for`: a <label for> pointing at a <button>
          replaces the button's accessible name with the label's text, and the button must keep
          saying what it does ("Export MIDI"), not what the row is about. */}
      <FieldLabel
        htmlFor={control.kind === 'action' ? undefined : id}
        id={labelId}
        className="flex min-h-11 min-w-11 flex-1 items-center justify-between gap-3"
      >
        {label}
        {control.kind === 'toggle' ? (
          <Checkbox
            id={id}
            checked={Boolean(value)}
            onCheckedChange={(next) => onChange(Boolean(next))}
            disabled={disabled}
          />
        ) : null}
      </FieldLabel>

      {control.kind === 'number' ? (
        <Input
          id={id}
          type="number"
          min={control.min}
          max={control.max}
          step={control.step}
          value={String(value)}
          onChange={(event) => reportNumber(event.target.value)}
          onBlur={(event) => reportNumber(event.target.value, true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') reportNumber(event.currentTarget.value, true);
          }}
          disabled={disabled}
          // h-11, not Input's own h-9: 36px is under the 44px minimum.
          className="h-11 w-28"
        />
      ) : null}

      {/* A text row NEVER reports per keystroke. AlphaTab's parsers are hostile to a partial
          value: a half-typed hex gives a null Color and the canvas then throws on `.rgba`, an
          `rgb` prefix throws out of the parser itself, and EVERY partial font string throws — ten
          of the seventeen keystrokes in "bold 12px Georgia". Each of those is also written to
          storage on the same keystroke, so the broken value survives a reload. The draft is held
          locally and reported only on blur or Enter, and only if `validate` accepts it. A
          validator alone is not enough: "#2DD" is legitimate CSS shorthand, so nothing can tell a
          half-typed "#2DD4BF" from a deliberate "#2DD" — deferring the commit is what removes the
          intermediate states. */}
      {control.kind === 'text' ? (
        <Input
          id={id}
          type="text"
          value={textDraft ?? String(value)}
          onChange={(event) => setTextDraft(event.target.value)}
          onBlur={commitText}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commitText();
          }}
          disabled={disabled}
          className="h-11 w-40"
        />
      ) : null}

      {/* The colour rows. A native colour control cannot produce a value the engine rejects, which
          is how the reference panel avoids this entirely — it uses a swatch picker and never a
          text field. */}
      {control.kind === 'color' ? (
        <Input
          id={id}
          type="color"
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-11 w-40 p-1"
        />
      ) : null}

      {control.kind === 'action' ? (
        <Button
          id={id}
          variant="outline"
          onClick={() => onAction?.()}
          disabled={disabled}
          className="h-11"
        >
          {control.actionLabel}
        </Button>
      ) : null}

      {control.kind === 'select' ? (
        <NativeSelect
          id={id}
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="h-11 w-44"
        >
          {control.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      ) : null}

      {/* A numeric value pairs a number input in the row with a slider on the line beneath — the
          row grammar both design sources describe. Both carry the SAME accessible name, so a
          screen reader hears one setting with two ways to set it. The number input gets the same
          on-commit clamp the plain `number` kind has: a half-typed value out of range must not
          sit there unclamped until the next edit. */}
      {control.kind === 'range' ? (
        <div className="flex w-full flex-col gap-2">
          <Input
            id={id}
            type="number"
            min={control.min}
            max={control.max}
            step={control.step}
            value={String(draft ?? value)}
            onChange={(event) => reportNumber(event.target.value)}
            onBlur={(event) => reportNumber(event.target.value, true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') reportNumber(event.currentTarget.value, true);
            }}
            disabled={disabled}
            className="h-11 w-28 self-end"
          />
          <Slider
            value={draft ?? Number(value)}
            onChange={setDraft}
            onCommit={(next) => {
              setDraft(null);
              onChange(next);
            }}
            min={control.min}
            max={control.max}
            step={control.step ?? 1}
            label={label}
            disabled={disabled}
          />
        </div>
      ) : null}

      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
};

export { SettingRow };
