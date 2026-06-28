import { Cover } from './Cover';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Cover',
  component: Cover,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Cover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Song: Story = { args: { variant: 'song', icon: 'music_note' } };
export const Lesson: Story = { args: { variant: 'lesson', icon: 'school' } };
