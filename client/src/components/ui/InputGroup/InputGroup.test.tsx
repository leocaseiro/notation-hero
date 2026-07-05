import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from './InputGroup';

test('renders the input and addons with their data-slots', () => {
  render(
    <InputGroup>
      <InputGroupAddon>
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput aria-label="Website URL" />
    </InputGroup>,
  );
  const input = screen.getByRole('textbox', { name: 'Website URL' });
  expect(input).toHaveAttribute('data-slot', 'input-group-input');
  // The input sits inside the group container.
  expect(input.closest('[data-slot="input-group"]')).toBeInTheDocument();
  expect(
    screen.getByText('https://').closest('[data-slot="input-group-text"]'),
  ).toBeInTheDocument();
  expect(
    screen.getByText('https://').closest('[data-slot="input-group-addon"]'),
  ).toBeInTheDocument();
});

test('renders a prefix addon with align inline-start by default', () => {
  render(
    <InputGroup>
      <InputGroupAddon>
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput aria-label="URL" />
    </InputGroup>,
  );
  const addon = screen.getByText('https://').closest('[data-slot="input-group-addon"]');
  expect(addon).toHaveAttribute('data-align', 'inline-start');
});

test('renders a suffix addon with align inline-end', () => {
  render(
    <InputGroup>
      <InputGroupInput aria-label="Search" />
      <InputGroupAddon align="inline-end">
        <InputGroupText>results</InputGroupText>
      </InputGroupAddon>
    </InputGroup>,
  );
  const addon = screen.getByText('results').closest('[data-slot="input-group-addon"]');
  expect(addon).toHaveAttribute('data-align', 'inline-end');
});

test('typing updates the input value', async () => {
  const user = userEvent.setup();
  render(
    <InputGroup>
      <InputGroupInput aria-label="Search catalog" />
    </InputGroup>,
  );
  const input = screen.getByRole('textbox', { name: 'Search catalog' });
  await user.type(input, 'snare');
  expect(input).toHaveValue('snare');
});

test('propagates aria-invalid to the input for the group styling', () => {
  render(
    <InputGroup>
      <InputGroupInput aria-label="Username" aria-invalid />
    </InputGroup>,
  );
  const input = screen.getByRole('textbox', { name: 'Username' });
  expect(input).toHaveAttribute('aria-invalid', 'true');
  // The container keys its destructive border off a descendant aria-invalid=true.
  expect(input.closest('[data-slot="input-group"]')).toHaveClass(
    'has-[[aria-invalid=true]]:border-destructive',
  );
});

test('renders a trailing button and fires its onClick', async () => {
  const user = userEvent.setup();
  const onClick = vi.fn();
  render(
    <InputGroup>
      <InputGroupInput aria-label="Password" type="password" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton aria-label="Show password" onClick={onClick} />
      </InputGroupAddon>
    </InputGroup>,
  );
  const button = screen.getByRole('button', { name: 'Show password' });
  expect(button).toHaveAttribute('data-slot', 'input-group-button');
  expect(button).toHaveAttribute('type', 'button');
  await user.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);
});
