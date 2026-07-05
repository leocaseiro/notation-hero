import { Toaster as SonnerPrimitive } from 'sonner';
import type { CSSProperties, ComponentProps } from 'react';

/**
 * Toast host built on `sonner`. Mount a single `<Toaster />` once near the app
 * root; then call `toast(...)` (or `toast.success` / `.error` / `.warning` /
 * `.info`) from anywhere to enqueue a toast — no context wiring needed.
 *
 * The `--normal-*` CSS variables map sonner's colors onto our design tokens
 * (`--popover`, `--popover-foreground`, `--border`), so toasts follow the `.dark`
 * class. Semantic toasts (`toast.success` / `.error` / `.warning` / `.info`) are
 * distinguished by a leading type icon on a neutral surface (shadcn's default);
 * pass `richColors` for colored backgrounds. Sonner renders its own DOM hooks —
 * `[data-sonner-toaster]` (the region) and `[data-sonner-toast]` (each toast) —
 * and does not forward a `data-slot`.
 */
const Toaster = ({ ...props }: ComponentProps<typeof SonnerPrimitive>) => (
  <SonnerPrimitive
    className="toaster group"
    // sonner's default description grey ignores our `.dark` class and fails
    // contrast on the dark toast; map it to our muted-foreground token instead.
    toastOptions={{ classNames: { description: 'text-muted-foreground!' } }}
    style={
      {
        '--normal-bg': 'var(--popover)',
        '--normal-text': 'var(--popover-foreground)',
        '--normal-border': 'var(--border)',
      } as CSSProperties
    }
    {...props}
  />
);

export { Toaster };

export { toast } from 'sonner';
