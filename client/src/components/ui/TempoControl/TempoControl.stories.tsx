import { useState } from 'react';
import { fn } from 'storybook/test';
import { TempoControl } from './TempoControl';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/TempoControl',
  component: TempoControl,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    scoreTempo: 120,
    speed: 1,
    onSpeedChange: fn(),
  },
  argTypes: {
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof TempoControl>;

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive: local state so the steppers, the wheel and typing all work in the canvas. The
// component owns SPEED, never BPM, so the story holds the multiplier — as the player does.
const Interactive = ({
  initialSpeed,
  ...args
}: Readonly<Parameters<typeof TempoControl>[0] & { initialSpeed: number }>) => {
  const [speed, setSpeed] = useState(initialSpeed);
  return (
    <TempoControl
      {...args}
      speed={speed}
      onSpeedChange={(next) => {
        setSpeed(next);
        args.onSpeedChange(next);
      }}
    />
  );
};

// At written speed: the percentage is never shown — not on hover, not on focus.
export const Default: Story = {
  render: (args) => <Interactive {...args} initialSpeed={1} />,
};

// Off written speed: hover or focus reveals the percentage (75%); at rest it is hidden.
export const Slowed: Story = {
  render: (args) => <Interactive {...args} initialSpeed={0.75} />,
};

export const Disabled: Story = {
  args: { disabled: true },
};
