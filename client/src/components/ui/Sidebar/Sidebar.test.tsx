import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, vi } from 'vitest';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from './Sidebar';

// The provider calls `useIsMobile`, which reads `matchMedia` (absent in jsdom). Stub it to report
// desktop so the sidebar renders its fixed column, not the mobile Sheet.
beforeEach(() => {
  globalThis.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

// Module-scope menu so the JSX tree in `renderSidebar` stays shallow (jsx-max-depth) and is a
// stable component (no-unstable-nested-components).
const Menu = () => (
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton isActive>Catalog</SidebarMenuButton>
    </SidebarMenuItem>
    <SidebarMenuItem>
      <SidebarMenuButton>Songs</SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
);

function renderSidebar(defaultOpen = true) {
  return render(
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar collapsible="icon">
        <SidebarContent>
          <SidebarGroup>
            <Menu />
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarTrigger />
    </SidebarProvider>,
  );
}

test('renders the sidebar column with its menu buttons and slots', () => {
  renderSidebar();
  const catalog = screen.getByRole('button', { name: 'Catalog' });
  expect(catalog).toHaveAttribute('data-slot', 'sidebar-menu-button');
  // The active item is flagged for styling.
  expect(catalog).toHaveAttribute('data-active', 'true');
  expect(screen.getByRole('button', { name: 'Songs' })).toBeInTheDocument();
});

test('SidebarMenuButton render forwards the slot to a custom element', () => {
  // `render` replaces Radix's `asChild` (Base UI useRender): the button's slot/state attributes
  // land on the caller's element — the everyday nav case is a router <a>.
  render(
    <SidebarProvider>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton isActive render={<a href="/catalog">Catalog</a>} />
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarProvider>,
  );
  const link = screen.getByRole('link', { name: 'Catalog' });
  expect(link).toHaveAttribute('data-slot', 'sidebar-menu-button');
  expect(link).toHaveAttribute('data-active', 'true');
});

test('exposes the expanded state on the sidebar container', () => {
  renderSidebar(true);
  // The desktop container carries the expanded/collapsed state for the CSS to read.
  const container = document.querySelector('[data-slot="sidebar"][data-state]');
  expect(container).not.toBeNull();
  expect(container).toHaveAttribute('data-state', 'expanded');
});

test('starts collapsed when defaultOpen is false', () => {
  renderSidebar(false);
  const container = document.querySelector('[data-slot="sidebar"][data-state]');
  expect(container).toHaveAttribute('data-state', 'collapsed');
  expect(container).toHaveAttribute('data-collapsible', 'icon');
});

test('renders the trigger with an accessible label', () => {
  renderSidebar();
  expect(screen.getByRole('button', { name: 'Toggle Sidebar' })).toHaveAttribute(
    'data-slot',
    'sidebar-trigger',
  );
});

test('cmd/ctrl+B is ignored while a text field is focused', () => {
  render(
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon">
        <SidebarContent>
          <SidebarInput aria-label="Search" />
        </SidebarContent>
      </Sidebar>
    </SidebarProvider>,
  );
  const container = document.querySelector('[data-slot="sidebar"][data-state]');
  expect(container).toHaveAttribute('data-state', 'expanded');
  // The shortcut fired from inside the input must NOT toggle the sidebar (don't hijack typing).
  fireEvent.keyDown(screen.getByRole('textbox', { name: 'Search' }), { key: 'b', ctrlKey: true });
  expect(container).toHaveAttribute('data-state', 'expanded');
  // Control: the same shortcut from outside a field DOES toggle it.
  fireEvent.keyDown(document.body, { key: 'b', ctrlKey: true });
  expect(container).toHaveAttribute('data-state', 'collapsed');
});

test('throws when a sidebar part is used outside the provider', () => {
  // Silence the expected React error-boundary console noise for this render.
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(() => render(<SidebarTrigger />)).toThrow(
    /useSidebar must be used within a SidebarProvider/,
  );
  spy.mockRestore();
});
