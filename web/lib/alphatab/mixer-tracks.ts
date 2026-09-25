import type { TrackStaffState } from '@notation-hero/client';

/**
 * The shape this module needs from an AlphaTab `Staff`. Declared structurally rather than
 * imported, so this file stays free of `@coderline/alphatab` and is trivially testable with plain
 * objects — the pattern `drum-tracks.ts` already uses.
 */
export interface StaffScannable {
  bars: readonly { clef: number }[];
  showStandardNotation: boolean;
  showSlash: boolean;
  showNumbered: boolean;
  showTablature: boolean;
  isPercussion: boolean;
  tuning: readonly number[];
}

/** The shape this module needs from an AlphaTab `Track`. */
export interface TrackScannable {
  index: number;
  name: string;
  playbackInfo: { volume: number };
  staves: readonly StaffScannable[];
}

export interface MixerTrack {
  index: number;
  name: string;
  volume: number;
  solo: boolean;
  mute: boolean;
  transposeAudio: number;
  transposeFull: number;
  expanded: boolean;
  /**
   * True when ANY staff on this track is percussion. A drum "pitch" is an instrument identifier,
   * not a note, so transposing one is meaningless — the row's expand control locks on this flag.
   * `tablatureAvailable` on `TrackStaffState` cannot stand in for it: that is false for
   * percussion, piano AND vocal alike, so it cannot tell a caller the track is drums.
   */
  isPercussion: boolean;
  staves: TrackStaffState[];
}

export const trackName = (track: { name: string; index: number }): string => {
  const name = track.name.trim();
  // Guitar Pro leaves the name blank and puts the same placeholder short name on every track.
  // A numbered label is the name the row can show.
  return name || `Track ${track.index + 1}`;
};

/**
 * `clefTreble`/`clefBass` are AlphaTab's own `Clef.G2`/`Clef.F4` numbers, read from the loaded
 * engine namespace by the caller — never hand-copied here. Passing `undefined` for either (the
 * engine has not loaded yet) simply means no bar's clef can match, so every staff reads
 * `Staff N`, which is also the label AlphaTab-shaped decoding cannot avoid.
 */
export const staffLabel = (
  staff: { bars: readonly { clef: number }[] },
  staffIndex: number,
  clefTreble?: number,
  clefBass?: number,
): string => {
  // The clef lives on the bar. A grand staff is named by its two clefs; everything else stays
  // "Staff N", which is the name TrackRow's own contract documents.
  const clef = staff.bars[0]?.clef;
  if (clef === clefTreble) return 'Treble';
  if (clef === clefBass) return 'Bass';
  return `Staff ${staffIndex + 1}`;
};

// Plain data at the boundary, so nothing downstream holds an AlphaTab object in React state.
export const toMixerTrack = (
  track: TrackScannable,
  clefTreble?: number,
  clefBass?: number,
): MixerTrack => ({
  index: track.index,
  name: trackName(track),
  volume: track.playbackInfo.volume,
  solo: false,
  mute: false,
  transposeAudio: 0,
  transposeFull: 0,
  expanded: false,
  // Reads the staves directly, the same rule selectDrumTrackIndexes (drum-tracks.ts) settled on
  // over Track's own `isPercussion` getter: it survives a change to the getter.
  isPercussion: track.staves.some((staff) => staff.isPercussion),
  staves: track.staves.map((staff, staffIndex) => ({
    id: `${track.index}-${staffIndex}`,
    label: staffLabel(staff, staffIndex, clefTreble, clefBass),
    showStandardNotation: staff.showStandardNotation,
    showSlash: staff.showSlash,
    showNumbered: staff.showNumbered,
    showTablature: staff.showTablature,
    // The pinned AlphaTab forces showTablature=false on any percussion staff and requires a
    // tuning, so the toggle is offered only where it can actually do something.
    tablatureAvailable: !staff.isPercussion && staff.tuning.length > 0,
  })),
});
