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
