import { render, screen } from '@testing-library/react';

import { Flags } from './Flags';

test('composes a label across every set flag', () => {
  render(<Flags audio video parts />);
  expect(screen.getByRole('img', { name: 'Has audio, video and parts' })).toBeInTheDocument();
});

test('single-flag label has no comma or "and"', () => {
  render(<Flags audio />);
  expect(screen.getByRole('img', { name: 'Has audio' })).toBeInTheDocument();
});

test('renders nothing when no flags are set', () => {
  const { container } = render(<Flags />);
  expect(container).toBeEmptyDOMElement();
});
