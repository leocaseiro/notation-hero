'use client';

import { useId, useState } from 'react';

import { Button } from '../Button/Button';
import { Field } from '../Field/Field';
import { Slider } from '../Slider/Slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '../Tooltip/Tooltip';
import { TransportToggle } from '../TransportToggle/TransportToggle';
import { MIXER_BUTTON_CLASS, MIXER_ROW_CLASS, MUTE_PRESSED_CLASS } from './MixerClasses';
import type { ComponentProps, ReactNode } from 'react';

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
  onStaffChange: (staffId: string, key: StaffToggleKey, next: boolean) => void;
  transposeAudio: number;
  onTransposeAudioChange: (semitones: number) => void;
  transposeFull: number;
  /**
   * Notation only — this moves the DRAWN score, never the sound. The audio-only transposition is
   * the slider above it. The prop keeps its `Full` name because it maps to AlphaTab's whole-score
   * `transpositionPitches`, as opposed to the per-channel `changeTrackTranspositionPitch`.
   */
  onTransposeFullChange: (semitones: number) => void;
  expanded: boolean;
  onExpandedChange: (next: boolean) => void;
  /**
   * Set on a PERCUSSION track: the reason, as tooltip text, and the expand control that reveals
   * Transpose audio/full renders disabled. A drum "pitch" is an instrument identifier, not a
   * note, so transposing one is meaningless — and it also broke playback. The disclosure holds
   * nothing else, so locking the control itself is enough; the two sliders inside need no lock
   * of their own.
   */
  expandUnavailable?: string;
  /**
   * Set while the file plays its own recording: the reason, as tooltip text. Solo, mute, volume
   * and Transpose audio then render disabled — the engine ignores all four in that mode.
   * Render-select, the display toggles and Transpose notation stay live: they change the drawn
   * score.
   */
  mixUnavailable?: string;
}

export type StaffToggleKey =
  | 'showStandardNotation'
  | 'showSlash'
  | 'showNumbered'
  | 'showTablature';

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

// Static elements, safe at module scope: neither closes over anything from the component, and
// React clones them at the call site. A Record, not an if-chain, so adding a fifth
// StaffToggleKey fails the type check here instead of silently falling through.
const STAFF_TOGGLE_ICON: Record<StaffToggleKey, ReactNode> = {
  showStandardNotation: <Icon name="music_note" />,
  showSlash: <Mark>/</Mark>,
  showNumbered: <Mark>#</Mark>,
  showTablature: <Icon name="grid_on" />,
};
const STAFF_TOGGLE_NAME: Record<StaffToggleKey, string> = {
  showStandardNotation: 'Standard notation',
  showSlash: 'Slash notation',
  showNumbered: 'Numbered notation',
  showTablature: 'Tablature',
};
// All four keys, in display order — staffButtons renders this array, and staffToggle counts
// against it to find whether IT is the only one left on for its staff.
const STAFF_TOGGLE_KEYS: readonly StaffToggleKey[] = [
  'showStandardNotation',
  'showSlash',
  'showNumbered',
  'showTablature',
];

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
  expandUnavailable,
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

  const staffToggle = (staff: TrackStaffState, key: StaffToggleKey, divided: boolean) => {
    const unavailable = key === 'showTablature' && !staff.tablatureAvailable;
    // 1.8.4 cannot lay out a staff with NOTHING to draw — it throws deep inside its own renderer
    // (a crash reached in one click: "Cannot read properties of undefined (reading 'staves')" on
    // a drum staff, "reading 'beat'" on a vocal one). Once a staff is down to its last enabled
    // notation type, that toggle locks on rather than letting the click reach setStaffDisplay.
    const onCount = STAFF_TOGGLE_KEYS.filter((toggleKey) => staff[toggleKey]).length;
    const lastOn = staff[key] && onCount === 1;
    const disabled = unavailable || lastOn;
    const state = staff[key] ? 'on' : 'off';
    let tooltip = `${staff.label} ${STAFF_TOGGLE_NAME[key]}: ${state}`;
    if (unavailable) tooltip = `${staff.label} Tablature: unavailable`;
    else if (lastOn) tooltip = `${staff.label}: at least one notation type must stay shown`;
    return (
      <TransportToggle
        key={key}
        pressed={staff[key]}
        onPressedChange={(next) => onStaffChange(staff.id, key, next)}
        label={`${name} ${staff.label} ${STAFF_TOGGLE_NAME[key]}`}
        icon={STAFF_TOGGLE_ICON[key]}
        tooltip={tooltip}
        disabled={disabled}
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
      {STAFF_TOGGLE_KEYS.map((key, index) => staffToggle(staff, key, index > 0))}
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

        {staves.length === 1 && staves[0] ? staffButtons(staves[0]) : null}

        {/* A percussion track locks this control (transposition is meaningless on a drum
            "pitch" — expandUnavailable), so the trigger wraps the Button in a span rather than
            rendering it directly — the same shape TransportToggle's own tooltip uses, unlike the
            `TooltipTrigger render={<Button …/>}` shape `Tooltip.stories.tsx` demonstrates for a
            control with no disabled state to guard against. A disabled Button is
            `pointer-events: none`, so as its own trigger it would never receive the hover that
            opens the tooltip explaining why; the span takes the hover instead, and focus still
            reaches the Button because focus events bubble. Hoverable (no disableHoverablePopup —
            WCAG 2.1 AA 1.4.13); max-w-40 on the content bounds its reach on a packed row.
            col-start-7 sits on the SPAN, not the Button — it is the span that is now the grid
            item — and is explicit, not auto-placement: the staff column above is empty (no
            staffButtons) whenever a track has anything other than exactly one staff, and nothing
            else would otherwise hold column 6 open. */}
        <Tooltip>
          <TooltipTrigger render={<span className="col-start-7 inline-flex" />}>
            <Button
              variant="ghost"
              size="icon"
              disabled={Boolean(expandUnavailable)}
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
          </TooltipTrigger>
          <TooltipContent sideOffset={8} className="max-w-40">
            {expandUnavailable ?? (expanded ? 'Hide more controls' : 'Show more controls')}
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
            <span className="text-xs font-medium text-muted-foreground">Transpose notation</span>
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
              label={`${name} Transpose notation`}
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
