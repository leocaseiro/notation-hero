import { useRender } from '@base-ui/react/use-render';
import type * as React from 'react';

import { buttonVariants } from '@/components/ui/Button/Button';
import { cn } from '@/lib/utils';

// Breadcrumb — faithful shadcn/ui port. Primitive-free markup (nav > ol > li); `BreadcrumbLink`
// uses Base UI's `useRender` (migrated from Radix `Slot`) for `asChild`-equivalent composition
// with a router `<Link>`. Lucide's ChevronRight / MoreHorizontal are swapped for the repo's
// self-hosted Material Symbols glyphs.

const Breadcrumb = (props: React.ComponentProps<'nav'>) => (
  <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />
);

const BreadcrumbList = ({ className, ...props }: React.ComponentProps<'ol'>) => (
  <ol
    data-slot="breadcrumb-list"
    className={cn(
      'text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5',
      className,
    )}
    {...props}
  />
);

const BreadcrumbItem = ({ className, ...props }: React.ComponentProps<'li'>) => (
  <li
    data-slot="breadcrumb-item"
    className={cn('inline-flex items-center gap-1.5', className)}
    {...props}
  />
);

const BreadcrumbLink = ({ className, render, ...props }: useRender.ComponentProps<'a'>) =>
  useRender({
    defaultTagName: 'a',
    render,
    props: {
      'data-slot': 'breadcrumb-link',
      // Reuses the Button `link` variant as the single source of truth for the teal brand hover +
      // underline-on-hover + dark-mode AA contrast (see Button.tsx) instead of a second hardcoded
      // copy. `h-auto p-0 gap-0` reset Button's own box model (height/padding/icon-gap) — a
      // breadcrumb crumb is inline text, not a button-shaped hit target.
      className: cn(buttonVariants({ variant: 'link' }), 'h-auto gap-0 p-0', className),
      ...props,
    },
  });

const BreadcrumbPage = ({ className, ...props }: React.ComponentProps<'span'>) => (
  <span
    data-slot="breadcrumb-page"
    role="link"
    aria-disabled="true"
    aria-current="page"
    className={cn('text-foreground font-normal', className)}
    {...props}
  />
);

const BreadcrumbSeparator = ({ children, className, ...props }: React.ComponentProps<'li'>) => (
  <li
    data-slot="breadcrumb-separator"
    role="presentation"
    aria-hidden="true"
    className={cn('inline-flex items-center', className)}
    {...props}
  >
    {children ?? (
      <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>
        chevron_right
      </span>
    )}
  </li>
);

const BreadcrumbEllipsis = ({ className, ...props }: React.ComponentProps<'span'>) => (
  <span
    data-slot="breadcrumb-ellipsis"
    role="presentation"
    aria-hidden="true"
    className={cn('flex size-9 items-center justify-center', className)}
    {...props}
  >
    <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>
      more_horiz
    </span>
    <span className="sr-only">More</span>
  </span>
);

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
