// Public surface of the design system. It grows only when a screen pulls a component across
// (spec D3 — the player decides what gets built). The full barrel over every ui/ component is
// Phase 2 (design-system rename) work.
export { Button, buttonVariants } from './components/ui/Button/Button';
export type { ButtonProps } from './components/ui/Button/Button';

// Pulled across by the v0 player:
// - Skeleton covers the notation area until the engine + Bravura have arrived.
// - Toaster/toast carry the unsupported-file, engine-failure and settings-reset messages.
export { Skeleton, SkeletonTable, SkeletonForm } from './components/ui/Skeleton/Skeleton';
export { Toaster, toast } from './components/ui/Sonner/Sonner';
// - Card/CardContent frame the empty state's drop target (Task 10).
export { Card, CardContent } from './components/ui/Card/Card';
// - Tooltip carries the open score's file name behind its title in the player header (Task 11).
export { Tooltip, TooltipTrigger, TooltipContent } from './components/ui/Tooltip/Tooltip';
