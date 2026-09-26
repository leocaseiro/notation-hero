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
  /**
   * AlphaTab stores this NEGATED: the engine's own `applyPitchOffsets` does
   * `staff.transpositionPitch = -settings.notation.transpositionPitches[i]`, and the alphaTex
   * importer does `staff.transpositionPitch = value * -1` for `\transpose`. So a file that asks
   * for "up two semitones" arrives here as -2. `toMixerTrack` negates it back to the number the
   * row's slider shows.
   */
  transpositionPitch: number;
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

// The row's starting Transpose notation value: the file's own, read back from the staff. A track
// whose staves disagree cannot happen through this app — both the engine's applyPitchOffsets and
// setTrackTransposition write every staff of a track at once — so the first staff speaks for it.
const transposeStart = (track: TrackScannable): number => {
  const stored = track.staves[0]?.transpositionPitch ?? 0;
  return stored === 0 ? 0 : -stored;
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
  // Seeded from the FILE, not from 0. The engine keeps a file-carried transposition on the staff
  // (negated — see StaffScannable.transpositionPitch), and the Transpose notation row is the only
  // editor for it. Starting at 0 made the row lie about the open file and, worse, turned a return
  // to 0 into an erase: measured on a file carrying `\transpose 2`, nudging the slider up one and
  // back down left the staff at 0, losing the file's value with no way back but reopening.
  // `=== 0` rather than a bare negation: -(0) is -0, which reads as a bug in stored state.
  transposeFull: transposeStart(track),
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
