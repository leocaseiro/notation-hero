import { Tabs as TabsPrimitive } from 'radix-ui';
import type * as React from 'react';

import { cn } from '@/lib/utils';

// Styled shadcn-style wrappers over Radix Tabs. Radix owns all the behaviour — roving focus,
// arrow-key navigation, and the tablist/tab/tabpanel semantics — so these wrappers only add the
// segment/pill look and the data-slot hooks; they never touch the interaction model.

const Tabs = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) => (
  <TabsPrimitive.Root
    data-slot="tabs"
    className={cn('flex flex-col gap-2', className)}
    {...props}
  />
);

// The pill track: a rounded, muted bar that groups the triggers as an inline segment control.
const TabsList = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List
    data-slot="tabs-list"
    className={cn(
      'inline-flex h-9 w-fit items-center justify-center gap-1 rounded-md bg-muted p-1 text-muted-foreground',
      className,
    )}
    {...props}
  />
);

// A single pill. Inactive triggers stay muted; the active one (data-[state=active]) lifts onto a
// bg-background surface with a subtle shadow and foreground text. Focus-visible draws the ring.
const TabsTrigger = ({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    data-slot="tabs-trigger"
    className={cn(
      'inline-flex h-7 flex-1 items-center justify-center gap-1.5 rounded-sm px-2.5 text-sm font-medium whitespace-nowrap transition-all outline-none',
      // Inactive triggers keep full-contrast foreground text (muted-foreground on the muted track
      // is only 4.13:1 — fails AA); the active pill is distinguished by its raised bg + shadow.
      'text-foreground hover:bg-background/60',
      'data-[state=active]:bg-background data-[state=active]:shadow-sm',
      'focus-visible:ring-3 focus-visible:ring-ring/50',
      'disabled:pointer-events-none disabled:opacity-50',
      '[&_.material-symbols-outlined]:text-[1.125rem]',
      className,
    )}
    {...props}
  />
);

// The panel shown for the active tab. Radix handles show/hide and the tabpanel role.
const TabsContent = ({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) => (
  <TabsPrimitive.Content
    data-slot="tabs-content"
    className={cn('outline-none', className)}
    {...props}
  />
);

export { Tabs, TabsList, TabsTrigger, TabsContent };
