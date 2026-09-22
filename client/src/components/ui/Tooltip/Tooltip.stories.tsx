import { useArgs } from 'storybook/preview-api';

import { Tooltip, TooltipContent, TooltipTrigger } from './Tooltip';
import type { Meta, StoryObj } from '@storybook/tanstack-react';
import type * as React from 'react';
import { Button } from '@/components/ui/Button/Button';

// Button variants the `triggerVariant` control can render the trigger as — the trigger is a
// plain `render={<Button …/>}`, so any Button variant works; consumers can render anything that
// forwards a ref and spreads props.
const TRIGGER_VARIANTS = [
  'default',
  'outline',
  'secondary',
  'ghost',
  'destructive',
  'link',
] as const;
type TriggerVariant = (typeof TRIGGER_VARIANTS)[number];

const meta = {
  title: 'UI/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: [
          'Tooltip — a shadcn/ui port over Base UI. Compose it as',
          '`Tooltip > TooltipTrigger + TooltipContent`. The `Tooltip` wraps its own',
          '`TooltipProvider`, so a single tooltip works standalone.',
          '',
          'It is dumb/presentational: it opens on hover/focus of the trigger. These stories are',
          'interactive — hover or focus the trigger to open it, or flip the **`open`** control to',
          'pin it open (that same control is what the visual-regression suite drives). The trigger',
          'is whatever you pass to `render` — pick a Button variant with the **`triggerVariant`**',
          'control here. The content is portalled, positioned by Base UI, and themed via the',
          '`bg-primary` / `text-primary-foreground` tokens in light and dark.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  args: { open: false, delay: 0, closeDelay: 0, triggerVariant: 'secondary' },
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Controlled open state. Flip it here, or hover/focus the trigger.',
    },
    delay: {
      control: 'number',
      description: 'Milliseconds to wait before opening on hover.',
    },
    closeDelay: {
      control: 'number',
      description: 'Milliseconds to wait before closing after the pointer leaves.',
    },
    triggerVariant: {
      control: 'select',
      options: TRIGGER_VARIANTS,
      description: 'Button variant rendered as the trigger (any render-able element works).',
    },
  },
  // `delay`/`closeDelay` live on TooltipTrigger and `triggerVariant` is story wiring — neither is
  // on the Tooltip root Meta<typeof Tooltip> is typed against, so `as` (not `satisfies`).
} as Meta<typeof Tooltip>;

export default meta;

type Story = StoryObj<typeof meta>;

// Bind the tooltip's `open` to the Storybook control and sync it back on hover/focus, so the
// trigger, the control, and the VR `open` arg all drive the same state. `delay`/`closeDelay` pass
// straight through to the trigger and `triggerVariant` picks the trigger Button. Storybook preview
// hooks (`useArgs`) must run INSIDE the render function Storybook invokes — not a nested component
// — so this factory returns that render function.
const controlledRender = (label: string, content: React.ReactNode) => {
  const Render = () => {
    const [{ open, delay, closeDelay, triggerVariant }, updateArgs] = useArgs<{
      open: boolean;
      delay: number;
      closeDelay: number;
      triggerVariant: TriggerVariant;
    }>();
    return (
      <Tooltip open={open} onOpenChange={(next) => updateArgs({ open: next })}>
        <TooltipTrigger
          delay={delay}
          closeDelay={closeDelay}
          render={<Button variant={triggerVariant}>{label}</Button>}
        />
        {content}
      </Tooltip>
    );
  };
  return Render;
};

// Default — hover/focus "Hover me" (or flip `open`) to reveal a short label.
export const Default: Story = {
  render: controlledRender('Hover me', <TooltipContent>Add to practice</TooltipContent>),
  parameters: {
    // The render factory makes autodocs' inferred snippet useless — show real usage instead.
    docs: {
      source: {
        code: `<Tooltip>
  <TooltipTrigger render={<Button variant="secondary">Hover me</Button>} />
  <TooltipContent>Add to practice</TooltipContent>
</Tooltip>`,
      },
    },
  },
};

// Longer content to exercise `text-balance` wrapping.
export const LongText: Story = {
  render: controlledRender(
    'Details',
    <TooltipContent className="max-w-56">
      Play the full song at your best tempo, then drill the tricky bars in Practice mode.
    </TooltipContent>,
  ),
  parameters: {
    docs: {
      source: {
        code: `<Tooltip>
  <TooltipTrigger render={<Button variant="secondary">Details</Button>} />
  <TooltipContent className="max-w-56">
    Play the full song at your best tempo, then drill the tricky bars in Practice mode.
  </TooltipContent>
</Tooltip>`,
      },
    },
  },
};
