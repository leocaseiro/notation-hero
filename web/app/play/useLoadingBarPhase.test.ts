import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { useLoadingBarPhase } from './useLoadingBarPhase';

// 700 is what PlayerShell passes: the 400 ms hold at 100 % plus the 300 ms fade.
const LINGER_MS = 700;

// KNOWN GAP, on purpose: these cases cannot catch the reset being moved out of render and into an
// effect, because under `act()` the passive effect flushes before the phase is read. That one is
// only reachable by tracing the painted bar across a reopen in the end-to-end suite.

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const renderPhase = () =>
  renderHook(({ loading }) => useLoadingBarPhase(loading, LINGER_MS), {
    initialProps: { loading: true },
  });

test('a finished bar is held for the linger, then goes', () => {
  const { result, rerender } = renderPhase();
  expect(result.current).toBe('loading');

  rerender({ loading: false });
  expect(result.current).toBe('done');

  act(() => {
    vi.advanceTimersByTime(LINGER_MS);
  });
  expect(result.current).toBe('gone');
});

test('a second load is armed again, so it gets the whole hold and fade', () => {
  const { result, rerender } = renderPhase();

  rerender({ loading: false });
  act(() => {
    vi.advanceTimersByTime(LINGER_MS);
  });
  expect(result.current).toBe('gone');

  rerender({ loading: true });
  expect(result.current).toBe('loading');

  // The assertion with teeth. Without the in-render re-arm, `expired` is still true from the first
  // load and this reads 'gone' at once — the bar vanishing instead of holding at 100 % and fading.
  rerender({ loading: false });
  expect(result.current).toBe('done');

  act(() => {
    vi.advanceTimersByTime(LINGER_MS);
  });
  expect(result.current).toBe('gone');
});
