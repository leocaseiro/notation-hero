import { Flags } from './Flags';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Flags',
  component: Flags,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Flags>;

export default meta;
type Story = StoryObj<typeof meta>;

export const All: Story = { args: { audio: true, video: true, parts: true } };
export const AudioOnly: Story = { args: { audio: true } };
export const VideoOnly: Story = { args: { video: true } };
export const PartsOnly: Story = { args: { parts: true } };
