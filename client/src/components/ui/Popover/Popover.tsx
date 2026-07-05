import { Popover as PopoverPrimitive } from 'radix-ui';
import type * as React from 'react';

import { cn } from '@/lib/utils';

// Bare styled wrapper over Radix Popover. Content renders INLINE (no Portal) so it stays inside the
// Storybook story root — that keeps the open panel in scope for the axe a11y sweep and the VR
// snapshot (both scoped to #storybook-root). Coverage comes via the filter components that consume
// it (FacetFilter / TokenPicker / LevelFilter), so this primitive ships no standalone story/test.
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
      className,
    )}
    {...props}
  />
);

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor, PopoverClose };
