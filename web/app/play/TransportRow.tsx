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
   * Rendered last in the row. Exists so Plan C can drop its mixer/settings trigger in without
   * reopening this interface or this layout. Plan B passes nothing.
   */
  trailing?: ReactNode;
  disabled: boolean;
  /** The play/pause control, owned by the shell because it drives api.playPause(). */
  playButton: ReactNode;
}

const Glyph = ({ name }: Readonly<{ name: string }>) => (
  <span className="material-symbols-outlined" aria-hidden="true">
    {name}
  </span>
);

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
  trailing,
}: Readonly<TransportRowProps>) {
  return (
    <div className="flex w-full items-center gap-4 border-t border-border px-6 py-3">
      {playButton}
      {/* The label names WHAT will repeat. With no bar range selected AlphaTab's isLooping restarts
          the whole score when it ends; with one it repeats the selection. The button looks identical
          either way, and the selection gesture (a mouse drag across the notation) is taught nowhere —
          so the label carries it. No marker UI, so the out-of-scope constraint holds. */}
      <TransportToggle
        data-testid="toggle-loop"
        pressed={looping}
        onPressedChange={onLoopingChange}
        label={hasRange ? 'Loop selection' : 'Loop score'}
        tooltip={hasRange ? undefined : 'Drag across bars in the notation to loop just that range'}
        icon={<Glyph name="repeat" />}
        disabled={disabled}
      />
      <Scrubber
        className="flex-1"
        positionMs={positionMs}
        durationMs={durationMs}
        onSeek={onSeek}
        disabled={disabled}
      />
      {/* Material Symbols has no metronome glyph. `avg_pace` is the nearest stock icon; the repo's
          own mockup (docs/mockups/player-flatrow-teal.html) instead inlines an SVG path. Start with
          the stock glyph so nothing unlicensed ships; the icon choice is tracked as NH-294 —
          it is a design call, not an implementation detail. */}
      <TransportToggle
        data-testid="toggle-metronome"
        pressed={metronome}
        onPressedChange={onMetronomeChange}
        label="Metronome"
        tooltip={
          hasBackingTrack ? 'Not available while the file plays its own recording' : undefined
        }
        icon={<Glyph name="avg_pace" />}
        disabled={disabled || hasBackingTrack}
      />
      <TransportToggle
        data-testid="toggle-countin"
        pressed={countIn}
        onPressedChange={onCountInChange}
        label="Count-In"
        tooltip={
          hasBackingTrack ? 'Not available while the file plays its own recording' : undefined
        }
        icon={<Glyph name="timer" />}
        disabled={disabled || hasBackingTrack}
      />
      {trailing}
    </div>
  );
}
