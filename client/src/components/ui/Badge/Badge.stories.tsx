import { Badge } from './Badge';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Badge',
  component: Badge,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: { children: 'Badge' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline'],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

// `default` is the bright-fill pairing (bg-primary + text-primary-foreground); it gets its
// own story so axe validates its contrast directly, not only indirectly via Button.
export const Default: Story = { args: { variant: 'default' } };
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Destructive: Story = { args: { variant: 'destructive' } };
export const Outline: Story = { args: { variant: 'outline' } };

// The render prop (Base UI useRender) — rendered as a real anchor so VR + a11y gate the
// interactive-badge composition, including its focus-visible ring.
export const AsLink: Story = {
  render: (args) => (
    // eslint-disable-next-line jsx-a11y/anchor-has-content -- useRender clones the anchor with the Badge's children
    <Badge {...args} render={<a href="#practice" />}>
      Link badge
    </Badge>
  ),
};
