import { cva } from 'class-variance-authority';
import { useMemo } from 'react';
import type { VariantProps } from 'class-variance-authority';
import type * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Composable form-field primitives. `Field` is the wrapper that lays out a
 * control with its `FieldLabel`, `FieldDescription`, and `FieldError`; the
 * orientation (`vertical` default, `horizontal`, `responsive`) is a `cva`
 * variant surfaced as `data-orientation`. `FieldSet` + `FieldLegend` group
 * related fields (with `FieldGroup` for spacing), and `FieldSeparator` divides
 * groups. Every part sets its own `data-slot` so styling and tests can target
 * it. `FieldLabel` is a native `<label>` (not our `Label` component) to keep
 * this file self-contained; its `select-none` covers the double-click
 * text-selection guard Radix Label used to provide.
 */
const fieldVariants = cva('group/field flex w-full gap-2 data-[invalid=true]:text-destructive', {
  variants: {
    orientation: {
      vertical: ['flex-col [&>*]:w-full [&>.sr-only]:w-auto'],
      horizontal: [
        'flex-row items-center',
        '[&>[data-slot=field-label]]:flex-auto',
        'has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
      ],
      responsive: [
        'flex-col @md/field-group:flex-row @md/field-group:items-center [&>*]:w-full @md/field-group:[&>*]:w-auto [&>.sr-only]:w-auto',
        '@md/field-group:[&>[data-slot=field-label]]:flex-auto',
        '@md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
      ],
    },
  },
  defaultVariants: {
    orientation: 'vertical',
  },
});

const Field = ({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof fieldVariants>) => (
  <div
    role="group"
    data-slot="field"
    data-orientation={orientation}
    className={cn(fieldVariants({ orientation }), className)}
    {...props}
  />
);

const FieldLabel = ({ className, ...props }: React.ComponentProps<'label'>) => (
  // eslint-disable-next-line jsx-a11y/label-has-associated-control -- generic wrapper: the control association (htmlFor / wrapped input) happens at the call site
  <label
    data-slot="field-label"
    className={cn(
      'group/field-label peer/field-label flex w-fit gap-2 text-sm leading-snug font-medium select-none group-data-[disabled=true]/field:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
      'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-4',
      'has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5 dark:has-data-[state=checked]:bg-primary/10',
      className,
    )}
    {...props}
  />
);

const FieldTitle = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div
    data-slot="field-title"
    className={cn(
      'flex w-fit items-center gap-2 text-sm leading-snug font-medium group-data-[disabled=true]/field:opacity-50',
      className,
    )}
    {...props}
  />
);

const FieldContent = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div
    data-slot="field-content"
    className={cn('group/field-content flex flex-1 flex-col gap-1.5 leading-snug', className)}
    {...props}
  />
);

const FieldDescription = ({ className, ...props }: React.ComponentProps<'p'>) => (
  <p
    data-slot="field-description"
    className={cn(
      'text-sm leading-normal font-normal text-muted-foreground group-has-[[data-orientation=horizontal]]/field:text-balance',
      'last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5',
      '[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
      className,
    )}
    {...props}
  />
);

const FieldError = ({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<'div'> & {
  errors?: Array<{ message?: string } | undefined>;
}) => {
  // Returns divergent shapes by design — explicit `children`, a single error
  // string, a `<ul>` of messages, or `null` — so the single-return-type rule
  // can't apply; the union is exactly React.ReactNode.
  // eslint-disable-next-line sonarjs/function-return-type -- intentional ReactNode union (string | element | null)
  const content = useMemo<React.ReactNode>(() => {
    if (children) {
      return children;
    }

    if (!errors?.length) {
      return null;
    }

    const uniqueErrors = [...new Map(errors.map((error) => [error?.message, error])).values()];

    if (uniqueErrors.length === 1) {
      return uniqueErrors[0]?.message;
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {uniqueErrors.map(
          (error) => error?.message && <li key={error.message}>{error.message}</li>,
        )}
      </ul>
    );
  }, [children, errors]);

  if (!content) {
    return null;
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn('text-sm font-normal text-destructive', className)}
      {...props}
    >
      {content}
    </div>
  );
};

const FieldGroup = ({ className, ...props }: React.ComponentProps<'div'>) => (
  <div
    data-slot="field-group"
    className={cn(
      'group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4',
      className,
    )}
    {...props}
  />
);

const FieldSet = ({ className, ...props }: React.ComponentProps<'fieldset'>) => (
  <fieldset
    data-slot="field-set"
    className={cn(
      'flex flex-col gap-6',
      'has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
      className,
    )}
    {...props}
  />
);

const FieldLegend = ({
  className,
  variant = 'legend',
  ...props
}: React.ComponentProps<'legend'> & { variant?: 'legend' | 'label' }) => (
  <legend
    data-slot="field-legend"
    data-variant={variant}
    className={cn(
      'mb-3 font-medium',
      'data-[variant=legend]:text-base',
      'data-[variant=label]:text-sm',
      className,
    )}
    {...props}
  />
);

const FieldSeparator = ({
  children,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  children?: React.ReactNode;
}) => (
  <div
    data-slot="field-separator"
    data-content={!!children}
    className={cn(
      'relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2',
      className,
    )}
    {...props}
  >
    {/* Plain rule instead of a shared Separator component, to keep this file self-contained. */}
    <div
      role="separator"
      aria-orientation="horizontal"
      className="absolute inset-x-0 top-1/2 h-px bg-border"
    />
    {children && (
      <span
        className="relative mx-auto block w-fit bg-background px-2 text-muted-foreground"
        data-slot="field-separator-content"
      >
        {children}
      </span>
    )}
  </div>
);

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldSet,
  FieldLegend,
  FieldSeparator,
  FieldContent,
  FieldTitle,
  fieldVariants,
};
