import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup } from '@base-ui/react/toggle-group';

import { cn } from '@/lib/utils';

export interface ChipOption {
  /** Stable value emitted through onChange. */
  value: string;
  /** Visible chip text. */
  label: string;
  /** Optional leading Material Symbols glyph name, e.g. 'timer'. */
  icon?: string;
  /** Disable just this chip (the whole group can also be disabled). */
  disabled?: boolean;
}

interface ToggleChipGroupProps {
  /** Chips to render, in order. */
  options: readonly ChipOption[];
  /** Selected values (length <= 1 when type='single'). */
  value: string[];
  /** Fires with the next selection; always a string[] regardless of type. */
  onChange: (next: string[]) => void;
  /** 'multiple' (default) lets many chips be on; 'single' keeps at most one. */
  type?: 'single' | 'multiple';
  /** Disable the whole group. */
  disabled?: boolean;
  /** Accessible name for the group (there is no visible label). */
  'aria-label'?: string;
  className?: string;
}

// Chip look shared by every item: a rounded pill that reads as "off" on a gray secondary fill
// (like Button `secondary`), and fills SOLID brand teal when Base UI marks it data-pressed (like
// Button `default`). Base UI owns the roving focus, arrow-key movement, and aria-pressed — this only
// paints the pill + focus ring.
const CHIP_CLASS = cn(
  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors outline-none',
  'border border-border bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_6%)]',
  'data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground',
  'focus-visible:ring-3 focus-visible:ring-ring/50',
  'disabled:pointer-events-none disabled:opacity-50',
  '[&_.material-symbols-outlined]:text-[1.125rem]',
);

// Dumb, controlled group of toggle chips. Base UI's ToggleGroup is always array-valued (`value`/
// `onValueChange` speak `string[]` regardless of single-vs-multiple selection, unlike Radix's bare
// string in single mode) — this already matches our public API, so `single` mode needs no
// boundary conversion, just `multiple={false}`. Serves the catalog Skill and Time-signature
// filters (NH-254).
const ToggleChipGroup = ({
  options,
  value,
  onChange,
  type = 'multiple',
  disabled,
  'aria-label': ariaLabel,
  className,
}: ToggleChipGroupProps) => (
  <ToggleGroup
    multiple={type === 'multiple'}
    value={value}
    onValueChange={(next) => onChange(next)}
    data-slot="toggle-chip-group"
    className={cn('flex flex-wrap gap-2', className)}
    {...(disabled !== undefined && { disabled })}
    {...(ariaLabel !== undefined && { 'aria-label': ariaLabel })}
  >
    {options.map((option) => (
      <Toggle
        key={option.value}
        value={option.value}
        disabled={option.disabled}
        data-slot="toggle-chip"
        className={CHIP_CLASS}
      >
        {option.icon ? (
          <span className="material-symbols-outlined" aria-hidden="true">
            {option.icon}
          </span>
        ) : null}
        {option.label}
      </Toggle>
    ))}
  </ToggleGroup>
);

export { ToggleChipGroup };
