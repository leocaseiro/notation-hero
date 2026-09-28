import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only self-registers its afterEach cleanup when the runner exposes test globals.
// This lane deliberately does not (`globals` is off, so web/tsconfig.json needs no vitest types
// and a test imports what it uses), so unmount each render here — otherwise every render stacks
// in the same document and the next `getByTestId` finds two matching elements.
afterEach(cleanup);

// Same polyfills client/vitest.setup.ts carries, and for the same reason: web components compose
// client's Base UI primitives (Scrubber's Slider, TransportToggle's Tooltip), which instantiate a
// ResizeObserver on mount to measure and position content, and use the pointer-capture +
// scrollIntoView APIs during pointer and keyboard interaction. jsdom has no layout engine and
// implements none of them, so without these every such render throws.
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
// next/link measures its own visibility with an IntersectionObserver and disconnects it on
// unmount, which throws when the global is absent — so PlayerShell, which renders a Link through
// PlayerHeader, cannot even be unmounted without this.
class IntersectionObserverStub {
  observe(): void {
    // no-op: nothing intersects in jsdom.
  }
  unobserve(): void {
    // no-op.
  }
  disconnect(): void {
    // no-op.
  }
  takeRecords(): [] {
    return [];
  }
}
if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver =
    IntersectionObserverStub as unknown as typeof IntersectionObserver;
}
Element.prototype.scrollIntoView = () => {};
Element.prototype.hasPointerCapture = () => false;
Element.prototype.setPointerCapture = () => {};
Element.prototype.releasePointerCapture = () => {};
