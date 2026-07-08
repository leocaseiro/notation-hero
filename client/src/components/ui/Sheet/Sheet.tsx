import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';
import type * as React from 'react';

import { cn } from '@/lib/utils';

// Sheet — shadcn/ui port over Base UI Dialog (migrated from Radix). An off-canvas panel that
// slides in from an edge (`side`). shadcn's enter/exit `animate-in/out` + slide/fade classes are
// omitted (the repo has no animation plugin); positioning, sizing, the overlay scrim, and the
// token classes are otherwise identical. Lucide's `X` close glyph is swapped for the self-hosted
// Material Symbols `close`. A dialog needs a title for a11y, so always render `SheetTitle`
// (visually hidden via `sr-only` if the design has no visible heading). Base UI's `modal` is
// tri-state (`true` | `false` | `'trap-focus'`) and defaults to `true` (full dialog semantics:
// focus trap + scroll lock + outside pointer events disabled).

const Sheet = (props: React.ComponentProps<typeof SheetPrimitive.Root>) => (
  <SheetPrimitive.Root data-slot="sheet" {...props} />
);

const SheetTrigger = (props: React.ComponentProps<typeof SheetPrimitive.Trigger>) => (
  <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
);

const SheetClose = (props: React.ComponentProps<typeof SheetPrimitive.Close>) => (
  <SheetPrimitive.Close data-slot="sheet-close" {...props} />
);

const SheetPortal = (props: React.ComponentProps<typeof SheetPrimitive.Portal>) => (
  <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
);

const SheetOverlay = ({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Backdrop>) => (
  <SheetPrimitive.Backdrop
    data-slot="sheet-overlay"
    className={cn('fixed inset-0 z-50 bg-black/50', className)}
    {...props}
  />
);

const SheetContent = ({
  className,
  children,
  side = 'right',
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Popup> & {
  side?: 'top' | 'right' | 'bottom' | 'left';
}) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Popup
      data-slot="sheet-content"
      // outline-none: Base UI can focus the Popup itself on open (tabindex=-1), which would
      // otherwise draw the UA's blue focus ring around the whole panel.
      className={cn(
        // border-border/dark:border-input named explicitly (Button outline palette) — Tailwind
        // v4's bare border-* falls back to currentColor, the "too dark" edge from Leo's review.
        'bg-background border-border dark:border-input fixed z-50 flex flex-col gap-4 shadow-lg outline-none',
        side === 'right' && 'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
        side === 'left' && 'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
        side === 'top' && 'inset-x-0 top-0 h-auto border-b',
        side === 'bottom' && 'inset-x-0 bottom-0 h-auto border-t',
        className,
      )}
      {...props}
    >
      {children}
      <SheetPrimitive.Close
        data-slot="sheet-close"
        className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none"
      >
        <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>
          close
        </span>
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Popup>
  </SheetPortal>
);

const SheetHeader = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div data-slot="sheet-header" className={cn('flex flex-col gap-1.5 p-4', className)} {...props} />
);

const SheetFooter = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div
    data-slot="sheet-footer"
    className={cn('mt-auto flex flex-col gap-2 p-4', className)}
    {...props}
  />
);

const SheetTitle = ({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) => (
  <SheetPrimitive.Title
    data-slot="sheet-title"
    className={cn('text-foreground font-semibold', className)}
    {...props}
  />
);

const SheetDescription = ({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) => (
  <SheetPrimitive.Description
    data-slot="sheet-description"
    className={cn('text-muted-foreground text-sm', className)}
    {...props}
  />
);

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
