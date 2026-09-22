import { fn } from 'storybook/test';

import { Textarea } from './Textarea';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Textarea',
  component: Textarea,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  // Every story needs an accessible name for axe; `aria-label` is the default so
  // stories that don't wrap a visible <label> still pass a11y. The fn() spies
  // make typing/focus observable in the Actions panel.
  args: { 'aria-label': 'Message', onChange: fn(), onFocus: fn(), onBlur: fn() },
  // Explicit controls: docgen can't expand React.ComponentProps<'textarea'>.
  argTypes: {
    placeholder: { control: 'text' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    rows: { control: 'number' },
    'aria-invalid': { control: 'boolean' },
    defaultValue: { control: 'text' },
  },
} satisfies Meta<typeof Textarea>;

export default meta;

type Story = StoryObj<typeof meta>;

// Empty textarea — the baseline box, border, and `min-h-16` floor before content
// grows it via `field-sizing-content`.
export const Default: Story = {};

// Placeholder text — greyed hint (`placeholder:text-muted-foreground`) shown
// until the user types.
export const Placeholder: Story = {
  args: { placeholder: 'Type your message here…' },
};

// Disabled — dimmed and non-interactive (`disabled:opacity-50` +
// `disabled:cursor-not-allowed`); the value stays but can't be edited.
export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Read-only because the field is disabled.' },
};

// Read-only — still focusable and selectable, but the value can't be edited.
// Unlike `disabled`, the control keeps its normal appearance.
export const ReadOnly: Story = {
  args: { readOnly: true, defaultValue: 'You can select and copy this, but not edit it.' },
};

// Invalid — `aria-invalid` swaps the border and ring to the destructive tokens,
// signalling a validation error to both sighted and assistive-tech users.
export const Invalid: Story = {
  args: { 'aria-invalid': true, defaultValue: 'This value failed validation.' },
};

// Pre-filled — a controlled-looking initial value via `defaultValue`; the box
// auto-sizes to fit the text.
export const WithValue: Story = {
  args: { defaultValue: 'The quick brown fox jumps over the lazy dog.' },
};

// Fixed rows — `rows={6}` sets a taller initial height instead of relying on the
// content-driven `min-h-16` floor. Wrapped in a labelled field for context.
export const WithRows: Story = {
  render: (args) => (
    <div className="grid w-80 gap-1.5">
      <label htmlFor="notes" className="text-sm leading-none font-medium">
        Notes
      </label>
      <Textarea {...args} id="notes" rows={6} placeholder="Add any extra notes…" />
    </div>
  ),
  // The wrapping <label htmlFor> names the control, so drop the story-level aria-label.
  args: { 'aria-label': undefined },
};
