import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import type * as React from 'react';

import { cn, getStorybookRootContainer } from '@/lib/utils';

// Styled wrapper over Base UI Popover. Base UI's `Positioner` always requires a `Portal` ancestor
// (it throws without one — unlike Radix, which could render inline by omitting `Portal`), so
// `PopoverContent` always wraps one, but targets its `container` at the Storybook canvas
// (`#storybook-root`) when present — that keeps the open panel in scope for the axe a11y sweep and
// the VR snapshot (both scoped to #storybook-root), and is what FacetFilter / TokenPicker /
// LevelFilter use. Real app pages get Base UI's default (`document.body`).
// Base UI has no `Anchor` part (Radix's separate anchor-vs-trigger split doesn't exist) — dropped.
const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverClose = PopoverPrimitive.Close;

const PopoverContent = ({
  className,
  align = 'start',
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Popup> &
  Pick<React.ComponentProps<typeof PopoverPrimitive.Positioner>, 'align' | 'sideOffset'>) => (
  <PopoverPrimitive.Portal container={getStorybookRootContainer()}>
    <PopoverPrimitive.Positioner align={align} sideOffset={sideOffset}>
      <PopoverPrimitive.Popup
        data-slot="popover-content"
        className={cn(
          'z-50 w-64 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md outline-none',
          // When the panel itself takes focus (content with no focusable child), show a ring so keyboard
          // users see where focus landed instead of it appearing "lost".
          'focus-visible:ring-3 focus-visible:ring-ring/50',
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Positioner>
  </PopoverPrimitive.Portal>
);

export { Popover, PopoverTrigger, PopoverContent, PopoverClose };
