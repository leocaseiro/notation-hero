import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { Button } from '@/components/ui/Button/Button';
import { cn } from '@/lib/utils';

/**
 * Composable text field that wraps an input with prefix/suffix addons — an icon,
 * a unit label, or a trailing action button — inside one bordered container.
 * Compose it from `InputGroupInput` (the field) plus `InputGroupAddon` slots that
 * hold `InputGroupText`, a Material Symbols glyph, or an `InputGroupButton`. The
 * container owns the border, shadow, and focus ring: it lights the ring when the
 * inner input is focus-visible (`has-[input:focus-visible]`) and turns the border
 * destructive when the input is `aria-invalid`, so the group reads as one control.
 * `InputGroupInput` is its own borderless `<input>`; `InputGroupButton` renders the
 * real Button (ghost / xs) so its trailing action stays in lockstep with the Button
 * component.
 */
const InputGroup = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div
    data-slot="input-group"
    role="group"
    className={cn(
      'group/input-group relative flex w-full items-center rounded-md border border-input shadow-xs transition-[color,box-shadow] outline-none dark:bg-input/30',
      // Focus ring: driven by the group's OWN input (data-slot=input-group-input), so a
      // trailing button or an input nested in an addon does not light the whole group.
      'has-[[data-slot=input-group-input]:focus-visible]:border-ring has-[[data-slot=input-group-input]:focus-visible]:ring-[3px] has-[[data-slot=input-group-input]:focus-visible]:ring-ring/50',
      // Error state: the group's OWN aria-invalid input turns the container destructive
      // (scoped to input-group-input so a nested invalid button/element does not).
      'has-[[data-slot=input-group-input][aria-invalid=true]]:border-destructive has-[[data-slot=input-group-input][aria-invalid=true]]:ring-destructive/20 dark:has-[[data-slot=input-group-input][aria-invalid=true]]:ring-destructive/40',
      className,
    )}
    {...props}
  />
);

// Addon padding + ordering keyed off `data-align`: `inline-start` sits first with
// left padding, `inline-end` sits last with right padding. Decorative addons stay
// muted; `pointer-events-none` lets clicks fall through to the input, while an
// interactive `InputGroupButton` re-enables its own pointer events.
const inputGroupAddonVariants = cva(
  "pointer-events-none flex items-center gap-2 text-muted-foreground select-none [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        'inline-start': 'order-first pl-3',
        'inline-end': 'order-last pr-3',
      },
    },
    defaultVariants: {
      align: 'inline-start',
    },
  },
);

const InputGroupAddon = ({
  className,
  align = 'inline-start',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof inputGroupAddonVariants>) => (
  <div
    data-slot="input-group-addon"
    data-align={align}
    className={cn(inputGroupAddonVariants({ align }), className)}
    {...props}
  />
);

// Its own borderless, transparent input so it sits flush inside the group; the
// container supplies the border, background, and focus ring.
const InputGroupInput = ({ className, ...props }: React.ComponentProps<'input'>) => (
  <input
    data-slot="input-group-input"
    className={cn(
      'flex-1 border-0 bg-transparent px-3 py-1 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
);

// Small muted text for a static prefix/suffix (a protocol, unit, or currency).
const InputGroupText = ({ className, ...props }: React.ComponentProps<'span'>) => (
  <span
    data-slot="input-group-text"
    className={cn(
      "flex items-center gap-2 text-sm text-muted-foreground [&>svg:not([class*='size-'])]:size-4",
      className,
    )}
    {...props}
  />
);

// Small trailing action (clear, toggle password visibility) rendered as the real
// Button (ghost / xs) so its radius, sizing, and states can't drift from Button. The
// addon sets `pointer-events-none`, so re-enable them here; keep
// `data-slot="input-group-button"` for the VR/a11y selectors (Button's mergeProps lets
// a caller override the default data-slot), and `type="button"` so a trailing action
// never submits a surrounding form (this Button renders a bare <button>, which would
// otherwise default to type="submit").
const InputGroupButton = ({ className, ...props }: React.ComponentProps<typeof Button>) => (
  <Button
    variant="ghost"
    size="xs"
    type="button"
    data-slot="input-group-button"
    className={cn('pointer-events-auto', className)}
    {...props}
  />
);

export {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  InputGroupButton,
  inputGroupAddonVariants,
};
