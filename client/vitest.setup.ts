import '@testing-library/jest-dom/vitest';

// jsdom is missing a few DOM APIs that Base UI (Slider, Combobox) relies on at mount or during
// keyboard navigation. Polyfill them once here so every component test has them, instead of
// per-file shims. Unconditional assignment (the DOM lib types these as always-present, so `??=`
// would trip @typescript-eslint/no-unnecessary-condition).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub;
Element.prototype.scrollIntoView = () => {};
Element.prototype.hasPointerCapture = () => false;
Element.prototype.setPointerCapture = () => {};
Element.prototype.releasePointerCapture = () => {};
