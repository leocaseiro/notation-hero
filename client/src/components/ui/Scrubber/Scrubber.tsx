'use client';

import { useState } from 'react';

import { Slider } from '../Slider/Slider';

import { cn } from '@/lib/utils';

interface ScrubberProps {
  /** Playback position in milliseconds. */
  positionMs: number;
  /** Song length in milliseconds. 0 means nothing is loaded. */
  durationMs: number;
  /** Fires with the requested position in MILLISECONDS — the unit the player's setter takes. */
  onSeek: (ms: number) => void;
  disabled?: boolean;
  className?: string;
}

// mm:ss. Beyond an hour this reads as minutes past 60 (e.g. 65:00) rather than growing an hour
// field — no practice score runs that long, and a third field would jitter the row's width.
const formatClock = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// Elapsed time, a seek bar, total time. It knows nothing about the player — milliseconds in, a
// requested position in milliseconds out. Its one piece of state is the in-flight drag value: the
// thumb and the elapsed clock must follow the pointer continuously, but only the RELEASE may seek.
// Seeking on every pointer move would cost the caller one engine seek per move.
//
// The bar works in SECONDS internally so one arrow-key press is a one-second step, which is the
// granularity a drummer wants; milliseconds would need a step of 1000 and would report a
// misleading max of 260000.
//
// A–B loop markers are deliberately absent: v0 uses the notation's native bar-range selection plus
// the Loop toggle, so there is no marker UI and no marker/selection sync to keep.
const Scrubber = ({
  positionMs,
  durationMs,
  onSeek,
  disabled = false,
  className,
}: Readonly<ScrubberProps>) => {
  const [draggingSeconds, setDraggingSeconds] = useState<number | null>(null);
  const durationSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const positionSeconds = Math.min(durationSeconds, Math.max(0, Math.floor(positionMs / 1000)));

  return (
    <div data-slot="scrubber" className={cn('flex w-full items-center gap-4', className)}>
      <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
        {formatClock(draggingSeconds === null ? positionMs : draggingSeconds * 1000)}
      </span>
      {/* onChange keeps the thumb (and the elapsed clock) under the pointer; onCommit is the only
          thing that seeks. One drag then costs one seek instead of one per pointer move. Keyboard
          seeking still works — Base UI fires onValueCommitted for a settled keystroke too. */}
      <Slider
        className="flex-1"
        value={draggingSeconds ?? positionSeconds}
        onChange={setDraggingSeconds}
        onCommit={(seconds) => {
          setDraggingSeconds(null);
          onSeek(seconds * 1000);
        }}
        min={0}
        max={durationSeconds}
        step={1}
        label="Seek"
        disabled={disabled || durationSeconds === 0}
      />
      <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
        {formatClock(durationMs)}
      </span>
    </div>
  );
};

export { Scrubber };
