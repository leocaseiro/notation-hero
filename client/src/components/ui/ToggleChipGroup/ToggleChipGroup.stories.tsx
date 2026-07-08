import { useState } from 'react';
import { fn } from 'storybook/test';
import { ToggleChipGroup } from './ToggleChipGroup';
import type { ChipOption } from './ToggleChipGroup';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

// Time-signature filter chips (no icons).
const TIME_SIGNATURES: readonly ChipOption[] = [
  { value: '4/4', label: '4/4' },
  { value: '3/4', label: '3/4' },
  { value: '6/8', label: '6/8' },
  { value: '7/8', label: '7/8' },
  { value: '5/4', label: '5/4' },
];

// Skill filter chips, each with a leading Material Symbol.
const SKILLS: readonly ChipOption[] = [
  { value: 'timing', label: 'Timing', icon: 'timer' },
  { value: 'independence', label: 'Independence', icon: 'call_split' },
  { value: 'control', label: 'Control', icon: 'tune' },
  { value: 'coordination', label: 'Coordination', icon: 'sync' },
  { value: 'speed', label: 'Speed', icon: 'speed' },
];

const meta = {
  title: 'UI/ToggleChipGroup',
  component: ToggleChipGroup,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  // Baseline args satisfy the required controlled props; each story overrides value/options.
  args: {
    options: TIME_SIGNATURES,
    value: [],
    onChange: fn(),
    'aria-label': 'Time signature',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    type: { control: 'radio', options: ['single', 'multiple'] },
  },
} satisfies Meta<typeof ToggleChipGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive: local state so clicking chips updates the canvas. The dumb component is fully
// controlled, so the story owns the state — this is how a container would wire it.
export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>(['4/4']);
    return (
      <ToggleChipGroup
        {...args}
        value={value}
        onChange={(v) => {
          setValue(v);
          args.onChange(v);
        }}
      />
    );
  },
};

// Skill chips with leading icons; two selected.
export const Skills: Story = {
  args: { options: SKILLS, 'aria-label': 'Skills' },
  render: (args) => {
    const [value, setValue] = useState<string[]>(['timing', 'speed']);
    return (
      <ToggleChipGroup
        {...args}
        value={value}
        onChange={(v) => {
          setValue(v);
          args.onChange(v);
        }}
      />
    );
  },
};

// Single-select: at most one chip on at a time.
export const Single: Story = {
  args: { type: 'single' },
  render: (args) => {
    const [value, setValue] = useState<string[]>(['3/4']);
    return (
      <ToggleChipGroup
        {...args}
        value={value}
        onChange={(v) => {
          setValue(v);
          args.onChange(v);
        }}
      />
    );
  },
};

// Nothing selected — every chip resting.
export const NoneSelected: Story = {
  render: (args) => {
    const [value, setValue] = useState<string[]>([]);
    return (
      <ToggleChipGroup
        {...args}
        value={value}
        onChange={(v) => {
          setValue(v);
          args.onChange(v);
        }}
      />
    );
  },
};

// Disabled group — no chip is pressable.
export const Disabled: Story = {
  args: { value: ['4/4'], disabled: true },
};
