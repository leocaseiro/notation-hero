import { useRender } from '@base-ui/react/use-render';
import { cva } from 'class-variance-authority';
import * as React from 'react';
import type { VariantProps } from 'class-variance-authority';

import { Button } from '@/components/ui/Button/Button';
import { Input } from '@/components/ui/Input/Input';
import { Separator } from '@/components/ui/Separator/Separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/Sheet/Sheet';
import { Skeleton } from '@/components/ui/Skeleton/Skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip/Tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

// Sidebar — faithful shadcn/ui port. A collapsible app-nav column that offsets to an icon rail on
// desktop and swaps to the off-canvas Sheet on mobile. shadcn's enter/exit `animate-*` classes are
// omitted (the repo has no animation plugin); the width/offset transitions, positioning, tokens
// (`--sidebar*`), shadows, and focus classes are otherwise identical. Lucide's `PanelLeft` /
// `MoreHorizontal` glyphs are swapped for the self-hosted Material Symbols `dock_to_right` /
// `more_horiz`. State (expanded/collapsed) persists to a cookie and toggles on cmd/ctrl+B.
// Composition parts that took Radix's `asChild` now take Base UI's `render` prop via `useRender`
// (Breadcrumb precedent); the trigger-open selectors track Base UI's `data-popup-open` (a Base UI
// menu/popover trigger sets that, not Radix's `data-state="open"`). The sidebar's OWN
// `data-state="expanded|collapsed"` attribute is repo-authored state, not a primitive's — it stays.

const SIDEBAR_COOKIE_NAME = 'sidebar_state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = '16rem';
const SIDEBAR_WIDTH_MOBILE = '18rem';
const SIDEBAR_WIDTH_ICON = '3rem';
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';

interface SidebarContextProps {
  state: 'expanded' | 'collapsed';
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar(): SidebarContextProps {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }
  return context;
}

