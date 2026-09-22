import { render, screen } from '@testing-library/react';
import { Home } from './Home';

test('renders the Notation Hero heading', () => {
  render(<Home />);
  expect(screen.getByRole('heading', { name: 'Notation Hero' })).toBeInTheDocument();
});
