import { describe, expect, it } from 'vitest';
import { toDifficulty } from './catalog.util';

describe('toDifficulty (N-14 bands: Debut 0 · Beginner 1-3 · Intermediate 4-6 · Advanced 7-8 · Expert 9-10)', () => {
  it.each([
    [0, 'Debut'],
    [1, 'Beginner 1'],
    [3, 'Beginner 3'],
    [4, 'Intermediate 4'],
    [6, 'Intermediate 6'],
    [7, 'Advanced 7'],
    [8, 'Advanced 8'],
    [9, 'Expert 9'],
    [10, 'Expert 10'],
    [null, 'Ungraded'],
  ])('level %s -> %s', (level, expected) => {
    expect(toDifficulty(level)).toBe(expected);
  });
});
