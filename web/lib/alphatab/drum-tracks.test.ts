import { describe, expect, it } from 'vitest';

import { selectDrumTrackIndexes } from './drum-tracks';

const staff = (isPercussion: boolean) => ({ isPercussion });

describe('selectDrumTrackIndexes', () => {
  it("returns every percussion track, not just the first — Punk.gp's shape", () => {
    // Punk.gp parses to three tracks: 0:Drumkit (percussion), 1:Distortion Guitar (not),
    // 2:Drumkit Left (percussion). A regression that kept only track 0 would silently drop
    // the left-hand staff, which is exactly why that fixture exists.
    expect(
      selectDrumTrackIndexes([
        { index: 0, staves: [staff(true)] },
        { index: 1, staves: [staff(false)] },
        { index: 2, staves: [staff(true)] },
      ]),
    ).toEqual([0, 2]);
  });

  it('returns an empty array when no track has a percussion staff', () => {
    // NOT an error: the caller passes undefined to renderScore, which renders score.tracks[0].
    expect(selectDrumTrackIndexes([{ index: 0, staves: [staff(false)] }])).toEqual([]);
  });

  it('counts a track whose percussion staff is not the first one', () => {
    expect(selectDrumTrackIndexes([{ index: 0, staves: [staff(false), staff(true)] }])).toEqual([
      0,
    ]);
  });
});
