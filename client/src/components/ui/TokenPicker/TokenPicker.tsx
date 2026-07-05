import { useRef, useState } from 'react';
import type { FilterOption } from '@/components/ui/FacetFilter/FacetFilter';
import type * as React from 'react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/Popover/Popover';
import { cn } from '@/lib/utils';

interface TokenPickerProps {
  /** Accessible name for the text input (there is no visible label). */
  label: string;
  options: readonly FilterOption[];
  /** Selected token values (length <= 1 when mode="single"). */
  value: string[];
  onChange: (next: string[]) => void;
  mode?: 'single' | 'multiple';
  /** Controlled search text (optional). */
  query?: string;
  onQueryChange?: (query: string) => void;
  /** Filter suggestions in memory. Set false for server-driven (fetch) suggestions. */
  shouldFilter?: boolean;
  loading?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  /** Allow adding a free-text token that is not in `options` (e.g. user tags). */
  allowCreate?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

// Chip face text: prefer the option's label, fall back to the raw value (free-created tokens).
function tokenLabel(options: readonly FilterOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

// Typeahead + removable chips. Dumb + fetch-agnostic: pass static `options` with `shouldFilter`
// on for in-memory suggestions, or `shouldFilter={false}` and drive `options` from a request keyed
// off `onQueryChange`. Serves the catalog Tags / Key (multiple) and Pattern (single) filters.
const TokenPicker = ({
  label,
  options,
  value,
  onChange,
  mode = 'multiple',
  query,
  onQueryChange,
  shouldFilter = true,
  loading = false,
  placeholder = 'Add…',
  emptyMessage = 'No matches',
  allowCreate = false,
  defaultOpen = false,
  className,
}: TokenPickerProps) => {
  const [internalQuery, setInternalQuery] = useState('');
  const [open, setOpen] = useState(defaultOpen);
  const inputRef = useRef<HTMLInputElement>(null);
  const effectiveQuery = query ?? internalQuery;

  const setQuery = (next: string) => {
    setInternalQuery(next);
    onQueryChange?.(next);
  };

  const available = options.filter((option) => !value.includes(option.value));
  const suggestions = shouldFilter
    ? available.filter((option) =>
        option.label.toLowerCase().includes(effectiveQuery.toLowerCase()),
      )
    : available;

  const trimmed = effectiveQuery.trim();
  const canCreate =
    allowCreate && trimmed.length > 0 && !options.some((option) => option.value === trimmed);

  const addToken = (tokenValue: string) => {
    if (mode === 'single') {
      onChange([tokenValue]);
    } else if (!value.includes(tokenValue)) {
      onChange([...value, tokenValue]);
    }
    setQuery('');
    inputRef.current?.focus();
  };

  const removeToken = (tokenValue: string) => {
    onChange(value.filter((current) => current !== tokenValue));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const [topSuggestion] = suggestions;
      if (topSuggestion) {
        addToken(topSuggestion.value);
      } else if (canCreate) {
        addToken(trimmed);
      }
      return;
    }
    const lastToken = value.at(-1);
    if (event.key === 'Backspace' && effectiveQuery === '' && lastToken !== undefined) {
      removeToken(lastToken);
      return;
    }
    if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const showEmpty = !loading && suggestions.length === 0 && !canCreate;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          data-slot="token-picker"
          className={cn(
            'flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-border bg-background px-1.5 py-1 text-sm',
            'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
            className,
          )}
        >
          {value.map((token) => (
            <span
              key={token}
              className="inline-flex items-center gap-1 rounded-sm bg-secondary py-0.5 pr-0.5 pl-1.5 text-xs text-secondary-foreground"
            >
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
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            aria-label={label}
            value={effectiveQuery}
            placeholder={placeholder}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className="min-w-24 flex-1 bg-transparent px-1 py-0.5 outline-none placeholder:text-muted-foreground"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="w-64 p-1"
      >
        {loading && <p className="px-2 py-1.5 text-sm text-muted-foreground">Loading…</p>}
        {showEmpty && <p className="px-2 py-1.5 text-sm text-muted-foreground">{emptyMessage}</p>}
        {!loading &&
          suggestions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => addToken(option.value)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
            >
              {option.icon && (
                <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">
                  {option.icon}
                </span>
              )}
              {option.label}
            </button>
          ))}
        {!loading && canCreate && (
          <button
            type="button"
            onClick={() => addToken(trimmed)}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
          >
            <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">
              add
            </span>
            Add “{trimmed}”
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
};

export { TokenPicker };
