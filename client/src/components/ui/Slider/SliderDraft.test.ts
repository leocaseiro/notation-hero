import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';

import { useSliderDraft } from './SliderDraft';

test('shows the committed value while nothing is being dragged', () => {
  const { result } = renderHook(() => useSliderDraft(12, vi.fn()));

  expect(result.current.value).toBe(12);
});

test('a move shows the draft and reports nothing', () => {
  const onCommit = vi.fn();
  const { result } = renderHook(() => useSliderDraft(12, onCommit));

  act(() => {
    result.current.onChange(7);
  });

  expect(result.current.value).toBe(7);
  expect(onCommit).not.toHaveBeenCalled();
});

// The whole point of the draft: however many moves a gesture makes, the caller hears one value.
test('a commit reports the settled value once, however many moves preceded it', () => {
  const onCommit = vi.fn();
  const { result } = renderHook(() => useSliderDraft(12, onCommit));

  act(() => {
    result.current.onChange(7);
  });
  act(() => {
    result.current.onChange(9);
  });
  act(() => {
    result.current.onCommit(9);
  });

  expect(onCommit).toHaveBeenCalledTimes(1);
  expect(onCommit).toHaveBeenLastCalledWith(9);
});

test('a commit drops the draft, so the committed value wins again', () => {
  const onCommit = vi.fn();
  const { result, rerender } = renderHook(
    ({ committed }: { committed: number }) => useSliderDraft(committed, onCommit),
    { initialProps: { committed: 12 } },
  );

  act(() => {
    result.current.onChange(7);
  });
  act(() => {
    result.current.onCommit(7);
  });

  // The caller has not written 7 yet, and the draft is gone — so the control is back on 12
  // rather than holding a value nobody accepted.
  expect(result.current.value).toBe(12);

  // And a caller that CLAMPS or refuses the reported value shows its own value, not the draft.
  rerender({ committed: 5 });
  expect(result.current.value).toBe(5);
});
