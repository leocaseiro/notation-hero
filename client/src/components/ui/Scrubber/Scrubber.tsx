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
// The bar works in MILLISECONDS. An earlier version worked in whole seconds, and both of its
// faults were plain to anyone who used it: during playback the thumb jumped once a second instead
// of gliding, and the pointer snapped to whole seconds, so it could not be put in the middle of a
// bar. The keyboard keeps its useful amounts through Slider's `keyStep` — an arrow key is one
// second, Shift+Arrow / PageUp / PageDown ten — and a listener hears the clock, not a raw
// millisecond count, through `valueText`.
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
  const [draggingMs, setDraggingMs] = useState<number | null>(null);
  // Whole milliseconds: a player reports lengths like 6000.000000000001, and End must not ask for
  // a position past the end.
  const maxMs = Math.max(0, Math.floor(durationMs));
  const shownMs = draggingMs ?? Math.min(maxMs, Math.max(0, Math.round(positionMs)));

  return (
    // `min-w-0` is not decoration: as a flex item this defaults to `min-width: auto`, which
    // refuses to shrink below its own content, so in a tight row it pushes its neighbours out of
    // the layout instead of giving way. The two clocks step aside below `sm` for the same reason —
    // they are `shrink-0`, and on a phone they would otherwise sit on top of the transport icons.
    // Nothing is lost to a screen reader: the slider's own valueText already reads
    // "0:00 of 0:06".
    <div
      data-slot="scrubber"
      className={cn('flex w-full min-w-0 items-center gap-2 sm:gap-4', className)}
    >
      <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground max-sm:hidden">
        {formatClock(shownMs)}
      </span>
      {/* onChange keeps the thumb (and the elapsed clock) under the pointer; onCommit is the only
          thing that seeks. One drag then costs one seek instead of one per pointer move. Keyboard
          seeking still works — a settled keystroke commits too. */}
      <Slider
        // `min-w-16` is the floor. Without it the rail is the only thing in the row that CAN give
        // way, so a narrow window took it to 0 px — still focusable, still seekable by keyboard,
        // and completely invisible. That is the NH-315 failure mode, and the a11y lane's 44 px
        // check on the slider control is what would catch it.
        className="min-w-16 flex-1"
        value={shownMs}
        onChange={setDraggingMs}
        onCommit={(ms) => {
          setDraggingMs(null);
          onSeek(ms);
        }}
        min={0}
        // 1, not 0, while nothing is loaded. `min === max` makes Base UI's valueToPercent return
        // (0-0)/(0-0) = NaN, SliderIndicator emits `width: "NaN%"`, the browser drops the invalid
        // declaration and the rail paints FULL — a finished-looking bar for the whole load — and
        // Base UI warns ``Slider `max` must be greater than `min`.`` on every page load. The bar
        // stays disabled and both clocks still read 00:00, so nothing else changes.
        max={maxMs || 1}
        step={1}
        keyStep={1000}
        largeStep={10_000}
        valueText={`${formatClock(shownMs)} of ${formatClock(maxMs)}`}
        label="Seek"
        disabled={disabled || maxMs === 0}
      />
      <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground max-sm:hidden">
        {formatClock(durationMs)}
      </span>
    </div>
  );
};

export { Scrubber };
