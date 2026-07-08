import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  contrastRatio,
  mixWithBlack,
  oklchLuminance,
  readDarkTokens,
} from '../../../dark-contrast';
import { Button } from './Button';

test('renders with its label', () => {
  render(<Button>Play</Button>);
  expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
});

test('applies the variant and size data attributes', () => {
  render(
    <Button variant="secondary" size="sm">
      Tap
    </Button>,
  );
  const button = screen.getByRole('button', { name: 'Tap' });
  expect(button).toHaveAttribute('data-variant', 'secondary');
  expect(button).toHaveAttribute('data-size', 'sm');
  // data-* is set straight from props, so also assert the cva className — a swapped
  // variant class would not change the data attribute.
  expect(button).toHaveClass('bg-secondary');
});

test('calls onClick when clicked', () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Click</Button>);
  fireEvent.click(screen.getByRole('button', { name: 'Click' }));
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('does not fire onClick when disabled', () => {
  const onClick = vi.fn();
  render(
    <Button disabled onClick={onClick}>
      Nope
    </Button>,
  );
  const button = screen.getByRole('button', { name: 'Nope' });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(onClick).not.toHaveBeenCalled();
});

test('renders as the child element when render is set', () => {
  // eslint-disable-next-line jsx-a11y/anchor-has-content -- useRender clones the anchor with the Button's children
  render(<Button render={<a href="/play" />}>Go</Button>);
  const link = screen.getByRole('link', { name: 'Go' });
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute('data-slot', 'button');
});

test('fires onClick on keyboard activation (Space + Enter)', async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Go</Button>);
  screen.getByRole('button', { name: 'Go' }).focus();
  await user.keyboard('[Space]');
  await user.keyboard('[Enter]');
  expect(onClick).toHaveBeenCalledTimes(2);
});

test('wires aria-invalid to the destructive border class', () => {
  render(<Button aria-invalid>Bad</Button>);
  const button = screen.getByRole('button', { name: 'Bad' });
  expect(button).toHaveAttribute('aria-invalid', 'true');
  expect(button).toHaveClass('aria-invalid:border-destructive');
});

// Dark-mode contrast for the `link` variant. Breadcrumb reuses these same classes on a `--muted`
// bar, which the old `dark:text-brand-600` (#0d9488) failed at 3.95:1 — replaced with adaptive
// `text-primary` + a `color-mix` hover darken, both guarded here against the real tokens in
// styles.css so a future token edit (or a reintroduced dim link colour) fails fast.
describe('link variant dark-mode contrast (AA)', () => {
  const tokens = readDarkTokens();
  const primary = tokens.primary;
  if (!primary) throw new Error('--primary not found in the .dark block of styles.css');

  it.each(['muted', 'popover', 'background', 'accent'] as const)(
    'resting text-primary on %s stays >= 4.5:1 (AA)',
    (surface) => {
      const surfaceToken = tokens[surface];
      if (!surfaceToken) throw new Error(`--${surface} not found in the .dark block of styles.css`);
      expect(
        contrastRatio(oklchLuminance(primary), oklchLuminance(surfaceToken)),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(['muted', 'popover', 'background', 'accent'] as const)(
    'hover color-mix(primary, black 12%%) on %s stays >= 4.5:1 (AA)',
    (surface) => {
      const surfaceToken = tokens[surface];
      if (!surfaceToken) throw new Error(`--${surface} not found in the .dark block of styles.css`);
      const hover = mixWithBlack(primary, 0.12);
      expect(
        contrastRatio(oklchLuminance(hover), oklchLuminance(surfaceToken)),
      ).toBeGreaterThanOrEqual(4.5);
    },
  );
});
