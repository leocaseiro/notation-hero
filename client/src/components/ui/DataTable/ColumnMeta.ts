import type { RowData } from '@tanstack/react-table';

// Lets a column declare horizontal alignment via `meta: { align: 'right' }`.
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- TData/TValue are required by the augmented interface signature
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: 'left' | 'center' | 'right';
  }
}

export function alignClass(align?: 'left' | 'center' | 'right'): string {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
}
