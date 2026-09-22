'use client';

import { useId, useState } from 'react';

import { Checkbox } from '../Checkbox/Checkbox';
import { Field, FieldLabel } from '../Field/Field';
import { Slider } from '../Slider/Slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '../Tooltip/Tooltip';
import type { ComponentProps } from 'react';

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
   * Solo-all and mute-all are "select all" CHECKBOXES over the rows, not one-way commands: ticked
   * when every track is, `indeterminate` when only some are — Base UI renders that as
   * `aria-checked="mixed"`. A click on a mixed or unticked box reports `true` and on a ticked box
   * `false`, the browser's own select-all behaviour; this row adds no rule of its own. The caller
   * writes the reported value onto every track through the same per-row handler a row click uses,
   * so each value keeps exactly one writer.
   */
  soloAll: boolean;
  soloAllIndeterminate: boolean;
  onSoloAllChange: (next: boolean) => void;
  muteAll: boolean;
  muteAllIndeterminate: boolean;
  onMuteAllChange: (next: boolean) => void;
  /**
   * Set while the file plays its own recording: the reason, as tooltip text. Both master
   * checkboxes then render unavailable — the engine ignores per-track solo and mute in that mode.
   * Master volume stays LIVE, which is why this flag is not called `mixUnavailable`.
   */
  soloMuteUnavailable?: string;
}

// The mixer's foot row: master volume, plus solo-all and mute-all as select-all checkboxes over
// the rows. It composes the same primitives TrackRow does and owns no state of its own — the
// caller supplies every value and writes each reported change onto the individual rows.
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
  className,
  ...rest
}: Readonly<MasterRowProps>) => {
  const soloId = useId();
  const muteId = useId();

  // Pointer-tracking draft, the same shape TrackRow's volume slider uses. null = not dragging.
  const [draft, setDraft] = useState<number | null>(null);

  const disabled = Boolean(soloMuteUnavailable);

  // The tooltip names the NEXT PRESS, not the current state — `aria-checked` already announces
  // the state to a screen reader, so this is the one place in the row set where the tooltip may
  // carry the action instead. The mixed state reuses the "all" wording on purpose: the dash
  // already says some are set, and the press takes everything to on either way.
  const soloTooltip =
    soloMuteUnavailable ?? (soloAll && !soloAllIndeterminate ? 'Clear solos' : 'Solo all');
  const muteTooltip =
    soloMuteUnavailable ?? (muteAll && !muteAllIndeterminate ? 'Unmute all' : 'Mute all');

  return (
    <Field
      data-slot="master-row"
      orientation="horizontal"
      className={cn('flex-wrap gap-3', className)}
      {...rest}
    >
      <span className="text-sm font-medium">Master</span>

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
        className="w-32"
      />

      <Tooltip>
        <TooltipTrigger
          closeOnClick={false}
          render={
            <FieldLabel
              htmlFor={soloId}
              className={cn(
                'flex min-h-11 min-w-11 items-center justify-center gap-2',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              Solo all
              <Checkbox
                id={soloId}
                checked={soloAll}
                indeterminate={soloAllIndeterminate}
                aria-disabled={disabled}
                // Base UI's Checkbox.Root has no `focusableWhenDisabled` escape hatch, so its own
                // `disabled` prop would drop the control out of the tab order and the
                // why-tooltip could never open on keyboard focus. `aria-disabled` plus this guard
                // is the Button / TransportToggle precedent, kept in the tab order on purpose —
                // the dimming above rides on the same flag so a mouse user sees it too, since
                // Checkbox's own styling keys off `data-disabled`, which this never sets.
                onCheckedChange={(next) => {
                  if (disabled) return;
                  onSoloAllChange(next);
                }}
              />
            </FieldLabel>
          }
        />
        <TooltipContent sideOffset={8}>{soloTooltip}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger
          closeOnClick={false}
          render={
            <FieldLabel
              htmlFor={muteId}
              className={cn(
                'flex min-h-11 min-w-11 items-center justify-center gap-2',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              Mute all
              <Checkbox
                id={muteId}
                checked={muteAll}
                indeterminate={muteAllIndeterminate}
                aria-disabled={disabled}
                onCheckedChange={(next) => {
                  if (disabled) return;
                  onMuteAllChange(next);
                }}
              />
            </FieldLabel>
          }
        />
        <TooltipContent sideOffset={8}>{muteTooltip}</TooltipContent>
      </Tooltip>
    </Field>
  );
};

export { MasterRow };
