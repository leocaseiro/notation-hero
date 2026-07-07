import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import type * as React from 'react';

import { cn } from '@/lib/utils';

// Styled shadcn-style wrappers over Base UI Tabs. Base UI owns all the behaviour — roving focus,
// arrow-key navigation, and the tablist/tab/tabpanel semantics — so these wrappers only add the
// segment/pill look and the data-slot hooks; they never touch the interaction model.
// `activateOnFocus` (manual vs automatic activation) and `loopFocus` are Base UI List props —
// exposed here so consumers/Storybook controls (NH-268) can configure them.

const Tabs = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) => (
  <TabsPrimitive.Root
    data-slot="tabs"
    className={cn('flex flex-col gap-2', className)}
    {...props}
  />
);

// The pill track: a rounded, muted bar that groups the triggers as an inline segment control.
// Base UI defaults `activateOnFocus` to false (manual activation); we default it to true here to
// keep the prior Radix-era automatic-activation behaviour (arrow keys select, not just focus), and
// still expose it as a real prop so callers/Storybook controls (NH-268) can opt into manual mode.
const TabsList = ({
  className,
  activateOnFocus = true,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List
    data-slot="tabs-list"
    activateOnFocus={activateOnFocus}
    className={cn(
      'inline-flex h-9 w-fit items-center justify-center gap-1 rounded-md bg-muted p-1 text-muted-foreground',
      className,
    )}
    {...props}
  />
);

// A single pill. Inactive triggers stay muted; the active one (data-[state=active]) gets the solid
// teal (primary) fill with primary-foreground text and a subtle shadow. Focus-visible draws the ring.
const TabsTrigger = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Tab>) => (
  <TabsPrimitive.Tab
    data-slot="tabs-trigger"
    className={cn(
      'inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-sm px-2.5 text-sm font-medium whitespace-nowrap transition-all outline-none',
      // Inactive triggers keep full-contrast foreground text (muted-foreground on the muted track
      // is only 4.13:1 — fails AA); the active pill is the solid teal fill (primary), like Button.
      'text-foreground hover:bg-background/60',
      // Base UI Tab uses a boolean `data-active` presence attribute (not Radix's `data-state="active"`).
      'data-active:bg-primary data-active:text-primary-foreground data-active:shadow-sm',
      'focus-visible:ring-3 focus-visible:ring-ring/50',
      'disabled:pointer-events-none disabled:opacity-50',
      '[&_.material-symbols-outlined]:text-[1.125rem]',
      className,
    )}
    {...props}
  />
);

// The panel shown for the active tab. Base UI handles show/hide and the tabpanel role.
const TabsContent = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Panel>) => (
  <TabsPrimitive.Panel
    data-slot="tabs-content"
    className={cn('outline-none', className)}
    {...props}
  />
);

export { Tabs, TabsList, TabsTrigger, TabsContent };
