import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area';
import type * as React from 'react';

import { cn } from '@/lib/utils';

// ScrollArea — shadcn/ui port over Base UI (migrated from Radix). A custom-scrollbar container.
// `orientation` picks the bar axis (default `vertical`, like shadcn; the player's horizontal
// control/section strip passes `horizontal`) and is forwarded to the `ScrollBar`; the bar is
// themed via the `border`/`bg-border` tokens. Dumb/presentational — it scrolls whatever children
// overflow it. Radix's `type` prop is gone: Base UI mounts the bar whenever the viewport has
// measurable overflow and unmounts it otherwise (pass `keepMounted` on `ScrollBar` to pin it).
// The Base UI `Content` part wraps the children so horizontal overflow is measured correctly.
const ScrollArea = ({
  className,
  children,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  orientation?: 'vertical' | 'horizontal';
}) => (
  <ScrollAreaPrimitive.Root
    data-slot="scroll-area"
    className={cn('relative', className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport
      data-slot="scroll-area-viewport"
      // Base UI manages the viewport's tabIndex itself (0 only while there is overflow to
      // scroll — WCAG 2.1.1 / axe scrollable-region-focusable). The focus-visible ring classes
      // below exist for exactly that focused state.
      className="focus-visible:ring-ring/50 size-full rounded-[inherit] outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1"
    >
      <ScrollAreaPrimitive.Content data-slot="scroll-area-content">
        {children}
      </ScrollAreaPrimitive.Content>
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar orientation={orientation} />
    <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" />
  </ScrollAreaPrimitive.Root>
);

const ScrollBar = ({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Scrollbar>) => (
  <ScrollAreaPrimitive.Scrollbar
    data-slot="scroll-area-scrollbar"
    orientation={orientation}
    className={cn(
      'flex touch-none p-px transition-colors select-none',
      orientation === 'vertical' && 'h-full w-2.5 border-l border-l-transparent',
      orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent',
      className,
    )}
    {...props}
  >
    {/* Thumb follows the Button `outline` border palette (border light / input dark) so every
        line in the system reads the same weight; override via className if a surface needs more. */}
    <ScrollAreaPrimitive.Thumb
      data-slot="scroll-area-thumb"
      className="bg-border dark:bg-input relative flex-1 rounded-full"
    />
  </ScrollAreaPrimitive.Scrollbar>
);

export { ScrollArea, ScrollBar };
