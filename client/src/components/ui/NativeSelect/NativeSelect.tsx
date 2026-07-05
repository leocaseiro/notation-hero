import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Styled wrapper around a native `<select>` — a 9-unit-tall field with the house
 * form styling (rounded border, subtle shadow, focus-visible ring). The caller
 * passes the `<option>`s (and `<optgroup>`s) as `children`; native `<select>`
 * props (`value`, `defaultValue`, `onChange`, `disabled`, …) pass straight
 * through. `appearance-none` hides the platform arrow so a decorative Material
 * Symbols chevron can sit on the right (`pr-8` reserves its lane). Set
 * `aria-invalid` to switch the border and ring to the destructive colour, and
 * `disabled` to dim it (`opacity-50`) with a not-allowed cursor. Give it an
 * accessible name via `aria-label` or an associated `<label htmlFor>`.
 */
const NativeSelect = ({ className, children, ...props }: React.ComponentProps<'select'>) => (
  <div data-slot="native-select-wrapper" className="relative">
    <select
      data-slot="native-select"
      className={cn(
        'peer h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-transparent pl-3 pr-8 text-sm shadow-xs transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <span
      data-slot="native-select-icon"
      className="material-symbols-outlined pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-muted-foreground select-none peer-disabled:opacity-50"
      aria-hidden="true"
    >
      unfold_more
    </span>
  </div>
);

export { NativeSelect };
