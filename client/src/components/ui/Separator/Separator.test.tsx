import { render, screen } from '@testing-library/react';

import { Separator } from './Separator';

test('renders a semantic separator with its slot', () => {
  render(<Separator />);
  // Base UI always renders role="separator" (Radix's `decorative` prop is gone), so assistive
  // tech perceives the divider.
  const separator = screen.getByRole('separator');
  expect(separator).toHaveAttribute('data-slot', 'separator');
  expect(separator).toHaveAttribute('data-orientation', 'horizontal');
  expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
});

test('reflects the vertical orientation as data and aria attributes', () => {
  render(<Separator orientation="vertical" />);
  const separator = screen.getByRole('separator');
  expect(separator).toHaveAttribute('data-orientation', 'vertical');
  expect(separator).toHaveAttribute('aria-orientation', 'vertical');
});
