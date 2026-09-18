'use client';

import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '@/lib/utils';

// CI's @source-scan guard (.github/workflows/ci.yml) greps built web CSS for one sentinel
// utility used in this component to prove the cross-package Tailwind scan ran. The class is
// named in ci.yml, NOT here — a comment token would let Tailwind regenerate it, defeating the check.
//
// Disabled styling carries BOTH selector sets: `aria-disabled:` for Button itself (it never renders
// the native attribute — see below) and `disabled:` for natively disabled elements that reuse this
// string (Pagination's <button disabled>, anything inside <fieldset disabled>). `opacity-50` also
// dims the focus ring, so the aria-disabled state doubles the ring alpha to match an enabled Button.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-disabled:focus-visible:ring-ring aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-[color-mix(in_oklch,var(--primary),black_12%)]',
        outline:
          'border-border bg-background shadow-xs hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/15 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 aria-disabled:focus-visible:ring-destructive/40 dark:bg-destructive/20 dark:hover:bg-destructive/25 dark:focus-visible:ring-destructive/40 dark:aria-disabled:focus-visible:ring-destructive/80',
        link: 'text-primary underline-offset-4 hover:text-[color-mix(in_oklch,var(--primary),black_12%)] hover:underline',
      },
      size: {
        default:
          'h-9 gap-1.5 px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),8px)] px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1 rounded-[min(var(--radius-md),10px)] px-2.5 in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5',
        lg: 'h-10 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        icon: 'size-9',
        'icon-xs':
          "size-6 rounded-[min(var(--radius-md),8px)] in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm':
          'size-8 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-md',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonProps = useRender.ComponentProps<'button'> & VariantProps<typeof buttonVariants>;

// NH-304: `disabled` renders `aria-disabled="true"`, never the native attribute, so the button
// stays in the tab order, keeps its accessible name, and accepts `ref.current.focus()`. The
// component blocks activation itself, so no consumer needs a guard.
//
// The activation handlers are taken OUT of `props` and passed on only while enabled. Base UI's
// mergeProps runs the rightmost handler first and the consumer's props are rightmost, so a guard
// merged beside them would run after the consumer's handler had already fired. Props from a
// Base UI trigger (`<MenuTrigger render={<Button disabled />}>`) arrive here the same way, so the
// trigger is blocked too. `pointer-events-none` (in buttonVariants) is part of the guard: hover-open
// popups attach native listeners through the ref, which no prop guard can withhold.
const Button = ({
  className,
  variant = 'default',
  size = 'default',
  render,
  disabled = false,
  onClick,
  onKeyDown,
  onKeyUp,
  onMouseDown,
  onPointerDown,
  ...props
}: ButtonProps) =>
  useRender({
    defaultTagName: 'button',
    render,
    props: mergeProps<'button'>(
      {
        className: cn(buttonVariants({ variant, size, className })),
      },
      {
        'data-slot': 'button',
        'data-variant': variant,
        'data-size': size,
      } as React.ComponentPropsWithRef<'button'>,
      props,
      // Last, so `aria-disabled: true` wins over a spread `aria-disabled={false}`.
      disabled
        ? {
            'aria-disabled': true,
            // The click guard does the work: mouse, Enter, Space, a programmatic .click(), a
            // form's implicit submission and a press that began while enabled all arrive as a click.
            onClick: (event) => event.preventDefault(),
            // Second layer — stop Enter/Space from producing a click. Every other key keeps its
            // default action: Tab leaves, Escape bubbles, arrow keys scroll.
            onKeyDown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') event.preventDefault();
            },
          }
        : { onClick, onKeyDown, onKeyUp, onMouseDown, onPointerDown },
    ),
  });

export { Button, buttonVariants };
