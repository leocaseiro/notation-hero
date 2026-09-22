import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Single source of truth for the "input surface" look — the bordered, filled resting appearance
 * shared by input-shaped controls (SearchInput's box, TokenPicker's chips box, LevelFilter's
 * <select>s). This is the input analog of Button's `buttonVariants`: it carries the drift-prone
 * colour tokens — including the dark-mode `border-input` + translucent `bg-input` overrides that
 * match shadcn's Input convention — so no surface hand-copies them (the source of the earlier
 * dark-mode drift). Compose it with `cn(...)` plus each control's own sizing + focus treatment
 * (containers use `focus-within:*`, selects use `focus-visible:*`). Buttons use `buttonVariants`
 * instead — do not reach for this on a button.
 */
export const inputSurfaceClasses =
  'rounded-md border border-border bg-background dark:border-input dark:bg-input/30';

/**
 * Base UI's Popover/Combobox `Positioner` always requires a `Portal` ancestor (unlike Radix, which
 * could render inline by omitting `Portal` entirely) — it throws without one. To keep the floating
 * panel inside the Storybook canvas (`#storybook-root`) for the axe a11y sweep + VR snapshot (both
 * scoped to that element), target the portal's `container` there when it exists; falls back to
 * Base UI's default (`document.body`) in unit tests and real app pages.
 */
export function getStorybookRootContainer(): HTMLElement | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.querySelector<HTMLElement>('#storybook-root') ?? undefined;
}
