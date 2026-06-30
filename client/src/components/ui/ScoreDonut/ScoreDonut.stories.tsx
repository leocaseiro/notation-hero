import { ScoreDonut } from './ScoreDonut';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/ScoreDonut',
  component: ScoreDonut,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: { size: { control: { type: 'range', min: 20, max: 96, step: 4 } } },
} satisfies Meta<typeof ScoreDonut>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotAttempted: Story = { args: { score: null } };
export const JustStarted: Story = { args: { score: 1 } }; // smallest arc — locks the ~1% ring vs empty
export const Low: Story = { args: { score: 35 } };
export const Developing: Story = { args: { score: 60 } };
export const Climbing: Story = { args: { score: 78 } };
export const High: Story = { args: { score: 94 } };
export const Mastered: Story = { args: { score: 100 } };
