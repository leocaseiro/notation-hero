'use client';

import { NumberField } from '@base-ui/react/number-field';
import { useEffect, useRef, useState } from 'react';

import { buttonVariants } from '../Button/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../Tooltip/Tooltip';

import { cn } from '@/lib/utils';

interface TempoControlProps {
  /** The score's live tempo in BPM. The displayed number is this times `speed`. */
  scoreTempo: number;
  /** Playback speed multiplier; 1 is the score's own tempo. */
  speed: number;
  onSpeedChange: (next: number) => void;
  /** Lowest speed. The default, 12.5 %, is the floor of the player engine this was built for. */
  minSpeed?: number;
  /**
   * Highest speed. The default, 800 %, is the ceiling of the player engine this was built for — the
   * design system adds no limit of its own. The number field still needs a `max` to clamp a typed
   * value against, so it mirrors the engine's.
   */
  maxSpeed?: number;
  disabled?: boolean;
  className?: string;
}

/** How long the percentage stays visible after a change that carried no focus. */
const PERCENT_LINGER_MS = 3000;

/**
 * How long after the LAST change an edit still counts as the same edit. It must outlast Base UI's
 * own 400 ms pause between the first step of a held button and the start of its auto-repeat (and a
 * keyboard's delay before key-repeat), or one held press would end in the middle of the hold.
 */
const EDIT_SETTLE_MS = 1000;

