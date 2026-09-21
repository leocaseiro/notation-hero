import { render, screen } from '@testing-library/react';
import { Progress } from './Progress';

test('exposes a named progressbar with the value mapped to 0-100', () => {
  render(<Progress value={0.42} label="Loading sounds" />);
  const bar = screen.getByRole('progressbar', { name: 'Loading sounds' });
  expect(bar).toHaveAttribute('aria-valuenow', '42');
  expect(bar).toHaveAttribute('aria-valuemin', '0');
  expect(bar).toHaveAttribute('aria-valuemax', '100');
});

// AlphaTab forwards the raw XMLHttpRequest ProgressEvent: `total` is 0 when the response carries
// no Content-Length. The caller maps that to null, and Base UI renders the indeterminate state —
// which, per ARIA, means NO aria-valuenow at all. Base UI does this for us.
test('renders indeterminate with no aria-valuenow when value is null', () => {
  render(<Progress value={null} label="Loading sounds" />);
  const bar = screen.getByRole('progressbar', { name: 'Loading sounds' });
  expect(bar).not.toHaveAttribute('aria-valuenow');
  expect(bar).toHaveAttribute('data-indeterminate');
});

// `total` is the ENCODED length while `loaded` counts decoded bytes when the CDN compresses, so the
// fraction can exceed 1. Base UI does NOT clamp — it renders `aria-valuenow` straight through — so
// these two cases assert the WRAPPER's clamp.
test('clamps an over-unity fraction to 100', () => {
  render(<Progress value={1.8} label="Loading sounds" />);
  expect(screen.getByRole('progressbar', { name: 'Loading sounds' })).toHaveAttribute(
    'aria-valuenow',
    '100',
  );
});

test('clamps a negative fraction to 0', () => {
  render(<Progress value={-0.5} label="Loading sounds" />);
  expect(screen.getByRole('progressbar', { name: 'Loading sounds' })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
});
