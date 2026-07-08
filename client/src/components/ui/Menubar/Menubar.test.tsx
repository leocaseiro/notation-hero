import { render, screen } from '@testing-library/react';

import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from './Menubar';

test('renders the bar and trigger with their slots and no content while closed', () => {
  render(
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Open score</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>,
  );
  expect(screen.getByRole('menubar')).toHaveAttribute('data-slot', 'menubar');
  expect(screen.getByRole('menuitem', { name: 'File' })).toHaveAttribute(
    'data-slot',
    'menubar-trigger',
  );
  // Base UI mounts/unmounts content by open state; closed => not in the DOM (not just hidden).
  expect(screen.queryByText('Open score')).not.toBeInTheDocument();
});

test('shows the portalled content and items when a menu is open', async () => {
  render(
    <Menubar>
      <MenubarMenu open>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>New song</MenubarItem>
          <MenubarItem>Open score</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>,
  );
  // Base UI portals the content to document.body; findByRole resolves once it mounts.
  const menu = await screen.findByRole('menu');
  expect(menu).toHaveAttribute('data-slot', 'menubar-content');

  const item = await screen.findByRole('menuitem', { name: 'New song' });
  expect(item).toHaveAttribute('data-slot', 'menubar-item');
  expect(await screen.findByRole('menuitem', { name: 'Open score' })).toBeInTheDocument();
});

test('a controlled open menu opens alone, leaving siblings closed', async () => {
  // Base UI has no bar-level `value`; each MenubarMenu is controlled via its own `open`.
  render(
    <Menubar>
      <MenubarMenu open>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>New song</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Undo</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>,
  );
  // The open menu (file): its trigger is expanded and its content is mounted.
  expect(screen.getByRole('menuitem', { name: 'File' })).toHaveAttribute('aria-expanded', 'true');
  expect(await screen.findByRole('menuitem', { name: 'New song' })).toBeInTheDocument();
  // The sibling (edit) stays closed: not expanded, content absent from the DOM.
  expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText('Undo')).not.toBeInTheDocument();
});
