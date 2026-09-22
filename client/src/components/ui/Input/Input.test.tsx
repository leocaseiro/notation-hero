import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

test('renders an accessible textbox', () => {
  render(<Input aria-label="Email" />);
  expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
});

test('carries the input slot', () => {
  render(<Input aria-label="Email" />);
  expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('data-slot', 'input');
});

test('typing updates the value and fires onChange', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<Input aria-label="Name" onChange={onChange} />);
  const input = screen.getByRole('textbox', { name: 'Name' });
  await user.type(input, 'Paradiddle');
  expect(input).toHaveValue('Paradiddle');
  expect(onChange).toHaveBeenCalled();
});

test('disabled input blocks typing', async () => {
  const user = userEvent.setup();
  render(<Input aria-label="Name" disabled />);
  const input = screen.getByRole('textbox', { name: 'Name' });
  expect(input).toBeDisabled();
  await user.type(input, 'nope');
  expect(input).toHaveValue('');
});

test('read-only input stays focusable but ignores typing', async () => {
  const user = userEvent.setup();
  render(<Input aria-label="Name" readOnly defaultValue="Paradiddle" />);
  const input = screen.getByRole<HTMLInputElement>('textbox', { name: 'Name' });
  expect(input).not.toBeDisabled();
  await user.click(input);
  expect(input).toHaveFocus();
  await user.type(input, 'more');
  expect(input).toHaveValue('Paradiddle');
});

test('exposes aria-invalid when set', () => {
  render(<Input aria-label="Email" aria-invalid />);
  expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('aria-invalid', 'true');
});

test('reflects the type prop', () => {
  render(<Input aria-label="Email" type="email" />);
  expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('type', 'email');
});
