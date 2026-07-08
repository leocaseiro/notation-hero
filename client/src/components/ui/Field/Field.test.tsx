import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from './Field';

test('FieldLabel associates with an input via htmlFor and focuses it on click', async () => {
  const user = userEvent.setup();
  render(
    <Field>
      <FieldLabel htmlFor="name">Name</FieldLabel>
      <input id="name" type="text" />
    </Field>,
  );
  const input = screen.getByRole('textbox');
  expect(input).not.toHaveFocus();
  await user.click(screen.getByText('Name'));
  expect(input).toHaveFocus();
});

test('FieldDescription renders its text with the field-description slot', () => {
  render(<FieldDescription>Helper text</FieldDescription>);
  const description = screen.getByText('Helper text');
  expect(description).toBeInTheDocument();
  expect(description.closest('[data-slot="field-description"]')).toBeInTheDocument();
});

test('FieldError renders its children with the field-error slot and alert role', () => {
  render(<FieldError>Something went wrong</FieldError>);
  const error = screen.getByRole('alert');
  expect(error).toHaveTextContent('Something went wrong');
  expect(error).toHaveAttribute('data-slot', 'field-error');
});

test('FieldError renders a de-duplicated list from the errors prop', () => {
  render(
    <FieldError
      errors={[{ message: 'Required' }, { message: 'Too short' }, { message: 'Required' }]}
    />,
  );
  const items = screen.getAllByRole('listitem');
  expect(items).toHaveLength(2);
  expect(items[0]).toHaveTextContent('Required');
  expect(items[1]).toHaveTextContent('Too short');
});

test('FieldError renders a single error as plain text, not a list', () => {
  render(<FieldError errors={[{ message: 'Required' }]} />);
  const error = screen.getByRole('alert');
  expect(error).toHaveTextContent('Required');
  expect(error).toHaveAttribute('data-slot', 'field-error');
  // The single-error branch skips the <ul>/<li> shape used for multiple errors.
  expect(error.querySelector('ul')).not.toBeInTheDocument();
  expect(error.querySelector('li')).not.toBeInTheDocument();
});

test('FieldError renders nothing without children or errors', () => {
  const { container } = render(<FieldError />);
  expect(container).toBeEmptyDOMElement();
});

test('Field applies data-orientation (default vertical)', () => {
  render(
    <Field>
      <FieldLabel htmlFor="a">A</FieldLabel>
      <input id="a" />
    </Field>,
  );
  expect(screen.getByRole('group')).toHaveAttribute('data-orientation', 'vertical');
});

test('Field applies the horizontal orientation', () => {
  render(
    <Field orientation="horizontal">
      <FieldLabel htmlFor="b">B</FieldLabel>
      <input id="b" />
    </Field>,
  );
  expect(screen.getByRole('group')).toHaveAttribute('data-orientation', 'horizontal');
});

test('sub-parts carry their own data-slots', () => {
  const { container } = render(
    <FieldSet>
      <FieldLegend>Group</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="c">Label</FieldLabel>
          <FieldContent>
            <input id="c" />
          </FieldContent>
          <FieldTitle>Title</FieldTitle>
        </Field>
        <FieldSeparator />
      </FieldGroup>
    </FieldSet>,
  );

  for (const slot of [
    'field-set',
    'field-legend',
    'field-group',
    'field',
    'field-label',
    'field-content',
    'field-title',
    'field-separator',
  ]) {
    expect(container.querySelector(`[data-slot="${slot}"]`)).toBeInTheDocument();
  }
});
