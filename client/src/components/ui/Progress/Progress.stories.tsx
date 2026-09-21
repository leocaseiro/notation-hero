import { Progress } from './Progress';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Progress',
  component: Progress,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: {
    value: 0.42,
    label: 'Loading sounds',
  },
} satisfies Meta<typeof Progress>;

export default meta;
type Story = StoryObj<typeof meta>;

// A download part-way through: `value` is a 0-1 fraction.
export const Default: Story = {};

export const Complete: Story = {
  args: { value: 1 },
};

// No fraction exists (the response carried no Content-Length), so the bar pulses instead.
export const Indeterminate: Story = {
  args: { value: null },
};
