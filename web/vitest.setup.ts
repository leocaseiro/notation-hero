import '@testing-library/jest-dom/vitest';

// jsdom has no layout engine, so it lacks ResizeObserver + the pointer-capture / scrollIntoView APIs
// some primitives use on mount. Polyfill them once so component tests render instead of crashing.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
Element.prototype.scrollIntoView = () => {};
Element.prototype.hasPointerCapture = () => false;
Element.prototype.setPointerCapture = () => {};
Element.prototype.releasePointerCapture = () => {};
