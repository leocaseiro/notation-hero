import { render, screen } from '@testing-library/react';
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
