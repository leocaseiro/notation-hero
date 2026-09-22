import { fn } from 'storybook/test';

import { SettingRow } from './SettingRow';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/SettingRow',
  component: SettingRow,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  // Every story gets an onChange spy so a click/keystroke is observable in the Actions panel; an
  // action row also gets onAction.
  args: { onChange: fn(), onAction: fn() },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SettingRow>;

export default meta;

type Story = StoryObj<typeof meta>;

// A boolean row — the checkbox sits inside the label so the whole row is the hit target.
export const Toggle: Story = {
  args: {
    id: 'show-cursors',
    label: 'Show cursors',
    control: { kind: 'toggle' },
    value: true,
  },
};

// A plain numeric field, no slider. Named to match the `number` control kind and story id (the
// id Storybook derives from this export's name), not the JS global.
// eslint-disable-next-line sonarjs/no-globals-shadowing -- see comment above
export const Number: Story = {
  args: {
    id: 'scale',
    label: 'Scale',
    control: { kind: 'number', min: 0.5, max: 2, step: 0.1 },
    value: 1,
  },
};

// A number input paired with a slider on the line beneath — the row grammar the speed and zoom
// rows use.
export const Range: Story = {
  args: {
    id: 'zoom',
    label: 'Zoom',
    control: { kind: 'range', min: 0.25, max: 3, step: 0.05 },
    value: 1,
  },
};

// Free text, committed on blur or Enter — a notation font string, one of the rows that needs this
// rather than the `color` kind.
export const Text: Story = {
  args: {
    id: 'notation-font',
    label: 'Notation font',
    control: { kind: 'text' },
    value: 'bold 12px Georgia',
  },
};

// A native colour picker — the six colour rows use this, never `text`.
export const Color: Story = {
  args: {
    id: 'staff-line-color',
    label: 'Staff line colour',
    control: { kind: 'color' },
    value: '#2DD4BF',
  },
};

// A dropdown built from a plain option list.
export const Select: Story = {
  args: {
    id: 'layout-mode',
    label: 'Layout mode',
    control: {
      kind: 'select',
      options: [
        { value: 'page', label: 'Page' },
        { value: 'horizontal', label: 'Horizontal' },
      ],
    },
    value: 'page',
  },
};

// A command row — the Export group. Pressing it fires onAction, never onChange.
export const Action: Story = {
  args: {
    id: 'export-midi',
    label: 'MIDI file',
    control: { kind: 'action', actionLabel: 'Export MIDI' },
    value: '',
  },
};

// Disabled — the label stays visible, so no why-tooltip is owed here.
export const Disabled: Story = {
  args: {
    id: 'show-cursors',
    label: 'Show cursors',
    control: { kind: 'toggle' },
    value: false,
    disabled: true,
  },
};
