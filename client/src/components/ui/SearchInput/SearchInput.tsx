import { useRef } from 'react';
import type * as React from 'react';

import { cn } from '@/lib/utils';

interface SearchInputProps extends Omit<
  React.ComponentProps<'input'>,
  'value' | 'onChange' | 'onSubmit' | 'type'
> {
  /** Controlled search text. */
  value: string;
  /** Fires with the new text on every keystroke and on clear. */
  onChange: (value: string) => void;
  /** Optional side effect when the clear button is pressed (value is emptied regardless). */
  onClear?: () => void;
  /** Fires with the current value when the user presses Enter in the box. */
  onSubmit?: (value: string) => void;
  /** Accessible name for the search box (there is no visible label). */
  label?: string;
}

// Dumb, controlled search box: value in, onChange out. It never fetches — the parent decides
// what to do with the text (filter an in-memory list or trigger a request). Leading search glyph,
// and a clear button that appears only when there is text to clear.
const SearchInput = ({
  value,
  onChange,
  onClear,
  onSubmit,
  label = 'Search',
  placeholder = 'Search…',
  className,
  disabled,
  ...props
}: SearchInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onSubmit?.(value);
    }
  };

  const showClear = value.length > 0 && !disabled;

  return (
    <div
      data-slot="search-input"
      className={cn(
        'relative flex h-9 items-center rounded-md border border-border bg-background text-sm',
        'dark:border-input dark:bg-input/30',
        'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
        disabled && 'opacity-50',
        className,
      )}
    >
      <span
        className="material-symbols-outlined pointer-events-none absolute left-2 text-[1.125rem] text-muted-foreground"
        aria-hidden="true"
      >
        search
      </span>
      <input
        ref={inputRef}
        type="search"
        aria-label={label}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'h-full w-full rounded-md bg-transparent pr-8 pl-8 outline-none',
          'placeholder:text-muted-foreground',
          // Hide the browser's native search clear so our own button is the single affordance.
          '[&::-webkit-search-cancel-button]:appearance-none',
        )}
        {...props}
        onKeyDown={handleKeyDown}
      />
      {showClear && (
        <button
          type="button"
          data-slot="search-input-clear"
          aria-label="Clear search"
          onClick={handleClear}
          className={cn(
            'absolute right-1.5 inline-flex size-6 items-center justify-center rounded-sm',
            'text-muted-foreground hover:text-foreground',
            'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
          )}
        >
          <span className="material-symbols-outlined text-[1.125rem]" aria-hidden="true">
            close
          </span>
        </button>
      )}
    </div>
  );
};

export { SearchInput };
