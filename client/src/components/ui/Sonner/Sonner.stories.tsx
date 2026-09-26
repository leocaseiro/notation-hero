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

// Fires a few short persistent toasts on mount and dismisses ALL of them on unmount
// (toast.dismiss() with no argument) so they don't leak into other stories. `expand`
// flows through from args, so the two Stack stories below reuse this same pile.
const StackOnMount = ({ ...rest }: ComponentProps<typeof Toaster>) => {
  useEffect(() => {
    toast('First event created', { duration: Infinity });
    toast.success('Saved', { duration: Infinity });
    toast('Second event created', { duration: Infinity });
    return () => {
      toast.dismiss();
    };
  }, []);
  return <Toaster {...rest} />;
};

// Collapsed stack — several toasts pile up (expand={false}, sonner's default) and
// expand when the user hovers the stack (interactive in Storybook).
export const Stack: Story = {
  args: { expand: false },
  render: (args) => <StackOnMount {...args} />,
};

// Fires several DIFFERENT error causes so they stack rather than collapse onto one id, and
// dismisses all of them on unmount. No explicit duration anywhere below: these stories exist to
// pixel-guard what `toast.error` does on its own.
const ErrorsOnMount = ({ count, ...rest }: { count: number } & ComponentProps<typeof Toaster>) => {
  useEffect(() => {
    const causes = [
      'song.gp is too large to open. The limit is 25 MB.',
      'riff.xml could not be read. Check that the file still exists.',
      'beat.cap is not a score format the player reads.',
      'solo.gp5 could not be opened.',
    ];
    for (const cause of causes.slice(0, count)) toast.error(cause);
    return () => {
      toast.dismiss();
    };
  }, [count]);
  return <Toaster {...rest} />;
};

// A single error left alone. Every other story pins `duration: Infinity` by hand, which means none
// of them would notice if the wrapper stopped applying it — this one fires a bare toast.error, so
// the frame IS the guarantee that an error toast does not dismiss itself, and that it carries a
// close button success and loading toasts do not.
export const PersistentError: Story = {
  render: (args) => <ErrorsOnMount {...args} count={1} />,
};

// Three causes at the cap. Expanded by default, because a collapsed stack renders all but the
// newest as a blank scaled card until a pointer enters the list — unreadable to anyone on a
// keyboard or a touch screen.
export const ErrorStack: Story = {
  render: (args) => <ErrorsOnMount {...args} count={3} />,
};

// A fourth error arrives. The oldest is dropped rather than parked past visibleToasts, where sonner
// would keep it laid out at opacity 0 and still focusable — invisible and tabbable at once.
export const ErrorStackAtCap: Story = {
  render: (args) => <ErrorsOnMount {...args} count={4} />,
};

// Expanded stack — expand={true} renders every toast already spread out, so the resting
// snapshot IS the expanded view with no hover timing to race (what VR pixel-guards).
export const StackExpanded: Story = {
  args: { expand: true },
  render: (args) => <StackOnMount {...args} />,
};

// Loading toast — sonner's own spinner beside the message, held open like every other story
// here. The player shows this while a chosen score is parsed: loadScoreFromBytes is synchronous,
// so the app's own browser lane has no request to stall and no event to hold the toast open,
// which is why the state is audited here instead.
export const Loading: Story = {
  render: (args) => (
    <ToastOnMount
      {...args}
      fire={() => toast.loading('Opening Punk.gp…', { duration: Infinity })}
    />
  ),
};
