import { useState } from 'react';
import { SearchInput } from './SearchInput';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/SearchInput',
  component: SearchInput,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  // Baseline args satisfy the required controlled props; individual stories override value.
  args: {
    value: '',
    onChange: () => {},
    label: 'Search catalog',
    placeholder: 'Search songs & lessons…',
  },
  argTypes: {
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof SearchInput>;

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive: local state so typing updates the box in the Storybook canvas. The dumb component
// is fully controlled, so the story owns the state — this is how a container would wire it.
export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState('');
    return <SearchInput {...args} value={value} onChange={setValue} />;
  },
};

// Non-empty value: the clear button is visible.
export const WithValue: Story = {
  args: { value: 'rock', onChange: () => {} },
};

// Disabled: no input, no clear button.
export const Disabled: Story = {
  args: { value: 'jazz', onChange: () => {}, disabled: true },
};
