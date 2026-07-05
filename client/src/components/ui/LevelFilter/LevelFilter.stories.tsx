import { useState } from 'react';
import { fn } from 'storybook/test';
import { LevelFilter } from './LevelFilter';
import type { LevelRange } from './LevelFilter';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/LevelFilter',
  component: LevelFilter,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  // Roomy positioned wrapper so the open popover (range selects + Clear) is captured in
  // #storybook-root.
  decorators: [
    (Story) => (
      <div className="relative min-h-56 w-72">
        <Story />
      </div>
    ),
  ],
  args: { value: { min: null, max: null }, onChange: fn() },
} satisfies Meta<typeof LevelFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

// Closed trigger, no bound set.
export const Unset: Story = {
  render: (args) => {
    const [value, setValue] = useState<LevelRange>({ min: null, max: null });
    return (
      <LevelFilter
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

// Open with an upper bound only (max = 4) — reads "Level ≤ 4".
export const MaxOnly: Story = {
  render: (args) => {
    const [value, setValue] = useState<LevelRange>({ min: null, max: 4 });
    return (
      <LevelFilter
        {...args}
        value={value}
        onChange={(v) => {
          setValue(v);
          args.onChange(v);
        }}
        defaultOpen
      />
    );
  },
};

// Open with a lower bound only (min = 2) — reads "Level ≥ 2".
export const MinOnly: Story = {
  render: (args) => {
    const [value, setValue] = useState<LevelRange>({ min: 2, max: null });
    return (
      <LevelFilter
        {...args}
        value={value}
        onChange={(v) => {
          setValue(v);
          args.onChange(v);
        }}
        defaultOpen
      />
    );
  },
};

// Open with both bounds (min = 2, max = 6) — reads "Level: 2–6".
export const Range: Story = {
  render: (args) => {
    const [value, setValue] = useState<LevelRange>({ min: 2, max: 6 });
    return (
      <LevelFilter
        {...args}
        value={value}
        onChange={(v) => {
          setValue(v);
          args.onChange(v);
        }}
        defaultOpen
      />
    );
  },
};

// Open with min == max (3) — reads "Level: only 3".
export const Only: Story = {
  render: (args) => {
    const [value, setValue] = useState<LevelRange>({ min: 3, max: 3 });
    return (
      <LevelFilter
        {...args}
        value={value}
        onChange={(v) => {
          setValue(v);
          args.onChange(v);
        }}
        defaultOpen
      />
    );
  },
};

// Open with the Debut (0) upper bound — reads "Level ≤ Debut".
export const Debut: Story = {
  render: (args) => {
    const [value, setValue] = useState<LevelRange>({ min: null, max: 0 });
    return (
      <LevelFilter
        {...args}
        value={value}
        onChange={(v) => {
          setValue(v);
          args.onChange(v);
        }}
        defaultOpen
      />
    );
  },
};
