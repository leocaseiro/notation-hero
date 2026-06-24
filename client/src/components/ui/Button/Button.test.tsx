import { fireEvent, render, screen } from '@testing-library/react';
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

test('renders as the child element when asChild is set', () => {
  render(
    <Button asChild>
      <a href="/play">Go</a>
    </Button>,
  );
  const link = screen.getByRole('link', { name: 'Go' });
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute('data-slot', 'button');
});