// The header's tempo control. SPEED is the value it owns, not BPM: AlphaTab's playbackSpeed is what
// actually changes playback, and the Player settings group (Plan C) edits the same number — so
// keeping speed as the single source of truth is what stops the two controls drifting apart. BPM is
// the presentation, and the user edits it directly.
//
// Base UI's NumberField owns the interaction model: the editable input, wheel scrubbing, the
// min/max clamp, and hold-to-repeat on the buttons. This wrapper converts BPM <-> speed at the
// boundary, paints the pill, and implements the percentage-visibility rule.
//
// The READOUT tracks the playhead: on a score whose tempo changes, the header shows the tempo
// where playback currently is, multiplied by the chosen speed — EXCEPT while an edit is under way
// (see `editBase` below), when the number moves only by the user's own hand.
const TempoControl = ({
  scoreTempo,
  speed,
  onSpeedChange,
  minSpeed = 0.125,
  maxSpeed = 8,
  disabled = false,
  className,
}: Readonly<TempoControlProps>) => {
  const [lingering, setLingering] = useState(false);
  // React 19 (web/ runs 19.2.7, @types/react 19.2.0) removed the zero-argument useRef overload,
  // so the initial value is explicit. `useRef<ReturnType<typeof setTimeout>>()` is TS2554.
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The score tempo an edit began at, or null when nobody is editing. `scoreTempo` is rewritten
  // continuously as the playhead moves, so on a score whose parts are written at different tempos
  // (a verse at 90, a chorus at 120) it can change in the middle of an edit. While an edit lasts,
  // BOTH the displayed number and the conversion back to a speed use this one frozen value: a
  // person who starts slowing the verse down from 90 keeps seeing the verse's numbers until they
  // stop, even if playback has moved into the chorus — and the speed they chose is a percentage,
  // so it carries into the chorus unchanged (90 -> 80 is 89 %, so the chorus reads 107).
  //
  // Freezing only the conversion is a real bug, not a simplification: Base UI steps from the
  // DISPLAYED value, so a live display over a frozen divisor compounds on every 60 ms tick of a
  // held button — measured 101 -> 181 -> 240, double speed in two ticks.
  //
  // State, not a ref: the display is derived from it during render.
  const [editBase, setEditBase] = useState<number | null>(null);
  const settleRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const base = editBase ?? scoreTempo;
  const displayedBpm = Math.round(base * speed);
  const percent = Math.round(speed * 100);
  const offSpeed = Math.abs(speed - 1) > 0.0001;

  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      clearTimeout(settleRef.current);
    },
    [],
  );

  // An edit ends when the changes stop (no new value for EDIT_SETTLE_MS) or on blur — one rule for
  // a held button, a held arrow key, the wheel and typed digits alike.
  const endEdit = () => {
    clearTimeout(settleRef.current);
    setEditBase(null);
  };

  const handleBpm = (nextBpm: number | null) => {
    if (nextBpm === null || base <= 0) return; // a score with no tempo would divide by zero
    onSpeedChange(Math.min(maxSpeed, Math.max(minSpeed, nextBpm / base)));

    // The first change freezes the tempo it began at; every later one only extends the edit.
    setEditBase(base);
    clearTimeout(settleRef.current);
    settleRef.current = setTimeout(endEdit, EDIT_SETTLE_MS);

    setLingering(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setLingering(false), PERCENT_LINGER_MS);
  };

  const tempoTip = offSpeed
    ? `${displayedBpm} BPM — ${percent}% of the score's written tempo`
    : `${displayedBpm} BPM — the score's written tempo`;

  return (
    <NumberField.Root
      value={displayedBpm}
      onValueChange={handleBpm}
      min={Math.round(base * minSpeed)}
      max={Math.round(base * maxSpeed)}
      step={1}
      largeStep={5}
      allowWheelScrub
      disabled={disabled}
      data-slot="tempo-control"
      data-testid="tempo-control"
      // The visibility rule lives in these two attributes plus the CSS below. data-off-speed=false
      // means "at written speed", and rule 4 says the percentage is then never shown at all.
      data-off-speed={offSpeed}
      data-linger={lingering}
      // React's onBlur is `focusout`, which BUBBLES, and Base UI moves focus between the steppers
      // and the input as they are pressed. Ending the edit on one of those would re-base the next
      // conversion on the live `scoreTempo` mid-correction — the exact compounding the freeze
      // exists to stop. Only focus leaving the pill ends it; the settle timer covers a person who
      // simply stops.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) endEdit();
      }}
      className={cn('group flex items-center gap-0.5', className)}
    >
      <NumberField.Group className="flex items-center gap-0.5">
        <NumberField.Decrement
          aria-label="Decrease tempo"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-11 rounded-lg')}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            remove
          </span>
        </NumberField.Decrement>

        {/* A plain wrapper, NOT NumberField.ScrubArea. ScrubArea (drag sideways to change the value)
            cancels pointerdown and sets `user-select: none` on everything inside it, so with the
            input in there the number could not be selected with the mouse — no drag, no
            double-click. The field behaves like a native number input instead: the mouse selects,
            and the value moves by the arrow keys, the wheel, the +/- buttons and typing. */}
        {/* The readout says what the number IS — a tempo in BPM — and the tooltip says what it is
            RELATIVE TO, which the bare number cannot: 120 means nothing until you know whether the
            score is written at 120 or at 150 and running slow. The inline percentage below shows
            the same figure but only while the tempo is being adjusted (the visibility rule), so
            without this there is no way to ask "what speed am I at?" after the fact.
            The trigger wraps the column rather than the whole pill: a tooltip anchored to the pill
            would open from its centre, under the pointer that is on a stepper. */}
        <Tooltip>
          <TooltipTrigger render={<div className="flex flex-col items-center px-2" />}>
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              BPM
            </span>
            <NumberField.Input
              aria-label="Tempo"
              className={cn(
                'w-12 border-0 bg-transparent p-0 text-center font-mono text-sm leading-none font-bold tabular-nums',
                'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
              )}
            />
            {/* Rule 1-4, entirely in CSS: hover or focus reveals it, blur hides it (focus-within does
              that for free), data-linger covers a change that carries no focus, and the whole thing is gated
              on data-off-speed so 100% never shows anything. */}
            <span
              data-testid="tempo-percent"
              aria-hidden="true"
              className={cn(
                'font-mono text-[10px] text-primary tabular-nums opacity-0 transition-opacity',
                'group-data-[off-speed=true]:group-hover:opacity-100',
                'group-data-[off-speed=true]:group-focus-within:opacity-100',
                'group-data-[off-speed=true]:group-data-[linger=true]:opacity-100',
              )}
            >
              {percent}%
            </span>
          </TooltipTrigger>
          <TooltipContent data-testid="tempo-tooltip">{tempoTip}</TooltipContent>
        </Tooltip>

        <NumberField.Increment
          aria-label="Increase tempo"
          className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-11 rounded-lg')}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            add
          </span>
        </NumberField.Increment>
      </NumberField.Group>

      {/* Base UI's Input is a text input carrying aria-roledescription, not role="spinbutton",
          so a value change driven by the +/- buttons is not announced. This is the same visually
          hidden live region DataTable.tsx uses for the same shape of problem.

          The percentage rides in the SAME announcement rather than in a node of its own. The
          visible `%` is aria-hidden (it would otherwise be read as a stray number), and it is the
          only thing that says whether the score is playing at its written speed — so a bare
          "90 BPM" leaves a screen-reader user unable to tell "written at 90" from "written at 120,
          playing at 75%". Off written speed it is spoken; at exactly 100% it is omitted, which
          matches visibility rule 4 (at written speed there is nothing to report). */}
      <span role="status" aria-live="polite" className="sr-only">
        {offSpeed ? `${displayedBpm} BPM, ${percent}% of written speed` : `${displayedBpm} BPM`}
      </span>
    </NumberField.Root>
  );
};

export { TempoControl };
