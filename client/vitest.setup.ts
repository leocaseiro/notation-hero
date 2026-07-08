import '@testing-library/jest-dom/vitest';

// jsdom has no layout engine, so it doesn't implement ResizeObserver — which Base UI
// primitives (Tooltip, and later DropdownMenu/Menubar/HoverCard/Dialog) instantiate on
// mount to measure and position content. Provide a no-op so component unit tests can render
// open/positioned Base UI content instead of crashing with "ResizeObserver is not defined".
class ResizeObserverStub {
  observe(): void {
    // no-op: nothing to measure in jsdom.
  }
  unobserve(): void {
    // no-op.
  }
  disconnect(): void {
    // no-op.
  }
}
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
