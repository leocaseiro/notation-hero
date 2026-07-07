import { fn } from 'storybook/test';

import { Label } from './Label';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Label',
  component: Label,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  // onMouseDown is the one component-mediated handler (double-click selection
  // guard) — the fn() spy makes it observable in the Actions panel.
  args: { children: 'Email', onMouseDown: fn() },
  argTypes: {
    htmlFor: { control: 'text' },
    children: { control: 'text' },
  },
} satisfies Meta<typeof Label>;

export default meta;

type Story = StoryObj<typeof meta>;

// Plain label with no associated control — the baseline typography + spacing.
export const Default: Story = {};

// `htmlFor` points at the input's `id`, so clicking the label focuses the input.
// This is the standard, accessible pairing for a separate label + field.
export const WithAssociatedInput: Story = {
  render: () => (
    <div className="grid gap-1.5">
      <Label htmlFor="email">Email</Label>
      <input
        id="email"
        type="email"
        placeholder="you@example.com"
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      />
    </div>
  ),
};

// The label wraps the control instead of using `htmlFor` — the association is
// implicit, and the `gap-2` base class spaces the checkbox from its text.
export const WrappingInput: Story = {
  render: () => (
    <Label>
      <input type="checkbox" />
      Remember me
    </Label>
  ),
};

// Disabled peer input — `peer-disabled:` dims the label and shows the
// not-allowed cursor, so a disabled field reads as disabled without extra props.
export const Disabled: Story = {
  render: () => (
    <div className="grid gap-1.5">
      <input
        id="disabled-email"
        type="email"
        disabled
        placeholder="you@example.com"
        className="peer h-9 rounded-md border border-input bg-background px-3 text-sm"
      />
      <Label htmlFor="disabled-email">Email</Label>
    </div>
  ),
};

// Required field — the asterisk marks it visually; `aria-hidden` keeps the
// decorative glyph out of the accessible name (the "required" cue belongs on the
// input via `required`/`aria-required`).
export const Required: Story = {
  render: () => (
    <Label htmlFor="required-name">
      Name
      <span className="text-destructive" aria-hidden="true">
        *
      </span>
    </Label>
  ),
};

// Long text — confirms the label wraps within a constrained width rather than
// overflowing (the base class leaves wrapping to normal flow).
export const LongText: Story = {
  render: () => (
    <div className="max-w-60">
      <Label htmlFor="consent">
        I agree to receive occasional product updates and understand I can unsubscribe at any time
      </Label>
    </div>
  ),
};

// Ancestor group marked data-disabled="true" — the wiring Field-style wrappers
// use; `group-data-[disabled=true]:` dims the label and shows the not-allowed
// cursor, mirroring the peer-disabled path.
export const GroupDisabled: Story = {
  render: () => (
    <div className="group grid gap-1.5" data-disabled="true">
      <Label htmlFor="group-disabled-email">Email</Label>
      <input
        id="group-disabled-email"
        type="email"
        disabled
        placeholder="you@example.com"
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
      />
    </div>
  ),
};
