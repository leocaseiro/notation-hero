import { render, screen } from '@testing-library/react';

import { Bpm } from './Bpm';

test('formats a numeric bpm', () => {
  render(<Bpm value={116} />);
  expect(screen.getByRole('img', { name: 'BPM: 116' })).toHaveTextContent('116');
});

test('formats a ramp range with a spoken "to"', () => {
  render(<Bpm value="60→120" />);
  expect(screen.getByRole('img', { name: 'BPM: 60 to 120' })).toBeInTheDocument();
});

test('renders a malformed multi-part ramp verbatim instead of throwing', () => {
  // A 3-part value is not a valid 2-endpoint ramp, so parseRange returns null and Bpm
  // falls back to the raw string (a silent, non-crashing degradation we lock in here).
  render(<Bpm value="60→90→120" />);
  expect(screen.getByRole('img', { name: 'BPM: 60→90→120' })).toHaveTextContent('60→90→120');
});
