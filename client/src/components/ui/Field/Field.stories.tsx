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

import { Checkbox } from '@/components/ui/Checkbox/Checkbox';

const meta = {
  title: 'UI/Field',
  component: Field,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  // No fn() spies: no Field part defines an event-handler prop (all are
  // passthrough div/label/p wrappers). The `orientation` control is scoped to the
  // Default story (the only one that spreads args) instead of meta — the other
  // stories fix their own orientation, so a global control would be inert for them.
} satisfies Meta<typeof Field>;

export default meta;

type Story = StoryObj<typeof meta>;

// Shared input styling so the stories read as real fields without pulling in our
// Input component (this component folder must build independently). Carries the
// Scope 2 tokens: focus ring + invalid border (ring width only on focus).
const inputClass =
  'h-9 rounded-md border border-input bg-background px-3 text-sm transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20';

// Baseline vertical field + orientation playground: this story spreads `args`, so its
// scoped `orientation` control actually drives the layout (vertical / horizontal /
// responsive).
export const Default: Story = {
  args: { orientation: 'vertical' },
  argTypes: {
    orientation: { control: 'select', options: ['vertical', 'horizontal', 'responsive'] },
  },
  render: (args) => (
    <Field {...args} className="w-72">
      <FieldLabel htmlFor="field-name">Name</FieldLabel>
      <input id="field-name" type="text" placeholder="Ada Lovelace" className={inputClass} />
    </Field>
  ),
};

// A helper line under the control — `FieldDescription` renders muted, small text,
// wired to the input via `aria-describedby`.
export const WithDescription: Story = {
  render: () => (
    <Field className="w-72">
      <FieldLabel htmlFor="field-email">Email</FieldLabel>
      <input
        id="field-email"
        type="email"
        placeholder="you@example.com"
        aria-describedby="field-email-description"
        className={inputClass}
      />
      <FieldDescription id="field-email-description">
        We&apos;ll only use this to send your receipt.
      </FieldDescription>
    </Field>
  ),
};

// Invalid state — `data-invalid` on the wrapper turns the label destructive,
// `aria-invalid` marks the control (destructive border at rest, ring on focus),
// and `FieldError` renders destructive text with `role="alert"` so assistive
// tech announces it.
export const WithError: Story = {
  render: () => (
    <Field data-invalid="true" className="w-72">
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

// FieldError's `errors` prop — deduped and rendered as a bullet list when more
// than one message survives.
export const MultipleErrors: Story = {
  render: () => (
    <Field data-invalid="true" className="w-72">
      <FieldLabel htmlFor="field-username">Username</FieldLabel>
      <input
        id="field-username"
        type="text"
        aria-invalid="true"
        aria-describedby="field-username-error"
        className={inputClass}
      />
      <FieldError
        id="field-username-error"
        errors={[{ message: 'Must be at least 3 characters.' }, { message: 'Already taken.' }]}
      />
    </Field>
  ),
};

// Disabled composition — `data-disabled` on the wrapper dims the label
// (group-data-[disabled=true]) and the disabled input drives peer-disabled.
export const Disabled: Story = {
  render: () => (
    <Field data-disabled="true" className="w-72">
      <FieldLabel htmlFor="field-disabled-name">Name</FieldLabel>
      <input
        id="field-disabled-name"
        type="text"
        disabled
        placeholder="Ada Lovelace"
        className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
      />
    </Field>
  ),
};

// Horizontal orientation — label and control sit on one row (`items-center`). Uses the
// real Checkbox (horizontal fields are typically a label + toggle), which also exercises
// the orientation's checkbox/radio alignment (`[role=checkbox]:mt-px`).
export const Horizontal: Story = {
  render: () => (
    <Field orientation="horizontal" className="w-72">
      <FieldLabel htmlFor="field-newsletter">Subscribe</FieldLabel>
      <Checkbox id="field-newsletter" />
    </Field>
  ),
};

// A `FieldSet` + `FieldLegend` groups related fields; `FieldGroup` spaces them.
// The nested set exercises the legend's `variant="label"` (smaller) style.
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
        <FieldSet>
          <FieldLegend variant="label">Preferred contact</FieldLegend>
          <Field>
            <FieldLabel htmlFor="fieldset-phone">Phone</FieldLabel>
            <input id="fieldset-phone" type="tel" className={inputClass} />
          </Field>
        </FieldSet>
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
// a row at the `@md/field-group` breakpoint (28rem), so the group must be wider
// than that for the row branch to render (w-72 would always stack).
export const Responsive: Story = {
  render: () => (
    <FieldGroup className="w-[32rem]">
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
