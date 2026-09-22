import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RECORDING } from '../TrackRow/TrackRow';
import { MasterRow } from './MasterRow';

// The tooltip names the NEXT PRESS, so it is the one string that moves with state. Read through
// the tooltip container rather than by text: `Solo all` is ALSO the box's accessible name, and
// findByText would match both. Same selector `web/e2e`'s `openTooltip` already uses.
const openTooltip = () =>
  document.querySelector('[data-slot="tooltip-content"][data-open]')?.textContent;

const baseProps = {
  volume: 0.5,
  onVolumeChange: () => {},
  soloAll: false,
  soloAllIndeterminate: false,
  onSoloAllChange: () => {},
  muteAll: false,
  muteAllIndeterminate: false,
  onMuteAllChange: () => {},
};

test('the foot row shows master volume, solo all and mute all', () => {
  render(<MasterRow {...baseProps} />);
  expect(screen.getByRole('slider', { name: /master volume/i })).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: /solo all/i })).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: /mute all/i })).toBeInTheDocument();
});

test('some tracks muted reads as mixed, not as unticked', () => {
  render(<MasterRow {...baseProps} muteAllIndeterminate />);
  expect(screen.getByRole('checkbox', { name: /mute all/i })).toHaveAttribute(
    'aria-checked',
    'mixed',
  );
});

test('a mixed box reports true, so one press takes every row with it', async () => {
  const onMuteAllChange = vi.fn();
  render(<MasterRow {...baseProps} muteAllIndeterminate onMuteAllChange={onMuteAllChange} />);
  await userEvent.click(screen.getByRole('checkbox', { name: /mute all/i }));
  expect(onMuteAllChange).toHaveBeenCalledWith(true);
});

test('a ticked box reports false, so the same press is the way back out', async () => {
  const onMuteAllChange = vi.fn();
  render(<MasterRow {...baseProps} muteAll onMuteAllChange={onMuteAllChange} />);
  await userEvent.click(screen.getByRole('checkbox', { name: /mute all/i }));
  expect(onMuteAllChange).toHaveBeenCalledWith(false);
});

test('each master box says what the next press will do', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<MasterRow {...baseProps} />);

  // Keyboard focus, the way TrackRow's tooltip case does it: jsdom has no pointer geometry.
  await user.tab(); // the volume slider
  await user.tab();
  expect(screen.getByRole('checkbox', { name: /solo all/i })).toHaveFocus();
  await waitFor(() => expect(openTooltip()).toBe('Solo all'));

  // Everything soloed: the same box is now the way back out.
  rerender(<MasterRow {...baseProps} soloAll />);
  await waitFor(() => expect(openTooltip()).toBe('Clear solos'));

  // Mixed reuses the "all" wording — the dash already says some are set.
  rerender(<MasterRow {...baseProps} soloAllIndeterminate />);
  await waitFor(() => expect(openTooltip()).toBe('Solo all'));
});

test('a recording disables both master boxes and leaves the volume live', () => {
  render(<MasterRow {...baseProps} soloMuteUnavailable={RECORDING} />);
  // `aria-disabled`, not `data-disabled` and not toBeDisabled(): Base UI's Checkbox.Root has no
  // `focusableWhenDisabled` escape hatch, so its own `disabled` prop would drop the control out
  // of the tab order — the row sets `aria-disabled` by hand instead, so the why-tooltip stays
  // reachable on keyboard focus.
  expect(screen.getByRole('checkbox', { name: /solo all/i })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  expect(screen.getByRole('checkbox', { name: /mute all/i })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  expect(screen.getByRole('slider', { name: /master volume/i })).not.toBeDisabled();
});
