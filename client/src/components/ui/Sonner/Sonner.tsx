'use client';

import { Toaster as SonnerPrimitive, toast as sonnerToast } from 'sonner';
import type { CSSProperties, ComponentProps } from 'react';

/**
 * How many error toasts may be on screen at once. Sonner keeps anything past `visibleToasts` laid
 * out at opacity 0 with pointer events off — but the element is still a tab stop and its close
 * button is still a real `<button>`, so an invisible-yet-focusable control is exactly what a cap
 * has to prevent. `visibleToasts` below is this plus one, so the loading or success toast always
 * has a slot of its own: an error stack must never be able to hide the "Opening …" spinner, which
 * the player waits on before it takes the main thread.
 */
const ERROR_TOAST_CAP = 3;

/**
 * The error toasts currently on screen, oldest first — a Set preserves insertion order, which is
 * what makes "drop the oldest" meaningful. It lives here rather than in a consuming app because
 * this is where the ids are minted: a caller cannot enumerate them afterwards.
 */
const liveErrorIds = new Set<string | number>();

let anonymousErrorCount = 0;

type ErrorMessage = Parameters<typeof sonnerToast.error>[0];
type ErrorOptions = Parameters<typeof sonnerToast.error>[1];

/** Identical copy collapses onto one toast; a non-string message cannot, so it gets a fresh id. */
function deriveId(message: ErrorMessage): string {
  anonymousErrorCount += 1;
  return typeof message === 'string'
    ? `error:${message}`
    : `error:anon:${String(anonymousErrorCount)}`;
}

function forget(id: string | number): void {
  liveErrorIds.delete(id);
}

/**
 * An error toast that stays until it is dismissed, stacks with errors from other causes, and
 * carries a close button.
 *
 * `duration` and `closeButton` are applied AFTER the caller's options on purpose: sonner has no
 * per-type setting, so these guarantees can only live in a wrapper, and a caller must not be able
 * to hand back the four-second dismissal this exists to remove.
 */
function raiseErrorToast(message: ErrorMessage, options?: ErrorOptions): string | number {
  const id = options?.id ?? deriveId(message);

  if (liveErrorIds.has(id)) {
    // The same failure again. Updating in place would change nothing on screen — identical copy,
    // no re-animation, nothing new in the live region — so someone who retried could not tell
    // whether the retry registered. Dismiss and re-raise so the entry animation runs again.
    sonnerToast.dismiss(id);
  } else {
    while (liveErrorIds.size >= ERROR_TOAST_CAP) {
      const oldest = liveErrorIds.values().next().value;
      if (oldest === undefined) break;
      forget(oldest);
      sonnerToast.dismiss(oldest);
    }
  }

  // Re-insert so a refreshed toast counts as the newest rather than the next to be dropped.
  forget(id);
  liveErrorIds.add(id);

  return sonnerToast.error(message, {
    ...options,
    id,
    duration: Number.POSITIVE_INFINITY,
    closeButton: true,
    onDismiss: (raised) => {
      forget(id);
      options?.onDismiss?.(raised);
    },
    onAutoClose: (raised) => {
      forget(id);
      options?.onAutoClose?.(raised);
    },
  });
}

/**
 * Dismiss the error toasts whose id matches. The player uses this to clear the open-a-file errors
 * when a later open succeeds — they describe the same interaction, so leaving a stale failure
 * behind a fresh success would contradict it.
 */
function dismissErrors(matches: (id: string) => boolean): void {
  // Collected first, then dismissed: dismissing deletes from `liveErrorIds`, and mutating a Set
  // while iterating it skips entries.
  const doomed: (string | number)[] = [];
  for (const id of liveErrorIds) {
    if (matches(String(id))) doomed.push(id);
  }
  for (const id of doomed) {
    forget(id);
    sonnerToast.dismiss(id);
  }
}

/**
 * The design system's `toast`. `error` IS the wrapper above — not a sibling export — so there is
 * exactly one reachable `toast.error` and a call site cannot accidentally raise a four-second,
 * un-closable error by importing the unwrapped one.
 */
const toast: typeof sonnerToast = Object.assign(
  (...args: Parameters<typeof sonnerToast>) => sonnerToast(...args),
  sonnerToast,
  { error: raiseErrorToast },
);

