import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { Menubar as MenubarPrimitive } from '@base-ui/react/menubar';
import type * as React from 'react';

import { buttonVariants } from '@/components/ui/Button/Button';
import { cn } from '@/lib/utils';

// Menubar — shadcn/ui port over Base UI (migrated from Radix). Base UI's Menubar is a container
// that wraps one Menu.Root per menu: MenubarMenu/Trigger/Content map onto Menu.Root/Menu.Trigger/
// Menu.Portal > Positioner > Popup (the old `menubar-content` slot stays on the Popup so VR/a11y
// selectors keep working). There is no container-level `value` — each menu is opened via its own
// `open`/`defaultOpen`/`onOpenChange` on MenubarMenu. shadcn's enter/exit `animate-*` classes are
// omitted because the repo has no animation plugin (tw-animate-css). Lucide's Check /
// ChevronRight / Circle icons are swapped for the repo's self-hosted Material Symbols glyphs.

// Base UI stamps data-orientation on the container, so `orientation="vertical"` stacks the
// triggers into a column as well as flipping the arrow-key axis (pass side="right" on
// MenubarContent so a vertical bar's menus open beside it, not under it).
const Menubar = ({ className, ...props }: React.ComponentProps<typeof MenubarPrimitive>) => (
  <MenubarPrimitive
    data-slot="menubar"
    className={cn(
      'bg-background border-border dark:border-input flex h-9 items-center gap-1 rounded-md border p-1 shadow-xs',
      'data-[orientation=vertical]:h-auto data-[orientation=vertical]:w-fit data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch',
      className,
    )}
    {...props}
  />
);

const MenubarMenu = (props: React.ComponentProps<typeof MenuPrimitive.Root>) => (
  <MenuPrimitive.Root data-slot="menubar-menu" {...props} />
);

const MenubarGroup = (props: React.ComponentProps<typeof MenuPrimitive.Group>) => (
  <MenuPrimitive.Group data-slot="menubar-group" {...props} />
);

const MenubarPortal = (props: React.ComponentProps<typeof MenuPrimitive.Portal>) => (
  <MenuPrimitive.Portal data-slot="menubar-portal" {...props} />
);

const MenubarRadioGroup = (props: React.ComponentProps<typeof MenuPrimitive.RadioGroup>) => (
  <MenuPrimitive.RadioGroup data-slot="menubar-radio-group" {...props} />
);

