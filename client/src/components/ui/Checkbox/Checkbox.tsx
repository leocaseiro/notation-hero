import { Checkbox as CheckboxPrimitive } from 'radix-ui';
import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Checkbox built on Radix `Checkbox`. Renders a Material Symbols glyph in the
 * indicator — `check` when checked, and `remove` (a horizontal bar) when
 * indeterminate (the tri-state a Radix checkbox supports for "some but not all
 * children selected"). The glyph follows the rendered `data-state`, so it is
 * correct for both the controlled (`checked="indeterminate"`) and uncontrolled
 * (`defaultChecked="indeterminate"`) paths. Pair it with a label via a shared
 * `id`/`htmlFor` so clicking the text toggles the box. Radix renders the
 * accessible `role="checkbox"` on an underlying button.
 */
const Checkbox = ({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) => (
  <CheckboxPrimitive.Root
    data-slot="checkbox"
    className={cn(
      'group/checkbox peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary dark:data-[state=indeterminate]:bg-primary',
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator
      data-slot="checkbox-indicator"
      className="flex items-center justify-center text-current"
    >
      <span
        className="material-symbols-outlined hidden text-[1rem] group-data-[state=checked]/checkbox:inline"
        aria-hidden="true"
      >
        check
      </span>
      <span
        className="material-symbols-outlined hidden text-[1rem] group-data-[state=indeterminate]/checkbox:inline"
        aria-hidden="true"
      >
        remove
      </span>
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
);

export { Checkbox };
