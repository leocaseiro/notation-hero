import type * as React from 'react';

import { cn } from '@/lib/utils';

interface SkeletonProps extends React.ComponentProps<'div'> {
  /** One pulse cycle in milliseconds (peak -> trough -> peak). Defaults to the keyframe's 2000. */
  duration?: number;
}

// Base skeleton block — a pulsing placeholder sized entirely by `className` (h-*, w-*,
// rounded-*). The old `bg-accent` + animate-pulse read as ~1.1:1 against the page background —
// effectively invisible, and the pulse's 0.5-opacity trough made it worse. Now pulses
// BACKGROUND-COLOR between the dedicated --skeleton (peak) and --skeleton-pulse (trough) tokens
// (styles.css; Leo-picked greys, both sides of the cycle stay visible in light + dark), so
// contrast holds through the whole animation instead of only the frozen resting frame.
// `duration` overrides the pulse speed per instance (inline animation-duration beats the
// keyframe's 2s default); omit it to stay on the shared rhythm.
const Skeleton = ({ className, duration, style, ...props }: Readonly<SkeletonProps>) => (
  <div
    data-slot="skeleton"
    className={cn('bg-skeleton animate-skeleton-pulse rounded-md', className)}
    style={duration === undefined ? style : { animationDuration: `${duration}ms`, ...style }}
    {...props}
  />
);

interface SkeletonTableProps extends React.ComponentProps<'div'> {
  /** Body rows to render (excludes the header row). */
  rows?: number;
  /** Columns per row. */
  columns?: number;
}

// A wide leading column (the title) plus fixed-width trailing columns (meta), so the placeholder
// reads like a real catalog row rather than N equal bars.
const columnWidth = (index: number): string => {
  if (index === 0) return 'flex-1';
  // Trailing meta columns alternate two fixed widths so they read like distinct fields.
  return index % 2 === 1 ? 'w-24' : 'w-20';
};

// Table-shaped loading placeholder — a header row of thin cells over `rows` taller body
// rows. Dumb/presentational: it takes only counts, so it drops into any list/table view
// (e.g. the catalog table) while data loads. Defaults to 3 columns: a wide title + two narrow.
const SkeletonTable = ({
  rows = 5,
  columns = 3,
  className,
  ...props
}: Readonly<SkeletonTableProps>) => {
  // Stable string keys (not the array index) so the react/no-array-index-key lint stays happy.
  const columnKeys = Array.from({ length: columns }, (_, index) => `col-${index}`);
  const rowKeys = Array.from({ length: rows }, (_, index) => `row-${index}`);
  return (
    <div
      data-slot="skeleton-table"
      role="status"
      aria-label="Loading"
      className={cn('w-full space-y-2.5', className)}
      {...props}
    >
      <div className="flex gap-3">
        {columnKeys.map((key, index) => (
          <Skeleton key={key} className={cn('h-4', columnWidth(index))} />
        ))}
      </div>
      {rowKeys.map((rowKey) => (
        <div key={rowKey} className="flex gap-3">
          {columnKeys.map((colKey, index) => (
            <Skeleton key={`${rowKey}-${colKey}`} className={cn('h-8', columnWidth(index))} />
          ))}
        </div>
      ))}
    </div>
  );
};

interface SkeletonFormProps extends React.ComponentProps<'div'> {
  /** Label + input field pairs to render. */
  fields?: number;
}

// Form-shaped loading placeholder — `fields` label+input pairs above a submit-button block.
// Dumb/presentational: counts only, so it stands in for any form while it hydrates.
const SkeletonForm = ({ fields = 3, className, ...props }: Readonly<SkeletonFormProps>) => {
  const fieldKeys = Array.from({ length: fields }, (_, index) => `field-${index}`);
  return (
    <div
      data-slot="skeleton-form"
      role="status"
      aria-label="Loading"
      className={cn('w-full space-y-4', className)}
      {...props}
    >
      {fieldKeys.map((key) => (
        <div key={key} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="h-9 w-28" />
    </div>
  );
};

export { Skeleton, SkeletonTable, SkeletonForm };
