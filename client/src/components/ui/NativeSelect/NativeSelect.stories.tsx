import { fn } from 'storybook/test';

import { NativeSelect } from './NativeSelect';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/NativeSelect',
  component: NativeSelect,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  // aria-label gives every isolated story its accessible name; the onChange fn()
  // spy makes selections observable in the Actions panel.
  args: { 'aria-label': 'Difficulty', onChange: fn() },
  argTypes: {
    disabled: { control: 'boolean' },
    'aria-invalid': { control: 'boolean' },
    'aria-label': { control: 'text' },
  },
} satisfies Meta<typeof NativeSelect>;

export default meta;

type Story = StoryObj<typeof meta>;

// Baseline — a few options with a preselected value. `aria-label` gives the
// control its accessible name (no visible `<label>` in the isolated story).
export const Default: Story = {
  args: { defaultValue: 'beginner' },
  render: (args) => (
    <NativeSelect {...args}>
      <option value="debut">Debut</option>
      <option value="beginner">Beginner</option>
      <option value="intermediate">Intermediate</option>
      <option value="advanced">Advanced</option>
    </NativeSelect>
  ),
};

// Placeholder pattern — a disabled, hidden first option shown until the user
// picks. `defaultValue=""` selects it so the field reads as "empty".
export const Placeholder: Story = {
  args: { defaultValue: '' },
  render: (args) => (
    <NativeSelect {...args}>
      <option value="" disabled hidden>
        Select a difficulty…
      </option>
      <option value="debut">Debut</option>
      <option value="beginner">Beginner</option>
      <option value="intermediate">Intermediate</option>
    </NativeSelect>
  ),
};

// Disabled — `disabled` dims the field (`opacity-50`), shows the not-allowed
// cursor, and greys the chevron via `peer-disabled`.
export const Disabled: Story = {
  args: { defaultValue: 'beginner', disabled: true },
  render: (args) => (
    <NativeSelect {...args}>
      <option value="debut">Debut</option>
      <option value="beginner">Beginner</option>
      <option value="intermediate">Intermediate</option>
    </NativeSelect>
  ),
};

// Invalid — `aria-invalid` switches the border and ring to the destructive
// colour, the same signal the form layer sets on a failed field.
export const Invalid: Story = {
  args: { defaultValue: '', 'aria-invalid': true },
  render: (args) => (
    <NativeSelect {...args}>
      <option value="" disabled hidden>
        Select a difficulty…
      </option>
      <option value="debut">Debut</option>
      <option value="beginner">Beginner</option>
    </NativeSelect>
  ),
};

// Grouped options — `<optgroup>` bins the choices under labelled headers.
export const WithGroups: Story = {
  args: { 'aria-label': 'Instrument', defaultValue: 'snare' },
  render: (args) => (
    <NativeSelect {...args}>
      <optgroup label="Percussion">
        <option value="snare">Snare</option>
        <option value="kick">Kick</option>
        <option value="hi-hat">Hi-hat</option>
      </optgroup>
      <optgroup label="Melodic">
        <option value="marimba">Marimba</option>
        <option value="glockenspiel">Glockenspiel</option>
      </optgroup>
    </NativeSelect>
  ),
};

// Many options — ~15 entries confirm the field stays a fixed-height control and
// the native picker scrolls rather than the layout growing.
export const ManyOptions: Story = {
  args: { 'aria-label': 'Level', defaultValue: '1' },
  render: (args) => (
    <NativeSelect {...args}>
      {Array.from({ length: 15 }, (_, i) => i + 1).map((level) => (
        <option key={level} value={String(level)}>
          Level {level}
        </option>
      ))}
    </NativeSelect>
  ),
};
