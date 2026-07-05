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
      'group/checkbox peer relative size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary dark:data-[state=indeterminate]:bg-primary',
      className,
    )}
    {...props}
  >
    {/* Indicator is taken out of flow (`absolute inset-0`, Root is `relative`) so the
        glyph does not sit in the box's inline flow: an in-flow indicator shifts the
        box's baseline between the empty (unchecked) and filled (checked) states, so the
        box would jump vertically next to adjacent text. Out of flow, the box aligns the
        same in every state. */}
    <CheckboxPrimitive.Indicator
      data-slot="checkbox-indicator"
      className="absolute inset-0 flex items-center justify-center text-current"
    >
      {/* Toggle visibility on a plain wrapper, not the icon span itself: the global
          `.material-symbols-outlined` rule sets `display` *unlayered*, which in the CSS
          cascade beats Tailwind's layered `hidden`/`block` utilities — so a
          `.material-symbols-outlined` span cannot be hidden directly (both glyphs would
          show at once). The wrapper carries no such rule, so the data-state toggle works
          and exactly one glyph renders per state. */}
      <span className="hidden group-data-[state=checked]/checkbox:block" aria-hidden="true">
        <span className="material-symbols-outlined text-[1rem]">check</span>
      </span>
      <span className="hidden group-data-[state=indeterminate]/checkbox:block" aria-hidden="true">
        <span className="material-symbols-outlined text-[1rem]">remove</span>
      </span>
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
);

export { Checkbox };