// Read the persisted sidebar open state from the cookie. Returns undefined when absent or when
// there is no document (guards non-browser/SSR contexts).
function readSidebarOpenCookie(): boolean | undefined {
  if (typeof document === 'undefined') return undefined;
  const entry = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${SIDEBAR_COOKIE_NAME}=`));
  if (!entry) return undefined;
  return entry.slice(SIDEBAR_COOKIE_NAME.length + 1) === 'true';
}

const SidebarProvider = ({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);

  // Internal open state (uncontrolled by default; a parent can control via `open`/`onOpenChange`).
  // The uncontrolled seed comes from the persisted cookie so a reload restores the last choice —
  // this is a client SPA, so no server reads the cookie; seeding here is what makes persistence work.
  const [_open, _setOpen] = React.useState(() => readSidebarOpenCookie() ?? defaultOpen);
  const open = openProp ?? _open;
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === 'function' ? value(open) : value;
      if (setOpenProp) {
        // Controlled: the parent owns state AND persistence — don't write the cookie behind its back.
        setOpenProp(openState);
        return;
      }
      _setOpen(openState);
      // Persist across reloads (uncontrolled only; seeded back into `_open` above). The repo has no
      // cookie-store abstraction, so set it directly.
      // eslint-disable-next-line unicorn/no-document-cookie -- faithful shadcn port
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open],
  );

  const toggleSidebar = React.useCallback(
    () => (isMobile ? setOpenMobile((value) => !value) : setOpen((value) => !value)),
    [isMobile, setOpen],
  );

  // cmd/ctrl + B toggles the sidebar.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't hijack cmd/ctrl+B while the user is typing in a field (this PR ships Input /
      // SidebarInput as first-class consumers). `toLowerCase` so Shift/CapsLock stay consistent.
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if (
        event.key.toLowerCase() === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  const state = open ? 'expanded' : 'collapsed';

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      openMobile,
      setOpenMobile,
      toggleSidebar,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar],
  );

  // No TooltipProvider wrapper anymore: the migrated Tooltip wraps each Root in its own Provider,
  // and its Trigger defaults delay/closeDelay to 0 — the same instant-show the Radix
  // `delayDuration={0}` provider gave the whole sidebar.
  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        data-slot="sidebar-wrapper"
        style={
          {
            '--sidebar-width': SIDEBAR_WIDTH,
            '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
            ...style,
          } as React.CSSProperties
        }
        className={cn(
          'group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
};

const Sidebar = ({
  side = 'left',
  variant = 'sidebar',
  collapsible = 'offcanvas',
  className,
  style,
  children,
  ...props
}: React.ComponentProps<'div'> & {
  side?: 'left' | 'right';
  variant?: 'sidebar' | 'floating' | 'inset';
  collapsible?: 'offcanvas' | 'icon' | 'none';
}) => {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === 'none') {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          'bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col',
          className,
        )}
        style={style}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          side={side}
          className={cn(
            'bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden',
            className,
          )}
          style={
            {
              '--sidebar-width': SIDEBAR_WIDTH_MOBILE,
              ...style,
            } as React.CSSProperties
          }
          {...props}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className="group peer text-sidebar-foreground hidden md:block"
      data-slot="sidebar"
      data-state={state}
      data-collapsible={state === 'collapsed' ? collapsible : ''}
      data-variant={variant}
      data-side={side}
    >
      {/* The gap element reserves the column's width in the flow. */}
      <div
        data-slot="sidebar-gap"
        className={cn(
          'relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear',
          'group-data-[collapsible=offcanvas]:w-0',
          'group-data-[side=right]:rotate-180',
          variant === 'floating' || variant === 'inset'
            ? 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]'
            : 'group-data-[collapsible=icon]:w-(--sidebar-width-icon)',
        )}
      />
      <div
        data-slot="sidebar-container"
        className={cn(
          'fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex',
          side === 'left'
            ? 'left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]'
            : 'right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]',
          variant === 'floating' || variant === 'inset'
            ? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]'
            : // border-sidebar-border named explicitly — Tailwind v4's bare border-r/l falls back
              // to currentColor (near-black/near-white), the "too dark" line from Leo's review.
              'border-sidebar-border group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l',
          className,
        )}
        style={style}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
        >
          {children}
        </div>
      </div>
    </div>
  );
};

const SidebarTrigger = ({ className, onClick, ...props }: React.ComponentProps<typeof Button>) => {
  const { toggleSidebar } = useSidebar();
  return (
    <Button
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      variant="ghost"
      size="icon"
      className={cn('size-7', className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 20 }}>
        dock_to_right
      </span>
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
};

const SidebarRail = ({ className, ...props }: React.ComponentProps<'button'>) => {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar"
      className={cn(
        'hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] sm:flex',
        'in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize',
        '[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
        'hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full',
        '[[data-side=left][data-collapsible=offcanvas]_&]:-right-2 [[data-side=right][data-collapsible=offcanvas]_&]:-left-2',
        className,
      )}
      {...props}
    />
  );
};

const SidebarInset = ({ className, ...props }: React.ComponentProps<'main'>) => (
  <main
    data-slot="sidebar-inset"
    className={cn(
      'bg-background relative flex w-full flex-1 flex-col',
      'md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2',
      className,
    )}
    {...props}
  />
);

const SidebarInput = ({ className, ...props }: React.ComponentProps<typeof Input>) => (
  <Input
    data-slot="sidebar-input"
    data-sidebar="input"
    className={cn('bg-background h-8 w-full shadow-none', className)}
    {...props}
  />
);

const SidebarHeader = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div
    data-slot="sidebar-header"
    data-sidebar="header"
    className={cn('flex flex-col gap-2 p-2', className)}
    {...props}
  />
);

const SidebarFooter = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div
    data-slot="sidebar-footer"
    data-sidebar="footer"
    className={cn('flex flex-col gap-2 p-2', className)}
    {...props}
  />
);

const SidebarSeparator = ({ className, ...props }: React.ComponentProps<typeof Separator>) => (
  <Separator
    data-slot="sidebar-separator"
    data-sidebar="separator"
    className={cn('bg-sidebar-border mx-2 w-auto', className)}
    {...props}
  />
);

const SidebarContent = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div
    data-slot="sidebar-content"
    data-sidebar="content"
    className={cn(
      'flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden',
      className,
    )}
    {...props}
  />
);

const SidebarGroup = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div
    data-slot="sidebar-group"
    data-sidebar="group"
    className={cn('relative flex w-full min-w-0 flex-col p-2', className)}
    {...props}
  />
);

const SidebarGroupLabel = ({ className, render, ...props }: useRender.ComponentProps<'div'>) =>
  useRender({
    defaultTagName: 'div',
    render,
    props: {
      'data-slot': 'sidebar-group-label',
      'data-sidebar': 'group-label',
      className: cn(
        'text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
        'group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0',
        className,
      ),
      ...props,
    },
  });

const SidebarGroupAction = ({ className, render, ...props }: useRender.ComponentProps<'button'>) =>
  useRender({
    defaultTagName: 'button',
    render,
    props: {
      'data-slot': 'sidebar-group-action',
      'data-sidebar': 'group-action',
      className: cn(
        'text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
        // Increase the hit area of the button on mobile.
        'after:absolute after:-inset-2 md:after:hidden',
        'group-data-[collapsible=icon]:hidden',
        className,
      ),
      ...props,
    },
  });

const SidebarGroupContent = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div
    data-slot="sidebar-group-content"
    data-sidebar="group-content"
    className={cn('w-full text-sm', className)}
    {...props}
  />
);

const SidebarMenu = ({ className, ...props }: React.ComponentProps<'ul'>) => (
  <ul
    data-slot="sidebar-menu"
    data-sidebar="menu"
    className={cn('flex w-full min-w-0 flex-col gap-1', className)}
    {...props}
  />
);

const SidebarMenuItem = ({ className, ...props }: React.ComponentProps<'li'>) => (
  <li
    data-slot="sidebar-menu-item"
    data-sidebar="menu-item"
    className={cn('group/menu-item relative', className)}
    {...props}
  />
);

const sidebarMenuButtonVariants = cva(
  // Active item = solid brand teal (`bg-primary`), matching the player-rail reference and the
  // Button's selected state — not shadcn's neutral `sidebar-accent`, and not the lighter
  // `sidebar-primary` (whose light-mode teal fails AA 4.5:1 against white). Hover/open stay neutral.
  'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-primary data-[active=true]:font-medium data-[active=true]:text-primary-foreground data-[popup-open]:hover:bg-sidebar-accent data-[popup-open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        outline:
          'bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]',
      },
      size: {
        default: 'h-8 text-sm',
        sm: 'h-7 text-xs',
        lg: 'h-12 text-sm group-data-[collapsible=icon]:p-0!',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

const SidebarMenuButton = ({
  render,
  isActive = false,
  variant = 'default',
  size = 'default',
  tooltip,
  className,
  ...props
}: useRender.ComponentProps<'button'> &
  VariantProps<typeof sidebarMenuButtonVariants> & {
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
  }) => {
  const { isMobile, state } = useSidebar();

  const button = useRender({
    defaultTagName: 'button',
    render,
    props: {
      'data-slot': 'sidebar-menu-button',
      'data-sidebar': 'menu-button',
      'data-size': size,
      'data-active': isActive,
      className: cn(sidebarMenuButtonVariants({ variant, size }), className),
      ...props,
    },
  });

  if (!tooltip) {
    return button;
  }

  const tooltipProps = typeof tooltip === 'string' ? { children: tooltip } : tooltip;

  return (
    <Tooltip>
      {/* The rendered button element replaces Radix's `asChild` child: the trigger merges its
          props onto it, and the button's own props (data-slot etc.) win conflicts, as before. */}
      <TooltipTrigger render={button} />
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== 'collapsed' || isMobile}
        {...tooltipProps}
      />
    </Tooltip>
  );
};

const SidebarMenuAction = ({
  className,
  render,
  showOnHover = false,
  ...props
}: useRender.ComponentProps<'button'> & {
  showOnHover?: boolean;
}) =>
  useRender({
    defaultTagName: 'button',
    render,
    props: {
      'data-slot': 'sidebar-menu-action',
      'data-sidebar': 'menu-action',
      className: cn(
        'text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground peer-hover/menu-button:text-sidebar-accent-foreground absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 outline-hidden transition-transform focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
        // Increase the hit area of the button on mobile.
        'after:absolute after:-inset-2 md:after:hidden',
        'peer-data-[size=sm]/menu-button:top-1',
        'peer-data-[size=default]/menu-button:top-1.5',
        'peer-data-[size=lg]/menu-button:top-2.5',
        'group-data-[collapsible=icon]:hidden',
        showOnHover &&
          'peer-data-[active=true]/menu-button:text-sidebar-accent-foreground group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[popup-open]:opacity-100 md:opacity-0',
        className,
      ),
      ...props,
    },
  });

const SidebarMenuBadge = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div
    data-slot="sidebar-menu-badge"
    data-sidebar="menu-badge"
    className={cn(
      'text-sidebar-foreground pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums select-none',
      'peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground',
      'peer-data-[size=sm]/menu-button:top-1',
      'peer-data-[size=default]/menu-button:top-1.5',
      'peer-data-[size=lg]/menu-button:top-2.5',
      'group-data-[collapsible=icon]:hidden',
      className,
    )}
    {...props}
  />
);

const SidebarMenuSkeleton = ({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<'div'> & {
  showIcon?: boolean;
}) => {
  // A width in 50-90% that varies between rows so a loading list doesn't look uniform. shadcn uses
  // `Math.random` here; that is impure in render (and the repo lints it), so derive a stable,
  // deterministic width from this instance's `useId` instead — different per row, same across
  // that row's re-renders.
  const id = React.useId();
  const hash = [...id].reduce((sum, char) => sum + char.codePointAt(0)!, 0);
  const width = `${(hash % 41) + 50}%`;
  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn('flex h-8 items-center gap-2 rounded-md px-2', className)}
      {...props}
    >
      {showIcon ? (
        <Skeleton className="size-4 rounded-md" data-sidebar="menu-skeleton-icon" />
      ) : null}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-sidebar="menu-skeleton-text"
        style={{ '--skeleton-width': width } as React.CSSProperties}
      />
    </div>
  );
};

const SidebarMenuSub = ({ className, ...props }: React.ComponentProps<'ul'>) => (
  <ul
    data-slot="sidebar-menu-sub"
    data-sidebar="menu-sub"
    className={cn(
      'border-sidebar-border mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l px-2.5 py-0.5',
      'group-data-[collapsible=icon]:hidden',
      className,
    )}
    {...props}
  />
);

const SidebarMenuSubItem = ({ className, ...props }: React.ComponentProps<'li'>) => (
  <li
    data-slot="sidebar-menu-sub-item"
    data-sidebar="menu-sub-item"
    className={cn('group/menu-sub-item relative', className)}
    {...props}
  />
);

const SidebarMenuSubButton = ({
  render,
  size = 'md',
  isActive = false,
  className,
  ...props
}: useRender.ComponentProps<'a'> & {
  size?: 'sm' | 'md';
  isActive?: boolean;
}) =>
  useRender({
    defaultTagName: 'a',
    render,
    props: {
      'data-slot': 'sidebar-menu-sub-button',
      'data-sidebar': 'menu-sub-button',
      'data-size': size,
      'data-active': isActive,
      className: cn(
        'text-sidebar-foreground ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent active:text-sidebar-accent-foreground [&>svg]:text-sidebar-accent-foreground flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 outline-hidden focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
        // Active sub-item = solid brand teal (bg-primary), coherent with the main menu button above.
        'data-[active=true]:bg-primary data-[active=true]:text-primary-foreground',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        'group-data-[collapsible=icon]:hidden',
        className,
      ),
      ...props,
    },
  });

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
