import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Composable card built from plain `<div>`s (no primitive library). Compose the
 * parts to taste: `CardHeader` (with `CardTitle`, `CardDescription`, and an
 * optional `CardAction` that floats top-right), `CardContent`, and `CardFooter`.
 * Each part carries its own `data-slot` so the header can react to the presence
 * of an action (`has-data-[slot=card-action]:`) and the footer/header borders
 * add their own padding when a divider class is applied.
 */
const Card = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div
    data-slot="card"
    className={cn(
      'flex flex-col gap-6 rounded-xl border border-border bg-card py-6 text-card-foreground shadow-sm dark:border-input',
      className,
    )}
    {...props}
  />
);

// Header grid — a container-query context (`@container/card-header`) that grows a
// second column for a `CardAction` only when one is present, and adds bottom
// padding when the header also carries a bottom border.
const CardHeader = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div
    data-slot="card-header"
    className={cn(
      '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
      className,
    )}
    {...props}
  />
);

// Card heading — semibold, tight leading so it sits close to the description.
const CardTitle = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div data-slot="card-title" className={cn('leading-none font-semibold', className)} {...props} />
);

// Muted supporting copy beneath the title.
const CardDescription = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div
    data-slot="card-description"
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
);

// Top-right action slot — pinned to the header grid's second column, spanning the
// title + description rows so a button lines up with the heading block.
const CardAction = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div
    data-slot="card-action"
    className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
    {...props}
  />
);

// Main body — matches the header/footer horizontal padding.
const CardContent = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div data-slot="card-content" className={cn('px-6', className)} {...props} />
);

// Footer row — flex so actions align on a single baseline; adds top padding when
// a top border is present.
const CardFooter = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div
    data-slot="card-footer"
    className={cn('flex items-center px-6 [.border-t]:pt-6', className)}
    {...props}
  />
);

export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter };
