import { fn } from 'storybook/test';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from './InputGroup';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/InputGroup',
  component: InputGroup,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof InputGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

// fn() spies for the composition's handlers (they live on subcomponents, not
// InputGroup props) so interactions land in the Actions panel.
const handleToggleVisibility = fn();
const handleChange = fn();

// Static text prefix — a muted "https://" sits in a leading addon while the input
// stays borderless inside the group. `aria-label` names the field for axe.
// Args-driven so the Controls panel can retune the input.
export const WithPrefixText: Story = {
  args: { className: 'w-72' },
  argTypes: { className: { control: 'text' } },
  render: (args) => (
    <InputGroup {...args}>
      <InputGroupAddon>
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput aria-label="Website URL" placeholder="example.com" onChange={handleChange} />
    </InputGroup>
  ),
};

// Trailing Material Symbols glyph — a decorative `search` icon in an `inline-end`
// addon (aria-hidden), so it reads as one search field with the input's label.
export const WithSuffixIcon: Story = {
  render: () => (
    <InputGroup className="w-72">
      <InputGroupInput aria-label="Search catalog" placeholder="Search…" />
      <InputGroupAddon align="inline-end">
        <span className="material-symbols-outlined" aria-hidden="true">
          search
        </span>
      </InputGroupAddon>
    </InputGroup>
  ),
};

// Trailing action button — an `InputGroupButton` in an `inline-end` addon toggles
// visibility; the addon's pointer-events are re-enabled on the button so it stays
// clickable. The glyph is decorative; `aria-label` names the button.
export const WithButton: Story = {
  render: () => (
    <InputGroup className="w-72">
      <InputGroupInput aria-label="Password" type="password" placeholder="Password" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton aria-label="Show password" onClick={handleToggleVisibility}>
          <span className="material-symbols-outlined" aria-hidden="true">
            visibility
          </span>
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};

// Invalid state — the input's `aria-invalid` turns the whole container border and
// ring destructive via `has-[[aria-invalid=true]]:`.
export const Invalid: Story = {
  render: () => (
    <InputGroup className="w-72">
      <InputGroupAddon>
        <InputGroupText>@</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput aria-label="Username" aria-invalid defaultValue="bad user" />
    </InputGroup>
  ),
};

// Disabled composition — the input dims with the not-allowed cursor and the
// trailing button dims with pointer-events-none (buttons keep that token).
export const Disabled: Story = {
  render: () => (
    <InputGroup className="w-72">
      <InputGroupInput aria-label="Password" type="password" placeholder="Password" disabled />
      <InputGroupAddon align="inline-end">
        <InputGroupButton aria-label="Show password" disabled>
          <span className="material-symbols-outlined" aria-hidden="true">
            visibility
          </span>
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
};
