import { PlayButton } from './PlayButton';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/PlayButton',
  component: PlayButton,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: { title: 'Billie Jean' },
} satisfies Meta<typeof PlayButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
