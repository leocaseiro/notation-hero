import { useState } from 'react';
import { fn } from 'storybook/test';
import { TransportToggle } from './TransportToggle';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const Glyph = ({ name }: Readonly<{ name: string }>) => (
  <span className="material-symbols-outlined" aria-hidden="true">
    {name}
  </span>
);

const meta = {
  title: 'UI/TransportToggle',
  component: TransportToggle,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  args: {
    pressed: false,
    onPressedChange: fn(),
    label: 'Loop',
    icon: <Glyph name="repeat" />,
  },
  argTypes: {
    disabled: { control: 'boolean' },
    icon: { control: false },
  },
} satisfies Meta<typeof TransportToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive: local state so a click flips the pressed styling in the canvas. The component is
// fully controlled, so the story owns the boolean — this is how the transport row wires it.
const Interactive = ({
  initial,
  ...args
}: Readonly<Parameters<typeof TransportToggle>[0] & { initial: boolean }>) => {
  const [pressed, setPressed] = useState(initial);
  return (
    <TransportToggle
      {...args}
      pressed={pressed}
      onPressedChange={(next) => {
        setPressed(next);
        args.onPressedChange(next);
      }}
    />
  );
};

export const Default: Story = {
  render: (args) => <Interactive {...args} initial={false} />,
};

// Pressed = solid brand teal, the same selected state as ToggleChipGroup and Tabs.
export const Pressed: Story = {
  render: (args) => <Interactive {...args} initial />,
};

// Disabled renders aria-disabled (through Button), so it stays in the tab order.
export const Disabled: Story = {
  args: { disabled: true },
};

// The hint opens on hover and on keyboard focus.
export const WithTooltip: Story = {
  render: (args) => (
    <Interactive
      {...args}
      initial={false}
      tooltip="Drag across bars in the notation to loop just that range"
    />
  ),
};
