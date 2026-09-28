import type * as AlphaTab from '@coderline/alphatab';

/**
 * Drops the bar selection the ENGINE holds — which is NOT the same thing as the playback range the
 * app can see and set.
 *
 * `api.playbackRange` is the loop the sequencer plays. Separately, AlphaTabApiBase keeps a private
 * `_selectionStart`/`_selectionEnd` pair holding the actual BEAT OBJECTS a person dragged across,
 * and it re-applies them after EVERY render:
 *
 *     // AlphaTabApiBase._onPostRenderFinished
 *     if (this._selectionStart) {
 *       this.highlightPlaybackRange(this._selectionStart.beat, this._selectionEnd!.beat);
 *     }
 *
 * Setting `playbackRange = null` does not touch that pair, and neither does the public
 * `clearPlaybackRangeHighlight()` — measured, it clears the markers and leaves the beats. So after
 * any render where the selected beat loses its layout box, the highlighter looks that beat up in the
 * new bounds and dereferences `undefined.realBounds`. Two ordinary actions reach it: opening another
 * file, and unticking the very track the selection sits on. Both threw before this existed, in an
 * uncaught way nothing in the lane noticed (NH-291).
 *
 * The clearing route is obscure because the engine exposes no direct one. `applyPlaybackRangeFromHighlight`
 * has a branch for "the highlight is a single beat, so there is no range", and that branch is the only
 * public path that assigns `_selectionStart = undefined`. Reaching it means highlighting one beat and
 * applying it: the engine then clears its own pair, sets `playbackRange` to null and wipes the markers.
 * Any beat of the CURRENT score serves, because nothing is played from it — it is thrown away in the
 * same call.
 *
 * Call this BEFORE the render that invalidates the selection, never after: afterwards the throw has
 * already happened.
 *
 * @returns whether a selection was cleared — false when there is no score or no beat to aim at.
 */
export function dropPlaybackSelection(api: AlphaTab.AlphaTabApi | undefined): boolean {
  const beat = api?.score?.tracks[0]?.staves[0]?.bars[0]?.voices[0]?.beats[0];
  if (!api || !beat) return false;
  api.highlightPlaybackRange(beat, beat);
  api.applyPlaybackRangeFromHighlight();
  return true;
}
