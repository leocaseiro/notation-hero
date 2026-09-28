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
  noPlayer: false,
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

// Persistence made this reachable. The three toggles now come back from storage, so a drummer who
// practises with the metronome on and then opens a score AlphaTab can build no player for would
// otherwise return to a Loop button drawn pressed on a page where nothing can ever loop. The
// preference is still correct and still stored -- only the paint must not claim otherwise.
test('with no player built, the toggles are drawn unpressed whatever was restored', () => {
  render(<TransportRow {...props} looping metronome countIn noPlayer disabled />);

  expect(screen.getByTestId('toggle-loop')).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByTestId('toggle-metronome')).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByTestId('toggle-countin')).toHaveAttribute('aria-pressed', 'false');
});

test('with a player built, the same restored values are drawn pressed', () => {
  render(<TransportRow {...props} looping metronome countIn />);

  expect(screen.getByTestId('toggle-loop')).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByTestId('toggle-metronome')).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByTestId('toggle-countin')).toHaveAttribute('aria-pressed', 'true');
});

test('with no player built, every tooltip gives the reason instead of a state', async () => {
  const user = userEvent.setup();
  render(<TransportRow {...props} looping metronome noPlayer disabled />);

  // The wrapper span, not the button: a disabled Button is pointer-events:none.
  await user.hover(screen.getByTestId('toggle-loop').parentElement as HTMLElement);
  expect(await screen.findByText('Loop: not available while playback is off')).toBeInTheDocument();

  await user.hover(screen.getByTestId('toggle-metronome').parentElement as HTMLElement);
  expect(
    await screen.findByText('Metronome: not available while playback is off'),
  ).toBeInTheDocument();
});
