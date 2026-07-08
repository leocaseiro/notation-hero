import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NativeSelect } from './NativeSelect';

test('renders its options', () => {
  render(
    <NativeSelect aria-label="Difficulty">
      <option value="debut">Debut</option>
      <option value="beginner">Beginner</option>
    </NativeSelect>,
  );
  expect(screen.getByRole('option', { name: 'Debut' })).toBeInTheDocument();
  expect(screen.getByRole('option', { name: 'Beginner' })).toBeInTheDocument();
});

test('carries the native-select slot', () => {
  render(
    <NativeSelect aria-label="Difficulty">
      <option value="debut">Debut</option>
    </NativeSelect>,
  );
  expect(screen.getByRole('combobox')).toHaveAttribute('data-slot', 'native-select');
});

test('selecting an option fires onChange and updates the value', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(
    <NativeSelect aria-label="Difficulty" defaultValue="debut" onChange={onChange}>
      <option value="debut">Debut</option>
      <option value="beginner">Beginner</option>
    </NativeSelect>,
  );
  const select = screen.getByRole<HTMLSelectElement>('combobox');
  await user.selectOptions(select, 'beginner');
  expect(onChange).toHaveBeenCalled();
  expect(select.value).toBe('beginner');
});

test('is disabled when the disabled prop is set', () => {
  render(
    <NativeSelect aria-label="Difficulty" disabled>
      <option value="debut">Debut</option>
    </NativeSelect>,
  );
  expect(screen.getByRole('combobox')).toBeDisabled();
});

test('reflects aria-invalid', () => {
  render(
    <NativeSelect aria-label="Difficulty" aria-invalid>
      <option value="debut">Debut</option>
    </NativeSelect>,
  );
  expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
});

test('renders grouped options under an optgroup', () => {
  const { container } = render(
    <NativeSelect aria-label="Instrument">
      <optgroup label="Percussion">
        <option value="snare">Snare</option>
      </optgroup>
    </NativeSelect>,
  );
  const optgroup = container.querySelector('optgroup');
  expect(optgroup).toHaveAttribute('label', 'Percussion');
  expect(optgroup?.querySelector('option')).toHaveTextContent('Snare');
});
