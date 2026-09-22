import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from './Checkbox';

test('renders with the checkbox role and an accessible name', () => {
  render(<Checkbox aria-label="Accept terms" />);
  expect(screen.getByRole('checkbox', { name: 'Accept terms' })).toBeInTheDocument();
});

test('carries the checkbox slot', () => {
  render(<Checkbox aria-label="Accept terms" />);
  expect(screen.getByRole('checkbox')).toHaveAttribute('data-slot', 'checkbox');
});

test('toggles checked state on click', async () => {
  const user = userEvent.setup();
  render(<Checkbox aria-label="Accept terms" />);
  const checkbox = screen.getByRole('checkbox');
  expect(checkbox).toHaveAttribute('aria-checked', 'false');
  expect(checkbox).toHaveAttribute('data-unchecked');
  await user.click(checkbox);
  expect(checkbox).toHaveAttribute('aria-checked', 'true');
  expect(checkbox).toHaveAttribute('data-checked');
});

test('controlled checkbox reports the change but keeps its checked value', async () => {
  const user = userEvent.setup();
  const onCheckedChange = vi.fn();
  render(<Checkbox aria-label="Accept terms" checked onCheckedChange={onCheckedChange} />);
  const checkbox = screen.getByRole('checkbox');
  await user.click(checkbox);
  // The click asks to turn it off, but with no state update from the parent the
  // controlled value stays checked. Base UI passes eventDetails as a second arg.
  expect(onCheckedChange).toHaveBeenCalledWith(false, expect.anything());
  expect(checkbox).toHaveAttribute('aria-checked', 'true');
  expect(checkbox).toHaveAttribute('data-checked');
});

test('does not toggle when disabled', async () => {
  const user = userEvent.setup();
  render(<Checkbox aria-label="Accept terms" disabled />);
  const checkbox = screen.getByRole('checkbox');
  // Base UI renders a <span role="checkbox">, which can't carry the native disabled
  // attribute (toBeDisabled) — the disabled state is exposed via aria-disabled.
  expect(checkbox).toHaveAttribute('aria-disabled', 'true');
  await user.click(checkbox);
  expect(checkbox).toHaveAttribute('aria-checked', 'false');
});

test('reflects the indeterminate state', () => {
  render(<Checkbox aria-label="Accept terms" indeterminate />);
  const checkbox = screen.getByRole('checkbox');
  expect(checkbox).toHaveAttribute('aria-checked', 'mixed');
  expect(checkbox).toHaveAttribute('data-indeterminate');
});

test('indeterminate indicator renders both the check and remove glyphs (CSS-toggled)', () => {
  const { container } = render(<Checkbox aria-label="Accept terms" indeterminate />);
  const indicator = container.querySelector('[data-slot="checkbox-indicator"]');
  expect(indicator).toBeInTheDocument();
  // Both Material Symbols glyphs live in the DOM; the visible one is chosen by
  // the data-indeterminate CSS toggle (covered by VR), not by conditional rendering.
  expect(indicator).toHaveTextContent('check');
  expect(indicator).toHaveTextContent('remove');
});

test('clicking an associated label toggles the checkbox', async () => {
  const user = userEvent.setup();
  render(
    <>
      <label htmlFor="c">Accept</label>
      <Checkbox id="c" />
    </>,
  );
  const checkbox = screen.getByRole('checkbox');
  expect(checkbox).toHaveAttribute('aria-checked', 'false');
  await user.click(screen.getByText('Accept'));
  expect(checkbox).toHaveAttribute('aria-checked', 'true');
});

test('exposes aria-invalid when set', () => {
  render(<Checkbox aria-label="Accept terms" aria-invalid />);
  expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
});
