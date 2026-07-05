import { RadioGroup, RadioGroupItem } from './RadioGroup';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/RadioGroup',
  component: RadioGroup,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof RadioGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

// Baseline group of three options, each item paired with a plain `<label>` via
// matching `id`/`htmlFor` so the whole row is clickable and has an accessible name.
export const Default: Story = {
  render: () => (
    <RadioGroup>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="comfortable" id="default-comfortable" />
        <label htmlFor="default-comfortable">Comfortable</label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="compact" id="default-compact" />
        <label htmlFor="default-compact">Compact</label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="spacious" id="default-spacious" />
        <label htmlFor="default-spacious">Spacious</label>
      </div>
    </RadioGroup>
  ),
};

// `defaultValue` pre-selects one option (uncontrolled) — Radix renders the filled
// dot on the matching item and gives it the initial roving focus.
export const WithDefaultValue: Story = {
  render: () => (
    <RadioGroup defaultValue="compact">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="comfortable" id="value-comfortable" />
        <label htmlFor="value-comfortable">Comfortable</label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="compact" id="value-compact" />
        <label htmlFor="value-compact">Compact</label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="spacious" id="value-spacious" />
        <label htmlFor="value-spacious">Spacious</label>
      </div>
    </RadioGroup>
  ),
};

// Disabling the group cascades `disabled` to every item — they dim and stop
// accepting pointer/keyboard selection.
export const Disabled: Story = {
  render: () => (
    <RadioGroup disabled defaultValue="comfortable">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="comfortable" id="disabled-comfortable" />
        <label htmlFor="disabled-comfortable">Comfortable</label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="compact" id="disabled-compact" />
        <label htmlFor="disabled-compact">Compact</label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="spacious" id="disabled-spacious" />
        <label htmlFor="disabled-spacious">Spacious</label>
      </div>
    </RadioGroup>
  ),
};

// `aria-invalid` on each item switches its border + ring to the destructive
// tokens, so a failed validation reads visually without changing the layout.
export const Invalid: Story = {
  render: () => (
    <RadioGroup>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="comfortable" id="invalid-comfortable" aria-invalid />
        <label htmlFor="invalid-comfortable">Comfortable</label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="compact" id="invalid-compact" aria-invalid />
        <label htmlFor="invalid-compact">Compact</label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="spacious" id="invalid-spacious" aria-invalid />
        <label htmlFor="invalid-spacious">Spacious</label>
      </div>
    </RadioGroup>
  ),
};

// `flex gap-4` on the group lays the options out in a row instead of the default
// stacked grid — Radix arrow-key navigation still follows the visual order.
export const Horizontal: Story = {
  render: () => (
    <RadioGroup defaultValue="comfortable" className="flex gap-4">
      <div className="flex items-center gap-2">
        <RadioGroupItem value="comfortable" id="horizontal-comfortable" />
        <label htmlFor="horizontal-comfortable">Comfortable</label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="compact" id="horizontal-compact" />
        <label htmlFor="horizontal-compact">Compact</label>
      </div>
      <div className="flex items-center gap-2">
        <RadioGroupItem value="spacious" id="horizontal-spacious" />
        <label htmlFor="horizontal-spacious">Spacious</label>
      </div>
    </RadioGroup>
  ),
};
