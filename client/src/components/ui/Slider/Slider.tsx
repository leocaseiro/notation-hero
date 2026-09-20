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
  /** Accessible name for the thumb (Base UI maps it to role="slider"). */
  label?: string;
  /** Format the visible readout; defaults to String(v). */
  formatValue?: (v: number) => string;
  /** Unit appended to the visible readout, e.g. 'BPM'. */
  unit?: string;
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
  label = 'Value',
  formatValue = String,
  unit,
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
        onValueChange={(next) => onChange(next)}
        onValueCommitted={(next) => onCommit?.(next)}
        min={min}
        max={max}
        step={step}
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
            <SliderPrimitive.Thumb index={0} aria-label={label} className={SLIDER_THUMB_CLASS} />
          </SliderPrimitive.Track>
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
    </div>
  );
};

export { Slider };
