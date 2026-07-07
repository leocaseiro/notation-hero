import { fn } from 'storybook/test';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './Card';
import type { Meta, StoryObj } from '@storybook/tanstack-react';
import { Button } from '@/components/ui/Button/Button';

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  // className is Card's one tunable prop (width, divider variants) — wire it as
  // a control so the panel isn't empty.
  args: { className: 'w-80' },
  argTypes: { className: { control: 'text' } },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

// fn() spies on the story buttons (they are children, not Card props) so clicks
// land in the Actions panel.
const handleCancel = fn();
const handlePractice = fn();
const handleMore = fn();

// Baseline card — header (title + description) over content. The header grid
// stays single-column because no CardAction is present.
export const Default: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Paradiddle</CardTitle>
        <CardDescription>A foundational sticking pattern.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Right left right right, left right left left.</p>
      </CardContent>
    </Card>
  ),
};

// Adds a footer with two design-system Buttons — the footer is `flex
// items-center`, so the actions sit on one baseline; `justify-end` pushes them
// to the right.
export const WithFooter: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Paradiddle</CardTitle>
        <CardDescription>A foundational sticking pattern.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Right left right right, left right left left.</p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button onClick={handlePractice}>Practice</Button>
      </CardFooter>
    </Card>
  ),
};

// A CardAction floats an icon button to the header's top-right — the header grid
// grows a second column (`has-data-[slot=card-action]:`) to seat it. The glyph is
// decorative (`aria-hidden`); `aria-label` names the button.
export const WithAction: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Paradiddle</CardTitle>
        <CardDescription>A foundational sticking pattern.</CardDescription>
        <CardAction>
          <Button variant="outline" size="icon-sm" aria-label="More options" onClick={handleMore}>
            <span className="material-symbols-outlined" aria-hidden="true">
              more_horiz
            </span>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Right left right right, left right left left.</p>
      </CardContent>
    </Card>
  ),
};

// Everything at once — header with title, description, and action, plus content
// and a footer. Exercises the full composition in one snapshot.
export const Full: Story = {
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Paradiddle</CardTitle>
        <CardDescription>A foundational sticking pattern.</CardDescription>
        <CardAction>
          <Button variant="outline" size="icon-sm" aria-label="More options" onClick={handleMore}>
            <span className="material-symbols-outlined" aria-hidden="true">
              more_horiz
            </span>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Right left right right, left right left left.</p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button onClick={handlePractice}>Practice</Button>
      </CardFooter>
    </Card>
  ),
};
