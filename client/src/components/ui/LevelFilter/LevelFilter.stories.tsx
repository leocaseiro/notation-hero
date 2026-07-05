import { useState } from 'react';
import { LevelFilter } from './LevelFilter';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/LevelFilter',
  component: LevelFilter,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  // Roomy positioned wrapper so the open popover (pill grid + Clear) is captured in #storybook-root.
  decorators: [
    (Story) => (
      <div className="relative min-h-72 w-72">
        <Story />
      </div>
    ),
  ],
  args: { value: null, onChange: () => {} },
} satisfies Meta<typeof LevelFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

// Closed trigger, no bound set.
export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState<number | null>(null);
    return <LevelFilter {...args} value={value} onChange={setValue} />;
  },
};

// Closed trigger showing the numeric bound.
export const Selected: Story = {
  render: (args) => {
    const [value, setValue] = useState<number | null>(4);
    return <LevelFilter {...args} value={value} onChange={setValue} />;
  },
};

// Open with a bound at 4 (the pill is pressed and Clear is shown).
export const Open: Story = {
  render: (args) => {
    const [value, setValue] = useState<number | null>(4);
    return <LevelFilter {...args} value={value} onChange={setValue} defaultOpen />;
  },
};

// Open with the Debut (0) bound selected.
export const Debut: Story = {
  render: (args) => {
    const [value, setValue] = useState<number | null>(0);
    return <LevelFilter {...args} value={value} onChange={setValue} defaultOpen />;
  },
};

// Open with nothing selected — no pressed pill, no Clear.
export const Unset: Story = {
  render: (args) => {
    const [value, setValue] = useState<number | null>(null);
    return <LevelFilter {...args} value={value} onChange={setValue} defaultOpen />;
  },
};
