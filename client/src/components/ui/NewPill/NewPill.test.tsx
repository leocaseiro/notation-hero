import { render, screen } from '@testing-library/react';
import { NewPill } from './NewPill';

test('renders a "New" pill', () => {
  render(<NewPill />);
  const pill = screen.getByText('New');
  expect(pill).toHaveAttribute('data-slot', 'new-pill');
});
