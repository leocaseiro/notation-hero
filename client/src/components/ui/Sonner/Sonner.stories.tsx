import { useEffect } from 'react';
import { Toaster, toast } from './Sonner';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Sonner',
  component: Toaster,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Toaster>;

export default meta;

type Story = StoryObj<typeof meta>;

// Each story mounts a top-centered Toaster and fires its toast on mount with an
// infinite duration, so the toast stays visible and persistent for a11y + VR
// (auto-dismiss would make the snapshot race the timeout). The toast is
// dismissed on unmount so stories don't leak toasts into one another.
const ToastOnMount = ({ fire }: { fire: () => string | number }) => {
  useEffect(() => {
    const id = fire();
    return () => {
      toast.dismiss(id);
    };
  }, [fire]);
  return <Toaster position="top-center" />;
};

// Neutral toast — the baseline appearance with just a message.
export const Default: Story = {
  render: () => (
    <ToastOnMount fire={() => toast('Event has been created', { duration: Infinity })} />
  ),
};

// Success toast — sonner's `success` type adds a green check icon on the neutral
// surface (pass `richColors` on the Toaster for a filled green background).
export const Success: Story = {
  render: () => <ToastOnMount fire={() => toast.success('Saved', { duration: Infinity })} />,
};

// Error toast — sonner's `error` type adds an error icon on the neutral surface
// (pass `richColors` for a filled destructive background).
export const ErrorToast: Story = {
  render: () => (
    <ToastOnMount fire={() => toast.error('Something went wrong', { duration: Infinity })} />
  ),
};

// Warning toast — sonner's `warning` type adds a warning icon on the neutral surface.
export const Warning: Story = {
  render: () => (
    <ToastOnMount fire={() => toast.warning('Check your input', { duration: Infinity })} />
  ),
};

// Info toast — sonner's `info` type adds an info icon on the neutral surface.
export const Info: Story = {
  render: () => <ToastOnMount fire={() => toast.info('Heads up', { duration: Infinity })} />,
};

// Toast with a secondary description line under the title.
export const WithDescription: Story = {
  render: () => (
    <ToastOnMount
      fire={() =>
        toast('Event created', {
          description: 'Sunday, Dec 3 at 9:00 AM',
          duration: Infinity,
        })
      }
    />
  ),
};

// Toast with an inline action button (e.g. Undo) alongside the message.
export const WithAction: Story = {
  render: () => (
    <ToastOnMount
      fire={() =>
        toast('Event created', {
          action: { label: 'Undo', onClick: () => {} },
          duration: Infinity,
        })
      }
    />
  ),
};
