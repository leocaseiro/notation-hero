import { useState } from 'react';
import { fn } from 'storybook/test';
import { Scrubber } from './Scrubber';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Scrubber',
  component: Scrubber,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    // Wide on purpose: the bar sits between two clocks and needs room to read as a rail.
    (Story) => (
      <div className="w-[36rem]">
        <Story />
      </div>
    ),
  ],
  args: {
    positionMs: 102_000,
    durationMs: 260_000,
    onSeek: fn(),
  },
  argTypes: {
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Scrubber>;

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive: local state stands in for the player, so a drag or an arrow key moves the clock.
const Interactive = ({
  initialMs,
  ...args
}: Readonly<Parameters<typeof Scrubber>[0] & { initialMs: number }>) => {
  const [positionMs, setPositionMs] = useState(initialMs);
  return (
    <Scrubber
      {...args}
      positionMs={positionMs}
      onSeek={(ms) => {
        setPositionMs(ms);
        args.onSeek(ms);
      }}
    />
  );
};

export const Default: Story = {
  render: (args) => <Interactive {...args} initialMs={102_000} />,
};

export const Start: Story = {
  render: (args) => <Interactive {...args} initialMs={0} />,
};

export const NearEnd: Story = {
  render: (args) => <Interactive {...args} initialMs={255_000} />,
};

// Nothing loaded: no length, so the bar is disabled and both clocks read 00:00.
export const Empty: Story = {
  args: { positionMs: 0, durationMs: 0 },
};
