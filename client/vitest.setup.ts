import '@testing-library/jest-dom/vitest';

// jsdom has no layout engine, so it doesn't implement ResizeObserver — which Base UI primitives
// (Slider, Combobox, Tooltip, DropdownMenu/Menubar/HoverCard/Dialog, …) instantiate on mount to
// measure and position content. It also lacks the pointer-capture + scrollIntoView APIs Base UI's
// Slider/Combobox use during pointer + keyboard interaction. Polyfill them all once here so every
// component test can render open/positioned Base UI content instead of crashing.
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
Element.prototype.scrollIntoView = () => {};
Element.prototype.hasPointerCapture = () => false;
Element.prototype.setPointerCapture = () => {};
Element.prototype.releasePointerCapture = () => {};
