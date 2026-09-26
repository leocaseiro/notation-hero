import { act, fireEvent, render, screen } from '@testing-library/react';
import { Toaster, dismissErrors, toast } from './Sonner';

// sonner renders nothing until a toast is queued, so mounting the Toaster and
// firing a toast is what actually surfaces the region — assert both the toaster
// slot and its aria-labelled section exist (no crash on mount + render).
test('renders the sonner toaster region', async () => {
  render(<Toaster />);
  act(() => {
    toast('Ready');
  });
  await screen.findByText('Ready');
  expect(document.querySelector('[data-sonner-toaster]')).toBeInTheDocument();
  expect(screen.getByRole('region', { name: /notifications/i })).toBeInTheDocument();
});

test('exposes toast as a function', () => {
  expect(typeof toast).toBe('function');
});

test('shows a toast when toast() is called', async () => {
  render(<Toaster />);
  act(() => {
    toast('Hello world');
  });
  expect(await screen.findByText('Hello world', undefined, { timeout: 3000 })).toBeInTheDocument();
});

test('invokes the action button onClick', async () => {
  const onClick = vi.fn();
  render(<Toaster />);
  act(() => {
    toast('Saved', { action: { label: 'Undo', onClick } });
  });
  // fireEvent.click (not userEvent) so we skip sonner's pointerdown →
  // setPointerCapture path, which jsdom does not implement.
  fireEvent.click(await screen.findByText('Undo'));
  expect(onClick).toHaveBeenCalled();
});

// ── Error toasts: persistent, stacked, closable (NH-331 / NH-311) ───────────────────────────────
//
// Sonner's toast state is module-level, so it survives between tests in this file — clear it or a
// leftover toast is counted by the next assertion.
//
// These carry the whole weight of the persistence guarantee. Neither the visual-regression nor the
// accessibility lane can see it: every Sonner story already passes `duration: Infinity`, so the
// change to the DEFAULT is invisible to both by construction.

// A dismissed toast STAYS in the DOM carrying data-removed="true" — sonner unmounts it on a CSS
// transition event, and jsdom fires none. Counting nodes would therefore count toasts nobody can
// see, so every assertion below goes through this filter.
const liveErrors = () =>
  [...document.querySelectorAll<HTMLElement>('[data-sonner-toast][data-type="error"]')].filter(
    (node) => node.dataset.removed !== 'true',
  );

const liveErrorTexts = () => liveErrors().map((node) => node.textContent);

// Sonner marks a dismissed toast and only reflects it after its exit animation window. Measured:
// 1000ms is not enough under fake timers and the removal is missed; this is comfortably past it.
const REMOVAL_MS = 3000;

beforeEach(() => {
  // Installed BEFORE anything renders: sonner schedules its auto-close and its exit-animation
  // removal with setTimeout, and timers created before vi.useFakeTimers() are never advanced.
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  act(() => {
    // dismissErrors, not a bare toast.dismiss(): the id registry is module-level and survives
    // between tests, and a bulk dismiss does not fire the per-toast onDismiss that prunes it. A
    // leftover id would make the next test's cap evict a phantom instead of a real toast.
    dismissErrors(() => true);
    toast.dismiss();
  });
  act(() => {
    vi.advanceTimersByTime(REMOVAL_MS);
  });
  vi.useRealTimers();
});

test('an error toast is still on screen long after a success toast has gone', async () => {
  render(<Toaster />);
  act(() => {
    toast.success('Saved');
    toast.error('Could not save');
  });
  await screen.findByText('Could not save');
  act(() => {
    vi.advanceTimersByTime(30_000);
  });
  expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  expect(screen.getByText('Could not save')).toBeInTheDocument();
});

// The design system re-exports `toast` as its public surface. If the wrapper were a sibling export
// instead of `toast.error` itself, every existing call site would keep raising a four-second,
// un-closable error toast and nothing would fail.
test('the persistence holds through the package public toast export, not just a helper', async () => {
  render(<Toaster />);
  act(() => {
    toast.error('Via the public export');
  });
  await screen.findByText('Via the public export');
  act(() => {
    vi.advanceTimersByTime(30_000);
  });
  expect(screen.getByText('Via the public export')).toBeInTheDocument();
});

