import { expect, it, vi } from 'vitest';

import { dropPlaybackSelection } from './playback-selection';

import type * as AlphaTab from '@coderline/alphatab';

/** An api with one reachable beat, and the two calls recorded. */
function stub(beats: unknown[] = [{ id: 'beat-0' }]) {
  const calls: string[] = [];
  const api = {
    score: { tracks: [{ staves: [{ bars: [{ voices: [{ beats }] }] }] }] },
    highlightPlaybackRange: vi.fn(() => calls.push('highlight')),
    applyPlaybackRangeFromHighlight: vi.fn(() => calls.push('apply')),
  };
  return { api, calls };
}

it('highlights one beat and applies it, which is what makes the engine drop its own selection', () => {
  const { api, calls } = stub();

  expect(dropPlaybackSelection(api as unknown as AlphaTab.AlphaTabApi)).toBe(true);

  // The ORDER is the whole mechanism: applying a single-beat highlight is the only public path that
  // clears AlphaTabApiBase's private _selectionStart. Applying without highlighting first would
  // apply whatever the person had selected.
  expect(calls).toEqual(['highlight', 'apply']);
  // Both arguments are the same beat — a range of one beat, which the engine reads as "no range".
  expect(api.highlightPlaybackRange).toHaveBeenCalledWith({ id: 'beat-0' }, { id: 'beat-0' });
});

it('does nothing when there is no api, no score, or no beat to aim at', () => {
  // The api is undefined until the engine module has loaded, which is a real state to be in.
  const beforeTheEngineLoads = undefined;
  expect(dropPlaybackSelection(beforeTheEngineLoads)).toBe(false);

  const { api: noScore } = stub();
  expect(
    dropPlaybackSelection({ ...noScore, score: null } as unknown as AlphaTab.AlphaTabApi),
  ).toBe(false);

  // A score whose first bar has no beats: reached on a freshly created api, before a score renders.
  const { api, calls } = stub([]);
  expect(dropPlaybackSelection(api as unknown as AlphaTab.AlphaTabApi)).toBe(false);
  expect(calls).toEqual([]);
});
