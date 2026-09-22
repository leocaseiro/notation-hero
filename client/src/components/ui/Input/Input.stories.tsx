import { fn } from 'storybook/test';

import { Input } from './Input';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  // Every story gives the field an accessible name via aria-label so axe passes
  // without a visible <label> wrapper in the centered canvas. The fn() spies make
  // typing/focus observable in the Actions panel.
  args: { 'aria-label': 'Field', onChange: fn(), onFocus: fn(), onBlur: fn() },
  // Explicit controls: docgen can't expand React.ComponentProps<'input'>.
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'file', 'search', 'tel', 'url'],
    },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    'aria-invalid': { control: 'boolean' },
    placeholder: { control: 'text' },
    defaultValue: { control: 'text' },
  },
} satisfies Meta<typeof Input>;

export default meta;

type Story = StoryObj<typeof meta>;

// Empty field — the baseline border, height, and shadow with no value.
export const Default: Story = {};

// Placeholder text rendered in the muted foreground until the user types.
export const Placeholder: Story = {
  args: { placeholder: 'you@example.com' },
};

// Disabled field — `disabled:opacity-50` dims it and the not-allowed cursor
// signals it can't be edited.
export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Locked value' },
};

// Read-only field — shows a value the user can focus and copy but not edit.
export const ReadOnly: Story = {
  args: { readOnly: true, defaultValue: 'Read-only value' },
};

// Invalid field — `aria-invalid` swaps the border and focus ring to the
// destructive colour so validation errors read at a glance.
export const Invalid: Story = {
  args: { 'aria-invalid': true, defaultValue: 'not-an-email' },
};

// Pre-filled field — confirms typography and padding around an existing value.
export const WithValue: Story = {
  args: { defaultValue: 'Paradiddle' },
};

// Email input — mobile keyboards show the @-optimised layout for `type="email"`.
export const TypeEmail: Story = {
  args: { type: 'email', placeholder: 'you@example.com' },
};

// Password input — characters render masked for `type="password"`.
export const TypePassword: Story = {
  args: { type: 'password', defaultValue: 'hunter2' },
};

// Number input — numeric value with the browser's stepper affordances.
export const TypeNumber: Story = {
  args: { type: 'number', defaultValue: 120 },
};

// File input — the `file:` selectors style the native picker button.
export const TypeFile: Story = {
  args: { type: 'file' },
};
