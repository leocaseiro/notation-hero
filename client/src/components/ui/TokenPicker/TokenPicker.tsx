import { Combobox } from '@base-ui/react/combobox';
import { useState } from 'react';
import type { FilterOption } from '@/components/ui/FacetFilter/FacetFilter';
import { cn, getStorybookRootContainer } from '@/lib/utils';

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
  /** Filter suggestions in memory (Base UI Combobox). Set false for server-driven (fetch) suggestions. */
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

// Base UI's Combobox speaks a single value (or null) in single mode, an array in multiple mode —
// normalize both back to our public string[] contract.
function toValueArray(mode: 'single' | 'multiple', next: string | string[] | null): string[] {
  if (mode === 'multiple') return next as string[];
  if (next === null) return [];
  return [next as string];
}

// Inline multiple-combobox (shadcn "fancy multi-select", now on Base UI's first-class Combobox):
// selected values are removable gray badges INSIDE the box (Combobox.Chips/Chip/ChipRemove — built
// in, not hand-rolled), and you type in that same box to filter suggestions that drop below
// (arrow-key nav + Enter to toggle, teal checkmarks). Dumb + fetch-agnostic — static `options` +
// `shouldFilter` for frontend filtering, or `shouldFilter={false}` + drive `options` from a request
// keyed off `onQueryChange`. Serves Tags / Key (multi), Pattern (single).
//
// A11Y: Combobox.Input exposes role="combobox" itself here (it isn't rendered inside the popup, so
// Base UI treats the chips-row input as the combobox surface, not a Trigger button). Backspace-on-
// empty-box-removes-last-chip and the remove button not hijacking Enter/arrow-key list navigation
// are both handled natively by Combobox.Input/ChipRemove — no hand-rolled keydown guards needed.
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
  const items = options.map((option) => option.value);
  const inputPlaceholder = value.length === 0 ? placeholder : 'Add more…';

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
      <Combobox.Chips
        data-slot="token-picker"
        className={cn(
          'flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-border bg-background px-1.5 py-1 text-sm',
          'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
          className,
        )}
      >
        {value.map((token) => (
          <Combobox.Chip
            key={token}
            className="flex items-center gap-1 rounded-full bg-secondary py-0.5 pr-0.5 pl-1.5 text-secondary-foreground"
          >
            {tokenLabel(options, token)}
            <Combobox.ChipRemove
              aria-label={`Remove ${tokenLabel(options, token)}`}
              className="inline-flex items-center rounded-xs text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="material-symbols-outlined text-[1rem]" aria-hidden="true">
                close
              </span>
            </Combobox.ChipRemove>
          </Combobox.Chip>
        ))}
        <Combobox.Input
          aria-label={label}
          placeholder={inputPlaceholder}
          className="ml-1 min-w-24 flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground"
        />
      </Combobox.Chips>
      <Combobox.Portal container={getStorybookRootContainer()}>
        <Combobox.Positioner align="start" sideOffset={4} className="w-(--anchor-width)">
          <Combobox.Popup className="rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none">
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
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
};

export { TokenPicker };
