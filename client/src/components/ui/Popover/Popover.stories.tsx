import { fn } from 'storybook/test';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import type { Meta, StoryObj } from '@storybook/tanstack-react';
import type { ComponentProps } from 'react';
import { buttonVariants } from '@/components/ui/Button/Button';

// The positioning props (side / align / sideOffset) live on PopoverContent (the panel), not on
// Root — surfaced here as top-level story args (the same pattern Tabs uses for its List props) so
// the Controls panel can drive positioning. Root's own trivial props (defaultOpen, modal) and its
// onOpenChange handler are driven directly. Heavier/compound props (Positioner collision handling,
// Portal container, render composition) are left to the Base UI docs:
// https://base-ui.com/react/components/popover
type PopoverStoryArgs = ComponentProps<typeof Popover> &
  Pick<ComponentProps<typeof PopoverContent>, 'align' | 'side' | 'sideOffset'>;

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
  // Defaults mirror the component's own defaults (PopoverContent: align 'start', sideOffset 6; Base
  // UI: side 'bottom', modal false) so the committed VR baselines stay pixel-stable.
  args: {
    modal: false,
    side: 'bottom',
    align: 'start',
    sideOffset: 6,
    onOpenChange: fn(),
  },
  argTypes: {
    defaultOpen: { control: 'boolean' },
    modal: { control: 'boolean' },
    side: { control: 'radio', options: ['top', 'right', 'bottom', 'left'] },
    align: { control: 'radio', options: ['start', 'center', 'end'] },
    sideOffset: { control: { type: 'number', min: 0, max: 24, step: 1 } },
  },
} satisfies Meta<PopoverStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

// Demo trigger reuses Button's `outline` tokens (single source of truth) rather than hand-rolled
// classes — same pattern the shipped filter triggers use.
const TRIGGER_CLASS = buttonVariants({ variant: 'outline' });

const renderPopover = (args: PopoverStoryArgs) => (
  <Popover defaultOpen={args.defaultOpen} modal={args.modal} onOpenChange={args.onOpenChange}>
    <PopoverTrigger className={TRIGGER_CLASS}>Open popover</PopoverTrigger>
    <PopoverContent align={args.align} side={args.side} sideOffset={args.sideOffset}>
      <p className="text-sm font-medium">Popover title</p>
      <p className="text-sm text-muted-foreground">
        Floating panel content, anchored to the trigger.
      </p>
    </PopoverContent>
  </Popover>
);

// Closed — only the trigger button is shown.
export const Closed: Story = {
  args: { defaultOpen: false },
  render: renderPopover,
};

// Open — the floating panel renders inside the story root (Portal container = #storybook-root).
export const Open: Story = {
  args: { defaultOpen: true },
  render: renderPopover,
};
