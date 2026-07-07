import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

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
