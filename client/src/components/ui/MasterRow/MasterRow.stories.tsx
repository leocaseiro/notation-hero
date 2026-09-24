import { fn } from 'storybook/test';

import { Button } from '../Button/Button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../Tooltip/Tooltip';
import { MIXER_BUTTON_CLASS, RECORDING } from '../TrackRow/TrackRow';
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

// The `leading` slot, filled the way the Tracks popover fills it: an icon toggle in the same
// 34px mixer-button column as a track's render-select eye. MasterRow does not know what it does
// — this is what gives axe and VR coverage to that slot and to the pattern living inside it,
// since no Storybook story reached it otherwise.
export const WithLeadingControl: Story = {
  args: {
    leading: (
      <Tooltip>
        <TooltipTrigger closeOnClick={false} render={<span className="inline-flex" />}>
          <Button
            variant="ghost"
            size="icon"
            aria-pressed={false}
            aria-label="Multiple tracks"
            className={`${MIXER_BUTTON_CLASS} border border-border`}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              splitscreen
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent sideOffset={8} className="max-w-40">
          Multiple tracks
        </TooltipContent>
      </Tooltip>
    ),
  },
};
