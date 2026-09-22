import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  // The focus classes are inert on the default (never-focusable) span; they exist so a
  // render-as-interactive badge (e.g. render={<a …/>}) gets the design-system focus ring.
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive/10 text-destructive',
        outline: 'border-border bg-transparent text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

const Badge = ({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) =>
  useRender({
    defaultTagName: 'span',
    render,
    props: mergeProps<'span'>(
      { className: cn(badgeVariants({ variant }), className) },
      { 'data-slot': 'badge' } as React.ComponentPropsWithRef<'span'>,
      props,
    ),
  });

export { Badge, badgeVariants };