/**
 * Toast host built on `sonner`. Mount a single `<Toaster />` once near the app
 * root; then call `toast(...)` (or `toast.success` / `.error` / `.warning` /
 * `.info`) from anywhere to enqueue a toast — no context wiring needed.
 *
 * Per-status colors follow the Badge/Button destructive precedent (tinted
 * surface + status-colored text/icon, not a solid fill): success/warning/error
 * get an opaque `color-mix` tint of their token over `--popover`, mixed in
 * `oklab` (rectangular) so the near-achromatic `--popover` can't drag the hue
 * around the wheel — mixing `in oklch` interpolates hue and turns the low-chroma
 * result red in light (popover hue 0deg) / blue in dark. Opaque because toasts
 * float over page content, so a translucent `/10` would blend with whatever is
 * beneath. Border at 25% and sonner's `currentColor` type icon
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
    // Errors persist, so a collapsed stack would leave all but the newest as a blank scaled card
    // until a pointer entered the list — unreadable to anyone on a keyboard or a touch screen.
    expand
    visibleToasts={ERROR_TOAST_CAP + 1}
    // Measured, not guessed. A persistent toast at sonner's default bottom offset covers the
    // player's transport row: with one error up at 700x800, elementFromPoint returned the toast
    // instead of the seek rail, the metronome and the count-in — three controls a person simply
    // could not click, and nothing in CI can see that. Moving to a corner only relocates the
    // problem (top-right covers the header's tempo stepper at 700 wide, top-center covers both),
    // so the toast is lifted above the control row instead. 6rem clears the row's 72px with a
    // visible gap; the notation area it overlaps instead holds no controls.
    // Measured on /play with a real persistent error and document.elementFromPoint, which is the
    // only way to see occlusion — the a11y gate measures size and viewport containment, never
    // overlap. Controls a person could not click, by position:
    //
    //                     1280x800   700x800   375x800
    //   bottom-right         3          3       the transport row
    //   top-right            0          1       the header
    //
    // top-right is therefore the best available, not a clean win. Below 600px sonner spans nearly
    // the full width, so at phone sizes a persistent toast covers whichever row it is anchored to
    // whatever we choose — that is structural, and fixing it means the shell reserving space or
    // the toast not being a full-width fixed overlay. Recorded rather than papered over.
    position="top-right"
    // Sonner's default, set explicitly because it is now load-bearing: the Toaster mounts last in
    // the app's root layout, so plain Tab reaches a close button only after every page control.
    // This is the direct route into the toast region.
    hotkey={['altKey', 'KeyT']}
    toastOptions={{
      classNames: {
        toast: 'group/toast',
        // A loading toast says "this is happening NOW", so it must NOT fade in over 400 ms the
        // way the others do. It matters most when the work it announces BLOCKS the main thread:
        // the fade then freezes wherever it had got to, and anything short of fully painted is
        // never seen. Measured in the player, whose parse is synchronous — the "Opening …" toast
        // was replaced by its success text at 43 ms with opacity still 0.02, so the loading state
        // was never once visible, on any file, throttled or not.
        loading: 'transition-none!',
        description:
          'text-secondary-foreground! group-data-[type=success]/toast:text-success! group-data-[type=warning]/toast:text-warning! group-data-[type=error]/toast:text-destructive!',
        success:
          'bg-[color-mix(in_oklab,var(--success)_10%,var(--popover))]! text-success! border-success/25!',
        warning:
          'bg-[color-mix(in_oklab,var(--warning)_10%,var(--popover))]! text-warning! border-warning/25!',
        error:
          // pr-11 reserves the close button's 44px column; only error toasts carry one.
          'bg-[color-mix(in_oklab,var(--destructive)_10%,var(--popover))]! text-destructive! border-destructive/25! pr-11!',
        // Scope 2 for sonner's built-in action button: it ships a hardcoded 2px
        // rgba(0,0,0,.4) focus ring (invisible on dark, ignores --ring); the `!`
        // modifiers beat its (0,4,0) attribute-selector specificity.
        actionButton:
          'outline-none transition-all focus-visible:border-ring focus-visible:ring-[3px]! focus-visible:ring-ring/50! active:translate-y-px',
        // The ELEMENT grows to 44px, not an overlay on top of it: the a11y gate measures each
        // button's own getBoundingClientRect(), so a ::after hit area would leave the measured box
        // at sonner's 20px and still fail. Its background and border move to a centred ::before so
        // the painted circle stays 20px and never covers the toast's icon or title, and sonner's
        // outward translate is dropped so a 44px box cannot hang past the viewport edge — the same
        // gate fails a control positioned outside it.
        closeButton: [
          // Right-hand side, not sonner's default left: at 44px the box otherwise sits on top of
          // the toast's own icon (measured — the icon's rect fell entirely inside the button's).
          'size-11! transform-none! left-auto! right-0! top-0! border-0! bg-transparent! text-current!',
          'before:absolute before:left-1/2 before:top-1/2 before:size-5 before:-translate-x-1/2',
          'before:-translate-y-1/2 before:rounded-full before:border before:border-current/25',
          'before:bg-[var(--normal-bg)] before:content-[""]',
          'outline-none focus-visible:border-ring focus-visible:ring-[3px]! focus-visible:ring-ring/50!',
        ].join(' '),
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

export { Toaster, toast, dismissErrors, ERROR_TOAST_CAP };
