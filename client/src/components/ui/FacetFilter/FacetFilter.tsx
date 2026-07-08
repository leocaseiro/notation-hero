import { Combobox } from '@base-ui/react/combobox';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge/Badge';
import { Button, buttonVariants } from '@/components/ui/Button/Button';
import { cn, getStorybookRootContainer } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
  /** Optional Material Symbols ligature name shown before the label. */
  icon?: string;
  disabled?: boolean;
}

interface FacetFilterProps {
  /** Filter name shown on the trigger and used as the search box's accessible name. */
  label: string;
  options: readonly FilterOption[];
  /** Selected values (length <= 1 when mode="single"). */
  value: string[];
  onChange: (next: string[]) => void;
  mode?: 'single' | 'multiple';
  /** Fires with the search text on every keystroke (drive a request off this in fetch mode). */
  onQueryChange?: (query: string) => void;
  /** Filter the options in memory (Base UI Combobox). Set false for server-driven (fetch) results. */
  shouldFilter?: boolean;
  /** Fetch-mode loading row. */
  loading?: boolean;
  emptyMessage?: string;
  /** Trigger leading icon (Material Symbols ligature). */
  icon?: string;
  defaultOpen?: boolean;
  className?: string;
}

// The trigger reuses Button's `outline` variant tokens (via `buttonVariants` — single source of
// truth, dark-mode overrides included) on the existing `Combobox.Trigger` element, which keeps its
// role=combobox + aria-label. `outline` already carries `aria-expanded:bg-muted`, exactly the
// open-state highlight a trigger wants.
const TRIGGER_CLASSES = buttonVariants({ variant: 'outline' });

// Trigger text: single mode with a selection shows "Label: Value"; otherwise just the label (the
// gray count badge carries multi-select state). Extracted so the JSX has no nested ternary.
function selectionLabel(
  label: string,
  options: readonly FilterOption[],
  value: string[],
  mode: 'single' | 'multiple',
): string {
  if (mode === 'single' && value.length > 0) {
    const selected = options.find((option) => option.value === value[0]);
    return selected ? `${label}: ${selected.label}` : label;
  }
  return label;
}

// Selected option labels, comma-joined — feeds the trigger's hover tooltip (title) so a multi-select
// count badge can reveal WHICH options are chosen on hover without opening the popover.
function selectedSummary(options: readonly FilterOption[], value: string[]): string {
  return value.map((v) => options.find((option) => option.value === v)?.label ?? v).join(', ');
}

// Base UI's Combobox speaks a single value (or null) in single mode, an array in multiple mode —
// normalize both back to our public string[] contract.
function toValueArray(mode: 'single' | 'multiple', next: string | string[] | null): string[] {
  if (mode === 'multiple') return next as string[];
  if (next === null) return [];
  return [next as string];
}

// Accessible filter dropdown: a trigger chip opens a Base UI Combobox (arrow-key nav, Enter to
// toggle, teal checkmarks). Keeps the Jira-style layout but fixes keyboard selection. Dumb +
// fetch-agnostic — static `options` + `shouldFilter` for frontend filtering, or `shouldFilter={false}`
// + drive `options` from a request keyed off `onQueryChange`.
// Combobox's generic Value type is kept as the plain option `value` string (not the FilterOption
// object) so the public value/onChange contract stays `string[]`; label/icon/disabled are looked up
// from `options` by value inside the item renderer.
const FacetFilter = ({
  label,
  options,
  value,
  onChange,
  mode = 'multiple',
  onQueryChange,
  shouldFilter = true,
  loading = false,
  emptyMessage = 'No results',
  icon,
  defaultOpen = false,
  className,
}: FacetFilterProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const items = options.map((option) => option.value);

  // Multi-select: expose the chosen labels as a hover tooltip (title) on the count-badge trigger.
  const summary = mode === 'multiple' && value.length > 0 ? selectedSummary(options, value) : '';

  return (
    <Combobox.Root
      items={items}
      multiple={mode === 'multiple'}
      value={mode === 'multiple' ? value : (value[0] ?? null)}
      onValueChange={(next) => {
        onChange(toValueArray(mode, next));
        if (mode === 'single') setOpen(false);
      }}
      open={open}
      onOpenChange={(next) => setOpen(next)}
      filter={shouldFilter ? undefined : null}
      onInputValueChange={(next) => onQueryChange?.(next)}
    >
      <Combobox.Trigger
        type="button"
        data-slot="facet-filter"
        // Combobox.Trigger is exposed with role="combobox", not "button" — that role computes its
        // accessible name from aria-label/aria-labelledby, not subtree text content, so it needs an
        // explicit name (the visible label text alone wouldn't be picked up).
        aria-label={selectionLabel(label, options, value, mode)}
        className={cn(TRIGGER_CLASSES, className)}
        {...(summary ? { title: summary } : {})}
      >
        {icon && (
          <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">
            {icon}
          </span>
        )}
        <span>{selectionLabel(label, options, value, mode)}</span>
        {mode === 'multiple' && value.length > 0 && (
          <Badge variant="secondary" className="min-w-5 justify-center px-1">
            {value.length}
          </Badge>
        )}
        <span
          className="material-symbols-outlined text-[1.125rem] text-muted-foreground"
          aria-hidden="true"
        >
          expand_more
        </span>
      </Combobox.Trigger>
      <Combobox.Portal container={getStorybookRootContainer()}>
        <Combobox.Positioner align="start" sideOffset={6}>
          <Combobox.Popup className="w-64 overflow-hidden rounded-md border border-border bg-popover p-0 text-popover-foreground shadow-md outline-none">
            <div className="flex items-center gap-1 border-b border-border px-2">
              <span
                className="material-symbols-outlined text-[1.125rem] text-muted-foreground"
                aria-hidden="true"
              >
                search
              </span>
              <Combobox.Input
                aria-label={`Search ${label}`}
                placeholder="Search…"
                className="flex h-9 w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            {loading ? (
              <div role="status" className="py-6 text-center text-sm text-muted-foreground">
                Loading…
              </div>
            ) : (
              <>
                <Combobox.List className="max-h-60 overflow-x-hidden overflow-y-auto p-1">
                  {(item: string) => {
                    const option = options.find((candidate) => candidate.value === item);
                    if (!option) return null;
                    const selected = value.includes(option.value);
                    return (
                      <Combobox.Item
                        key={option.value}
                        value={option.value}
                        disabled={option.disabled ?? false}
                        className={cn(
                          'relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none',
                          'data-highlighted:bg-muted data-highlighted:text-foreground',
                          'data-disabled:pointer-events-none data-disabled:opacity-50',
                        )}
                      >
                        {option.icon && (
                          <span
                            className="material-symbols-outlined text-[1.125rem]"
                            aria-hidden="true"
                          >
                            {option.icon}
                          </span>
                        )}
                        <span>{option.label}</span>
                        {selected && <span className="sr-only">, checked</span>}
                        {selected && (
                          <span
                            className="material-symbols-outlined ml-auto text-[1.125rem] text-primary"
                            aria-hidden="true"
                          >
                            check
                          </span>
                        )}
                      </Combobox.Item>
                    );
                  }}
                </Combobox.List>
                <Combobox.Empty className="py-4 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </Combobox.Empty>
              </>
            )}
            {value.length > 0 && (
              <div className="border-t border-border p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange([])}
                  className="w-full justify-center text-muted-foreground"
                >
                  <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">
                    close
                  </span>
                  Clear
                </Button>
              </div>
            )}
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
};

export { FacetFilter };
