import type { Meta, StoryObj } from '@storybook/tanstack-react'
import { Button } from './Button'

const meta = {
  title: 'UI/Button',
  component: Button,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: { children: 'Button' },
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'outline',
        'secondary',
        'ghost',
        'destructive',
        'link',
      ],
    },
    size: {
      control: 'select',
      options: ['default', 'xs', 'sm', 'lg', 'icon'],
    },
  },
} satisfies Meta<typeof Button>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Secondary: Story = { args: { variant: 'secondary' } }
export const Outline: Story = { args: { variant: 'outline' } }
export const Ghost: Story = { args: { variant: 'ghost' } }
export const Destructive: Story = { args: { variant: 'destructive' } }
export const Link: Story = { args: { variant: 'link' } }
export const Small: Story = { args: { size: 'sm' } }
export const Large: Story = { args: { size: 'lg' } }
export const Disabled: Story = { args: { disabled: true } }

// Icon-only button — Material Symbols glyph. aria-label gives the accessible
// name; the glyph span is decorative (aria-hidden).
export const Icon: Story = {
  render: () => (
    <Button size="icon" aria-label="Play">
      <span className="material-symbols-outlined" aria-hidden="true">
        play_arrow
      </span>
    </Button>
  ),
}

// Text + leading icon.
export const WithIcon: Story = {
  render: () => (
    <Button>
      <span className="material-symbols-outlined" aria-hidden="true">
        play_arrow
      </span>
      Play
    </Button>
  ),
}
