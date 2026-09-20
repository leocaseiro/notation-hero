import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Scrubber } from './Scrubber';

const Harness = ({
  initial = 0,
  durationMs = 260_000,
}: Readonly<{ initial?: number; durationMs?: number }>) => {
  const [positionMs, setPositionMs] = useState(initial);
  return <Scrubber positionMs={positionMs} durationMs={durationMs} onSeek={setPositionMs} />;
};

test('shows elapsed and total time as mm:ss', () => {
  render(<Scrubber positionMs={102_000} durationMs={260_000} onSeek={() => {}} />);
  expect(screen.getByText('01:42')).toBeInTheDocument();
  expect(screen.getByText('04:20')).toBeInTheDocument();
});

test('pads seconds below ten', () => {
  render(<Scrubber positionMs={5000} durationMs={65_000} onSeek={() => {}} />);
  expect(screen.getByText('00:05')).toBeInTheDocument();
  expect(screen.getByText('01:05')).toBeInTheDocument();
});

test('the seek bar is a named slider over the song length, spoken as a clock', () => {
  render(<Scrubber positionMs={102_000} durationMs={260_000} onSeek={() => {}} />);
  const bar = screen.getByRole('slider', { name: 'Seek' });
  // Native min/max, not aria-valuemin/max — see the note in Slider.test.tsx. The bar works in
  // milliseconds, so the raw numbers mean nothing to a listener: aria-valuetext carries the clock.
  expect(bar).toHaveAttribute('min', '0');
  expect(bar).toHaveAttribute('max', '260000');
  expect(bar).toHaveAttribute('aria-valuetext', '01:42 of 04:20');
});

// The bug this guards: the bar used to floor to whole seconds, so during playback the thumb
// jumped once a second, and a person could not put it in the middle of a bar.
test('follows the position between whole seconds', () => {
  render(<Scrubber positionMs={1500} durationMs={6000} onSeek={() => {}} />);
  expect(screen.getByRole('slider', { name: 'Seek' })).toHaveAttribute('aria-valuenow', '1500');
  // The clock still reads whole seconds.
  expect(screen.getByText('00:01')).toBeInTheDocument();
});

test('an arrow key seeks one second, reported in milliseconds', async () => {
  const user = userEvent.setup();
  const onSeek = vi.fn();
  render(<Scrubber positionMs={1500} durationMs={260_000} onSeek={onSeek} />);
  const bar = screen.getByRole('slider', { name: 'Seek' });

  await user.click(bar);
  await user.keyboard('{ArrowRight}');

  // One second on from wherever it was — not snapped to a whole second first.
  expect(onSeek).toHaveBeenLastCalledWith(2500);
});

test('PageUp seeks ten seconds', async () => {
  const user = userEvent.setup();
  const onSeek = vi.fn();
  render(<Scrubber positionMs={0} durationMs={260_000} onSeek={onSeek} />);

  await user.click(screen.getByRole('slider', { name: 'Seek' }));
  await user.keyboard('{PageUp}');

  expect(onSeek).toHaveBeenLastCalledWith(10_000);
});

// AlphaTab reports lengths like 6000.000000000001; End must not ask for a position past the end.
test('End seeks to a whole-millisecond end', async () => {
  const user = userEvent.setup();
  const onSeek = vi.fn();
  render(<Scrubber positionMs={0} durationMs={6000.000_000_000_001} onSeek={onSeek} />);

  await user.click(screen.getByRole('slider', { name: 'Seek' }));
  await user.keyboard('{End}');

  expect(onSeek).toHaveBeenLastCalledWith(6000);
});

test('arrow keys move the clock through the controlled parent', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const bar = screen.getByRole('slider', { name: 'Seek' });

  await user.click(bar);
  await user.keyboard('{ArrowRight}');

  expect(screen.getByText('00:01')).toBeInTheDocument();
});

// A score that has not loaded yet has no length; the bar must not render NaN or a 1-second song.
test('renders a disabled zero-length bar when there is no duration', () => {
  render(<Scrubber positionMs={0} durationMs={0} onSeek={() => {}} />);
  expect(screen.getByRole('slider', { name: 'Seek' })).toBeDisabled();
  expect(screen.getAllByText('00:00')).toHaveLength(2);
});
