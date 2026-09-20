import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { TransportToggle } from './TransportToggle';

const Icon = () => (
  <span className="material-symbols-outlined" aria-hidden="true">
    repeat
  </span>
);

const Harness = ({ initial = false }: Readonly<{ initial?: boolean }>) => {
  const [pressed, setPressed] = useState(initial);
  return (
    <TransportToggle pressed={pressed} onPressedChange={setPressed} label="Loop" icon={<Icon />} />
  );
};

test('exposes a named button with its pressed state', () => {
  render(
    <TransportToggle pressed={false} onPressedChange={() => {}} label="Loop" icon={<Icon />} />,
  );
  expect(screen.getByRole('button', { name: 'Loop' })).toHaveAttribute('aria-pressed', 'false');
});

test('clicking toggles through the controlled parent', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const toggle = screen.getByRole('button', { name: 'Loop' });

  await user.click(toggle);
  expect(toggle).toHaveAttribute('aria-pressed', 'true');

  await user.click(toggle);
  expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

// Disabled is `aria-disabled`, never the native attribute — the design system's Button owns it.
// A natively disabled button takes no focus, which would hide the control from anyone tabbing
// through and make its tooltip unreachable.
test('disabled does not toggle, by mouse or by keyboard, and stays focusable', async () => {
  const user = userEvent.setup();
  render(
    <TransportToggle
      pressed={false}
      onPressedChange={() => {
        throw new Error('must not fire while disabled');
      }}
      label="Loop"
      icon={<Icon />}
      disabled
    />,
  );
  const toggle = screen.getByRole('button', { name: 'Loop' });
  expect(toggle).toHaveAttribute('aria-disabled', 'true');
  expect(toggle).not.toHaveAttribute('disabled');

  await user.tab();
  expect(toggle).toHaveFocus();
  await user.keyboard('{Enter}');
  await user.keyboard(' ');
  await user.click(toggle);
  expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

// The VR and axe helpers select on this slot, so neither Button's own `data-slot="button"` nor the
// tooltip trigger's may win over it.
test('keeps its own data-slot, with and without a tooltip', () => {
  const { rerender } = render(
    <TransportToggle pressed={false} onPressedChange={() => {}} label="Loop" icon={<Icon />} />,
  );
  expect(screen.getByRole('button', { name: 'Loop' })).toHaveAttribute(
    'data-slot',
    'transport-toggle',
  );

  rerender(
    <TransportToggle
      pressed={false}
      onPressedChange={() => {}}
      label="Loop"
      icon={<Icon />}
      tooltip="Repeat the selection"
    />,
  );
  expect(screen.getByRole('button', { name: 'Loop' })).toHaveAttribute(
    'data-slot',
    'transport-toggle',
  );
});

// The reason a disabled toggle must stay focusable: its tooltip says WHY it is unavailable.
test('a disabled toggle still opens its tooltip on keyboard focus', async () => {
  const user = userEvent.setup();
  render(
    <TransportToggle
      pressed={false}
      onPressedChange={() => {}}
      label="Metronome"
      icon={<Icon />}
      tooltip="Not available while the file plays its own recording"
      disabled
    />,
  );
  await user.tab();
  expect(screen.getByRole('button', { name: 'Metronome' })).toHaveFocus();
  expect(
    await screen.findByText('Not available while the file plays its own recording'),
  ).toBeInTheDocument();
});

// A disabled Button is `pointer-events: none`, so it never receives the hover that opens a
// tooltip — measured in a real browser: the hint opened on keyboard focus and never on the mouse.
// The tooltip's trigger is therefore a wrapper AROUND the button: the wrapper takes the hover, and
// focus still reaches it because focus events bubble.
test('the tooltip trigger wraps the button, so a disabled toggle can still be hovered', () => {
  render(
    <TransportToggle
      pressed={false}
      onPressedChange={() => {}}
      label="Metronome"
      icon={<Icon />}
      tooltip="Not available while the file plays its own recording"
      disabled
    />,
  );
  const toggle = screen.getByRole('button', { name: 'Metronome' });
  expect(toggle).not.toHaveAttribute('data-slot', 'tooltip-trigger');
  expect(toggle.parentElement).toHaveAttribute('data-slot', 'tooltip-trigger');
});

// A tooltip closes on click by default — right for a button that does something once, wrong for a
// toggle: the person presses Metronome, the button changes, and the tooltip that would say
// "Metronome: on" has gone until they move the pointer away and back.
test('the tooltip stays open across a press and shows the new state', async () => {
  const user = userEvent.setup();
  const Stateful = () => {
    const [pressed, setPressed] = useState(false);
    return (
      <TransportToggle
        pressed={pressed}
        onPressedChange={setPressed}
        label="Metronome"
        icon={<Icon />}
        tooltip={pressed ? 'Metronome: on' : 'Metronome: off'}
      />
    );
  };
  render(<Stateful />);
  const toggle = screen.getByRole('button', { name: 'Metronome' });

  await user.hover(toggle);
  expect(await screen.findByText('Metronome: off')).toBeInTheDocument();

  await user.click(toggle);
  expect(await screen.findByText('Metronome: on')).toBeInTheDocument();
});

test('passes button attributes such as data-testid through to the button', () => {
  render(
    <TransportToggle
      data-testid="toggle-loop"
      pressed
      onPressedChange={() => {}}
      label="Loop"
      icon={<Icon />}
    />,
  );
  expect(screen.getByTestId('toggle-loop')).toHaveAttribute('aria-pressed', 'true');
});
