import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Label } from './Label';

test('renders its text content', () => {
  render(<Label>Email</Label>);
  expect(screen.getByText('Email')).toBeInTheDocument();
});

test('carries the label slot', () => {
  render(<Label>Email</Label>);
  expect(screen.getByText('Email').closest('[data-slot="label"]')).toBeInTheDocument();
});

test('associates with an input via htmlFor and focuses it on click', async () => {
  const user = userEvent.setup();
  render(
    <>
      <Label htmlFor="email">Email</Label>
      <input id="email" type="email" />
    </>,
  );
  const input = screen.getByRole('textbox');
  expect(input).not.toHaveFocus();
  await user.click(screen.getByText('Email'));
  expect(input).toHaveFocus();
});

test('renders wrapped children (implicit association)', () => {
  render(
    <Label>
      <input type="checkbox" />
      Remember me
    </Label>,
  );
  const label = screen.getByText('Remember me').closest('label');
  expect(label).toBeInTheDocument();
  expect(label?.querySelector('input[type="checkbox"]')).toBeInTheDocument();
});

test('prevents text selection on double-click of the label text', () => {
  render(<Label>Email</Label>);
  const label = screen.getByText('Email');
  // detail: 2 = second click of a double-click; the component preventDefaults it
  // so the label text is not selected (Radix Label parity).
  const event = createEvent.mouseDown(label, { detail: 2 });
  fireEvent(label, event);
  expect(event.defaultPrevented).toBe(true);
});

test('leaves mousedown on a wrapped form control untouched', () => {
  render(
    <Label>
      <input type="checkbox" />
      Remember me
    </Label>,
  );
  const checkbox = screen.getByRole('checkbox');
  const event = createEvent.mouseDown(checkbox, { detail: 2 });
  fireEvent(checkbox, event);
  expect(event.defaultPrevented).toBe(false);
});

test('still calls a user-supplied onMouseDown', () => {
  const onMouseDown = vi.fn();
  render(<Label onMouseDown={onMouseDown}>Email</Label>);
  fireEvent.mouseDown(screen.getByText('Email'));
  expect(onMouseDown).toHaveBeenCalledTimes(1);
});
