import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from './Textarea';

test('renders a textbox', () => {
  render(<Textarea aria-label="Message" />);
  expect(screen.getByRole('textbox', { name: 'Message' })).toBeInTheDocument();
});

test('carries the textarea slot', () => {
  render(<Textarea aria-label="Message" />);
  expect(screen.getByRole('textbox').closest('[data-slot="textarea"]')).toBeInTheDocument();
});

test('typing updates the value', async () => {
  const user = userEvent.setup();
  render(<Textarea aria-label="Message" />);
  const textarea = screen.getByRole('textbox');
  await user.type(textarea, 'hello world');
  expect(textarea).toHaveValue('hello world');
});

test('disabled blocks typing', async () => {
  const user = userEvent.setup();
  render(<Textarea aria-label="Message" disabled />);
  const textarea = screen.getByRole('textbox');
  expect(textarea).toBeDisabled();
  await user.type(textarea, 'nope');
  expect(textarea).toHaveValue('');
});

test('read-only textarea stays focusable but ignores typing', async () => {
  const user = userEvent.setup();
  render(<Textarea aria-label="Message" readOnly defaultValue="hello world" />);
  const textarea = screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Message' });
  expect(textarea).not.toBeDisabled();
  await user.click(textarea);
  expect(textarea).toHaveFocus();
  await user.type(textarea, 'more');
  expect(textarea).toHaveValue('hello world');
});

test('marks the field invalid via aria-invalid', () => {
  render(<Textarea aria-label="Message" aria-invalid />);
  expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
});

test('respects the rows prop', () => {
  render(<Textarea aria-label="Message" rows={6} />);
  expect(screen.getByRole('textbox')).toHaveAttribute('rows', '6');
});
