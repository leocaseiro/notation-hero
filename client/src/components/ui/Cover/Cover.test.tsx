import { render } from '@testing-library/react';
import { Cover } from './Cover';

test('renders the given Material Symbols icon', () => {
  const { container } = render(<Cover icon="piano" />);
  expect(container.querySelector('[data-slot="cover"]')).toHaveTextContent('piano');
});

test('is decorative — aria-hidden, exposes no accessible name', () => {
  const { container } = render(<Cover />);
  const cover = container.querySelector('[data-slot="cover"]');
  expect(cover).toHaveAttribute('aria-hidden', 'true');
});

test('reflects the lesson variant', () => {
  const { container } = render(<Cover variant="lesson" />);
  expect(container.querySelector('[data-slot="cover"]')).toHaveAttribute('data-variant', 'lesson');
});
