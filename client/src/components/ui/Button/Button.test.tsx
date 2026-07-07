import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  render(<Button render={<a href="/play">Go</a>} />);
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
