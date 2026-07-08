import { useArgs } from 'storybook/preview-api';

import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubTrigger,
  MenubarTrigger,
} from './Menubar';
import type { Meta, StoryObj } from '@storybook/tanstack-react';
import type * as React from 'react';

const meta = {
  title: 'UI/Menubar',
  component: Menubar,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: [
          'Menubar — a shadcn/ui port over Base UI. Compose it from the parts:',
          '`Menubar > MenubarMenu > MenubarTrigger + MenubarContent`, with `MenubarItem`,',
          '`MenubarCheckboxItem`, `MenubarRadioGroup`/`RadioItem`, `MenubarLabel`,',
          '`MenubarSeparator`, `MenubarShortcut`, and `MenubarSub` for submenus. The triggers wear',
          'the Button `secondary` variant in every state, like the other overlay triggers.',
          '',
          'It is dumb/presentational — a container decides the menus and wires the callbacks; each',
          '`MenubarMenu` holds its own `open` state (Base UI has no bar-level `value`). These',
          'stories are interactive: click a trigger to open its menu, or set the **`value`**',
          'control to a menu name (e.g. `file`) to pin it open — that same control is what the',
          'visual-regression suite drives. The content is portalled and themed via the',
          "`bg-popover` / `focus:bg-accent` tokens. shadcn's enter/exit animations are omitted",
          '(the repo has no animation plugin).',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  args: { value: '', orientation: 'horizontal', loopFocus: true, modal: true },
  argTypes: {
    value: {
      control: 'text',
      description: 'Which menu is open (the name passed to the story wiring). Set it, or click.',
    },
    orientation: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
      description:
        'Layout + arrow-key axis: vertical stacks the triggers into a column and roves focus ' +
        'with up/down. Pass side="right" on MenubarContent so a vertical bar opens menus beside it.',
    },
    loopFocus: {
      control: 'boolean',
      description: 'Whether arrow-key focus loops from the last trigger back to the first.',
    },
    modal: {
      control: 'boolean',
      description:
        'When true, an open menu locks page scroll and makes everything OUTSIDE it inert ' +
        '(Base UI renders an invisible backdrop). Invisible in this isolated canvas — there is ' +
        'nothing outside to scroll or click; it matters in a real app shell.',
    },
  },
  // `value` is story wiring (Base UI's Menubar has no `value` prop), so `as` (not `satisfies`) —
  // same precedent as Tooltip.stories.tsx.
} as Meta<typeof Menubar>;

export default meta;

type Story = StoryObj<typeof meta>;

type MenuControlProps = { open: boolean; onOpenChange: (open: boolean) => void };

// Bind which menu is open to the `value` control and sync it back on click via `useArgs`, so the
// triggers and the control agree and VR can force a menu open with `args=value:<menu>`. Base UI
// has no bar-level `value`, so the factory hands each MenubarMenu its own open/onOpenChange pair.
const controlledRender = (
  menus: (menuProps: (menu: string) => MenuControlProps) => React.ReactNode,
) => {
  const Render = () => {
    const [{ value, orientation, loopFocus, modal }, updateArgs] = useArgs<{
      value: string;
      orientation: 'horizontal' | 'vertical';
      loopFocus: boolean;
      modal: boolean;
    }>();
    const menuProps = (menu: string): MenuControlProps => ({
      open: value === menu,
      onOpenChange: (open) => updateArgs({ value: open ? menu : '' }),
    });
    return (
      <Menubar orientation={orientation} loopFocus={loopFocus} modal={modal}>
        {menus(menuProps)}
      </Menubar>
    );
  };
  return Render;
};

// The File menu with player-style vocabulary, alongside closed Edit / View triggers.
export const Open: Story = {
  render: controlledRender((menuProps) => (
    <>
      <MenubarMenu {...menuProps('file')}>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>
            New song
            <MenubarShortcut>⌘N</MenubarShortcut>
          </MenubarItem>
          <MenubarItem>Open score</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>
            Export
            <MenubarShortcut>⌘E</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu {...menuProps('edit')}>
        <MenubarTrigger>Edit</MenubarTrigger>
      </MenubarMenu>
      <MenubarMenu {...menuProps('view')}>
        <MenubarTrigger>View</MenubarTrigger>
      </MenubarMenu>
    </>
  )),
};

// The View menu with the checkbox / radio / submenu family, so those Menubar-specific parts
// (and their Material Symbols glyphs: check / circle / chevron_right) get VR + a11y coverage.
// The label sits INSIDE the radio group — Base UI's GroupLabel requires (and labels) its group.
export const WithSelections: Story = {
  render: controlledRender((menuProps) => (
    <MenubarMenu {...menuProps('view')}>
      <MenubarTrigger>View</MenubarTrigger>
      <MenubarContent>
        <MenubarCheckboxItem checked>Show completed</MenubarCheckboxItem>
        <MenubarSeparator />
        <MenubarRadioGroup value="title">
          <MenubarLabel>Sort by</MenubarLabel>
          <MenubarRadioItem value="title">Title</MenubarRadioItem>
          <MenubarRadioItem value="level">Level</MenubarRadioItem>
        </MenubarRadioGroup>
        <MenubarSeparator />
        <MenubarSub>
          <MenubarSubTrigger>More</MenubarSubTrigger>
        </MenubarSub>
      </MenubarContent>
    </MenubarMenu>
  )),
};