test('two different causes stack instead of replacing one another', async () => {
  render(<Toaster />);
  act(() => {
    toast.error('Too large');
    toast.error('Not a score');
  });
  await screen.findByText('Not a score');
  expect(screen.getByText('Too large')).toBeInTheDocument();
  expect(liveErrors()).toHaveLength(2);
});

// Dropping the same bad file twice must not stack two identical cards, each needing its own
// close. It collapses onto one.
//
// What this does NOT yet do is make the repeat VISIBLE. Sonner reconciles a re-raised id onto the
// existing node, so identical copy produces no animation and nothing new in the live region —
// someone who retried cannot tell the retry registered. Making it visible means either changing
// the rendered copy (a repeat count) or introducing a deliberate exit-then-re-enter flicker, and
// both are user-visible product choices rather than implementation detail. Flagged, not guessed.
test('the same failure twice collapses onto one toast', async () => {
  render(<Toaster />);
  act(() => {
    toast.error('Not a score');
  });
  await screen.findByText('Not a score');
  act(() => {
    toast.error('Not a score');
  });
  expect(liveErrors()).toHaveLength(1);
});

test('an error toast carries a close control with an accessible name', async () => {
  render(<Toaster />);
  act(() => {
    toast.error('Could not save');
  });
  await screen.findByText('Could not save');
  expect(screen.getByRole('button', { name: /close toast/i })).toBeInTheDocument();
});

test('pressing close removes that toast and leaves the other one', async () => {
  render(<Toaster />);
  act(() => {
    toast.error('Too large');
    toast.error('Not a score');
  });
  await screen.findByText('Not a score');
  const [closeFirst] = screen.getAllByRole('button', { name: /close toast/i });
  fireEvent.click(closeFirst as HTMLElement);
  act(() => {
    vi.advanceTimersByTime(REMOVAL_MS);
  });
  expect(liveErrors()).toHaveLength(1);
});

test('success and loading toasts get no close control', async () => {
  render(<Toaster />);
  act(() => {
    toast.success('Saved');
    toast.loading('Opening …');
  });
  await screen.findByText('Saved');
  expect(screen.queryByRole('button', { name: /close toast/i })).not.toBeInTheDocument();
});

// Sonner keeps anything past `visibleToasts` laid out at opacity 0 — still a tab stop, still
// holding a real button — so the cap is what stops an invisible focusable control existing.
test('a fourth error drops the oldest, and a loading toast keeps its own slot', async () => {
  render(<Toaster />);
  act(() => {
    toast.error('First');
    toast.error('Second');
    toast.error('Third');
  });
  await screen.findByText('Third');
  act(() => {
    toast.error('Fourth');
  });
  act(() => {
    vi.advanceTimersByTime(REMOVAL_MS);
  });
  expect(liveErrorTexts()).not.toContain('First');
  expect(liveErrors()).toHaveLength(3);

  // The loading toast is not one of the dropped, and does not push an error out either: the
  // player waits for it to paint before it takes the main thread, so an error stack must never be
  // able to squeeze it out. visibleToasts is the cap plus one for exactly this.
  act(() => {
    toast.loading('Opening …');
  });
  await screen.findByText('Opening …');
  expect(liveErrors()).toHaveLength(3);
});

test('dismissErrors removes only the toasts its predicate matches', async () => {
  render(<Toaster />);
  act(() => {
    toast.error('Size problem', { id: 'E101:song.gp' });
    toast.error('Engine problem', { id: 'E201:engine' });
  });
  await screen.findByText('Engine problem');
  act(() => {
    dismissErrors((id) => id.startsWith('E101:'));
  });
  act(() => {
    vi.advanceTimersByTime(REMOVAL_MS);
  });
  expect(liveErrorTexts()).not.toContain('Size problem');
  expect(liveErrorTexts()).toContain('Engine problem');
});
