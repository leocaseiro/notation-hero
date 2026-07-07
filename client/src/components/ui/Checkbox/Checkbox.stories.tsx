import { fn } from 'storybook/test';

import { Checkbox } from './Checkbox';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Checkbox',
  component: Checkbox,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  // Every story needs an accessible name for axe; the standalone boxes carry an
  // aria-label, and `with-label` supplies its name through the wrapping <label>.
  // onCheckedChange is the one event-handler prop — the fn() spy makes toggles
  // observable in the Actions panel.
  args: { 'aria-label': 'Accept terms', onCheckedChange: fn() },
  argTypes: {
    checked: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
    disabled: { control: 'boolean' },
    'aria-invalid': { control: 'boolean' },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof meta>;

// Unchecked baseline — the resting box with its border and no indicator.
export const Default: Story = {};

// Checked — `check` glyph on the filled primary background.
export const Checked: Story = { args: { checked: true } };

// Indeterminate — Base UI's separate boolean prop (layered over the boolean
// checked state); the indicator shows `remove` (a horizontal bar) instead of the check.
export const Indeterminate: Story = { args: { indeterminate: true } };

// Disabled + unchecked — dimmed with the not-allowed cursor; not interactive.
export const Disabled: Story = { args: { disabled: true } };

// Disabled + checked — the disabled dimming still shows the checked fill + glyph.
export const DisabledChecked: Story = { args: { disabled: true, checked: true } };

// Invalid — `aria-invalid` swaps the border/ring to the destructive tokens, the
// standard cue for a failed-validation field.
export const Invalid: Story = { args: { 'aria-invalid': true } };

// Paired with text via a plain <label> (not our Label component, to keep this PR
// self-contained). `htmlFor`/`id` associate them, so clicking the text toggles the
// box and the label text becomes the accessible name.
export const WithLabel: Story = {
  render: () => (
    <label htmlFor="terms" className="flex items-center gap-2 text-sm">
      <Checkbox id="terms" />
      Accept terms and conditions
    </label>
  ),
};
