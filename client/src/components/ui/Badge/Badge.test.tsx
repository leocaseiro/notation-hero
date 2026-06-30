import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

test('renders content with the badge slot', () => {
  render(<Badge variant="outline">New</Badge>);
  const badge = screen.getByText('New');
  expect(badge).toHaveAttribute('data-slot', 'badge');
  // Visual styling (the outline fill/border) is owned by the VR snapshots, not asserted here
  // as a brittle Tailwind class string.
});
