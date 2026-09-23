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
  expect(screen.getByRole('button', { name: /solo all/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /mute all/i })).toBeInTheDocument();
});

test("the master volume slider spans AlphaTab's own 0-1 scale", () => {
  render(<MasterRow {...baseProps} />);
  const volume = screen.getByRole('slider', { name: /master volume/i });
  // Locks in the SCALE, not just that a slider exists: this is AlphaTab's own masterVolume gain,
  // 0-1 — a DIFFERENT range from a track's playbackInfo.volume (0-16, TrackRow's own scale test).
  // Nothing else in this suite would catch a regression that reintroduced the 0-16 range here.
  expect(volume).toHaveAttribute('min', '0');
  expect(volume).toHaveAttribute('max', '1');
  expect(volume).toHaveAttribute('aria-valuenow', '0.5');
  // The readout uses the same percentage formula TrackRow's volume uses, against this scale.
  expect(screen.getByText('50%')).toBeInTheDocument();
});

test('some tracks muted reads as mixed, not as released', () => {
  render(<MasterRow {...baseProps} muteAllIndeterminate />);
  expect(screen.getByRole('button', { name: /mute all/i })).toHaveAttribute(
    'aria-pressed',
    'mixed',
  );
});

test('a mixed button reports true, so one press takes every row with it', async () => {
  const onMuteAllChange = vi.fn();
  render(<MasterRow {...baseProps} muteAllIndeterminate onMuteAllChange={onMuteAllChange} />);
  await userEvent.click(screen.getByRole('button', { name: /mute all/i }));
  expect(onMuteAllChange).toHaveBeenCalledWith(true);
});

test('a pressed button reports false, so the same press is the way back out', async () => {
  const onMuteAllChange = vi.fn();
  render(<MasterRow {...baseProps} muteAll onMuteAllChange={onMuteAllChange} />);
  await userEvent.click(screen.getByRole('button', { name: /mute all/i }));
  expect(onMuteAllChange).toHaveBeenCalledWith(false);
});

test('each master box says what the next press will do', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<MasterRow {...baseProps} />);

  await user.tab();
  expect(screen.getByRole('button', { name: /solo all/i })).toHaveFocus();
  await waitFor(() => expect(openTooltip()).toBe('Solo all'));

  // Everything soloed: the same box is now the way back out.
  rerender(<MasterRow {...baseProps} soloAll />);
  await waitFor(() => expect(openTooltip()).toBe('Clear solos'));

  // Mixed reuses the "all" wording — the dash already says some are set.
  rerender(<MasterRow {...baseProps} soloAllIndeterminate />);
  await waitFor(() => expect(openTooltip()).toBe('Solo all'));
});

test('a recording disables both master boxes and leaves the volume live', async () => {
  const onSoloAllChange = vi.fn();
  const onMuteAllChange = vi.fn();
  render(
    <MasterRow
      {...baseProps}
      soloMuteUnavailable={RECORDING}
      onSoloAllChange={onSoloAllChange}
      onMuteAllChange={onMuteAllChange}
    />,
  );
  // `aria-disabled`, not `data-disabled` and not toBeDisabled(): Button never sets the native
  // disabled attribute, so the control stays in the tab order and the why-tooltip can still open.
  const solo = screen.getByRole('button', { name: /solo all/i });
  const mute = screen.getByRole('button', { name: /mute all/i });
  expect(solo).toHaveAttribute('aria-disabled', 'true');
  expect(mute).toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByRole('slider', { name: /master volume/i })).not.toBeDisabled();

  // `aria-disabled` alone does not stop a press on a native button that is not disabled. Button
  // withholds the click handler, which is what actually blocks the report; prove it fires rather
  // than trusting the attribute alone.
  await userEvent.click(solo);
  await userEvent.click(mute);
  expect(onSoloAllChange).not.toHaveBeenCalled();
  expect(onMuteAllChange).not.toHaveBeenCalled();
});
