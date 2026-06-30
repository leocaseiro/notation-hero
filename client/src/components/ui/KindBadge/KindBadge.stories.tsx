import { KindBadge } from './KindBadge';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/KindBadge',
  component: KindBadge,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: { kind: { control: 'select', options: ['beat', 'rudiment', 'fill'] } },
} satisfies Meta<typeof KindBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Beat: Story = { args: { kind: 'beat' } };
export const Rudiment: Story = { args: { kind: 'rudiment' } };
export const Fill: Story = { args: { kind: 'fill' } };
