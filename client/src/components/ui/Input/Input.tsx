import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Native text `<input>` with the house form styling — a 9-unit-tall field with a
 * rounded border, subtle shadow, and a focus-visible ring. Placeholder text uses
 * the muted foreground; `file:` selectors style the button of a file input. Set
 * `aria-invalid` to switch the border and ring to the destructive colour, and
 * `disabled` to dim it (`opacity-50`) with a not-allowed cursor. Every visual
 * state is driven by `className` variants, so any `<input>` prop (`type`,
 * `value`, `onChange`, …) passes straight through.
 */
const Input = ({ className, ...props }: React.ComponentProps<'input'>) => (
  <input
    data-slot="input"
    className={cn(
      'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30',
      'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
      'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
      className,
    )}
    {...props}
  />
);

export { Input };
