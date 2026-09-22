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
  side,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Popup> &
  Pick<
    React.ComponentProps<typeof PopoverPrimitive.Positioner>,
    'align' | 'side' | 'sideOffset'
  >) => (
  <PopoverPrimitive.Portal container={getStorybookRootContainer()}>
    {/* Same fix as Tooltip, for the same reason. Being PORTALLED is not what puts a panel on top:
        the portal only moves it in the DOM, and DOM order breaks ties only between elements in the
        same layer. A portal lands at body level with `z-index: auto`, so anything on the page with
        a real z-index — the player's header is z-10 — paints over it regardless. The `z-50` on the
        Popup below cannot help: Base UI renders that element `position: static`, and z-index is
        ignored on a static element. It has to live on the Positioner. */}
    <PopoverPrimitive.Positioner
      className="isolate z-50"
      align={align}
      side={side}
      sideOffset={sideOffset}
    >
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
