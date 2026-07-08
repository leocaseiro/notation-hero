import { useArgs } from 'storybook/preview-api';

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './DropdownMenu';
import type { Meta, StoryObj } from '@storybook/tanstack-react';
import type * as React from 'react';
import { Button } from '@/components/ui/Button/Button';

const meta = {
  title: 'UI/DropdownMenu',
  component: DropdownMenu,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: [
          'DropdownMenu — a shadcn/ui port over Base UI (migrated from Radix). Compose it from the',
          'parts: `DropdownMenu > DropdownMenuTrigger + DropdownMenuContent`, with `DropdownMenuItem`,',
          '`DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`/`RadioItem`, `DropdownMenuLabel`,',
          '`DropdownMenuSeparator`, `DropdownMenuShortcut`, and `DropdownMenuSub` for submenus.',
          '',
          'It is dumb/presentational — a container decides the items and wires the callbacks; the',
          'menu holds only its own open/checked state. These stories are interactive: click the',
          'trigger to open the menu, or flip the **`open`** control to pin it open (that same control',
          'is what the visual-regression suite drives). `modal={false}` keeps the isolated Storybook',
          'page from being locked around the portalled panel. The content is portalled and themed',
          "via the `bg-popover` / `focus:bg-accent` tokens. shadcn's enter/exit animations are",
          'omitted (the repo has no animation plugin).',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  args: {
    open: false,
    modal: false,
    loopFocus: true,
    orientation: 'vertical',
    triggerVariant: 'secondary',
  },
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Controlled open state. Flip it here, or click the trigger.',
    },
    modal: {
      control: 'boolean',
      description:
        'When true, interaction outside the open menu is disabled and page scroll is locked.',
    },
    loopFocus: {
      control: 'boolean',
      description: 'Whether arrow-key focus loops back to the first item after the last.',
    },
    orientation: {
      control: 'inline-radio',
      options: ['vertical', 'horizontal'],
      description: 'Roving-focus axis: vertical uses up/down arrows, horizontal left/right.',
    },
    triggerVariant: {
      control: 'select',
      options: ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'],
      description: 'Button variant rendered as the trigger (any render-able element works).',
    },
  },
  // `triggerVariant` is story wiring, not a DropdownMenu root prop — `as` (not `satisfies`).
} as Meta<typeof DropdownMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

// Bind `open` to the control and sync it back (click/keyboard) via `useArgs`, so the trigger and
// the control agree and VR can force it open with `args=open:!true`. `modal`, `loopFocus`, and
// `orientation` pass straight through to the root so the controls exercise the real props
// (`modal` defaults to false here to avoid locking the isolated story page around the panel).
const controlledRender = (triggerLabel: string, content: React.ReactNode) => {
  const Render = () => {
    const [{ open, modal, loopFocus, orientation, triggerVariant }, updateArgs] = useArgs<{
      open: boolean;
      modal: boolean;
      loopFocus: boolean;
      orientation: 'vertical' | 'horizontal';
      triggerVariant: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
    }>();
    return (
      <DropdownMenu
        open={open}
        onOpenChange={(next) => updateArgs({ open: next })}
        modal={modal}
        loopFocus={loopFocus}
        orientation={orientation}
      >
        <DropdownMenuTrigger render={<Button variant={triggerVariant}>{triggerLabel}</Button>} />
        {content}
      </DropdownMenu>
    );
  };
  return Render;
};

// Plain row actions from the catalog vocabulary, with a keyboard shortcut on the last item.
// Base UI's GroupLabel throws outside a Group/RadioGroup, so the label + its items are grouped.
export const Open: Story = {
  render: controlledRender(
    'Actions',
    <DropdownMenuContent align="start">
      <DropdownMenuGroup>
        <DropdownMenuLabel>Yellow</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Play</DropdownMenuItem>
        <DropdownMenuItem>Add to practice</DropdownMenuItem>
        <DropdownMenuItem>
          Open score
          <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>,
  ),
  parameters: {
    // The render factory makes autodocs' inferred snippet useless — show real usage instead.
    docs: {
      source: {
        code: `<DropdownMenu>
  <DropdownMenuTrigger render={<Button variant="secondary">Actions</Button>} />
  <DropdownMenuContent align="start">
    <DropdownMenuGroup>
      <DropdownMenuLabel>Yellow</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem>Play</DropdownMenuItem>
      <DropdownMenuItem>Add to practice</DropdownMenuItem>
      <DropdownMenuItem>
        Open score
        <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
      </DropdownMenuItem>
    </DropdownMenuGroup>
  </DropdownMenuContent>
</DropdownMenu>`,
      },
    },
  },
};

// A checkbox item plus a radio group — the "show completed" toggle and a sort-order choice.
export const WithCheckboxRadio: Story = {
  render: controlledRender(
    'View',
    <DropdownMenuContent align="start">
      <DropdownMenuCheckboxItem checked>Show completed</DropdownMenuCheckboxItem>
      <DropdownMenuSeparator />
      {/* The "Sort by" label sits INSIDE the RadioGroup: Base UI's GroupLabel needs a
          Group/RadioGroup context and labels the group it lives in. */}
      <DropdownMenuRadioGroup value="title">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioItem value="title">Title</DropdownMenuRadioItem>
        <DropdownMenuRadioItem value="level">Level</DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>,
  ),
};

// The submenu trigger (chevron glyph); the Sub panel opens on hover/focus of the trigger, so
// showing the trigger keeps this story deterministic.
export const WithSubmenu: Story = {
  render: controlledRender(
    'Actions',
    <DropdownMenuContent align="start">
      <DropdownMenuItem>Play</DropdownMenuItem>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>Add to lesson</DropdownMenuSubTrigger>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive">Remove</DropdownMenuItem>
    </DropdownMenuContent>,
  ),
};
