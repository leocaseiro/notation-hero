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

test('the seek bar is a named slider over the song length in seconds', () => {
  render(<Scrubber positionMs={0} durationMs={260_000} onSeek={() => {}} />);
  const bar = screen.getByRole('slider', { name: 'Seek' });
  // Native min/max, not aria-valuemin/max — see the note in Slider.test.tsx.
  expect(bar).toHaveAttribute('min', '0');
  expect(bar).toHaveAttribute('max', '260');
});

test('arrow keys seek and report milliseconds to the caller', async () => {
  const user = userEvent.setup();
  render(<Harness />);
  const bar = screen.getByRole('slider', { name: 'Seek' });

  await user.click(bar);
  await user.keyboard('{ArrowRight}');

  // One second step, reported back in ms — the unit the api's timePosition setter takes.
  expect(screen.getByText('00:01')).toBeInTheDocument();
});

// A score that has not loaded yet has no length; the bar must not render NaN or a 1-second song.
test('renders a disabled zero-length bar when there is no duration', () => {
  render(<Scrubber positionMs={0} durationMs={0} onSeek={() => {}} />);
  expect(screen.getByRole('slider', { name: 'Seek' })).toBeDisabled();
  expect(screen.getAllByText('00:00')).toHaveLength(2);
});
