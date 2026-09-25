import { fn } from 'storybook/test';

import { RECORDING, TrackRow } from './TrackRow';
import type { TrackStaffState } from './TrackRow';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const drumStaff: TrackStaffState = {
  id: 'staff-0',
  label: 'Staff 1',
  showStandardNotation: true,
  showSlash: false,
  showNumbered: false,
  showTablature: false,
  tablatureAvailable: false,
};

const guitarStaff: TrackStaffState = {
  id: 'staff-0',
  label: 'Staff 1',
  showStandardNotation: true,
  showSlash: false,
  showNumbered: false,
  showTablature: true,
  tablatureAvailable: true,
};

const meta = {
  title: 'UI/TrackRow',
  component: TrackRow,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    name: 'Drumkit',
    rendered: true,
    onRenderedChange: fn(),
    solo: false,
    onSoloChange: fn(),
    mute: false,
    onMuteChange: fn(),
    volume: 8,
    onVolumeChange: fn(),
    staves: [drumStaff],
    onStaffChange: fn(),
    transposeAudio: 0,
    onTransposeAudioChange: fn(),
    transposeFull: 0,
    onTransposeFullChange: fn(),
    expanded: false,
    onExpandedChange: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-[30rem]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TrackRow>;

export default meta;
type Story = StoryObj<typeof meta>;

// The primary cluster only — the disclosure is closed.
export const Collapsed: Story = {};

// Both transposition sliders revealed behind the per-row disclosure.
export const Expanded: Story = {
  args: { expanded: true },
};

// A stringed staff with a tuning — the only case where the tablature toggle is enabled. Percussion
// still shows the button, disabled.
export const StringedExpanded: Story = {
  args: {
    name: 'Distortion Guitar',
    staves: [guitarStaff],
    expanded: true,
  },
};

// A grand-staff part (piano): two staves, each its own labelled toggle group wrapping onto its
// own line below the primary cluster.
export const MultiStaff: Story = {
  args: {
    name: 'Piano',
    staves: [
      { ...drumStaff, id: 'treble', label: 'Treble' },
      { ...drumStaff, id: 'bass', label: 'Bass' },
    ],
  },
};

export const Muted: Story = {
  args: { mute: true },
};

export const Soloed: Story = {
  args: { solo: true },
};

// The file plays its own recording: solo, mute, volume and Transpose audio render disabled.
export const Recording: Story = {
  args: { expanded: true, mixUnavailable: RECORDING },
};

// A percussion track: transposition is meaningless on a drum "pitch", so the expand control that
// reveals the two transposition sliders locks — never the sliders themselves, since the
// disclosure holds nothing else. expanded stays false: the mapper never starts a percussion row
// already expanded, so the sliders can never actually be reached here.
export const PercussionExpandLocked: Story = {
  args: { expandUnavailable: 'Transposition is not available for percussion tracks' },
};
