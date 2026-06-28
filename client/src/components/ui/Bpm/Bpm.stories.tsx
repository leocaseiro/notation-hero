import { Bpm } from './Bpm';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Bpm',
  component: Bpm,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Bpm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = { args: { value: 116 } };
export const Range: Story = { args: { value: '60→120' } };
