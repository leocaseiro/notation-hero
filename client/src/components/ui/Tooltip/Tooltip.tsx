import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import type * as React from 'react';

import { cn } from '@/lib/utils';

// Tooltip — shadcn/ui port over Base UI (migrated from Radix). The enter/exit `animate-*`
// classes shadcn ships are omitted here because the repo has no animation plugin
// (tw-animate-css); the tooltip is otherwise identical. Base UI moves the show/hide delay from
// the Radix Provider onto the Trigger, so `delay`/`closeDelay` default to 0 there (Radix's
// `delayDuration = 0` showed immediately) — still overridable per trigger.

const TooltipProvider = (props: React.ComponentProps<typeof TooltipPrimitive.Provider>) => (
  <TooltipPrimitive.Provider data-slot="tooltip-provider" {...props} />
);

const Tooltip = (props: React.ComponentProps<typeof TooltipPrimitive.Root>) => (
  <TooltipProvider>
    <TooltipPrimitive.Root data-slot="tooltip" {...props} />
  </TooltipProvider>
);

const TooltipTrigger = ({
  delay = 0,
  closeDelay = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) => (
  <TooltipPrimitive.Trigger
    data-slot="tooltip-trigger"
    delay={delay}
    closeDelay={closeDelay}
    {...props}
  />
);

const TooltipContent = ({
  className,
  sideOffset = 0,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Positioner>) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Positioner data-slot="tooltip-positioner" sideOffset={sideOffset} {...props}>
      <TooltipPrimitive.Popup
        data-slot="tooltip-content"
        className={cn(
          'bg-primary text-primary-foreground z-50 w-fit origin-(--transform-origin) rounded-md px-3 py-1.5 text-xs text-balance',
          className,
        )}
      >
        {children}
        {/* Base UI's arrow middleware only positions the cross axis inline (top OR left, never
            both) — unlike Radix, it does not attach the arrow to the popup's facing edge. The
            data-[side=*] classes below supply that missing edge offset (verified against
            shadcn's own Base UI tooltip.tsx registry source). */}
        <TooltipPrimitive.Arrow
          className={cn(
            'bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]',
            'data-[side=top]:-bottom-2.5 data-[side=bottom]:top-1',
            'data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2',
            'data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2',
          )}
        />
      </TooltipPrimitive.Popup>
    </TooltipPrimitive.Positioner>
  </TooltipPrimitive.Portal>
);

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
