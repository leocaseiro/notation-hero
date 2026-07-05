import { ToggleGroup } from 'radix-ui';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover/Popover';
import { cn } from '@/lib/utils';

interface LevelFilterProps {
  /** Selected maximum level (the "at most" bound). null = no bound. */
  value: number | null;
  onChange: (value: number | null) => void;
  /** Selectable levels, low → high. Default 0..10 (0 = Debut). */
  levels?: readonly number[];
  defaultOpen?: boolean;
  className?: string;
}

const DEFAULT_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

// Visible pill face: 0 reads "Debut", the rest read the number.
function levelFace(level: number): string {
  return level === 0 ? 'Debut' : String(level);
}

// Pill accessible name: never a bare digit — "Debut" for 0, "Level N" otherwise.
function levelName(level: number): string {
  return level === 0 ? 'Debut' : `Level ${level}`;
}

// Trigger text: no bound → "Level"; a bound → "Level ≤ <face>". Extracted to avoid a nested ternary.
function triggerText(value: number | null): string {
  if (value === null) {
    return 'Level';
  }
  return `Level ≤ ${levelFace(value)}`;
}

const TRIGGER_CLASSES = cn(
  'inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-sm',
  'shadow-xs hover:bg-muted aria-expanded:bg-muted',
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
);

// Level filter: a trigger opens a popover with the fixed "is at most (≤)" condition and a grid of
// single-select level pills (Debut..10) plus Clear. Dumb + controlled — `value` is the max bound,
// `onChange(null)` clears it. The ≤ operator is locked per the catalog wireframe (a selectable
// operator would be a future prop).
const LevelFilter = ({
  value,
  onChange,
  levels = DEFAULT_LEVELS,
  defaultOpen = false,
  className,
}: LevelFilterProps) => (
  <Popover defaultOpen={defaultOpen}>
    <PopoverTrigger
      type="button"
      data-slot="level-filter"
      className={cn(TRIGGER_CLASSES, className)}
    >
      <span>{triggerText(value)}</span>
      <span
        className="material-symbols-outlined text-[1.125rem] text-muted-foreground"
        aria-hidden="true"
      >
        expand_more
      </span>
    </PopoverTrigger>
    <PopoverContent className="w-64">
      <p className="px-1 pb-2 text-xs font-medium text-muted-foreground">Level is at most (≤)</p>
      <ToggleGroup.Root
        type="single"
        value={value === null ? '' : String(value)}
        onValueChange={(next) => onChange(next === '' ? null : Number(next))}
        aria-label="Maximum level"
        className="grid grid-cols-6 gap-1"
      >
        {levels.map((level) => (
          <ToggleGroup.Item
            key={level}
            value={String(level)}
            aria-label={levelName(level)}
            className={cn(
              'inline-flex h-8 items-center justify-center rounded-md border border-border text-xs font-medium tabular-nums',
              'hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
              'data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary',
              level === 0 && 'col-span-2',
            )}
          >
            {levelFace(level)}
          </ToggleGroup.Item>
        ))}
      </ToggleGroup.Root>
      {value !== null && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cn(
            'mt-2 flex w-full items-center justify-center gap-1 rounded-sm px-2 py-1.5 text-sm',
            'text-muted-foreground hover:bg-muted hover:text-foreground',
            'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
          )}
        >
          <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">
            close
          </span>
          Clear
        </button>
      )}
    </PopoverContent>
  </Popover>
);

export { LevelFilter };
