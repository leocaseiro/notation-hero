import { useState } from 'react';
import { Badge } from '@/components/ui/Badge/Badge';
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
  /** Filter name shown on the trigger and as the option-list group label. */
  label: string;
  options: readonly FilterOption[];
  /** Selected values (length <= 1 when mode="single"). */
  value: string[];
  onChange: (next: string[]) => void;
  mode?: 'single' | 'multiple';
  /** Show the in-popover search box. */
  searchable?: boolean;
  /** Controlled search text (optional — the component keeps its own otherwise). */
  query?: string;
  onQueryChange?: (query: string) => void;
  /** Filter the options in memory by the query. Set false for server-driven (fetch) results. */
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
// count badge carries the multi-select state). Extracted so the JSX has no nested ternary.
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

// Jira-style filter dropdown: a trigger chip opens a popover with a search box over a native
// checkbox (multiple) or radio (single) list. Dumb + fetch-agnostic — pass a static `options` and
// keep `shouldFilter` on for in-memory filtering, or set `shouldFilter={false}` and drive `options`
// from a request keyed off `onQueryChange`.
const FacetFilter = ({
  label,
  options,
  value,
  onChange,
  mode = 'multiple',
  searchable = true,
  query,
  onQueryChange,
  shouldFilter = true,
  loading = false,
  emptyMessage = 'No results',
  icon,
  defaultOpen = false,
  className,
}: FacetFilterProps) => {
  const [internalQuery, setInternalQuery] = useState('');
  const effectiveQuery = query ?? internalQuery;

  const handleQueryChange = (next: string) => {
    setInternalQuery(next);
    onQueryChange?.(next);
  };

  const visibleOptions = shouldFilter
    ? options.filter((option) => option.label.toLowerCase().includes(effectiveQuery.toLowerCase()))
    : options;

  const toggle = (optionValue: string) => {
    if (mode === 'single') {
      onChange(value[0] === optionValue ? [] : [optionValue]);
      return;
    }
    onChange(
      value.includes(optionValue)
        ? value.filter((current) => current !== optionValue)
        : [...value, optionValue],
    );
  };

  return (
    <Popover defaultOpen={defaultOpen}>
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
        {searchable && (
          <div className="border-b border-border p-2">
            <input
              type="text"
              aria-label={`Search ${label}`}
              value={effectiveQuery}
              placeholder="Search…"
              onChange={(event) => handleQueryChange(event.target.value)}
              className={cn(
                'h-8 w-full rounded-sm bg-transparent px-2 text-sm outline-none',
                'placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50',
              )}
            />
          </div>
        )}
        <div role="group" aria-label={label} className="max-h-60 overflow-y-auto p-1">
          {loading && <p className="px-2 py-1.5 text-sm text-muted-foreground">Loading…</p>}
          {!loading && visibleOptions.length === 0 && (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">{emptyMessage}</p>
          )}
          {!loading &&
            visibleOptions.map((option) => (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted',
                  option.disabled && 'pointer-events-none opacity-50',
                )}
              >
                <input
                  type={mode === 'single' ? 'radio' : 'checkbox'}
                  name={`facet-${label}`}
                  checked={value.includes(option.value)}
                  disabled={option.disabled}
                  onChange={() => toggle(option.value)}
                  className="size-4 accent-primary"
                />
                {option.icon && (
                  <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">
                    {option.icon}
                  </span>
                )}
                <span>{option.label}</span>
              </label>
            ))}
        </div>
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
      </PopoverContent>
    </Popover>
  );
};

export { FacetFilter };
