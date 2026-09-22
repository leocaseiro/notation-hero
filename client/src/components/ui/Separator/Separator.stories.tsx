import { Separator } from './Separator';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Separator',
  component: Separator,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: [
          'Separator — a shadcn/ui port over Base UI. A thin divider that renders as a',
          'full-width horizontal rule (default) or a full-height vertical rule via `orientation`.',
          '',
          'It is dumb/presentational but always semantic: Base UI renders `role="separator"` with',
          '`aria-orientation` (there is no Radix-style `decorative` mode). The `bg-border`',
          'token themes it in light and dark.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
      description: 'Rule axis — the story container adapts to match.',
    },
  },
} satisfies Meta<typeof Separator>;

export default meta;

type Story = StoryObj<typeof meta>;

// One adaptive layout both stories share, so the `orientation` control works from either: stacked
// blocks for a horizontal rule, an inline flex row for vertical rules.
const AdaptiveDemo = ({
  orientation = 'horizontal',
}: {
  orientation?: 'horizontal' | 'vertical';
}) =>
  orientation === 'vertical' ? (
    <div className="flex h-5 items-center gap-3 text-sm">
      <span>Songs</span>
      <Separator orientation="vertical" />
      <span>Lessons</span>
      <Separator orientation="vertical" />
      <span>Player</span>
    </div>
  ) : (
    <div className="w-64 text-sm">
      <div className="pb-2">Catalog</div>
      <Separator />
      <div className="pt-2 text-muted-foreground">Browse songs and lessons</div>
    </div>
  );

// A horizontal rule between two stacked blocks of text — the default orientation.
export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
  render: (args) => <AdaptiveDemo orientation={args.orientation ?? 'horizontal'} />,
};

// A vertical rule between two inline items — full-height inside a flex row.
export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => <AdaptiveDemo orientation={args.orientation ?? 'vertical'} />,
};
