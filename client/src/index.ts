// Public surface of the design system. Phase 1 shipped Button only (NH-275 one-component proof);
// NH-279 intentionally widened it to DataTable + LevelPill (and the ColumnDef type) for the catalog
// BFF. The full barrel over all ~40 ui/ components + the client/ -> design-system/ rename remain
// Phase 2 work — see docs/specs/2026-07-09-nextjs-web-client-design.md.
export { Button, buttonVariants } from './components/ui/Button/Button';
export type { ButtonProps } from './components/ui/Button/Button';
export { DataTable } from './components/ui/DataTable/DataTable';
export type { DataTableProps } from './components/ui/DataTable/DataTable';
export type { ColumnDef } from '@tanstack/react-table';
export { LevelPill } from './components/ui/LevelPill/LevelPill';
