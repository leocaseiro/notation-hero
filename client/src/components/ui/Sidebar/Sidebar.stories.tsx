import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from './Sidebar';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: [
          'Sidebar — a faithful shadcn/ui port. A collapsible app-nav column: on desktop it offsets',
          'to an icon rail (`collapsible="icon"`) or slides off-canvas (`collapsible="offcanvas"`);',
          'on mobile it swaps to the off-canvas Sheet. Compose it from the parts: `SidebarProvider >',
          'Sidebar > SidebarHeader/Content/Footer`, with `SidebarGroup`, `SidebarMenu`,',
          '`SidebarMenuItem`, and `SidebarMenuButton` (CVA `variant`/`size`; pass `tooltip` for the',
          'collapsed-rail label). The active item is solid brand teal (`sidebar-primary`).',
          '',
          'It is dumb/presentational — a container decides the nav items and active state. These',
          'stories are interactive: click the **SidebarTrigger** in the top bar (or press cmd/ctrl+B)',
          'to collapse the column to an icon rail and expand it again. `defaultOpen` sets the initial',
          "state so each story starts expanded or collapsed. shadcn's enter/exit animations are",
          'omitted (the repo has no animation plugin); the width transitions and `--sidebar*` tokens',
          'remain.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  args: { side: 'left', variant: 'sidebar', collapsible: 'icon' },
  argTypes: {
    side: {
      control: 'inline-radio',
      options: ['left', 'right'],
      description: 'Which edge the column docks to.',
    },
    variant: {
      control: 'inline-radio',
      options: ['sidebar', 'floating', 'inset'],
      description: 'Docked column, floating card, or inset panel.',
    },
    collapsible: {
      control: 'inline-radio',
      options: ['icon', 'offcanvas', 'none'],
      description: 'Collapse behavior when the trigger (or cmd/ctrl+B) fires.',
    },
  },
} satisfies Meta<typeof Sidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

// App nav from the wireframe: a Browse group (Catalog / Songs / Lessons / Player) + an Admin group.
interface NavEntry {
  label: string;
  icon: string;
  active?: boolean;
}

const BROWSE: readonly NavEntry[] = [
  { label: 'Catalog', icon: 'library_music', active: true },
  { label: 'Songs', icon: 'music_note' },
  { label: 'Lessons', icon: 'school' },
  { label: 'Player', icon: 'play_circle' },
];

const ADMIN: readonly NavEntry[] = [{ label: 'Catalog admin', icon: 'settings' }];

// Each part is a module-scope component so every JSX subtree stays shallow (the provider -> sidebar
// -> group -> menu -> item -> button -> icon nesting otherwise trips react/jsx-max-depth).
const NavItem = ({ label, icon, active = false }: NavEntry) => (
  <SidebarMenuItem>
    <SidebarMenuButton isActive={active} tooltip={label}>
      <span className="material-symbols-outlined" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </SidebarMenuButton>
  </SidebarMenuItem>
);

const NavGroup = ({ label, items }: { label: string; items: readonly NavEntry[] }) => (
  <SidebarGroup>
    <SidebarGroupLabel>{label}</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        {items.map((item) => (
          <NavItem key={item.label} {...item} />
        ))}
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
);

// The brand row in the header — an icon that stays in the collapsed rail plus a label that hides.
const BrandHeader = () => (
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton tooltip="Notation Hero">
        <span className="material-symbols-outlined" aria-hidden="true">
          graphic_eq
        </span>
        <span className="font-semibold">Notation Hero</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
);

// A realistic app shell: the collapsible nav column + a main area whose top bar carries the
// SidebarTrigger, so the sidebar can be collapsed/expanded (click the trigger, or cmd/ctrl+B).
// `defaultOpen` sets the initial state so VR captures a deterministic expanded vs collapsed rail.
interface AppShellProps {
  defaultOpen: boolean;
  side?: 'left' | 'right' | undefined;
  variant?: 'sidebar' | 'floating' | 'inset' | undefined;
  collapsible?: 'icon' | 'offcanvas' | 'none' | undefined;
}

const AppShell = ({
  defaultOpen,
  side = 'left',
  variant = 'sidebar',
  collapsible = 'icon',
}: AppShellProps) => {
  const nav = (
    <Sidebar side={side} variant={variant} collapsible={collapsible}>
      <SidebarHeader>
        <BrandHeader />
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="Browse" items={BROWSE} />
        <NavGroup label="Admin" items={ADMIN} />
      </SidebarContent>
    </Sidebar>
  );
  const main = (
    <SidebarInset>
      <header className="border-sidebar-border flex h-12 items-center gap-2 border-b px-3">
        <SidebarTrigger />
        <span className="text-sm font-medium">Catalog</span>
      </header>
    </SidebarInset>
  );
  // A right-docked sidebar goes AFTER the content in the DOM (shadcn's own right-side examples):
  // the width-reserving gap element flows in source order, so Sidebar-first would reserve the
  // LEFT column while the fixed panel pins right, overlapping the content.
  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      {side === 'right' ? (
        <>
          {main}
          {nav}
        </>
      ) : (
        <>
          {nav}
          {main}
        </>
      )}
    </SidebarProvider>
  );
};

// Expanded — the full-width column with labels. Click the trigger (or cmd/ctrl+B) to collapse it.
// The side/variant/collapsible controls pass straight through to <Sidebar>.
export const Expanded: Story = {
  render: (args) => (
    <AppShell defaultOpen side={args.side} variant={args.variant} collapsible={args.collapsible} />
  ),
};

// Collapsed — the icon rail (labels hidden). Click the trigger to expand it; hovering a button
// reveals its `tooltip` label.
export const Collapsed: Story = {
  render: (args) => (
    <AppShell
      defaultOpen={false}
      side={args.side}
      variant={args.variant}
      collapsible={args.collapsible}
    />
  ),
};
