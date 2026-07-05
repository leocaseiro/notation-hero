import { Slider } from 'radix-ui';

import { cn } from '@/lib/utils';

interface RangeSliderProps {
  /** Controlled [min, max] selection. */
  value: [number, number];
  /** Fires with the new [min, max] tuple whenever either thumb moves. */
  onChange: (next: [number, number]) => void;
  /** Lowest selectable value. */
  min?: number;
  /** Highest selectable value. */
  max?: number;
  /** Increment per keystroke / drag tick. */
  step?: number;
  /** Accessible name for the low thumb (Radix maps it to role="slider"). */
  minLabel?: string;
  /** Accessible name for the high thumb (Radix maps it to role="slider"). */
  maxLabel?: string;
  /** Format each endpoint for the visible readout; defaults to String(v). */
  formatValue?: (v: number) => string;
  /** Unit appended to the visible readout, e.g. 'BPM'. */
  unit?: string;
  disabled?: boolean;
  className?: string;
}

// Dumb, controlled dual-thumb range slider: [min, max] in, onChange out. Radix owns the
// interaction model (roving focus, arrow-key stepping, the slider semantics); this wrapper only
// adds the rail/range/thumb look, the visible readout, and the data-slot hook. The two thumbs are
// the real controls — the readout is aria-hidden so a screen reader hears the thumbs'
// aria-valuenow/min/max, not a duplicated line. Each thumb carries its own aria-label so axe sees
// two named sliders.
const RangeSlider = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  minLabel = 'Minimum',
  maxLabel = 'Maximum',
  formatValue = String,
  unit,
  disabled = false,
  className,
}: RangeSliderProps) => {
  const [low, high] = value;
  const suffix = unit ? ` ${unit}` : '';
  const readout = `${formatValue(low)} – ${formatValue(high)}${suffix}`;

  return (
    <div data-slot="range-slider" className={cn('flex flex-col gap-2', className)}>
      <output aria-hidden="true" className="text-sm text-muted-foreground tabular-nums">
        {readout}
      </output>
      <Slider.Root
        value={value}
        onValueChange={(next) => onChange([next[0] ?? low, next[1] ?? high])}
        min={min}
        max={max}
        step={step}
        minStepsBetweenThumbs={0}
        disabled={disabled}
        className={cn(
          'relative flex h-5 w-full touch-none items-center select-none',
          disabled && 'opacity-50',
        )}
      >
        <Slider.Track className="relative h-1 grow rounded-full bg-muted">
          <Slider.Range className="absolute h-full rounded-full bg-primary" />
        </Slider.Track>
        <Slider.Thumb
          aria-label={minLabel}
          className={cn(
            'block size-4 rounded-full border-2 border-primary bg-background transition-colors',
            'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
            'disabled:pointer-events-none',
          )}
        />
        <Slider.Thumb
          aria-label={maxLabel}
          className={cn(
            'block size-4 rounded-full border-2 border-primary bg-background transition-colors',
            'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
            'disabled:pointer-events-none',
          )}
        />
      </Slider.Root>
    </div>
  );
};

export { RangeSlider };
