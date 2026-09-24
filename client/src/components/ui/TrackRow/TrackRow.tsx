'use client';

import { useId, useState } from 'react';

import { Button } from '../Button/Button';
import { Field } from '../Field/Field';
import { Slider } from '../Slider/Slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '../Tooltip/Tooltip';
import { TransportToggle } from '../TransportToggle/TransportToggle';
import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/** Shown as the reason a mix control is unavailable while the open file plays its own recording. */
export const RECORDING = 'Unavailable while the file plays its own recording';

export interface TrackStaffState {
  /** Stable key for React and for the toggle ids — never shown; see `label` for the display name. */
  id: string;
  /** Display name for the staff, e.g. `Treble` / `Bass` for a grand staff, or `Staff 1` otherwise. */
  label: string;
  showStandardNotation: boolean;
  showSlash: boolean;
  showNumbered: boolean;
  showTablature: boolean;
  /** False for a percussion, piano or vocal staff — 1.8.4 cannot render tablature on those. */
  tablatureAvailable: boolean;
}

interface TrackRowProps extends Omit<ComponentProps<'div'>, 'children' | 'onVolumeChange'> {
  name: string;
  /**
   * Whether the track is DRAWN. Rendered as an eye / eye-with-slash icon toggle, not a checkbox —
   * the same `TransportToggle` shape solo and mute already use. `aria-pressed` carries the state
   * and the always-present tooltip reads `Shown in the score` / `Hidden from the score`.
   */
  rendered: boolean;
  onRenderedChange: (next: boolean) => void;
  /**
   * Set on the LAST drawn track: the reason, as tooltip text, replacing the row's normal state
   * text. Its render-select then renders disabled. A separate prop from `mixUnavailable` on
   * purpose — render-select stays live while the file plays its own recording, and
   * `mixUnavailable` does not, so the two never coincide.
   */
  renderLockReason?: string;
  solo: boolean;
  onSoloChange: (next: boolean) => void;
  mute: boolean;
  onMuteChange: (next: boolean) => void;
  /**
   * 0-16, AlphaTab's own `playbackInfo.volume` scale. The ROW SHOWS it as a percentage —
   * `Math.round((volume / 16) * 100)` — because 12/16 means nothing to a drummer. The value here
   * and the caller's `next / 16` to the engine are both unchanged: the percentage is a display
   * unit, not a second scale.
   */
  volume: number;
  onVolumeChange: (next: number) => void;
  staves: readonly TrackStaffState[];
  onStaffChange: (
    staffId: string,
    key: keyof Omit<TrackStaffState, 'id' | 'label' | 'tablatureAvailable'>,
    next: boolean,
  ) => void;
  transposeAudio: number;
  onTransposeAudioChange: (semitones: number) => void;
  transposeFull: number;
  onTransposeFullChange: (semitones: number) => void;
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
  /**
   * Set while the file plays its own recording: the reason, as tooltip text. Solo, mute, volume
   * and Transpose audio then render disabled — the engine ignores all four in that mode.
   * Render-select, the display toggles and Transpose full stay live: they change the drawn score.
   */
  mixUnavailable?: string;
}

type StaffToggleKey = 'showStandardNotation' | 'showSlash' | 'showNumbered' | 'showTablature';

const Icon = ({ name }: Readonly<{ name: string }>) => (
  <span className="material-symbols-outlined" aria-hidden="true">
    {name}
  </span>
);

const Mark = ({ children }: Readonly<{ children: string }>) => (
  <span aria-hidden="true" className="text-base leading-none font-semibold">
    {children}
  </span>
);

// One column track for every track row and the master footer. Fixed columns (the eye, solo, mute,
// the staff group, the expand control) are the same width on both, so those buttons line up even
// though a track name changes length. 2.125rem is 34px: WCAG 2.5.8 AA asks 24px, and this mixer
// is dense enough that the transport's 44px targets do not fit the row. The staff column is
// 8.5rem whether or not a row fills it, so a 3-toggle percussion row and a 4-toggle string row
// still end on the same expand button.
export const MIXER_ROW_CLASS =
  'grid items-center gap-1.5 [grid-template-columns:2.125rem_minmax(3.25rem,1fr)_2.125rem_2.125rem_minmax(4.5rem,1.25fr)_8.625rem_2.125rem]';

// Mixer icon buttons. `size-11` on TransportToggle is the transport's 44px target; this overrides
// it for the row. Mute's pressed fill is warning amber — solo and "shown" stay brand teal.
export const MIXER_BUTTON_CLASS = 'size-[2.125rem] shrink-0 rounded-lg text-muted-foreground';
// data-pressed: a Base UI Toggle sets it — every mixer toggle built through TransportToggle
// (this row's own Mute button included).
export const MUTE_PRESSED_CLASS =
  'data-pressed:border-warning data-pressed:bg-warning data-pressed:text-warning-foreground';
