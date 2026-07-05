import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Popover',
  component: Popover,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  // Roomy positioned wrapper so the open panel is captured inside #storybook-root for VR.
  decorators: [
    (Story) => (
      <div className="relative min-h-56 w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

const TRIGGER_CLASS =
  'inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm shadow-xs hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none';

const Panel = () => (
  <PopoverContent>
    <p className="text-sm font-medium">Popover title</p>
    <p className="text-sm text-muted-foreground">
      Floating panel content, anchored to the trigger.
    </p>
  </PopoverContent>
);

// Closed — only the trigger button is shown.
export const Closed: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger className={TRIGGER_CLASS}>Open popover</PopoverTrigger>
      <Panel />
    </Popover>
  ),
};

// Open — the floating panel renders inline (no Portal), so it stays inside the story root.
export const Open: Story = {
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger className={TRIGGER_CLASS}>Open popover</PopoverTrigger>
      <Panel />
    </Popover>
  ),
};
