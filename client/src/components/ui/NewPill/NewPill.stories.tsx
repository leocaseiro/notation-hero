import { NewPill } from './NewPill';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/NewPill',
  component: NewPill,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof NewPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
