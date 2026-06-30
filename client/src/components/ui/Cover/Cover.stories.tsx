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

// Kind presets — the default cover glyph NameCell picks per kind when a row has no icon.
export const Song: Story = { args: { variant: 'song', icon: 'music_note' } };
export const Beat: Story = { args: { variant: 'song', icon: 'graphic_eq' } };
export const Rudiment: Story = { args: { variant: 'song', icon: 'drag_indicator' } };
export const Fill: Story = { args: { variant: 'song', icon: 'bolt' } };
export const Lesson: Story = { args: { variant: 'lesson', icon: 'school' } };
