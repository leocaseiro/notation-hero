import { Command as CommandPrimitive } from 'cmdk';
import { useState } from 'react';
import type { FilterOption } from '@/components/ui/FacetFilter/FacetFilter';
import type { KeyboardEvent } from 'react';
import { Badge } from '@/components/ui/Badge/Badge';
import { Command, CommandEmpty, CommandItem, CommandList } from '@/components/ui/Command/Command';
import { cn } from '@/lib/utils';

interface TokenPickerProps {
  /** Accessible name for the inline search box. */
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
  /** Start with the suggestion list shown (for stories/tests). */
  defaultOpen?: boolean;
  className?: string;
}

// Chip face text: prefer the option's label, fall back to the raw value.
function tokenLabel(options: readonly FilterOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

// Inline multiple-combobox (shadcn "fancy multi-select" on cmdk): selected values are removable gray
// badges INSIDE the box, and you type in that same box to filter suggestions that drop below (arrow-key
// nav + Enter to toggle, teal checkmarks). Dumb + fetch-agnostic — static `options` + `shouldFilter`
// for frontend filtering, or `shouldFilter={false}` + drive `options` from a request keyed off
// `onQueryChange`. Serves Tags / Key (multi), Pattern (single).
//
// A11Y: cmdk pins role=combobox + aria-expanded=true + aria-controls on the input, so the listbox
// (CommandList) must always exist for the aria-controls id reference to resolve. When closed we hide
// it (axe skips hidden nodes, so a momentarily-empty list can't trip aria-required-children) rather
// than unmounting it (which would dangle aria-controls). Options click via onMouseDown-preventDefault
// so the pointer-down doesn't blur the input and close the list before onSelect fires.
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
  const [query, setQuery] = useState('');

  const handleSelect = (optionValue: string) => {
    if (mode === 'single') {
      onChange(value[0] === optionValue ? [] : [optionValue]);
    } else {
      onChange(
        value.includes(optionValue)
          ? value.filter((current) => current !== optionValue)
          : [...value, optionValue],
      );
    }
    setQuery('');
  };

  const removeToken = (tokenValue: string) => {
    onChange(value.filter((current) => current !== tokenValue));
  };

  const handleQueryChange = (next: string) => {
    setQuery(next);
    onQueryChange?.(next);
  };

  // Backspace on an empty box removes the last token — keyboard parity with the × on each badge.
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && query === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const inputPlaceholder = value.length === 0 ? placeholder : 'Add more…';

  return (
    <Command
      data-slot="token-picker"
      shouldFilter={shouldFilter}
      className="overflow-visible bg-transparent"
    >
      <div
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
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => removeToken(token)}
              className="inline-flex items-center rounded-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="material-symbols-outlined text-[1rem]" aria-hidden="true">
                close
              </span>
            </button>
          </Badge>
        ))}
        <CommandPrimitive.Input
          aria-label={label}
          value={query}
          onValueChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          placeholder={inputPlaceholder}
          className="ml-1 min-w-24 flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <div className="relative">
        <CommandList
          className={cn(
            'absolute top-1 z-50 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md',
            !open && 'hidden',
          )}
        >
          {loading && (
            <div role="status" className="py-6 text-center text-sm text-muted-foreground">
              Loading…
            </div>
          )}
          {!loading && options.length === 0 && (
            <div role="status" className="py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          )}
          {!loading && options.length > 0 && <CommandEmpty>{emptyMessage}</CommandEmpty>}
          {!loading &&
            options.map((option) => {
              const selected = value.includes(option.value);
              return (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  disabled={option.disabled ?? false}
                  onMouseDown={(event) => event.preventDefault()}
                  onSelect={() => handleSelect(option.value)}
                >
                  {option.icon && (
                    <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">
                      {option.icon}
                    </span>
                  )}
                  <span>{option.label}</span>
                  {/* "checked", not "selected": cmdk uses aria-selected for the keyboard HIGHLIGHT,
                      so a distinct word avoids colliding when a row is highlighted + chosen. */}
                  {selected && <span className="sr-only">, checked</span>}
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
      </div>
    </Command>
  );
};

export { TokenPicker };
