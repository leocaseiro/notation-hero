import { describe, expect, it } from 'vitest';

import { staffLabel, toMixerTrack, trackName } from './mixer-tracks';
import type { StaffScannable, TrackScannable } from './mixer-tracks';

const CLEF_TREBLE = 4; // G2, per AlphaTab's own Clef enum
const CLEF_BASS = 3; // F4

const staff = (overrides: Partial<StaffScannable> = {}): StaffScannable => ({
  bars: [{ clef: CLEF_TREBLE }],
  showStandardNotation: true,
  showSlash: false,
  showNumbered: false,
  showTablature: false,
  isPercussion: false,
  tuning: [],
  ...overrides,
});

const track = (overrides: Partial<TrackScannable> = {}): TrackScannable => ({
  index: 0,
  name: '',
  playbackInfo: { volume: 12 },
  staves: [staff()],
  ...overrides,
});

describe('trackName', () => {
  it('falls back to a numbered label when the file leaves the name blank', () => {
    expect(trackName({ name: '  ', index: 2 })).toBe('Track 3');
  });

  it('keeps the file name when one is present', () => {
    expect(trackName({ name: 'Distortion Guitar', index: 1 })).toBe('Distortion Guitar');
  });
});

describe('staffLabel', () => {
  it('names a two-staff grand staff by its clefs', () => {
    expect(staffLabel(staff({ bars: [{ clef: CLEF_TREBLE }] }), 0, CLEF_TREBLE, CLEF_BASS)).toBe(
      'Treble',
    );
    expect(staffLabel(staff({ bars: [{ clef: CLEF_BASS }] }), 1, CLEF_TREBLE, CLEF_BASS)).toBe(
      'Bass',
    );
  });

  it('falls back to "Staff N" for a clef that names neither treble nor bass', () => {
    expect(staffLabel(staff({ bars: [{ clef: 0 }] }), 2, CLEF_TREBLE, CLEF_BASS)).toBe('Staff 3');
  });

  it('falls back to "Staff N" when the engine has not loaded, so no clef can match', () => {
    expect(staffLabel(staff({ bars: [{ clef: CLEF_TREBLE }] }), 0)).toBe('Staff 1');
  });
});

describe('toMixerTrack', () => {
  it("starts a track's volume at the file's own playbackInfo.volume", () => {
    const mixerTrack = toMixerTrack(track({ playbackInfo: { volume: 9 } }), CLEF_TREBLE, CLEF_BASS);
    expect(mixerTrack.volume).toBe(9);
    expect(mixerTrack.solo).toBe(false);
    expect(mixerTrack.mute).toBe(false);
  });

  // NH-291: transposition is meaningless on a drum "pitch" (an instrument identifier, not a
  // note) and the row locks its expand control on this track-level flag — tablatureAvailable
  // cannot stand in for it, since that is false for percussion, piano AND vocal alike.
  it('flags a track as percussion when its one staff is', () => {
    const mixerTrack = toMixerTrack(
      track({ staves: [staff({ isPercussion: true })] }),
      CLEF_TREBLE,
      CLEF_BASS,
    );
    expect(mixerTrack.isPercussion).toBe(true);
  });

  it('leaves a non-percussion track unflagged', () => {
    const mixerTrack = toMixerTrack(
      track({ staves: [staff({ isPercussion: false })] }),
      CLEF_TREBLE,
      CLEF_BASS,
    );
    expect(mixerTrack.isPercussion).toBe(false);
  });

  it('flags a track as percussion when only ONE of several staves is — matching selectDrumTrackIndexes', () => {
    const mixerTrack = toMixerTrack(
      track({ staves: [staff({ isPercussion: false }), staff({ isPercussion: true })] }),
      CLEF_TREBLE,
      CLEF_BASS,
    );
    expect(mixerTrack.isPercussion).toBe(true);
  });

  it('marks a percussion staff as unavailable for tablature regardless of tuning', () => {
    const mixerTrack = toMixerTrack(
      track({ staves: [staff({ isPercussion: true, tuning: [40, 45, 50, 55, 59, 64] })] }),
      CLEF_TREBLE,
      CLEF_BASS,
    );
    expect(mixerTrack.staves[0]?.tablatureAvailable).toBe(false);
  });

  it('marks a six-string staff as available for tablature', () => {
    const mixerTrack = toMixerTrack(
      track({ staves: [staff({ isPercussion: false, tuning: [40, 45, 50, 55, 59, 64] })] }),
      CLEF_TREBLE,
      CLEF_BASS,
    );
    expect(mixerTrack.staves[0]?.tablatureAvailable).toBe(true);
  });

  it('labels each staff of a three-staff track by its own clef, falling back to its position', () => {
    const mixerTrack = toMixerTrack(
      track({
        staves: [
          staff({ bars: [{ clef: CLEF_TREBLE }] }),
          staff({ bars: [{ clef: CLEF_BASS }] }),
          staff({ bars: [{ clef: 0 }] }), // Neutral — names neither treble nor bass
        ],
      }),
      CLEF_TREBLE,
      CLEF_BASS,
    );
    expect(mixerTrack.staves.map((s) => s.label)).toEqual(['Treble', 'Bass', 'Staff 3']);
  });
});
