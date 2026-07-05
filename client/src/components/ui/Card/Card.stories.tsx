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

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

// Plain button styles used in the action/footer stories. Kept inline (not the
// Button component) so this card story stays self-contained — see the
// self-containment note in the authoring brief.
const buttonClass =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent bg-primary px-2.5 text-sm font-medium text-primary-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';
const outlineButtonClass =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-sm font-medium shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

// Baseline card — header (title + description) over content. The header grid
// stays single-column because no CardAction is present.
export const Default: Story = {
  render: () => (
    <Card className="w-80">
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

// Adds a footer with two buttons — the footer is `flex items-center`, so the
// actions sit on one baseline; `justify-end` pushes them to the right.
export const WithFooter: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Paradiddle</CardTitle>
        <CardDescription>A foundational sticking pattern.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Right left right right, left right left left.</p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <button type="button" className={outlineButtonClass}>
          Cancel
        </button>
        <button type="button" className={buttonClass}>
          Practice
        </button>
      </CardFooter>
    </Card>
  ),
};

// A CardAction floats an icon button to the header's top-right — the header grid
// grows a second column (`has-data-[slot=card-action]:`) to seat it. The glyph is
// decorative (`aria-hidden`); `aria-label` names the button.
export const WithAction: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Paradiddle</CardTitle>
        <CardDescription>A foundational sticking pattern.</CardDescription>
        <CardAction>
          <button
            type="button"
            aria-label="More options"
            className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-background outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              more_horiz
            </span>
          </button>
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
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Paradiddle</CardTitle>
        <CardDescription>A foundational sticking pattern.</CardDescription>
        <CardAction>
          <button
            type="button"
            aria-label="More options"
            className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-background outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              more_horiz
            </span>
          </button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm">Right left right right, left right left left.</p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <button type="button" className={outlineButtonClass}>
          Cancel
        </button>
        <button type="button" className={buttonClass}>
          Practice
        </button>
      </CardFooter>
    </Card>
  ),
};
