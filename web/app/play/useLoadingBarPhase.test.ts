import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import { useLoadingBarPhase } from './useLoadingBarPhase';

// 700 is what PlayerShell passes: the 400 ms hold at 100 % plus the 300 ms fade.
const LINGER_MS = 700;

// KNOWN GAP, on purpose: these cases cannot catch the reset being moved out of render and into an
// effect, because under `act()` the passive effect flushes before the phase is read. Neither can
// the end-to-end suite — measured against a real build, not assumed: the hook returns 'loading'
// before it ever reads `expired`, so the bar is re-armed in the same commit either way, and every
// path that opens a file waits several animation frames, which is far longer than React needs to
// flush the effect. Mid-fade the question does not even arise: `expired` is false there already —
// that is what holds the phase at 'done'. The reset stays in render because it is the documented
// pattern, not because a test can tell the difference.
//
// What a reopen DOES show only end to end is the painted bar itself. 'a file opened while the bar
// is fading keeps one continuous bar, not two' in web/e2e/player.e2e.ts traces it frame by frame:
// one unbroken bar across the two loads, snapped back to full opacity, held at 100 % and faded.

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
