import type * as React from 'react';

import { cn } from '@/lib/utils';

// py-4: overflow-x-auto forces the browser to compute overflow-y as `auto` too (the two axes
// can't mix `visible` with `auto`), so it clips the card-row hover lift + glow that overflows
// the row box (DataTable appearance="cards"). `overflow-y-visible` is a no-op here; instead the
// vertical padding pushes the clip box (the padding edge) out past the glow's ~21px reach.
// NH-210 de-risk watch-out (a).
const Table = ({ className, ...props }: React.ComponentProps<'table'>) => (
  <div data-slot="table-container" className="relative w-full overflow-x-auto py-4">
    <table
      data-slot="table"
      className={cn('w-full caption-bottom text-sm', className)}
      {...props}
    />
  </div>
);

const TableHeader = ({ className, ...props }: React.ComponentProps<'thead'>) => (
  <thead data-slot="table-header" className={cn(className)} {...props} />
);

const TableBody = ({ className, ...props }: React.ComponentProps<'tbody'>) => (
  <tbody data-slot="table-body" className={cn(className)} {...props} />
);

const TableRow = ({ className, ...props }: React.ComponentProps<'tr'>) => (
  <tr data-slot="table-row" className={cn('transition-colors', className)} {...props} />
);

const TableHead = ({ className, ...props }: React.ComponentProps<'th'>) => (
  <th
    data-slot="table-head"
    className={cn(
      'px-2 text-left align-middle font-medium text-muted-foreground whitespace-nowrap',
      className,
    )}
    {...props}
  />
);

const TableCell = ({ className, ...props }: React.ComponentProps<'td'>) => (
  <td data-slot="table-cell" className={cn('p-2 align-middle', className)} {...props} />
);

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
