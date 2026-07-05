import { Popover as PopoverPrimitive } from 'radix-ui';
import type * as React from 'react';

import { cn } from '@/lib/utils';

// Styled wrapper over Radix Popover. Content renders INLINE (no Portal) so it stays inside the
// Storybook story root — that keeps the open panel in scope for the axe a11y sweep and the VR
// snapshot (both scoped to #storybook-root), and is what FacetFilter / TokenPicker / LevelFilter use.
// CONSUMER CONSTRAINT: because the content is not portalled, do NOT nest these inside an
// `overflow-hidden`/`auto`/`scroll` ancestor — the floating panel will clip to it. If a
// horizontally-scrolling filter row is ever needed, let that row overflow visibly, or add a
// `portal?` prop here (defaulting to inline for the test path) so real pages can opt into a portal.
const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;
const PopoverClose = PopoverPrimitive.Close;

const PopoverContent = ({
  className,
  align = 'start',
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) => (
  <PopoverPrimitive.Content
    data-slot="popover-content"
    align={align}
    sideOffset={sideOffset}
    className={cn(
      'z-50 w-64 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md outline-none',
      // When the panel itself takes focus (content with no focusable child), show a ring so keyboard
      // users see where focus landed instead of it appearing "lost".
      'focus-visible:ring-3 focus-visible:ring-ring/50',
      className,
    )}
    {...props}
  />
);

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor, PopoverClose };
