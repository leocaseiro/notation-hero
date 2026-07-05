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
import type { Meta, StoryObj } from '@storybook/tanstack-react';

const meta = {
  title: 'UI/Field',
  component: Field,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
} satisfies Meta<typeof Field>;

export default meta;

type Story = StoryObj<typeof meta>;

// Shared input styling so the stories read as real fields without pulling in our
// Input component (this component folder must build independently).
const inputClass = 'h-9 rounded-md border border-input bg-background px-3 text-sm';

// Baseline vertical field: a label associated with a plain input via `htmlFor`.
export const Default: Story = {
  render: () => (
    <Field className="w-72">
      <FieldLabel htmlFor="field-name">Name</FieldLabel>
      <input id="field-name" type="text" placeholder="Ada Lovelace" className={inputClass} />
    </Field>
  ),
};

// A helper line under the control — `FieldDescription` renders muted, small text.
export const WithDescription: Story = {
  render: () => (
    <Field className="w-72">
      <FieldLabel htmlFor="field-email">Email</FieldLabel>
      <input id="field-email" type="email" placeholder="you@example.com" className={inputClass} />
      <FieldDescription>We&apos;ll only use this to send your receipt.</FieldDescription>
    </Field>
  ),
};

// Invalid state — `FieldError` renders destructive text and carries `role="alert"`
// so assistive tech announces it; `aria-invalid` marks the control.
export const WithError: Story = {
  render: () => (
    <Field className="w-72">
      <FieldLabel htmlFor="field-password">Password</FieldLabel>
      <input
        id="field-password"
        type="password"
        aria-invalid="true"
        aria-describedby="field-password-error"
        className={inputClass}
      />
      <FieldError id="field-password-error">Must be at least 8 characters.</FieldError>
    </Field>
  ),
};

// Horizontal orientation — label and control sit on one row (`items-center`).
export const Horizontal: Story = {
  render: () => (
    <Field orientation="horizontal" className="w-72">
      <FieldLabel htmlFor="field-newsletter">Subscribe</FieldLabel>
      <input id="field-newsletter" type="checkbox" />
    </Field>
  ),
};

// A `FieldSet` + `FieldLegend` groups related fields; `FieldGroup` spaces them.
export const Fieldset: Story = {
  render: () => (
    <FieldSet className="w-72">
      <FieldLegend>Contact details</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="fieldset-first">First name</FieldLabel>
          <input id="fieldset-first" type="text" className={inputClass} />
        </Field>
        <Field>
          <FieldLabel htmlFor="fieldset-last">Last name</FieldLabel>
          <input id="fieldset-last" type="text" className={inputClass} />
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
};

// Grouped fields — `FieldTitle` + `FieldContent` frame each control and a
// labelled `FieldSeparator` ("OR") divides the two, exercising the separator's
// content branch alongside the title/content slots.
export const Grouped: Story = {
  render: () => (
    <FieldSet className="w-72">
      <FieldLegend>Sign in</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldTitle>Continue with email</FieldTitle>
          <FieldContent>
            <FieldLabel htmlFor="grouped-email">Email</FieldLabel>
            <input
              id="grouped-email"
              type="email"
              placeholder="you@example.com"
              className={inputClass}
            />
          </FieldContent>
        </Field>
        <FieldSeparator>OR</FieldSeparator>
        <Field>
          <FieldTitle>Continue with a phone number</FieldTitle>
          <FieldContent>
            <FieldLabel htmlFor="grouped-phone">Phone</FieldLabel>
            <input
              id="grouped-phone"
              type="tel"
              placeholder="+61 400 000 000"
              className={inputClass}
            />
          </FieldContent>
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
};

// Responsive orientation — stacks vertically on narrow containers and switches to
// a row at the `@md/field-group` breakpoint, so it lives inside a `FieldGroup`.
export const Responsive: Story = {
  render: () => (
    <FieldGroup className="w-72">
      <Field orientation="responsive">
        <FieldLabel htmlFor="responsive-username">Username</FieldLabel>
        <input
          id="responsive-username"
          type="text"
          placeholder="ada.lovelace"
          className={inputClass}
        />
      </Field>
    </FieldGroup>
  ),
};
