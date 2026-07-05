import { useState } from 'react';
import { Badge } from '@/components/ui/Badge/Badge';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/Command/Command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover/Popover';
import { cn } from '@/lib/utils';

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
  /** Filter the options in memory (cmdk). Set false for server-driven (fetch) results. */
  shouldFilter?: boolean;
  /** Fetch-mode loading row. */
  loading?: boolean;
  emptyMessage?: string;
  /** Trigger leading icon (Material Symbols ligature). */
  icon?: string;
  defaultOpen?: boolean;
  className?: string;
}

const TRIGGER_CLASSES = cn(
  'inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-sm',
  'shadow-xs hover:bg-muted aria-expanded:bg-muted',
  'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
);

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

// Accessible filter dropdown: a trigger chip opens a cmdk combobox (arrow-key nav, Enter/Space to
// toggle, teal checkmarks). Keeps the Jira-style layout but fixes keyboard selection. Dumb +
// fetch-agnostic — static `options` + `shouldFilter` for frontend filtering, or `shouldFilter={false}`
// + drive `options` from a request keyed off `onQueryChange`.
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

  const toggle = (optionValue: string) => {
    if (mode === 'single') {
      onChange(value[0] === optionValue ? [] : [optionValue]);
      setOpen(false);
      return;
    }
    onChange(
      value.includes(optionValue)
        ? value.filter((current) => current !== optionValue)
        : [...value, optionValue],
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        data-slot="facet-filter"
        className={cn(TRIGGER_CLASSES, className)}
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
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0">
        <Command shouldFilter={shouldFilter}>
          <CommandInput
            aria-label={`Search ${label}`}
            placeholder="Search…"
            onValueChange={(next) => onQueryChange?.(next)}
          />
          <CommandList>
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading…</div>
            )}
            {!loading && <CommandEmpty>{emptyMessage}</CommandEmpty>}
            {!loading &&
              options.map((option) => {
                const selected = value.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    disabled={option.disabled ?? false}
                    onSelect={() => toggle(option.value)}
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
                    {selected && <span className="sr-only">, selected</span>}
                    {selected && (
                      <span
                        className="material-symbols-outlined ml-auto text-[1.125rem] text-primary"
                        aria-hidden="true"
                      >
                        check
                      </span>
                    )}
                  </CommandItem>
                );
              })}
          </CommandList>
          {value.length > 0 && (
            <div className="border-t border-border p-1">
              <button
                type="button"
                onClick={() => onChange([])}
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
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export { FacetFilter };
