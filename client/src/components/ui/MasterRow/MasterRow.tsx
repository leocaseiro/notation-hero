'use client';

import { useState } from 'react';

import { Button } from '../Button/Button';
import { Field } from '../Field/Field';
import { Slider } from '../Slider/Slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '../Tooltip/Tooltip';
import {
  MIXER_BUTTON_CLASS,
  MIXER_MUTE_PRESSED_CLASS,
  MIXER_ROW_CLASS,
  MIXER_SOLO_PRESSED_CLASS,
} from '../TrackRow/TrackRow';
import type { ComponentProps, ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface MasterRowProps extends Omit<ComponentProps<'div'>, 'children' | 'onVolumeChange'> {
  /**
   * AlphaTab's own 0-1 master gain, the same value the Settings ▸ Player row edits. The row
   * SHOWS it as a percentage — `Math.round(volume * 100)` — the same display unit TrackRow's
   * volume uses, just against this control's 0-1 scale instead of a track's 0-16.
   */
  volume: number;
  onVolumeChange: (next: number) => void;
  /**
   * Solo-all and mute-all are "select all" toggles over the rows, not one-way commands: pressed
   * when every track is, `aria-pressed="mixed"` when only some are. A click on a mixed or
   * released button reports `true` and on a pressed button `false`, the browser's own select-all
   * behaviour; this row adds no rule of its own. The caller writes the reported value onto every
   * track through the same per-row handler a row click uses, so each value keeps exactly one
   * writer.
   */
  soloAll: boolean;
  soloAllIndeterminate: boolean;
  onSoloAllChange: (next: boolean) => void;
  muteAll: boolean;
  muteAllIndeterminate: boolean;
  onMuteAllChange: (next: boolean) => void;
  /**
   * Set while the file plays its own recording: the reason, as tooltip text. Both master
   * toggles then render unavailable — the engine ignores per-track solo and mute in that mode.
   * Master volume stays LIVE, which is why this flag is not called `mixUnavailable`.
   */
  soloMuteUnavailable?: string;
  /**
   * The mixer's layout switch, rendered in the eye column so it lines up with each track's
   * show/hide button. The row does not know what the button does.
   */
  leading?: ReactNode;
}

// The mixer's foot row: master volume, plus solo-all and mute-all as select-all icon buttons in
// the same columns as a track's solo and mute. It composes the same primitives TrackRow does and
// owns no state of its own — the caller supplies every value and writes each reported change onto
// the individual rows.
const MasterRow = ({
  volume,
  onVolumeChange,
  soloAll,
  soloAllIndeterminate,
  onSoloAllChange,
  muteAll,
  muteAllIndeterminate,
  onMuteAllChange,
  soloMuteUnavailable,
  leading,
  className,
  ...rest
}: Readonly<MasterRowProps>) => {
  // Pointer-tracking draft, the same shape TrackRow's volume slider uses. null = not dragging.
  const [draft, setDraft] = useState<number | null>(null);

  const disabled = Boolean(soloMuteUnavailable);

  // The tooltip names the NEXT PRESS, not the current state — `aria-pressed` already announces
  // the state to a screen reader, so this is the one place in the row set where the tooltip may
  // carry the action instead. The mixed state reuses the "all" wording on purpose: the mixed
  // fill already says some are set, and the press takes everything to on either way.
  const soloTooltip =
    soloMuteUnavailable ?? (soloAll && !soloAllIndeterminate ? 'Clear solos' : 'Solo all');
  const muteTooltip =
    soloMuteUnavailable ?? (muteAll && !muteAllIndeterminate ? 'Unmute all' : 'Mute all');

  return (
    <Field
      data-slot="master-row"
      orientation="horizontal"
      className={cn(MIXER_ROW_CLASS, 'px-2 py-1.5', className)}
      {...rest}
    >
      <span className="flex size-[2.125rem] items-center justify-center">{leading}</span>

      <span className="min-w-0 truncate text-sm font-semibold">Master</span>

      <MixAllToggle
        pressed={soloAll}
        indeterminate={soloAllIndeterminate}
        label="Solo all"
        tooltip={soloTooltip}
        disabled={disabled}
        icon="headphones"
        onChange={onSoloAllChange}
      />

      <MixAllToggle
        pressed={muteAll}
        indeterminate={muteAllIndeterminate}
        label="Mute all"
        tooltip={muteTooltip}
        disabled={disabled}
        icon="volume_off"
        mute
        onChange={onMuteAllChange}
      />

      <Slider
        value={draft ?? volume}
        onChange={setDraft}
        onCommit={(next) => {
          setDraft(null);
          onVolumeChange(next);
        }}
        min={0}
        max={1}
        step={0.05}
        label="Master volume"
        // The same percentage readout TrackRow's volume slider uses, against this control's 0-1
        // scale rather than a track's 0-16.
        showReadout
        formatValue={(v) => `${Math.round(v * 100)}%`}
        className="w-full min-w-0 px-4"
      />
    </Field>
  );
};

// Select-all over the rows, drawn as the same 34px icon button a track uses so the two rows
// share a column. `aria-pressed="mixed"` is the checkbox dash: some tracks are on, not all.
const MixAllToggle = ({
  pressed,
  indeterminate,
  label,
  tooltip,
  disabled,
  icon,
  mute = false,
  onChange,
}: Readonly<{
  pressed: boolean;
  indeterminate: boolean;
  label: string;
  tooltip: string;
  disabled: boolean;
  icon: string;
  mute?: boolean;
  onChange: (next: boolean) => void;
}>) => (
  <Tooltip>
    <TooltipTrigger closeOnClick={false} render={<span className="inline-flex" />}>
      <Button
        variant="ghost"
        size="icon"
        aria-pressed={indeterminate ? 'mixed' : pressed}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!(pressed && !indeterminate))}
        className={cn(
          MIXER_BUTTON_CLASS,
          'border border-border',
          // Keyed off aria-pressed, not data-pressed: this is a plain Button, not a Base UI
          // Toggle, so data-pressed is never set on it — the mechanism TrackRow's own Mute
          // button uses does not apply here. aria-pressed="mixed" does not match the
          // aria-pressed="true" selector, so the indeterminate branch below still wins the mixed
          // look; order it after for that reason.
          mute ? MIXER_MUTE_PRESSED_CLASS : MIXER_SOLO_PRESSED_CLASS,
          indeterminate &&
            (mute
              ? 'border-warning bg-warning/25 text-warning'
              : 'border-primary bg-primary/20 text-primary'),
        )}
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          {icon}
        </span>
      </Button>
    </TooltipTrigger>
    {/* Hoverable (no disableHoverablePopup — WCAG 2.1 AA 1.4.13); max-w-40 bounds its reach on
        this packed footer row. */}
    <TooltipContent sideOffset={8} className="max-w-40">
      {tooltip}
    </TooltipContent>
  </Tooltip>
);

export { MasterRow };
