'use client';

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion';
import type * as React from 'react';

import { cn } from '@/lib/utils';

// Collapsible sections over Base UI's Accordion. The parts are re-shaped into the familiar
// Root/Item/Trigger/Content quartet — Base UI splits the header and the trigger, and this folds
// the Header into AccordionTrigger so a caller writes three parts, not four.
//
// Multiple sections stay open by default: the settings popover has eight groups and a drummer
// comparing two of them should not have the first one snap shut.
const Accordion = ({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) => (
  <AccordionPrimitive.Root
    data-slot="accordion"
    multiple
    className={cn('flex w-full flex-col', className)}
    {...props}
  />
);

const AccordionItem = ({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) => (
  <AccordionPrimitive.Item
    data-slot="accordion-item"
    className={cn('border-b border-border last:border-b-0', className)}
    {...props}
  />
);

const AccordionTrigger = ({
  className,
  headerClassName,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger> & {
  // Lands on the <h3>, not the button. A sticky button cannot hold: its containing
  // block is that heading, and the heading is only as tall as the button. The heading's
  // parent is the item, which also wraps the rows, so sticky there stays readable
  // while that group scrolls and leaves with the group.
  headerClassName?: string;
}) => (
  <AccordionPrimitive.Header className={headerClassName}>
    <AccordionPrimitive.Trigger
      data-slot="accordion-trigger"
      className={cn(
        // min-h-11 = the 44px minimum hit area; the chevron keeps its drawn size.
        'group/accordion-trigger flex min-h-11 w-full items-center justify-between gap-2 px-1 py-2 text-left text-sm font-medium',
        'transition-colors outline-none hover:text-primary',
        'focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
      {...props}
    >
      {children}
      <span
        className="material-symbols-outlined shrink-0 transition-transform group-data-[panel-open]/accordion-trigger:rotate-180"
        aria-hidden="true"
      >
        expand_more
      </span>
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
);

const AccordionContent = ({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Panel>) => (
  <AccordionPrimitive.Panel
    data-slot="accordion-content"
    className={cn('overflow-hidden px-1 pb-3 text-sm', className)}
    {...props}
  />
);

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
