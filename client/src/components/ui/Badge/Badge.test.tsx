import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

test('renders content with the badge slot', () => {
  render(<Badge variant="outline">New</Badge>);
  const badge = screen.getByText('New');
  expect(badge).toHaveAttribute('data-slot', 'badge');
  // Visual styling (the outline fill/border) is owned by the VR snapshots, not asserted here
  // as a brittle Tailwind class string.
});

test('renders as the child element when render is set', () => {
  // eslint-disable-next-line jsx-a11y/anchor-has-content -- useRender clones the anchor with the Badge's children
  render(<Badge render={<a href="/new" />}>New</Badge>);
  const link = screen.getByRole('link', { name: 'New' });
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute('data-slot', 'badge');
});