// aria-pressed: the twins for a plain Button that carries its pressed state only as
// aria-pressed="true" (MasterRow's select-all toggles, which are not a Base UI Toggle and so
// never get data-pressed). Tailwind's built-in aria-pressed variant matches the literal string
// "true" only, so aria-pressed="mixed" — MasterRow's indeterminate state — does not match either.
export const MIXER_SOLO_PRESSED_CLASS =
  'aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground';
export const MIXER_MUTE_PRESSED_CLASS =
  'aria-pressed:border-warning aria-pressed:bg-warning aria-pressed:text-warning-foreground';

// One mixer row. The primary cluster (name, render-select, solo, mute, volume, then every
// per-staff display toggle) is always visible; only the two transposition sliders sit behind the
// per-row expand control. Eight controls do not fit on one line, so only those two disclose.
const TrackRow = ({
  name,
  rendered,
  onRenderedChange,
  renderLockReason,
  solo,
  onSoloChange,
  mute,
  onMuteChange,
  volume,
  onVolumeChange,
  staves,
  onStaffChange,
  transposeAudio,
  onTransposeAudioChange,
  transposeFull,
  onTransposeFullChange,
  expanded,
  onExpandedChange,
  mixUnavailable,
  className,
  ...rest
}: Readonly<TrackRowProps>) => {
  const panelId = useId();

  // Pointer-tracking drafts: the row shows the value under the thumb while dragging and reports
  // only once the gesture ends — the shape `SettingRow`'s range kind already uses. One message to
  // the synth worker per gesture is enough. null = not dragging.
  const [volumeDraft, setVolumeDraft] = useState<number | null>(null);
  const [audioDraft, setAudioDraft] = useState<number | null>(null);
  const [fullDraft, setFullDraft] = useState<number | null>(null);

  const mixDisabled = Boolean(mixUnavailable);

  const staffToggleIcon = (key: StaffToggleKey) => {
    if (key === 'showSlash') return <Mark>/</Mark>;
    if (key === 'showNumbered') return <Mark>#</Mark>;
    const iconName = key === 'showTablature' ? 'grid_on' : 'music_note';
    return <Icon name={iconName} />;
  };
  const staffToggleName: Record<StaffToggleKey, string> = {
    showStandardNotation: 'Standard notation',
    showSlash: 'Slash notation',
    showNumbered: 'Numbered notation',
    showTablature: 'Tablature',
  };

  const staffToggle = (staff: TrackStaffState, key: StaffToggleKey, divided: boolean) => {
    const unavailable = key === 'showTablature' && !staff.tablatureAvailable;
    const state = staff[key] ? 'on' : 'off';
    const tooltip = unavailable
      ? `${staff.label} Tablature: unavailable`
      : `${staff.label} ${staffToggleName[key]}: ${state}`;
    return (
      <TransportToggle
        key={key}
        pressed={staff[key]}
        onPressedChange={(next) => onStaffChange(staff.id, key, next)}
        label={`${name} ${staff.label} ${staffToggleName[key]}`}
        icon={staffToggleIcon(key)}
        tooltip={tooltip}
        disabled={unavailable}
        // These four buttons sit flush against each other in one bordered box (no gap), so a
        // tooltip wide enough to hold its text cannot avoid covering the very next one — measured
        // live: hovering from one straight to the next left both tooltips open at once, each kept
        // alive by the pointer landing on the other's own popup content. Every other toggle in
        // this app has a real gap and stays hoverable (the WCAG 2.1 AA 1.4.13 default).
        disableHoverablePopup
        className={cn(
          'size-[2.125rem] shrink-0 rounded-none border-0',
          divided && 'border-l border-border',
        )}
      />
    );
  };

  // Four buttons, always, at the mixer button size. A single staff sits in the primary row's
  // staff column. Each further staff gets its own line in that same column, so a grand staff
  // does not shrink the buttons to fit two groups on one row.
  const staffButtons = (staff: TrackStaffState) => (
    <div className="col-start-6 inline-flex justify-self-start overflow-hidden rounded-lg border border-border">
      {(['showStandardNotation', 'showSlash', 'showNumbered', 'showTablature'] as const).map(
        (key, index) => staffToggle(staff, key, index > 0),
      )}
    </div>
  );

  return (
    <Field
      data-slot="track-row"
      orientation="vertical"
      className={cn('gap-1.5 px-2 py-1.5', className)}
      {...rest}
    >
      <div className={MIXER_ROW_CLASS}>
        <TransportToggle
          pressed={rendered}
          onPressedChange={onRenderedChange}
          label={`Render ${name}`}
          icon={<Icon name={rendered ? 'visibility' : 'visibility_off'} />}
          tooltip={renderLockReason ?? (rendered ? 'Shown in the score' : 'Hidden from the score')}
          disabled={Boolean(renderLockReason)}
          className={cn(MIXER_BUTTON_CLASS, 'border-transparent')}
        />

        <Tooltip>
          <TooltipTrigger
            render={<span tabIndex={-1} className="block min-w-0 truncate text-sm font-medium" />}
          >
            {name}
          </TooltipTrigger>
          {/* Hoverable (no disableHoverablePopup — WCAG 2.1 AA 1.4.13), max-w-40 keeps a long
              track name from reaching toward the next row's controls on a packed mixer row. */}
          <TooltipContent sideOffset={8} className="max-w-40">
            {name}
          </TooltipContent>
        </Tooltip>

        <TransportToggle
          pressed={solo}
          onPressedChange={onSoloChange}
          label={`Solo ${name}`}
          icon={<Icon name="headphones" />}
          tooltip={mixUnavailable ?? `Solo: ${solo ? 'on' : 'off'}`}
          disabled={mixDisabled}
          className={cn(MIXER_BUTTON_CLASS, 'border border-border')}
        />

        <TransportToggle
          pressed={mute}
          onPressedChange={onMuteChange}
          label={`Mute ${name}`}
          icon={<Icon name="volume_off" />}
          tooltip={mixUnavailable ?? `Mute: ${mute ? 'on' : 'off'}`}
          disabled={mixDisabled}
          className={cn(MIXER_BUTTON_CLASS, 'border border-border', MUTE_PRESSED_CLASS)}
        />

        {/* 0-16 is playbackInfo.volume's own scale. The caller divides by 16, because
            changeTrackVolume takes an ABSOLUTE channel level on that same scale — not a ratio
            against the file's level, which would sit about a third hot from the start. Note the
            coupling v0 accepts: AlphaTab applies volume, solo AND mute to the track's primary and
            secondary MIDI CHANNELS, not to the track, so tracks sharing a channel move together.
            Punk.gp's two drum tracks are both on channel 9: their volume sliders are not
            independent, and muting or soloing one does the same to the other while this row's own
            button still shows only what was pressed on it. That is expected, not a defect. */}
        <Slider
          value={volumeDraft ?? volume}
          onChange={setVolumeDraft}
          onCommit={(next) => {
            setVolumeDraft(null);
            onVolumeChange(next);
          }}
          min={0}
          max={16}
          step={1}
          label={`${name} volume`}
          // 12/16 means nothing to a drummer — show the percentage, not the raw channel level.
          showReadout
          formatValue={(v) => `${Math.round((v / 16) * 100)}%`}
          disabled={mixDisabled}
          // Half the thumb hangs off each end of the rail. Without this inset a 0% thumb
          // lands on the mute button, and a 100% thumb lands on the notation buttons.
          className="w-full min-w-0 px-4"
        />

        {staves.length === 1 && staves[0] ? (
          staffButtons(staves[0])
        ) : (
          <span className="col-start-6" />
        )}

        {/* The expand control is never disabled, so the trigger renders the Button directly
            through `render` rather than wrapping it in a span — the
            `TooltipTrigger render={<Button …/>}` shape `Tooltip.stories.tsx` demonstrates for a
            control with no disabled state to guard against. Hoverable (no disableHoverablePopup —
            WCAG 2.1 AA 1.4.13); max-w-40 on the content bounds its reach on a packed row. */}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  MIXER_BUTTON_CLASS,
                  'border border-border bg-transparent text-foreground aria-expanded:bg-transparent',
                )}
                aria-expanded={expanded}
                aria-controls={panelId}
                aria-label={`More controls for ${name}`}
                onClick={() => onExpandedChange(!expanded)}
              >
                <span
                  className={cn(
                    'material-symbols-outlined text-[22px] transition-transform',
                    expanded && 'rotate-180',
                  )}
                  aria-hidden="true"
                >
                  keyboard_arrow_down
                </span>
              </Button>
            }
          />
          <TooltipContent sideOffset={8} className="max-w-40">
            {expanded ? 'Hide more controls' : 'Show more controls'}
          </TooltipContent>
        </Tooltip>
      </div>

      {staves.length > 1
        ? staves.map((staff) => (
            <div key={staff.id} className={MIXER_ROW_CLASS}>
              <span className="col-start-2 truncate text-xs font-medium text-muted-foreground">
                {staff.label}
              </span>
              {staffButtons(staff)}
            </div>
          ))
        : null}

      {expanded ? (
        <div id={panelId} className="flex flex-col gap-3 pt-1">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Transpose audio</span>
            <Slider
              value={audioDraft ?? transposeAudio}
              onChange={setAudioDraft}
              onCommit={(next) => {
                setAudioDraft(null);
                onTransposeAudioChange(next);
              }}
              min={-12}
              max={12}
              step={1}
              label={`${name} Transpose audio`}
              // Semitones are exact targets ("up a whole step" is +2) — the sign must never be
              // ambiguous, so a positive offset reads with an explicit `+`; zero reads bare.
              showReadout
              formatValue={(v) => (v > 0 ? `+${v}` : `${v}`)}
              disabled={mixDisabled}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Transpose full</span>
            <Slider
              value={fullDraft ?? transposeFull}
              onChange={setFullDraft}
              onCommit={(next) => {
                setFullDraft(null);
                onTransposeFullChange(next);
              }}
              min={-12}
              max={12}
              step={1}
              label={`${name} Transpose full`}
              showReadout
              formatValue={(v) => (v > 0 ? `+${v}` : `${v}`)}
            />
          </div>
        </div>
      ) : null}
    </Field>
  );
};

export { TrackRow };
