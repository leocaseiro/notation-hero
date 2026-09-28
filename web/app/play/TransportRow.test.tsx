import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';

import { TransportRow } from './TransportRow';

// A Guitar Pro file can embed its own recording. AlphaTab then plays that recording through a
// backing-track player whose synth stubs out the metronome channel, so Metronome and Count-In
// cannot do anything — they go inert AND say why, because a merely dimmed icon explains nothing.
// The shell derives the flag from AlphaTab's actual player (the backing-track player, not merely
// a file that embeds audio). This covers the row's half
// of that chain, which no fixture can reach (a real backing-track file is megabytes of audio).
const props = {
  positionMs: 0,
  durationMs: 60_000,
  onSeek: () => {},
  looping: false,
  onLoopingChange: () => {},
  metronome: false,
  onMetronomeChange: () => {},
  countIn: false,
  onCountInChange: () => {},
  hasRange: false,
  hasBackingTrack: false,
  disabled: false,
  playButton: <button type="button">Play</button>,
};

test('a backing-track score makes Metronome and Count-In inert, and nothing else', () => {
  render(<TransportRow {...props} hasBackingTrack />);

  // aria-disabled, never the native attribute: Button renders the ARIA form so the control keeps
  // focus and its accessible name.
  expect(screen.getByTestId('toggle-metronome')).toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByTestId('toggle-countin')).toHaveAttribute('aria-disabled', 'true');
  // Loop is untouched: repeating a passage works the same whether the sound is synthesised or
  // recorded, so over-disabling here would take away a control that still works.
  expect(screen.getByTestId('toggle-loop')).not.toHaveAttribute('aria-disabled', 'true');
});

test('their tooltips explain the unavailability instead of reporting on/off', async () => {
  const user = userEvent.setup();
  render(<TransportRow {...props} hasBackingTrack />);

  // Hover the WRAPPER, not the button: a disabled Button is pointer-events:none, which is why the
  // tooltip trigger is a span around it. That wrapper is what a mouse actually reaches.
  await user.hover(screen.getByTestId('toggle-metronome').parentElement as HTMLElement);
  expect(
    await screen.findByText('Metronome: not available while the file plays its own recording'),
  ).toBeInTheDocument();

  await user.hover(screen.getByTestId('toggle-countin').parentElement as HTMLElement);
  expect(
    await screen.findByText('Count-in: not available while the file plays its own recording'),
  ).toBeInTheDocument();
});

test('without a backing track the same toggles are live and report their state', async () => {
  const user = userEvent.setup();
  render(<TransportRow {...props} />);

  expect(screen.getByTestId('toggle-metronome')).not.toHaveAttribute('aria-disabled', 'true');
  expect(screen.getByTestId('toggle-countin')).not.toHaveAttribute('aria-disabled', 'true');

  await user.hover(screen.getByTestId('toggle-metronome').parentElement as HTMLElement);
  expect(await screen.findByText('Metronome: off')).toBeInTheDocument();
});
