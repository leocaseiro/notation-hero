/**
 * The shape this module needs from an AlphaTab `Track`. Declared structurally rather than imported,
 * so this file stays free of `@coderline/alphatab` and is trivially testable with plain objects.
 */
export interface PercussionScannable {
  index: number;
  staves: readonly { isPercussion: boolean }[];
}

/**
 * Indexes of the tracks that carry a percussion staff.
 *
 * An empty result is NOT an error: a score with no percussion staff renders `score.tracks[0]` —
 * AlphaTab's FIRST track, not a "default" or preferred one — which is what omitting the
 * `trackIndexes` argument to `renderScore` already does. The app leads with drums but must not turn
 * any other musician away: a guitar or piano score opens and plays instead of showing a dead end.
 *
 * `Track` also exposes its own `isPercussion` getter in 1.8.4; this reads the staves directly
 * because that is the rule the design settled on and it survives a change to the getter.
 */
export function selectDrumTrackIndexes(tracks: readonly PercussionScannable[]): number[] {
  return tracks
    .filter((track) => track.staves.some((staff) => staff.isPercussion))
    .map((t) => t.index);
}
