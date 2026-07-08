import { Slider } from '@base-ui/react/slider';

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

// Dumb, controlled dual-thumb range slider: [min, max] in, onChange out. Base UI owns the
// interaction model (roving focus, arrow-key stepping, the slider semantics); this wrapper only
// adds the rail/range/thumb look, the visible readout, and the data-slot hook. The two thumbs are
// the real controls — the readout is aria-hidden so a screen reader hears the thumbs'
// aria-valuenow/min/max, not a duplicated line. Each thumb carries its own aria-label so axe sees
// two named sliders. Each `Thumb` needs an explicit `index` (Base UI doesn't infer thumb order
// from DOM position the way Radix did).
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
        onValueChange={(next) => onChange([next[0], next[1]])}
        min={min}
        max={max}
        step={step}
        minStepsBetweenValues={0}
        disabled={disabled}
        className={cn(
          'relative flex h-5 w-full touch-none items-center select-none',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <Slider.Control className="flex w-full items-center">
          <Slider.Track className="relative h-1 grow rounded-full bg-muted">
            <Slider.Indicator className="absolute h-full rounded-full bg-primary" />
            {/* Thumbs: grab cursor + teal fill while dragging (:active); disabled keys off Base UI's
                data-disabled (a <span> can't match :disabled), which also suppresses the hover ring. */}
            <Slider.Thumb
              index={0}
              aria-label={minLabel}
              className={cn(
                'block size-4 cursor-grab rounded-full border-2 border-primary bg-background transition-[box-shadow,background-color]',
                'hover:ring-4 hover:ring-ring/30',
                // Base UI's thumb is a styled div wrapping a real (visually-hidden) native
                // `<input type="range">` — the input receives focus, not this div, so a plain
                // `focus-visible:` utility here would never match; `has-focus-visible:` reads the
                // nested input's focus state instead.
                'has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-focus-visible:outline-none',
                'active:cursor-grabbing active:bg-primary',
                'data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed',
              )}
            />
            <Slider.Thumb
              index={1}
              aria-label={maxLabel}
              className={cn(
                'block size-4 cursor-grab rounded-full border-2 border-primary bg-background transition-[box-shadow,background-color]',
                'hover:ring-4 hover:ring-ring/30',
                // Base UI's thumb is a styled div wrapping a real (visually-hidden) native
                // `<input type="range">` — the input receives focus, not this div, so a plain
                // `focus-visible:` utility here would never match; `has-focus-visible:` reads the
                // nested input's focus state instead.
                'has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-focus-visible:outline-none',
                'active:cursor-grabbing active:bg-primary',
                'data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed',
              )}
            />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
    </div>
  );
};

export { RangeSlider };
