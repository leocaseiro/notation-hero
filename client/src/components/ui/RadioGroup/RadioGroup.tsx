import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Single-select radio group built on Radix `RadioGroup`. Render one
 * `RadioGroupItem` per choice and pair each with a `<label>` via matching
 * `id`/`htmlFor` (or wrap the control) so the option is clickable and named.
 * Set `defaultValue` (uncontrolled) or `value` + `onValueChange` (controlled) on
 * the group; roving focus + arrow-key navigation come from Radix. The item picks
 * up `disabled` and `aria-invalid` styling from the same props Radix forwards.
 */
const RadioGroup = ({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) => (
  <RadioGroupPrimitive.Root
    data-slot="radio-group"
    className={cn('grid gap-3', className)}
    {...props}
  />
);

/**
 * A single radio option. The filled dot is a plain CSS `<span>` (not an icon
 * font) so the visual regression snapshot stays deterministic regardless of font
 * loading. Radix renders the `Indicator` only when this item is the selected one.
 */
const RadioGroupItem = ({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) => (
  <RadioGroupPrimitive.Item
    data-slot="radio-group-item"
    className={cn(
      'relative aspect-square size-4 shrink-0 rounded-full border border-input text-primary shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40',
      className,
    )}
    {...props}
  >
    {/* Indicator is taken out of flow (`absolute inset-0`, item is `relative`) so the dot
        does not sit in the item's inline flow: an in-flow indicator shifts the item's
        baseline when selected, so an inline radio would jump vertically next to text.
        Mirrors the Checkbox indicator. */}
    <RadioGroupPrimitive.Indicator
      data-slot="radio-group-indicator"
      className="absolute inset-0 flex items-center justify-center"
    >
      <span
        data-slot="radio-group-dot"
        aria-hidden="true"
        className="size-2 rounded-full bg-primary"
      />
    </RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>
);

export { RadioGroup, RadioGroupItem };
