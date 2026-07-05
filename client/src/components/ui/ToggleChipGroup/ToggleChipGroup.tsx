import { ToggleGroup } from 'radix-ui';

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
// (like Button `secondary`), and fills SOLID brand teal when Radix marks it data-[state=on] (like
// Button `default`). Radix owns the roving focus, arrow-key movement, and aria-pressed — this only
// paints the pill + focus ring.
const CHIP_CLASS = cn(
  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors outline-none',
  'border border-border bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_6%)]',
  'data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground',
  'focus-visible:ring-3 focus-visible:ring-ring/50',
  'disabled:pointer-events-none disabled:opacity-50',
  '[&_.material-symbols-outlined]:text-[1.125rem]',
);

// Item body is identical in both modes; only Root differs (single vs multiple have different
// value/onValueChange shapes in Radix). Rendering the items via one function keeps them in sync.
function renderChips(options: readonly ChipOption[]): React.ReactNode {
  return options.map((option) => (
    <ToggleGroup.Item
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
    </ToggleGroup.Item>
  ));
}

// Dumb, controlled group of toggle chips. The PUBLIC API is always a string[]; Radix's single
// mode speaks a bare string, so we convert only at that boundary (below) and never leak it out.
// Serves the catalog Skill and Time-signature filters (NH-254).
const ToggleChipGroup = ({
  options,
  value,
  onChange,
  type = 'multiple',
  disabled,
  'aria-label': ariaLabel,
  className,
}: ToggleChipGroupProps) => {
  // Props shared by both Root branches. Optional keys are spread in only when defined so nothing
  // passes an explicit `undefined` — Radix's ToggleGroup.Root is a discriminated union and
  // exactOptionalPropertyTypes rejects an undefined-valued optional prop against a union target.
  const rootProps = {
    'data-slot': 'toggle-chip-group',
    className: cn('flex flex-wrap gap-2', className),
    ...(disabled !== undefined && { disabled }),
    ...(ariaLabel !== undefined && { 'aria-label': ariaLabel }),
  };

  // Single mode: Radix value is a string ('' when nothing is on). Map [] <-> '' at the boundary
  // so callers always deal in string[].
  if (type === 'single') {
    return (
      <ToggleGroup.Root
        type="single"
        value={value[0] ?? ''}
        onValueChange={(next) => onChange(next ? [next] : [])}
        {...rootProps}
      >
        {renderChips(options)}
      </ToggleGroup.Root>
    );
  }

  // Multiple mode: Radix already speaks string[], so it passes straight through.
  return (
    <ToggleGroup.Root type="multiple" value={value} onValueChange={onChange} {...rootProps}>
      {renderChips(options)}
    </ToggleGroup.Root>
  );
};

export { ToggleChipGroup };
