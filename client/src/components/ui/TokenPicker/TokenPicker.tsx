import { useState } from 'react';
import type { FilterOption } from '@/components/ui/FacetFilter/FacetFilter';
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

interface TokenPickerProps {
  /** Accessible name for the search box and the "add" trigger. */
  label: string;
  options: readonly FilterOption[];
  /** Selected token values (length <= 1 when mode="single"). */
  value: string[];
  onChange: (next: string[]) => void;
  mode?: 'single' | 'multiple';
  /** Fires with the search text on every keystroke (drive a request off this in fetch mode). */
  onQueryChange?: (query: string) => void;
  /** Filter suggestions in memory (cmdk). Set false for server-driven (fetch) suggestions. */
  shouldFilter?: boolean;
  loading?: boolean;
  /** Placeholder shown in the box when nothing is selected. */
  placeholder?: string;
  emptyMessage?: string;
  defaultOpen?: boolean;
  className?: string;
}

// Chip face text: prefer the option's label, fall back to the raw value.
function tokenLabel(options: readonly FilterOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

// Multiple-combobox token picker (cmdk): selected values show as removable gray badges, and the
// searchable list (arrow-key nav + Enter to toggle, teal checkmarks) picks from `options`. Dumb +
// fetch-agnostic — static `options` + `shouldFilter` for frontend filtering, or `shouldFilter={false}`
// + drive `options` from a request keyed off `onQueryChange`. Serves Tags / Key (multi), Pattern (single).
const TokenPicker = ({
  label,
  options,
  value,
  onChange,
  mode = 'multiple',
  onQueryChange,
  shouldFilter = true,
  loading = false,
  placeholder = 'Add…',
  emptyMessage = 'No matches',
  defaultOpen = false,
  className,
}: TokenPickerProps) => {
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

  const removeToken = (tokenValue: string) => {
    onChange(value.filter((current) => current !== tokenValue));
  };

  return (
    <div
      data-slot="token-picker"
      className={cn(
        'flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-border bg-background px-1.5 py-1 text-sm',
        'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
        className,
      )}
    >
      {value.map((token) => (
        <Badge key={token} variant="secondary" className="gap-1 py-0.5 pr-0.5 pl-1.5">
          {tokenLabel(options, token)}
          <button
            type="button"
            aria-label={`Remove ${tokenLabel(options, token)}`}
            onClick={() => removeToken(token)}
            className="inline-flex items-center rounded-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="material-symbols-outlined text-[1rem]" aria-hidden="true">
              close
            </span>
          </button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          aria-label={label}
          className="flex min-w-24 flex-1 items-center gap-1 rounded-sm px-1 py-0.5 text-left text-muted-foreground outline-none focus-visible:text-foreground"
        >
          <span>{value.length === 0 ? placeholder : 'Add more…'}</span>
          <span className="material-symbols-outlined ml-auto text-[1.125rem]" aria-hidden="true">
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
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export { TokenPicker };
