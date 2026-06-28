import { render, screen } from '@testing-library/react';
import { KindBadge } from './KindBadge';

test('renders the full kind word (no abbreviations)', () => {
  render(<KindBadge kind="rudiment" />);
  expect(screen.getByText('Rudiment')).toBeInTheDocument();
});

test('carries the kind-badge slot and outline styling', () => {
  const { container } = render(<KindBadge kind="beat" />);
  const el = container.querySelector('[data-slot="kind-badge"]');
  expect(el).toHaveTextContent('Beat');
  expect(el).toHaveClass('bg-transparent');
});
