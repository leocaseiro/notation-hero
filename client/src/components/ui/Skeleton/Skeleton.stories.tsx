import { Skeleton, SkeletonForm, SkeletonTable } from './Skeleton';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Skeleton',
  component: Skeleton,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: [
          'Pulsing loading placeholder — a faithful shadcn/ui port. The base `Skeleton` is a',
          '`div` sized entirely by `className` (`h-*`, `w-*`, `rounded-*`); the pulse cycles',
          'between the `--skeleton` and `--skeleton-pulse` tokens in light and dark automatically.',
          '',
          '`SkeletonTable` and `SkeletonForm` are dumb/presentational presets composed from the',
          'base block — pass counts (`rows`/`columns`, `fields`) and drop them into any table or',
          'form view while data loads. They hold no state and fetch nothing, so a container decides',
          'when to swap them for real content.',
          '',
          'Tune the pulse speed per instance with the **`duration`** prop (one full cycle in',
          'milliseconds; defaults to 2000).',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    duration: {
      control: 'number',
      description: 'One pulse cycle in milliseconds. Defaults to 2000.',
    },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

// A single base block — the primitive every preset is built from. The `duration` control drives
// the real prop (inline animation-duration).
export const Default: Story = {
  args: { className: 'h-6 w-64', duration: 2000 },
};

// Table-shaped placeholder for list/table views (e.g. the catalog table) — the default 3-column
// shape: a wide leading title column plus two narrow meta columns.
export const Table: Story = {
  render: () => (
    <div className="w-[32rem] max-w-full">
      <SkeletonTable rows={5} />
    </div>
  ),
};

// Form-shaped placeholder for a form while it hydrates.
export const Form: Story = {
  render: () => (
    <div className="w-80 max-w-full">
      <SkeletonForm fields={3} />
    </div>
  ),
};
