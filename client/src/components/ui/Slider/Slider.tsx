'use client';

import { Slider as SliderPrimitive } from '@base-ui/react/slider';

import { SLIDER_CONTROL_CLASS, SLIDER_THUMB_CLASS, SLIDER_TRACK_CLASS } from './SliderClasses';

import { cn } from '@/lib/utils';

interface SliderProps {
  /** Controlled value. */
  value: number;
  /** Fires with the new value whenever the thumb moves. */
  onChange: (next: number) => void;
  /**
   * Fires once when the interaction ENDS — pointer release, or a keystroke's settled value.
   * Use it for work too expensive to run on every pointer move (a seek, a network write) while
   * `onChange` keeps the thumb tracking the pointer.
   */
  onCommit?: (next: number) => void;
  min?: number;
  max?: number;
  /** Increment per keystroke / drag tick. */
  step?: number;
  /**
   * Arrow-key increment, for when it must differ from the pointer's `step`. Base UI has ONE step
   * for both, so a fine pointer (a seek bar in milliseconds) would make an arrow key move by an
   * amount nobody can see. Omitted = the arrow keys move by `step`, as Base UI does.
   */
  keyStep?: number;
  /** Shift+Arrow / PageUp / PageDown increment. Omitted = Base UI's default (10). */
  largeStep?: number;
  /** Accessible name for the thumb (Base UI maps it to role="slider"). */
  label?: string;
  /** Format the visible readout; defaults to String(v). */
  formatValue?: (v: number) => string;
  /** Unit appended to the visible readout, e.g. 'BPM'. */
  unit?: string;
  /** What a screen reader hears (aria-valuetext) when the raw number is not what a person thinks
   *  in — a seek bar in milliseconds says "01:42 of 04:20". */
  valueText?: string;
  /** Show the readout above the rail. Off by default — most rows label the value themselves. */
  showReadout?: boolean;
  disabled?: boolean;
  className?: string;
}

// Dumb, controlled single-thumb slider: a number in, onChange out. Base UI owns the interaction
// model (arrow-key stepping, the slider semantics); this wrapper adds the rail/range/thumb look,
// the optional readout and the data-slot hook. RangeSlider is dual-thumb only (value:
// [number, number]), so it cannot serve the scrubber, the tempo slider, per-track volume or the
// settings rows — which is why this exists alongside it rather than replacing it.
//
// The readout is aria-hidden so a screen reader hears the thumb's aria-valuenow/min/max, not a
// duplicated line. The thumb carries its own aria-label so axe sees a named slider.
const Slider = ({
  value,
  onChange,
  onCommit,
  min = 0,
  max = 100,
  step = 1,
  keyStep,
  largeStep,
  label = 'Value',
  formatValue = String,
  unit,
  valueText,
  showReadout = false,
  disabled = false,
  className,
}: SliderProps) => {
  const suffix = unit ? ` ${unit}` : '';
  const readout = `${formatValue(value)}${suffix}`;

  return (
    <div data-slot="slider" className={cn('flex flex-col gap-2', className)}>
      {showReadout ? (
        <output aria-hidden="true" className="text-sm text-muted-foreground tabular-nums">
          {readout}
        </output>
      ) : null}
      <SliderPrimitive.Root
        value={value}
        onValueChange={(next, details) => {
          // A plain arrow key moves by `keyStep`, not by the pointer's `step`. Base UI still owns
          // the key handling (focus ring, right-to-left, which key means which direction): this
          // only reads the DIRECTION off the value it proposed, cancels that change — a cancelled
          // change is neither applied nor committed — and applies the scaled one. Overriding
          // onKeyDown instead would skip all of Base UI's handler, and measurably loses the focus
          // ring after a click followed by an arrow key.
          const event = details.event as Partial<KeyboardEvent>;
          const plainArrow =
            details.reason === 'keyboard' &&
            event.key?.startsWith('Arrow') === true &&
            event.shiftKey !== true;
          if (keyStep === undefined || !plainArrow) {
            onChange(next);
            return;
          }
          details.cancel();
          const scaled = Math.min(max, Math.max(min, value + Math.sign(next - value) * keyStep));
          onChange(scaled);
          onCommit?.(scaled);
        }}
        onValueCommitted={(next) => onCommit?.(next)}
        min={min}
        max={max}
        step={step}
        largeStep={largeStep}
        disabled={disabled}
        className={cn(
          'relative flex w-full touch-none items-center select-none',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        {/* 44 px pointer target lives on CONTROL, not Root: Base UI puts the click/drag handling
            on Control, so height on Root alone leaves the touchable area at the rail's 4 px. The
            rail stays h-1 and is centred inside it — invisible padding, full-size target. */}
        <SliderPrimitive.Control className={SLIDER_CONTROL_CLASS}>
          <SliderPrimitive.Track className={SLIDER_TRACK_CLASS}>
            <SliderPrimitive.Indicator className="absolute h-full rounded-full bg-primary" />
            {/* Thumb: grab cursor + teal fill while dragging (:active); disabled keys off Base
                UI's data-disabled (a <span> can't match :disabled), which also suppresses the
                hover ring. */}
            <SliderPrimitive.Thumb
              index={0}
              aria-label={label}
              aria-valuetext={valueText}
              className={SLIDER_THUMB_CLASS}
            />
          </SliderPrimitive.Track>
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
    </div>
  );
};

export { Slider };
