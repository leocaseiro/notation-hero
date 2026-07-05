import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover/Popover';
import { cn } from '@/lib/utils';

interface LevelRange {
  /** Lower bound ("at least"). null = unset. */
  min: number | null;
  /** Upper bound ("at most"). null = unset. */
  max: number | null;
}

interface LevelFilterProps {
  value: LevelRange;
  onChange: (next: LevelRange) => void;
  /** Selectable levels, low → high. Default 0..10 (0 = Debut). */
  levels?: readonly number[];
  defaultOpen?: boolean;
  className?: string;
}

const DEFAULT_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

// Visible face for a bound: 0 reads "Debut", the rest read the number.
function levelFace(level: number): string {
  return level === 0 ? 'Debut' : String(level);
}

// Trigger text (no nested ternary — one return per branch, single return type):
//   unset      → "Level"
//   max only   → "Level ≤ <face>"
//   min only   → "Level ≥ <face>"
//   min == max → "Level: only <face>"
//   both       → "Level: <faceMin>–<faceMax>"
function triggerText({ min, max }: LevelRange): string {
  if (min === null && max === null) {
    return 'Level';
  }
  if (min === null) {
    return `Level ≤ ${levelFace(max as number)}`;
  }
  if (max === null) {
    return `Level ≥ ${levelFace(min)}`;
  }
  if (min === max) {
    return `Level: only ${levelFace(min)}`;
  }
  return `Level: ${levelFace(min)}–${levelFace(max)}`;
}

// Parse a <select> value ('' = unset) back to a bound. Empty string clears the bound to null.
function parseBound(raw: string): number | null {
  return raw === '' ? null : Number(raw);
}

const TRIGGER_CLASSES = cn(
  'inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-sm',
  'shadow-xs hover:bg-muted aria-expanded:bg-muted',
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
);

const SELECT_CLASSES = cn(
  'h-8 w-[84px] rounded-md border border-border bg-background px-2 text-sm tabular-nums',
  'hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
);

// Level filter: a trigger opens a popover with a difficulty *range* — a Min and a Max native
// <select> (— / Debut / 1..10). Dumb + controlled: `value` is the {min,max} range, each `''`
// option maps to a null bound. Max-only = at most, min-only = at least, both = a range, equal =
// only. The container decides validity (min>max is stored as-is), per the catalog wireframe.
const LevelFilter = ({
  value,
  onChange,
  levels = DEFAULT_LEVELS,
  defaultOpen = false,
  className,
}: LevelFilterProps) => {
  const hasSelection = value.min !== null || value.max !== null;

  return (
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
      <PopoverContent className="w-64 p-0">
        <p className="px-2 pt-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          difficulty range (0 = Debut)
        </p>
        <div className="flex items-center gap-2 px-2 pt-1 pb-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase">
            Min
            <select
              aria-label="Minimum level"
              value={value.min === null ? '' : String(value.min)}
              onChange={(event) => onChange({ ...value, min: parseBound(event.target.value) })}
              className={SELECT_CLASSES}
            >
              <option value="">—</option>
              {levels.map((level) => (
                <option key={level} value={level}>
                  {levelFace(level)}
                </option>
              ))}
            </select>
          </label>
          <span className="text-muted-foreground" aria-hidden="true">
            –
          </span>
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase">
            Max
            <select
              aria-label="Maximum level"
              value={value.max === null ? '' : String(value.max)}
              onChange={(event) => onChange({ ...value, max: parseBound(event.target.value) })}
              className={SELECT_CLASSES}
            >
              <option value="">—</option>
              {levels.map((level) => (
                <option key={level} value={level}>
                  {levelFace(level)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {hasSelection && (
          <div className="border-t border-border p-1">
            <button
              type="button"
              onClick={() => onChange({ min: null, max: null })}
              className={cn(
                'flex w-full items-center justify-center gap-1 rounded-sm px-2 py-1.5 text-sm',
                'text-muted-foreground hover:bg-muted hover:text-foreground',
                'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
              )}
            >
              <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">
                close
              </span>
              Clear
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export { LevelFilter };
export type { LevelRange, LevelFilterProps };
