import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Multi-line text field — a styled native `<textarea>`. `field-sizing-content`
 * grows the box to fit its content (with `min-h-16` as the floor), so it starts
 * compact and expands as the user types; pass `rows` to set a fixed initial
 * height instead. Focus shows a ring, `aria-invalid` swaps to the destructive
 * ring, and `disabled` dims and blocks input. All native textarea props pass
 * through, so it stays a drop-in for `<textarea>`.
 */
const Textarea = ({ className, ...props }: React.ComponentProps<'textarea'>) => (
  <textarea
    data-slot="textarea"
    className={cn(
      'flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40',
      className,
    )}
    {...props}
  />
);

export { Textarea };
