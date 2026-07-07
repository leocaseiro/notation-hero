import { useEffect } from 'react';
import { fn } from 'storybook/test';

import { Toaster, toast } from './Sonner';
import type { Meta, StoryObj } from '@storybook/tanstack-react';
import type { ComponentProps } from 'react';

const meta = {
  title: 'UI/Sonner',
  component: Toaster,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  args: { position: 'top-center' },
  argTypes: {
    position: {
      control: 'select',
      options: [
        'top-left',
        'top-center',
        'top-right',
        'bottom-left',
        'bottom-center',
        'bottom-right',
      ],
    },
    closeButton: { control: 'boolean' },
    expand: { control: 'boolean' },
    duration: { control: 'number' },
  },
} satisfies Meta<typeof Toaster>;

export default meta;

type Story = StoryObj<typeof meta>;

// Each story mounts a Toaster and fires its toast on mount with an infinite
// duration, so the toast stays visible and persistent for a11y + VR
// (auto-dismiss would make the snapshot race the timeout). The toast is
// dismissed on unmount so stories don't leak toasts into one another. Toaster
// props (position, closeButton, …) flow through from story args so the
// Controls panel drives the component.
const ToastOnMount = ({
  fire,
  ...rest
}: { fire: () => string | number } & ComponentProps<typeof Toaster>) => {
  useEffect(() => {
    const id = fire();
    return () => {
      toast.dismiss(id);
    };
  }, [fire]);
  return <Toaster {...rest} />;
};

// fn() spy for the action button so clicks land in the Actions panel.
const undoClick = fn();

// Neutral toast — the baseline appearance: the secondary gray surface with just
// a message.
export const Default: Story = {
  render: (args) => (
    <ToastOnMount {...args} fire={() => toast('Event has been created', { duration: Infinity })} />
  ),
};

// Success toast — green-tinted surface with the check icon and text in the
// success token (Badge/Button tint precedent).
export const Success: Story = {
  render: (args) => (
    <ToastOnMount {...args} fire={() => toast.success('Saved', { duration: Infinity })} />
  ),
};

// Error toast — destructive-tinted surface with icon and text in the
// destructive token.
export const ErrorToast: Story = {
  render: (args) => (
    <ToastOnMount
      {...args}
      fire={() => toast.error('Something went wrong', { duration: Infinity })}
    />
  ),
};

// Warning toast — amber-tinted surface with icon and text in the warning token.
export const Warning: Story = {
  render: (args) => (
    <ToastOnMount
      {...args}
      fire={() => toast.warning('Check your input', { duration: Infinity })}
    />
  ),
};

// Info toast — stays on the neutral secondary surface; the info icon is the
// differentiator (no info status token).
export const Info: Story = {
  render: (args) => (
    <ToastOnMount {...args} fire={() => toast.info('Heads up', { duration: Infinity })} />
  ),
};

// Toast with a secondary description line under the title (neutral surface;
// hierarchy comes from sonner's font-weight difference).
export const WithDescription: Story = {
  render: (args) => (
    <ToastOnMount
      {...args}
      fire={() =>
        toast('Event created', {
          description: 'Sunday, Dec 3 at 9:00 AM',
          duration: Infinity,
        })
      }
    />
  ),
};

// A typed toast with a description — guards the description color on the tinted
// surface (it joins the status color; muted gray would fail contrast there).
export const SuccessWithDescription: Story = {
  render: (args) => (
    <ToastOnMount
      {...args}
      fire={() =>
        toast.success('Recording saved', {
          description: 'Paradiddle groove, take 3',
          duration: Infinity,
        })
      }
    />
  ),
};

// Toast with an inline action button (e.g. Undo) alongside the message.
export const WithAction: Story = {
  render: (args) => (
    <ToastOnMount
      {...args}
      fire={() =>
        toast('Event created', {
          action: { label: 'Undo', onClick: undoClick },
          duration: Infinity,
        })
      }
    />
  ),
};
