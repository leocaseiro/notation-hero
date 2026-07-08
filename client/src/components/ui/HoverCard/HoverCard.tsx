import { PreviewCard as HoverCardPrimitive } from '@base-ui/react/preview-card';
import type * as React from 'react';

import { cn } from '@/lib/utils';

// HoverCard — shadcn/ui port over Base UI's PreviewCard (migrated from Radix; Base UI renamed the
// primitive). shadcn's enter/exit `animate-*` / `data-open:*` classes are omitted because the repo
// has no animation plugin (tw-animate-css); positioning, z-index, sizing, and the token classes
// are otherwise identical. Base UI moves the open/close delays from the Radix Root onto the
// Trigger; its defaults (600ms open / 300ms close) stay — near Radix's 700/300 — and remain
// overridable per trigger.

const HoverCard = (props: React.ComponentProps<typeof HoverCardPrimitive.Root>) => (
  <HoverCardPrimitive.Root data-slot="hover-card" {...props} />
);

const HoverCardTrigger = (props: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) => (
  <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
);

const HoverCardContent = ({
  className,
  side = 'bottom',
  sideOffset = 4,
  align = 'center',
  alignOffset = 0,
  ...props
}: HoverCardPrimitive.Popup.Props &
  Pick<HoverCardPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>) => (
  <HoverCardPrimitive.Portal data-slot="hover-card-portal">
    <HoverCardPrimitive.Positioner
      data-slot="hover-card-positioner"
      side={side}
      sideOffset={sideOffset}
      align={align}
      alignOffset={alignOffset}
      className="isolate z-50"
    >
      <HoverCardPrimitive.Popup
        data-slot="hover-card-content"
        className={cn(
          'bg-popover text-popover-foreground z-50 w-64 origin-(--transform-origin) rounded-md border border-border dark:border-input p-4 shadow-md outline-hidden',
          className,
        )}
        {...props}
      />
    </HoverCardPrimitive.Positioner>
  </HoverCardPrimitive.Portal>
);

export { HoverCard, HoverCardTrigger, HoverCardContent };