// The triggers wear the Button `ghost` variant (Leo's #109 review — quiet at rest, Button's
// muted fill on hover and while open via `aria-expanded`, which Base UI keeps on the trigger).
// Size overrides squeeze the h-9 Button down to the h-7 that fits the h-9/p-1 bar. Base UI
// renders the trigger as a real <button role="menuitem">.
const MenubarTrigger = ({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Trigger>) => (
  <MenuPrimitive.Trigger
    data-slot="menubar-trigger"
    className={cn(buttonVariants({ variant: 'ghost' }), 'h-7 rounded-sm px-2', className)}
    {...props}
  />
);

const MenubarContent = ({
  className,
  align = 'start',
  alignOffset = -4,
  side = 'bottom',
  sideOffset = 8,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>) => (
  <MenuPrimitive.Portal>
    <MenuPrimitive.Positioner
      data-slot="menubar-positioner"
      className="isolate z-50 outline-none"
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
    >
      <MenuPrimitive.Popup
        data-slot="menubar-content"
        className={cn(
          // outline-none: Base UI focuses the Popup itself on open (tabindex=-1), which
          // otherwise draws the UA's blue focus ring around the whole panel.
          'bg-popover text-popover-foreground z-50 min-w-[12rem] overflow-hidden rounded-md border border-border dark:border-input p-1 shadow-md outline-none',
          className,
        )}
        {...props}
      />
    </MenuPrimitive.Positioner>
  </MenuPrimitive.Portal>
);

const MenubarItem = ({
  className,
  inset,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Item> & {
  inset?: boolean;
  variant?: 'default' | 'destructive';
}) => (
  <MenuPrimitive.Item
    data-slot="menubar-item"
    data-inset={inset}
    data-variant={variant}
    className={cn(
      "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className,
    )}
    {...props}
  />
);

const MenubarCheckboxItem = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.CheckboxItem>) => (
  <MenuPrimitive.CheckboxItem
    data-slot="menubar-checkbox-item"
    className={cn(
      "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className,
    )}
    {...props}
  >
    <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
      <MenuPrimitive.CheckboxItemIndicator>
        <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>
          check
        </span>
      </MenuPrimitive.CheckboxItemIndicator>
    </span>
    {children}
  </MenuPrimitive.CheckboxItem>
);

const MenubarRadioItem = ({
  className,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.RadioItem>) => (
  <MenuPrimitive.RadioItem
    data-slot="menubar-radio-item"
    className={cn(
      "focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className,
    )}
    {...props}
  >
    <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
      <MenuPrimitive.RadioItemIndicator>
        {/* A CSS dot, not a Material Symbols glyph: the self-hosted Outlined variable font ignores
            the FILL axis, so a filled span is what gives shadcn's solid radio indicator. */}
        <span aria-hidden="true" className="inline-block size-2 rounded-full bg-current" />
      </MenuPrimitive.RadioItemIndicator>
    </span>
    {children}
  </MenuPrimitive.RadioItem>
);

// Base UI's GroupLabel must live INSIDE a MenubarGroup or MenubarRadioGroup (it wires the group's
// aria-labelledby and throws outside one) — unlike Radix's free-floating Label.
const MenubarLabel = ({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.GroupLabel> & {
  inset?: boolean;
}) => (
  <MenuPrimitive.GroupLabel
    data-slot="menubar-label"
    data-inset={inset}
    className={cn('px-2 py-1.5 text-sm font-medium data-[inset]:pl-8', className)}
    {...props}
  />
);

const MenubarSeparator = ({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Separator>) => (
  <MenuPrimitive.Separator
    data-slot="menubar-separator"
    className={cn('bg-border -mx-1 my-1 h-px', className)}
    {...props}
  />
);

const MenubarShortcut = ({ className, ...props }: React.ComponentProps<'span'>) => (
  <span
    data-slot="menubar-shortcut"
    className={cn('text-muted-foreground ml-auto text-xs tracking-widest', className)}
    {...props}
  />
);

const MenubarSub = (props: React.ComponentProps<typeof MenuPrimitive.SubmenuRoot>) => (
  <MenuPrimitive.SubmenuRoot data-slot="menubar-sub" {...props} />
);

const MenubarSubTrigger = ({
  className,
  inset,
  children,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.SubmenuTrigger> & {
  inset?: boolean;
}) => (
  <MenuPrimitive.SubmenuTrigger
    data-slot="menubar-sub-trigger"
    data-inset={inset}
    className={cn(
      'focus:bg-accent focus:text-accent-foreground data-[popup-open]:bg-accent data-[popup-open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8',
      className,
    )}
    {...props}
  >
    {children}
    <span className="material-symbols-outlined ml-auto" aria-hidden="true" style={{ fontSize: 16 }}>
      chevron_right
    </span>
  </MenuPrimitive.SubmenuTrigger>
);

const MenubarSubContent = ({
  className,
  align = 'start',
  alignOffset = -3,
  side = 'right',
  sideOffset = 0,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, 'align' | 'alignOffset' | 'side' | 'sideOffset'>) => (
  <MenuPrimitive.Portal>
    <MenuPrimitive.Positioner
      data-slot="menubar-sub-positioner"
      className="isolate z-50 outline-none"
      align={align}
      alignOffset={alignOffset}
      side={side}
      sideOffset={sideOffset}
    >
      <MenuPrimitive.Popup
        data-slot="menubar-sub-content"
        className={cn(
          'bg-popover text-popover-foreground z-50 min-w-[8rem] overflow-hidden rounded-md border border-border dark:border-input p-1 shadow-lg outline-none',
          className,
        )}
        {...props}
      />
    </MenuPrimitive.Positioner>
  </MenuPrimitive.Portal>
);

export {
  Menubar,
  MenubarPortal,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarGroup,
  MenubarSeparator,
  MenubarLabel,
  MenubarItem,
  MenubarShortcut,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
};
