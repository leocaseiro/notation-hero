import { useArgs } from 'storybook/preview-api';

import { HoverCard, HoverCardContent, HoverCardTrigger } from './HoverCard';
import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { Button } from '@/components/ui/Button/Button';

const meta = {
  title: 'UI/HoverCard',
  component: HoverCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: [
          "HoverCard — a shadcn/ui port over Base UI's PreviewCard. Compose it as",
          '`HoverCard > HoverCardTrigger + HoverCardContent`. It shows a rich preview when the',
          'user hovers or focuses the trigger.',
          '',
          'It is dumb/presentational — a container decides what preview to render; the card holds',
          'only its own open state. This story is interactive: hover or focus the trigger to open',
          'it, or flip the **`open`** control to pin it open (that same control is what the',
          'visual-regression suite drives). `delay`/`closeDelay` live on the trigger (Base UI',
          'moves them off the root) and default to 0 here so the story reacts immediately. The',
          'content is portalled and themed via the `bg-popover` / `text-popover-foreground`',
          "tokens. shadcn's enter/exit animations are omitted (the repo has no animation plugin).",
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
      options: ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'],
      description: 'Button variant rendered as the trigger (any render-able element works).',
    },
  },
  // `delay`/`closeDelay` live on HoverCardTrigger and `triggerVariant` is story wiring — neither
  // is on the HoverCard root Meta<typeof HoverCard> is typed against, so `as` (not `satisfies`).
} as Meta<typeof HoverCard>;

export default meta;

type Story = StoryObj<typeof meta>;

// A small song preview from the catalog vocabulary: title + a couple of stats. Bound to the `open`
// control (synced back on hover) so the trigger and the control agree and VR can force it open.
// `delay`/`closeDelay` pass straight through to the trigger so the controls exercise the real
// props.
const OpenPreview = () => {
  const [{ open, delay, closeDelay, triggerVariant }, updateArgs] = useArgs<{
    open: boolean;
    delay: number;
    closeDelay: number;
    triggerVariant: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
  }>();
  return (
    <HoverCard open={open} onOpenChange={(next) => updateArgs({ open: next })}>
      <HoverCardTrigger
        delay={delay}
        closeDelay={closeDelay}
        render={<Button variant={triggerVariant}>Yellow</Button>}
      />
      <HoverCardContent align="start">
        <p className="text-sm font-medium">Yellow</p>
        <p className="text-muted-foreground mt-1 text-xs">Coldplay · Beginner 2</p>
        <dl className="mt-3 flex gap-4 text-xs">
          <div>
            <dt className="text-muted-foreground">Tempo</dt>
            <dd className="font-medium">89 BPM</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Sections</dt>
            <dd className="font-medium">4</dd>
          </div>
        </dl>
      </HoverCardContent>
    </HoverCard>
  );
};

export const Open: Story = {
  render: OpenPreview,
  parameters: {
    // The useArgs render component makes autodocs' inferred snippet useless — show real usage.
    docs: {
      source: {
        code: `<HoverCard>
  <HoverCardTrigger render={<Button variant="secondary">Yellow</Button>} />
  <HoverCardContent align="start">
    <p className="text-sm font-medium">Yellow</p>
    <p className="text-muted-foreground mt-1 text-xs">Coldplay · Beginner 2</p>
  </HoverCardContent>
</HoverCard>`,
      },
    },
  },
};
