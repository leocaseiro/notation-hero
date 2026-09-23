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
export const MUTE_PRESSED_CLASS =
  'data-pressed:border-warning data-pressed:bg-warning data-pressed:text-warning-foreground';

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
        className={cn(
          'size-[2.125rem] shrink-0 rounded-none border-0',
          divided && 'border-l border-border',
        )}
      />
    );
  };

  // A single staff's toggle group, joined into one control the width of the staff column.
  // `withLabel` shows the staff's own name above the group — the primary row's single-staff case
  // omits it (the track name next to it already identifies the staff); the multi-staff wrap
  // section below the primary row always shows it, so a grand-staff part's two groups can be
  // told apart.
  const staffGroup = (staff: TrackStaffState, withLabel: boolean) => {
    const keys: StaffToggleKey[] = [
      'showStandardNotation',
      'showSlash',
      'showNumbered',
      'showTablature',
    ];
    return (
      <div key={staff.id} className={cn('min-w-0', withLabel && 'w-full sm:w-auto')}>
        {withLabel ? (
          <span className="mb-1 block text-xs font-medium text-muted-foreground">
            {staff.label}
          </span>
        ) : null}
        <div className="inline-flex overflow-hidden rounded-lg border border-border">
          {keys.map((key, index) => staffToggle(staff, key, index > 0))}
        </div>
      </div>
    );
  };

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

        {/* The column is a floor, not a fit: `truncate` catches a name longer than whatever
            space the fixed buttons leave at the popover's real width. */}
        <span className="min-w-0 truncate text-sm font-medium">{name}</span>

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
          className="w-full min-w-0"
        />

        {staves.length === 1 && staves[0] ? staffGroup(staves[0], false) : <span />}

        {/* The expand control is never disabled, so the trigger renders the Button directly
            through `render` rather than wrapping it in a span — the
            `TooltipTrigger render={<Button …/>}` shape `Tooltip.stories.tsx` demonstrates for a
            control with no disabled state to guard against. */}
        <Tooltip disableHoverablePopup>
          <TooltipTrigger
            render={
              <Button
                size="icon"
                className={cn(MIXER_BUTTON_CLASS, 'border border-border')}
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
          <TooltipContent sideOffset={8}>
            {expanded ? 'Hide more controls' : 'Show more controls'}
          </TooltipContent>
        </Tooltip>
      </div>

      {staves.length > 1 ? (
        <div className="flex w-full flex-wrap gap-x-4 gap-y-2">
          {staves.map((staff) => staffGroup(staff, true))}
        </div>
      ) : null}

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
