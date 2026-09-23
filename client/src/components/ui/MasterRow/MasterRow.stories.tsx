import { fn } from 'storybook/test';

import { RECORDING } from '../TrackRow/TrackRow';
import { MasterRow } from './MasterRow';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/MasterRow',
  component: MasterRow,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    volume: 0.5,
    onVolumeChange: fn(),
    soloAll: false,
    soloAllIndeterminate: false,
    onSoloAllChange: fn(),
    muteAll: false,
    muteAllIndeterminate: false,
    onMuteAllChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[30rem]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MasterRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Resting: Story = {};

// Only some tracks soloed and muted — both buttons read mixed, never released.
export const Mixed: Story = {
  args: { soloAllIndeterminate: true, muteAllIndeterminate: true },
};

// Every track soloed and muted — both buttons pressed, so their tooltips read the way back out.
export const Ticked: Story = {
  args: { soloAll: true, muteAll: true },
};

// The file plays its own recording: both buttons render unavailable; master volume stays live.
export const Recording: Story = {
  args: { soloMuteUnavailable: RECORDING },
};
