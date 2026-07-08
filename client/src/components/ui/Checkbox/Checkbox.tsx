import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Checkbox built on Base UI `Checkbox`. Renders a Material Symbols glyph in the
 * indicator — `check` when checked, and `remove` (a horizontal bar) when
 * indeterminate ("some but not all children selected"; in Base UI this is the
 * separate boolean `indeterminate` prop layered over the boolean `checked`
 * state, not a `checked` value). The glyph follows the rendered `data-checked`
 * / `data-indeterminate` attributes, so it is correct for both the controlled
 * and uncontrolled paths. Pair it with a label via a shared `id`/`htmlFor` so
 * clicking the text toggles the box (the `id` lands on the hidden `<input>`
 * Base UI renders beside the `<span role="checkbox">`; the span's accessible
 * name resolves through the auto-wired `aria-labelledby`). Because the visible
 * element is a span, disabled styling keys off `data-disabled`, never the
 * `:disabled` pseudo-class.
 */
const Checkbox = ({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) => (
  <CheckboxPrimitive.Root
    data-slot="checkbox"
    className={cn(
      // `flex` matters: the root is a <span>, and width/height are ignored on
      // display:inline — without it the box collapses to a text-sized sliver.
      'group/checkbox peer relative flex size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-disabled:cursor-not-allowed data-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground data-indeterminate:border-primary data-indeterminate:bg-primary data-indeterminate:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-checked:bg-primary dark:data-indeterminate:bg-primary',
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
      {/* The global `.material-symbols-outlined` rule is *unlayered*, so it beats Tailwind's
          layered utilities for both `display` and `font-size`. Hence: (1) an icon span can't
          be hidden by `hidden`, so the show/hide toggle lives on a plain wrapper; (2) the
          wrapper uses `contents` (not `block`) so the glyph centres in the indicator's
          flexbox rather than baseline-aligning ~3px too high; (3) the size is forced with `!`
          to beat the unlayered `font-size` (else the glyph renders 20px and overflows). */}
      <span className="hidden group-data-checked/checkbox:contents" aria-hidden="true">
        <span className="material-symbols-outlined text-[0.875rem]!">check</span>
      </span>
      <span className="hidden group-data-indeterminate/checkbox:contents" aria-hidden="true">
        <span className="material-symbols-outlined text-[0.875rem]!">remove</span>
      </span>
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
);

export { Checkbox };
