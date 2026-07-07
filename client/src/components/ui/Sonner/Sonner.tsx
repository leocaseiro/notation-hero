import { Toaster as SonnerPrimitive } from 'sonner';
import type { CSSProperties, ComponentProps } from 'react';

/**
 * Toast host built on `sonner`. Mount a single `<Toaster />` once near the app
 * root; then call `toast(...)` (or `toast.success` / `.error` / `.warning` /
 * `.info`) from anywhere to enqueue a toast — no context wiring needed.
 *
 * Per-status colors follow the Badge/Button destructive precedent (tinted
 * surface + status-colored text/icon, not a solid fill): success/warning/error
 * get an opaque `color-mix` tint of their token over `--popover` (toasts float
 * over page content, so a translucent `/10` would blend with whatever is
 * beneath), with the border at 25% and sonner's `currentColor` type icon
 * picking up the status color. The default (untyped) toast sits on the
 * `--secondary` gray via sonner's `--normal-*` variables; `info` stays on that
 * neutral surface too (no info token — its icon is the differentiator).
 * Descriptions follow their surface's foreground (secondary-foreground on
 * neutral, the status color on typed) — `--muted-foreground` fails AA on these
 * tinted/gray surfaces in light mode, and title/description hierarchy comes
 * from sonner's font-weight difference. Sonner renders its own DOM hooks —
 * `[data-sonner-toaster]` (the region) and `[data-sonner-toast]` (each toast) —
 * and does not forward a `data-slot`.
 */
const Toaster = ({ ...props }: ComponentProps<typeof SonnerPrimitive>) => (
  <SonnerPrimitive
    className="toaster group"
    toastOptions={{
      classNames: {
        toast: 'group/toast',
        description:
          'text-secondary-foreground! group-data-[type=success]/toast:text-success! group-data-[type=warning]/toast:text-warning! group-data-[type=error]/toast:text-destructive!',
        success:
          'bg-[color-mix(in_oklch,var(--success)_10%,var(--popover))]! text-success! border-success/25!',
        warning:
          'bg-[color-mix(in_oklch,var(--warning)_10%,var(--popover))]! text-warning! border-warning/25!',
        error:
          'bg-[color-mix(in_oklch,var(--destructive)_10%,var(--popover))]! text-destructive! border-destructive/25!',
        // Scope 2 for sonner's built-in action button: it ships a hardcoded 2px
        // rgba(0,0,0,.4) focus ring (invisible on dark, ignores --ring); the `!`
        // modifiers beat its (0,4,0) attribute-selector specificity.
        actionButton:
          'outline-none transition-all focus-visible:border-ring focus-visible:ring-[3px]! focus-visible:ring-ring/50! active:translate-y-px',
      },
    }}
    style={
      {
        '--normal-bg': 'var(--secondary)',
        '--normal-text': 'var(--secondary-foreground)',
        '--normal-border': 'var(--border)',
      } as CSSProperties
    }
    {...props}
  />
);

export { Toaster };

export { toast } from 'sonner';
