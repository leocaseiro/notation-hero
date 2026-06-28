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
