import { renderHook } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

import { useIsMobile } from './use-mobile';

// jsdom implements neither `matchMedia` nor a real layout engine, so stub the media query. The hook
// reads `matchMedia(query).matches` for its value, so `matches` is what drives the result; the
// listener is a no-op here (we don't fire a resize in these cases).
function stubMatchMedia(matches: boolean): void {
  globalThis.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

const originalMatchMedia = globalThis.matchMedia;

afterEach(() => {
  globalThis.matchMedia = originalMatchMedia;
});

test('returns true when the viewport matches the mobile media query', () => {
  stubMatchMedia(true);
  const { result } = renderHook(() => useIsMobile());
  expect(result.current).toBe(true);
});

test('returns false when the viewport does not match the mobile media query', () => {
  stubMatchMedia(false);
  const { result } = renderHook(() => useIsMobile());
  expect(result.current).toBe(false);
});

test('falls back to false when matchMedia is unavailable', () => {
  // @ts-expect-error — deliberately remove matchMedia to exercise the SSR/non-DOM guard.
  globalThis.matchMedia = undefined;
  const { result } = renderHook(() => useIsMobile());
  expect(result.current).toBe(false);
});
