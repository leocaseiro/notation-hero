import { render, screen } from '@testing-library/react';

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './DropdownMenu';

test('renders the trigger with its slot and no content while closed', () => {
  render(
    <DropdownMenu>
      <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Play</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>,
  );
  expect(screen.getByRole('button', { name: 'Actions' })).toHaveAttribute(
    'data-slot',
    'dropdown-menu-trigger',
  );
  // Base UI mounts/unmounts content by open state; closed => not in the DOM (not just hidden).
  expect(screen.queryByText('Play')).not.toBeInTheDocument();
});

test('shows the portalled content and items when open', async () => {
  render(
    <DropdownMenu open>
      <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Play</DropdownMenuItem>
        <DropdownMenuItem>Add to practice</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>,
  );
  // Base UI portals the content to document.body; findByRole resolves once it mounts.
  const menu = await screen.findByRole('menu');
  expect(menu).toHaveAttribute('data-slot', 'dropdown-menu-content');

  const play = await screen.findByRole('menuitem', { name: 'Play' });
  expect(play).toHaveAttribute('data-slot', 'dropdown-menu-item');
  expect(await screen.findByRole('menuitem', { name: 'Add to practice' })).toBeInTheDocument();
});

test('checkbox and radio items expose their state via aria-checked', async () => {
  render(
    <DropdownMenu open modal={false}>
      <DropdownMenuTrigger>View</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuCheckboxItem checked>Show completed</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={false}>Hidden rows</DropdownMenuCheckboxItem>
        <DropdownMenuRadioGroup value="title">
          <DropdownMenuRadioItem value="title">Title</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="level">Level</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>,
  );
  expect(await screen.findByRole('menuitemcheckbox', { name: 'Show completed' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  expect(await screen.findByRole('menuitemcheckbox', { name: 'Hidden rows' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
  // Only the RadioItem whose value matches the group is checked.
  expect(await screen.findByRole('menuitemradio', { name: 'Title' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  expect(await screen.findByRole('menuitemradio', { name: 'Level' })).toHaveAttribute(
    'aria-checked',
    'false',
  );
});

test('label renders inside a group and the submenu trigger renders closed', async () => {
  // Base UI's GroupLabel THROWS outside a Group/RadioGroup (Radix's Label was standalone), so
  // labels always sit inside DropdownMenuGroup/RadioGroup — this mirrors the story structures.
  render(
    <DropdownMenu open modal={false}>
      <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>Yellow</DropdownMenuLabel>
          <DropdownMenuItem>Play</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Add to lesson</DropdownMenuSubTrigger>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>,
  );
  const group = await screen.findByRole('group');
  expect(group).toHaveAttribute('data-slot', 'dropdown-menu-group');
  // The group is labelled by its GroupLabel.
  expect(group).toHaveAccessibleName('Yellow');
  const subTrigger = await screen.findByText('Add to lesson');
  expect(subTrigger).toHaveAttribute('data-slot', 'dropdown-menu-sub-trigger');
  // Closed submenu trigger: no data-popup-open (the class hook for the open highlight).
  expect(subTrigger).not.toHaveAttribute('data-popup-open');
});

test('item forwards variant + inset as data attributes', async () => {
  render(
    <DropdownMenu open modal={false}>
      <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem variant="destructive">Remove</DropdownMenuItem>
        <DropdownMenuItem inset>Indented</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>,
  );
  expect(await screen.findByRole('menuitem', { name: 'Remove' })).toHaveAttribute(
    'data-variant',
    'destructive',
  );
  expect(await screen.findByRole('menuitem', { name: 'Indented' })).toHaveAttribute(
    'data-inset',
    'true',
  );
});
