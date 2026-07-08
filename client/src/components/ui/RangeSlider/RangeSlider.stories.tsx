import { useState } from 'react';
import { fn } from 'storybook/test';
import { RangeSlider } from './RangeSlider';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/RangeSlider',
  component: RangeSlider,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  // Baseline args satisfy the required controlled props; individual stories override value/bounds.
  args: {
    value: [20, 80],
    onChange: fn(),
    min: 0,
    max: 100,
  },
  argTypes: {
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof RangeSlider>;

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive: local state so dragging / arrow-keying updates both thumbs in the canvas. The dumb
// component is fully controlled, so the story owns the tuple — this is how a container would wire it.
export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState<[number, number]>([20, 80]);
    return (
      <RangeSlider
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

// The catalog Tempo (BPM) use case: wide 0–300 range with a unit in the readout.
export const Tempo: Story = {
  render: (args) => {
    const [value, setValue] = useState<[number, number]>([80, 120]);
    return (
      <RangeSlider
        {...args}
        value={value}
        onChange={(v) => {
          setValue(v);
          args.onChange(v);
        }}
        min={0}
        max={300}
        unit="BPM"
        minLabel="Minimum tempo"
        maxLabel="Maximum tempo"
      />
    );
  },
};

// Both thumbs pinned to the ends: the Range fills the whole track.
export const FullRange: Story = {
  render: (args) => {
    const [value, setValue] = useState<[number, number]>([0, 100]);
    return (
      <RangeSlider
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

// Disabled: dimmed, thumbs inert.
export const Disabled: Story = {
  args: { value: [20, 80], disabled: true },
};
