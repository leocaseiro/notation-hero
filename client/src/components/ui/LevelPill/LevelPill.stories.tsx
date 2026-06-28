import { LevelPill } from './LevelPill';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/LevelPill',
  component: LevelPill,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof LevelPill>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ungraded: Story = { args: { level: null } };
export const Debut: Story = { args: { level: 0 } };
export const Mid: Story = { args: { level: 5 } };
export const Max: Story = { args: { level: 10 } };
