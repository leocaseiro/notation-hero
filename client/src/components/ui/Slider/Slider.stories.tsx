import { useState } from 'react';
import { fn } from 'storybook/test';
import { Slider } from './Slider';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Slider',
  component: Slider,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  // Baseline args satisfy the required controlled props; individual stories override them.
  args: {
    value: 40,
    onChange: fn(),
    min: 0,
    max: 100,
    label: 'Volume',
  },
  argTypes: {
    disabled: { control: 'boolean' },
    showReadout: { control: 'boolean' },
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive: local state so dragging / arrow-keying moves the thumb in the canvas. The dumb
// component is fully controlled, so the story owns the number — this is how a container wires it.
export const Default: Story = {
  render: (args) => {
    const [value, setValue] = useState(40);
    return (
      <Slider
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

// The readout is opt-in: most rows label the value themselves.
export const WithReadout: Story = {
  render: (args) => {
    const [value, setValue] = useState(90);
    return (
      <Slider
        {...args}
        value={value}
        onChange={(v) => {
          setValue(v);
          args.onChange(v);
        }}
        min={30}
        max={240}
        label="Tempo"
        unit="BPM"
        showReadout
      />
    );
  },
};

// A coarse step: each arrow key press moves 25.
export const Stepped: Story = {
  render: (args) => {
    const [value, setValue] = useState(50);
    return (
      <Slider
        {...args}
        value={value}
        onChange={(v) => {
          setValue(v);
          args.onChange(v);
        }}
        step={25}
      />
    );
  },
};

// Disabled: dimmed, thumb inert.
export const Disabled: Story = {
  args: { value: 40, disabled: true },
};
