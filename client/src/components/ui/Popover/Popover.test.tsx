import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';

const Demo = () => (
  <Popover>
    <PopoverTrigger>Open</PopoverTrigger>
    <PopoverContent>
      <p>Panel content</p>
    </PopoverContent>
  </Popover>
);

test('opens on trigger click and closes on Escape', async () => {
  const user = userEvent.setup();
  render(<Demo />);
  expect(screen.queryByText('Panel content')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Open' }));
  expect(screen.getByText('Panel content')).toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(screen.queryByText('Panel content')).not.toBeInTheDocument();
});

test('the trigger exposes its expanded state', async () => {
  const user = userEvent.setup();
  render(<Demo />);
  const trigger = screen.getByRole('button', { name: 'Open' });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await user.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
});
