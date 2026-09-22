import { ScrollArea } from './ScrollArea';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/ScrollArea',
  component: ScrollArea,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: [
          'ScrollArea — a shadcn/ui port over Base UI. A custom-scrollbar container for the',
          "player's horizontal control/section strip. `ScrollArea` wraps its viewport and a themed",
          '`ScrollBar`; the bar is drawn with the `border` / `bg-border` tokens in light and dark.',
          '',
          'It is dumb/presentational — it scrolls whatever children overflow it. Base UI mounts',
          'the bar whenever the content overflows the viewport (deterministic for docs + VR) and',
          'unmounts it otherwise; there is no hover-reveal `type` prop like Radix had.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
      description: 'Scrollbar axis — the story content adapts to overflow that way.',
    },
  },
} satisfies Meta<typeof ScrollArea>;

export default meta;

type Story = StoryObj<typeof meta>;

// A row of section chips wider than the container, so the horizontal scrollbar shows — the
// player's section strip (#/play/:slug). The overflow itself pins the bar for a deterministic
// snapshot (Base UI mounts the bar whenever the viewport overflows).
const SECTIONS = [
  'Intro',
  'Verse 1',
  'Pre-chorus',
  'Chorus 1',
  'Verse 2',
  'Chorus 2',
  'Bridge',
  'Solo',
  'Breakdown',
  'Chorus 3',
  'Outro',
  'Coda',
] as const;

export const HorizontalStrip: Story = {
  args: { orientation: 'horizontal' },
  render: (args) => (
    <ScrollArea
      orientation={args.orientation ?? 'horizontal'}
      className={
        args.orientation === 'vertical'
          ? 'border-border dark:border-input h-40 w-56 rounded-md border'
          : 'border-border dark:border-input w-80 max-w-full rounded-md border'
      }
    >
      <div className={args.orientation === 'vertical' ? 'grid gap-2 p-3' : 'flex w-max gap-2 p-3'}>
        {SECTIONS.map((section) => (
          <span
            key={section}
            className="bg-muted text-foreground inline-flex h-8 items-center rounded-md px-3 text-sm whitespace-nowrap"
          >
            {section}
          </span>
        ))}
      </div>
    </ScrollArea>
  ),
};
