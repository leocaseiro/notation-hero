import { render, screen } from '@testing-library/react';

import { Skeleton, SkeletonForm, SkeletonTable } from './Skeleton';

test('base Skeleton renders the skeleton slot and merges className', () => {
  render(<Skeleton className="h-6 w-64" data-testid="sk" />);
  const el = screen.getByTestId('sk');
  expect(el).toHaveAttribute('data-slot', 'skeleton');
  expect(el).toHaveClass('h-6', 'w-64', 'animate-skeleton-pulse');
  // No duration prop -> no inline animation-duration; the keyframe's 2s default applies.
  expect(el.style.animationDuration).toBe('');
});

test('duration prop sets the inline animation-duration in milliseconds', () => {
  render(<Skeleton duration={800} data-testid="sk" />);
  expect(screen.getByTestId('sk').style.animationDuration).toBe('800ms');
});

test('SkeletonTable renders a header row plus the requested body rows', () => {
  const { container } = render(<SkeletonTable rows={3} columns={2} />);
  // Reachable as a loading status region (assistive tech / agents), not just a visual pulse.
  expect(screen.getByRole('status', { name: 'Loading' })).toHaveAttribute(
    'data-slot',
    'skeleton-table',
  );
  // header row (1) + body rows (3) = 4 flex rows, each with 2 cells = 8 base blocks.
  expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(4 * 2);
});

test('SkeletonForm renders one label+input pair per field plus a submit block', () => {
  const { container } = render(<SkeletonForm fields={2} />);
  expect(screen.getByRole('status', { name: 'Loading' })).toHaveAttribute(
    'data-slot',
    'skeleton-form',
  );
  // 2 fields x (label + input) + 1 submit = 5 base blocks.
  expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(2 * 2 + 1);
});

test('presets fall back to their default counts when called with no props', () => {
  const { container: tableEl } = render(<SkeletonTable />);
  // Defaults rows=5, columns=3 => header row (3) + 5 body rows x 3 = 18 base blocks.
  expect(tableEl.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3 + 5 * 3);

  const { container: formEl } = render(<SkeletonForm />);
  // Default fields=3 => 3 x (label + input) + 1 submit = 7 base blocks.
  expect(formEl.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(3 * 2 + 1);
});
