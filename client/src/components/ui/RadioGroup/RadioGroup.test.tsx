import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RadioGroup, RadioGroupItem } from './RadioGroup';

// Three options wired to plain labels — mirrors the story markup so the tests
// exercise the same accessible-name pairing the component is meant for.
const Options = () => (
  <>
    <div>
      <RadioGroupItem value="comfortable" id="comfortable" />
      <label htmlFor="comfortable">Comfortable</label>
    </div>
    <div>
      <RadioGroupItem value="compact" id="compact" />
      <label htmlFor="compact">Compact</label>
    </div>
    <div>
      <RadioGroupItem value="spacious" id="spacious" />
      <label htmlFor="spacious">Spacious</label>
    </div>
  </>
);

test('renders one radio per item with its accessible name', () => {
  render(
    <RadioGroup>
      <Options />
    </RadioGroup>,
  );
  expect(screen.getAllByRole('radio')).toHaveLength(3);
  expect(screen.getByRole('radio', { name: 'Comfortable' })).toBeInTheDocument();
});

test('carries the radio-group slot on the root', () => {
  render(
    <RadioGroup>
      <Options />
    </RadioGroup>,
  );
  expect(screen.getByRole('radiogroup')).toHaveAttribute('data-slot', 'radio-group');
});

test('selecting an option checks it (and only it)', async () => {
  const user = userEvent.setup();
  render(
    <RadioGroup>
      <Options />
    </RadioGroup>,
  );
  const compact = screen.getByRole('radio', { name: 'Compact' });
  expect(compact).not.toBeChecked();
  await user.click(compact);
  expect(compact).toBeChecked();
  expect(screen.getByRole('radio', { name: 'Comfortable' })).not.toBeChecked();
});

test('defaultValue pre-selects the matching radio', () => {
  render(
    <RadioGroup defaultValue="spacious">
      <Options />
    </RadioGroup>,
  );
  expect(screen.getByRole('radio', { name: 'Spacious' })).toBeChecked();
  expect(screen.getByRole('radio', { name: 'Compact' })).not.toBeChecked();
});

test('a disabled group prevents selection', async () => {
  const user = userEvent.setup();
  render(
    <RadioGroup disabled>
      <Options />
    </RadioGroup>,
  );
  const compact = screen.getByRole('radio', { name: 'Compact' });
  // Base UI renders the item as a <span role="radio">, which can't carry the native
  // disabled attribute (toBeDisabled) — the disabled state is exposed via aria-disabled.
  expect(compact).toHaveAttribute('aria-disabled', 'true');
  await user.click(compact);
  expect(compact).not.toBeChecked();
});

test('exposes aria-invalid on an item when set', () => {
  render(
    <RadioGroup>
      <RadioGroupItem value="comfortable" id="invalid-item" aria-invalid />
      <label htmlFor="invalid-item">Comfortable</label>
    </RadioGroup>,
  );
  expect(screen.getByRole('radio', { name: 'Comfortable' })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
});
