'use client';

import { Progress as ProgressPrimitive } from '@base-ui/react/progress';

import { cn } from '@/lib/utils';

interface ProgressProps {
  /**
   * Completion as a fraction from 0 to 1, or null for the indeterminate style.
   *
   * Null is a real case, not a guard: AlphaTab forwards the raw XMLHttpRequest ProgressEvent, and
   * `total` is 0 whenever the response carries no Content-Length — so there is genuinely no
   * fraction to show. Values above 1 are real too (a compressed response reports the ENCODED
   * total against DECODED loaded bytes).
   */
  value: number | null;
  /** Accessible name — required; a bare progressbar tells a screen-reader user nothing. */
  label: string;
  className?: string;
}

// Determinate progress bar with an indeterminate fallback, over Base UI's Progress. Base UI owns
// the ARIA contract — it omits aria-valuenow entirely on the indeterminate branch (which is what
// ARIA defines as "value unknown"; rendering 0 would announce "0 percent" forever). It does NOT
// clamp, so this wrapper does: it paints the track/indicator, adds data-slot, and pins the
// percentage into [0, 100] before Base UI sees it.
//
// The indeterminate fill reuses the repo's skeleton keyframe AS-IS. Do not stack a `bg-*` tint on
// it: `animate-skeleton-pulse` animates `background-color` across the whole cycle, so a keyframe
// declaration outranks a normal utility on the same element and the tint is simply never painted —
// while `runVrStories` freezes animations before snapshotting, so the committed baseline would show
// the tint the live page never renders. `Skeleton.tsx` pairs the animation with `bg-skeleton`.
const Progress = ({ value, label, className }: Readonly<ProgressProps>) => (
  <ProgressPrimitive.Root
    value={value === null ? null : Math.min(100, Math.max(0, value * 100))}
    data-slot="progress"
    aria-label={label}
    className={cn('relative h-1.5 w-full overflow-hidden rounded-full', className)}
  >
    <ProgressPrimitive.Track className="h-full w-full overflow-hidden rounded-full bg-muted">
      <ProgressPrimitive.Indicator
        // A fresh element when the bar turns from indeterminate to determinate (and back). Without
        // it `transition-[width]` tweens the full-width indeterminate fill DOWN to the first real
        // fraction — a full bar shrinking to 1 % reads as progress running backwards.
        key={value === null ? 'indeterminate' : 'determinate'}
        className={cn(
          'h-full rounded-full bg-primary transition-[width] duration-150',
          'data-[indeterminate]:animate-skeleton-pulse data-[indeterminate]:bg-skeleton data-[indeterminate]:w-full',
        )}
      />
    </ProgressPrimitive.Track>
  </ProgressPrimitive.Root>
);

export { Progress };
