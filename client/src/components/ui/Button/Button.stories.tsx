import { fn } from 'storybook/test';

import { Button } from './Button';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: { children: 'Button', onClick: fn() },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'xs', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg'],
    },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Outline: Story = { args: { variant: 'outline' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const Destructive: Story = { args: { variant: 'destructive' } };
export const Link: Story = { args: { variant: 'link' } };
export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'lg' } };
export const Disabled: Story = { args: { disabled: true } };

// Icon-only button — Material Symbols glyph. aria-label gives the accessible
// name; the glyph span is decorative (aria-hidden). Args are spread so the
// variant/disabled controls and the meta onClick spy reach the button (size stays fixed).
export const Icon: Story = {
  render: (args) => (
    <Button {...args} size="icon" aria-label="Play">
      <span className="material-symbols-outlined" aria-hidden="true">
        play_arrow
      </span>
    </Button>
  ),
};

// Text + leading icon.
export const WithIcon: Story = {
  render: (args) => (
    <Button {...args}>
      <span className="material-symbols-outlined" aria-hidden="true">
        play_arrow
      </span>
      Play
    </Button>
  ),
};

// Extra sizes — xs + the smaller/larger icon-only sizes — for full size coverage.
export const Xs: Story = { args: { size: 'xs' } };

export const IconXs: Story = {
  render: (args) => (
    <Button {...args} size="icon-xs" aria-label="Play">
      <span className="material-symbols-outlined" aria-hidden="true">
        play_arrow
      </span>
    </Button>
  ),
};

export const IconSm: Story = {
  render: (args) => (
    <Button {...args} size="icon-sm" aria-label="Play">
      <span className="material-symbols-outlined" aria-hidden="true">
        play_arrow
      </span>
    </Button>
  ),
};

export const IconLg: Story = {
  render: (args) => (
    <Button {...args} size="icon-lg" aria-label="Play">
      <span className="material-symbols-outlined" aria-hidden="true">
        play_arrow
      </span>
    </Button>
  ),
};

// The render prop (Base UI useRender) — the asChild replacement this component ships.
// Rendered as a real anchor so VR + a11y gate the Button-as-link composition.
export const AsLink: Story = {
  render: (args) => (
    // eslint-disable-next-line jsx-a11y/anchor-has-content -- useRender clones the anchor with the Button's children
    <Button {...args} render={<a href="#practice" />}>
      Link button
    </Button>
  ),
};
