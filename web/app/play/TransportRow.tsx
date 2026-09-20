'use client';

import { Scrubber, TransportToggle } from '@notation-hero/client';
import type { ReactNode } from 'react';

interface TransportRowProps {
  positionMs: number;
  durationMs: number;
  onSeek: (ms: number) => void;
  looping: boolean;
  onLoopingChange: (next: boolean) => void;
  metronome: boolean;
  onMetronomeChange: (next: boolean) => void;
  countIn: boolean;
  onCountInChange: (next: boolean) => void;
  /** Whether AlphaTab holds a bar-range selection. Drives the Loop toggle's label and hint only. */
  hasRange: boolean;
  /** Whether the loaded score plays an embedded recording. Metronome and Count-In are inert then. */
  hasBackingTrack: boolean;
  /**
   * Rendered FIRST in the row: the Open file control. The mockup draws it at the bottom of a left
   * rail; v0 has no rail, so the row's left end is the nearest place to it.
   */
  leading?: ReactNode;
  /**
   * Rendered last in the row. Exists so Plan C can drop its mixer/settings trigger in without
   * reopening this interface or this layout. Plan B passes nothing.
   */
  trailing?: ReactNode;
  disabled: boolean;
  /** The play/pause control, owned by the shell because it drives api.playPause(). */
  playButton: ReactNode;
}

// 24 px, the size the mockup draws every transport glyph at; the button around it is 44 px.
const Glyph = ({ name }: Readonly<{ name: string }>) => (
  <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 24 }}>
    {name}
  </span>
);

// Material Symbols has no metronome. This is the mockup's own glyph: `metronome` from Material
// Design Icons (Pictogrammers), Apache-2.0 — the path is byte-identical to theirs. Inline because
// the icon font cannot carry it; `size-6` is required, or Button sizes a bare svg to 16 px.
const MetronomeGlyph = () => (
  <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden="true">
    <path d="M12,1.75L8.57,2.67L4.06,19.53C4.03,19.68 4,19.84 4,20C4,21.11 4.89,22 6,22H18C19.11,22 20,21.11 20,20C20,19.84 19.97,19.68 19.94,19.53L18.58,14.42L17,16L17.2,17H13.41L16.25,14.16L14.84,12.75L10.59,17H6.8L10.29,4H13.71L15.17,9.43L16.8,7.79L15.43,2.67L12,1.75M11.25,5V14.75L12.75,13.25V5H11.25M19.79,7.8L16.96,10.63L16.25,9.92L14.84,11.34L17.66,14.16L19.08,12.75L18.37,12.04L21.2,9.21L19.79,7.8Z" />
  </svg>
);

/** The mockup's resting ink for a transport control is the muted grey; pressed stays solid teal. */
const RESTING_INK = 'text-muted-foreground';
const UNAVAILABLE = 'not available while the file plays its own recording';

// The transport row layout. It composes client/ controls and holds NO AlphaTab knowledge itself —
// every accessor arrives as a prop from the shell, which is what keeps the controls reusable and
// the client/ gate honest.
//
// No tempo control here: tempo lives in the header (spec §7), so the player has exactly one.
export function TransportRow({
  positionMs,
  durationMs,
  onSeek,
  looping,
  onLoopingChange,
  metronome,
  onMetronomeChange,
  countIn,
  onCountInChange,
  hasRange,
  hasBackingTrack,
  disabled,
  playButton,
  leading,
  trailing,
}: Readonly<TransportRowProps>) {
  // Every icon button says what it is and what STATE it is in: an icon alone does neither, and
  // the pressed colour means nothing to someone meeting the control for the first time. Loop also
  // names WHAT will repeat — with no bar range selected AlphaTab restarts the whole score, with
  // one it repeats the selection — and teaches the gesture that selects a range, which the UI
  // shows nowhere else. Always present, never conditional: a tooltip that comes and goes swaps
  // the wrapped and the bare element, which remounts the button and drops its focus.
  let loopTip = 'Loop: off · drag across bars in the notation to loop just that range';
  if (looping) {
    loopTip = hasRange
      ? 'Loop: on · the selected bars repeat'
      : 'Loop: on · the whole score repeats';
  } else if (hasRange) {
    loopTip = 'Loop: off · click to repeat the selected bars';
  }
  const onOff = (name: string, on: boolean) => {
    if (hasBackingTrack) return `${name}: ${UNAVAILABLE}`;
    return `${name}: ${on ? 'on' : 'off'}`;
  };

  return (
    <div className="flex w-full items-center gap-4 border-t border-border px-6 py-3">
      {leading}
      {playButton}
      {/* The LABEL names what will repeat too, for a screen reader: the button looks identical
          either way. No marker UI, so the out-of-scope constraint holds. */}
      <TransportToggle
        data-testid="toggle-loop"
        pressed={looping}
        onPressedChange={onLoopingChange}
        label={hasRange ? 'Loop selection' : 'Loop score'}
        tooltip={loopTip}
        icon={<Glyph name="repeat" />}
        disabled={disabled}
        className={RESTING_INK}
      />
      <Scrubber
        className="flex-1"
        positionMs={positionMs}
        durationMs={durationMs}
        onSeek={onSeek}
        disabled={disabled}
      />
      <TransportToggle
        data-testid="toggle-metronome"
        pressed={metronome}
        onPressedChange={onMetronomeChange}
        label="Metronome"
        tooltip={onOff('Metronome', metronome)}
        icon={<MetronomeGlyph />}
        disabled={disabled || hasBackingTrack}
        className={RESTING_INK}
      />
      <TransportToggle
        data-testid="toggle-countin"
        pressed={countIn}
        onPressedChange={onCountInChange}
        label="Count-In"
        tooltip={onOff('Count-in', countIn)}
        icon={<Glyph name="timer" />}
        disabled={disabled || hasBackingTrack}
        className={RESTING_INK}
      />
      {trailing}
    </div>
  );
}
