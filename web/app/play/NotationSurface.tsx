'use client';

import { Skeleton } from '@notation-hero/client';
import { useEffect, useRef, useState } from 'react';

import { useAlphaTabEngine } from '../../lib/alphatab/AlphaTabEngineContext';
import { selectDrumTrackIndexes } from '../../lib/alphatab/drum-tracks';
import { clearTrackTranspositions } from '../../lib/alphatab/live-settings';
import { useAlphaTabEvent } from '../../lib/alphatab/useAlphaTab';
import { PLAYER_ERROR } from '../../lib/player-errors';
import type { OpenNotation } from './PlayerShell';
import type * as AlphaTab from '@coderline/alphatab';
import type { RefObject } from 'react';

interface NotationSurfaceProps {
  /** The live api, or undefined until the engine has loaded. `Player` owns it. */
  api: AlphaTab.AlphaTabApi | undefined;
  /** AlphaTab's own element, from `useAlphaTab`. */
  hostRef: RefObject<HTMLDivElement | null>;
  /** The scroll box: ours. The landmark, the focus ring, the overflow, `player.scrollElement`. */
  viewportRef: RefObject<HTMLDivElement | null>;
  /** A score the person opened, already parsed by the shell. Null while the bundled beat —
   *  loaded by AlphaTab itself from settings.core.file — is the one on screen. */
  notation: OpenNotation | null;
  /** Soundfont download progress: a 0-1 fraction, or null when no fraction can be computed. */
  onSoundFontProgress: (fraction: number | null) => void;
}

/**
 * Renders an opened score onto the live api. Shared by the score effect and the re-assert guard
 * below, so both paths pick the same tracks and reset the viewport identically.
 */
function renderOpenNotation(
  api: AlphaTab.AlphaTabApi,
  notation: OpenNotation,
  viewport: HTMLDivElement | null,
): void {
  // Back to the top before the new score paints. The viewport survives score changes — it is ours,
  // not AlphaTab's — so without this, opening a short score after scrolling deep into a long one
  // leaves the person looking at blank space below the last system.
  if (viewport) viewport.scrollTop = 0;

  const drumIndexes = selectDrumTrackIndexes(notation.score.tracks);
  // INDEXES, not Track objects. Passing undefined makes AlphaTab render score.tracks[0] — its
  // FIRST track, not a "default" or preferred one. Fine here: that branch only runs when no track
  // carries a percussion staff at all, where any track is as good as another.
  // The pitches are indexed by track and live on the api, so the previous score's +2 on track 1
  // would transpose this score's track 1 — drawn AND played. It has to happen BEFORE the score
  // reaches the engine: applyPitchOffsets runs at the top of the render path, and clearing to []
  // afterwards un-stamps nothing, because the write only reaches a track whose index is inside the
  // array. Clearing first also leaves a transposition the FILE itself carries intact.
  clearTrackTranspositions(api);
  api.renderScore(notation.score, drumIndexes.length > 0 ? drumIndexes : undefined);
}

export function NotationSurface({
  api,
  hostRef,
  viewportRef,
  notation,
  onSoundFontProgress,
}: Readonly<NotationSurfaceProps>) {
  const { error: engineError } = useAlphaTabEngine();
  const [rendered, setRendered] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  // The two MUSIC-FONT failures are held apart from AlphaTab's own `error` event on purpose. A
  // finished render PROVES the font arrived — AlphaTab holds renderFinished until its font checker
  // sees the alphaTab face — so a font error is stale the moment one lands, and renderFinished
  // clears it below. It proves nothing about the SoundFont (E202): playback is still dead, so that
  // one must survive every later render. One shared state could not tell the two apart.
  const [fontError, setFontError] = useState<string | null>(null);
  const [renderedTrackCount, setRenderedTrackCount] = useState(0);
  // ReturnType<typeof globalThis.setTimeout>, not `number`: web/tsconfig.json sets no `types`
  // array, so @types/node is in scope and globalThis.setTimeout resolves to Node's overload,
  // which returns a Timeout object rather than a handle. ReturnType is correct under both.
  const timeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(undefined);
  // The score the person last asked for. It is a REF, not the `notation` closure, and it is
  // written synchronously below BEFORE renderScore — which is the whole point. renderScore fires
  // `scoreLoaded` synchronously, and useAlphaTabEvent refreshes its handler ref in an effect
  // declared after the render effect, so at that moment the handler still closes over the
  // PREVIOUS render's `notation`. Comparing against that stale value made the guard below
  // "restore" the score the person had just replaced: every open after the first updated the
  // header and then silently reverted the notation. A ref is correct the instant it is assigned.
  const wantedRef = useRef<OpenNotation | null>(null);

  // The two music-font failures AlphaTab itself never reports. Keyed on [api] because the font
  // face is injected during AlphaTabApi construction — before that there is nothing to fail.
  useEffect(() => {
    if (!api) return;

    // AlphaTab injects its music font as a CSS @font-face named `alphaTab…` during construction. If
    // that download fails, its font checker has no fallback family: it logs "rendering cannot
    // start", never fires renderFinished and raises no api.error — so the Skeleton would stay up
    // forever. The browser reports it at once, as `loadingerror` on document.fonts (verified in
    // Chromium). Text-font checkers have system fallbacks, hence the family filter.
    const onFontError = (event: FontFaceSetLoadEvent) => {
      if (event.fontfaces.some((face) => face.family.startsWith('alphaTab'))) {
        setFontError(
          `Error ${PLAYER_ERROR.musicFontFailed}: the music font could not be downloaded`,
        );
      }
    };
    document.fonts.addEventListener('loadingerror', onFontError);

    // Backstop for a download that hangs without ever failing: no event arrives, so give up after
    // 60 s. Long on purpose — the 306 KB font on a slow link must not trip it.
    timeoutRef.current = globalThis.setTimeout(
      () =>
        setFontError(
          `Error ${PLAYER_ERROR.musicFontTimeout}: the music font did not arrive within 60 seconds`,
        ),
      60_000,
    );

    return () => {
      document.fonts.removeEventListener('loadingerror', onFontError);
      globalThis.clearTimeout(timeoutRef.current);
    };
  }, [api]);

  // The SoundFont download failure surfaces through AlphaTab's own error event; the engine import
  // failure cannot (AlphaTabApi does not exist yet) and arrives through engineError below.
  useAlphaTabEvent(api, 'error', (cause) =>
    setRuntimeError(`Error ${PLAYER_ERROR.engineRuntime}: ${String(cause)}`),
  );
  // AlphaTab forwards the raw XMLHttpRequest ProgressEvent, so two numeric cases are real:
  //   - `total` is 0 when the response carries no Content-Length -> no fraction exists, so report
  //     null and let the bar render its indeterminate style.
  //   - `total` is the ENCODED length while `loaded` counts DECODED bytes when the CDN compresses,
  //     so the ratio can exceed 1 -> clamp.
  // Whether the host compresses .sf3 is unverified, so BOTH branches are reachable. This is
  // progress only; the two events that END the download are handled by the shell, because this
  // callback cannot carry the `undefined` that means "not downloading".
  useAlphaTabEvent(api, 'soundFontLoad', (progress) => {
    onSoundFontProgress(progress.total > 0 ? Math.min(1, progress.loaded / progress.total) : null);
  });
  useAlphaTabEvent(api, 'renderFinished', () => {
    globalThis.clearTimeout(timeoutRef.current);
    // A render finished, so the music font is present: drop any font error the 60 s backstop or
    // the loadingerror listener left behind, or it would pin a "reload the page" banner over a
    // score that is drawing and playable. runtimeError is NOT cleared — see its declaration.
    setFontError(null);
    setRendered(true);
    // What AlphaTab actually drew, not what we asked for. Deriving this from the index array we
    // just passed in would make it echo the request, and the drum-track assertions would pass even
    // if only track 0 were drawn. The no-percussion branch still reports 1, because renderScore
    // pushes score.tracks[0] when the index list is undefined.
    setRenderedTrackCount(api?.tracks.length ?? 0);
  });

  // The score arrives ALREADY PARSED. PlayerShell parses inside requestNotation, before it swaps
  // state, so a file that does not parse never becomes the open notation — there is no rollback
  // path to build because there is nothing to roll back. This effect only renders, and nothing is
  // destroyed: the workers and the loaded soundfont are reused, so a rejected replacement leaves
  // the playing score untouched by construction.
  useEffect(() => {
    if (!api || !notation) return;
    wantedRef.current = notation;
    renderOpenNotation(api, notation, viewportRef.current);
    // `api` is in the list because it is state: it arrives after the first commit, and a score
    // opened before it existed must still render once it does.
  }, [api, notation, viewportRef]);

  // AlphaTab fetches `settings.core.file` asynchronously and renders it WHENEVER it arrives. A
  // score the person opened during that window was therefore replaced, without a word, by the
  // bundled beat — they pressed Open, watched their file appear, and got the sample back. Verified
  // by opening Punk.gp immediately after load: the api held the bundled track eight seconds later.
  //
  // Re-assert ours whenever AlphaTab loads a score that is not the one the person opened. This
  // terminates: `_internalRenderTracks` triggers `scoreLoaded` only when the score actually
  // changed, so the re-render below fires the event once more and the identity guard returns.
  useAlphaTabEvent(api, 'scoreLoaded', () => {
    const wanted = wantedRef.current;
    if (!api || !wanted || api.score === wanted.score) return;
    renderOpenNotation(api, wanted, viewportRef.current);
  });

  const failure = engineError
    ? `Error ${PLAYER_ERROR.engineImport}: ${engineError.message}`
    : (runtimeError ?? fontError);

  return (
    // Fills whatever the shell gives it — the shell owns the height now, not this component. It
    // used to pin its own 420 px, which is exactly what stopped the player being full-height.
    <div className="relative h-full w-full">
      {/* The message sits ON TOP of the viewport, never in place of it. Replacing the viewport
          unmounts the element AlphaTab is bound to while the api is still alive, and the engine
          then renders into a detached node — with no error anywhere. Every state of this
          component keeps both divs below mounted. */}
      {failure ? (
        <p
          data-testid="engine-error"
          role="alert"
          className="absolute inset-x-0 top-0 z-10 rounded-md border border-destructive/25 bg-[color-mix(in_oklab,var(--destructive)_10%,var(--popover))] p-4 text-destructive"
        >
          The player engine could not start. Reload the page to try again. ({failure})
        </p>
      ) : null}
      {/* The Skeleton covers BOTH the engine import and the music-font fetch, and lifts on the
          first renderFinished: AlphaTab holds that event until its own font checker sees the
          `alphaTab` face load (there is no font wait in loadAlphaTabEngine). Dismissing
          it earlier leaves the notation area blank for exactly the window it exists to cover. */}
      {!failure && !rendered ? (
        <Skeleton
          data-testid="notation-skeleton"
          className="absolute inset-0 h-full w-full"
          aria-label="Loading notation"
          role="status"
        />
      ) : null}
      {/* TWO divs, not one. The outer one is the app's: the scroll box, the landmark and the focus
          ring. The inner one belongs to AlphaTab, which rewrites its children and sets its own
          inline styles on it (`position: relative`, verified in alphaTab.core.mjs:41328).
          Coupling our a11y markup to that element means any AlphaTab styling change lands on our
          scroll box. The fork splits them the same way (AlphaTabRhythmGame/index.tsx:416-417). */}
      {/* `bg-white`, deliberately NOT a token. AlphaTab draws notation as dark glyphs and this
          player never sets `model.Color`, so a theme-following surface would make the score
          invisible in dark mode. This is the one place in the player that pins a literal colour;
          it stops being correct the moment the glyph colour becomes themeable (NH-302). */}
      {/* A named region a keyboard user can focus. `tabIndex={0}` is required: a score taller than
          the window makes this box scroll, and axe's scrollable-region-focusable (serious, wcag2a)
          fails a scroll box with nothing focusable inside, whatever its role. `region`, not `img`:
          the notation takes mouse input (AlphaTab moves the cursor and selects bars on click) and
          needs keyboard control too, and an `img`'s children are presentational. Never `aria-label`
          without a role — on a plain div that fails axe's aria-prohibited-attr (serious). The focus
          ring copies client/'s ScrollArea viewport, which solved the same axe rule, but INSET: this
          box is flush against the window edges now, so an outward ring is clipped away by the
          shell's `overflow-hidden` on three sides and there is nothing left to see. The
          accessibility gate audits the scrolling state with Punk.gp. */}
      {/* `isolate` keeps AlphaTab's cursor layer inside this box. The engine sets
          `.at-cursors` to z-index 1000, and nothing between that div and the page
          creates a stacking context, so the bar highlight and the beat line paint
          over the settings popover. */}
      <div
        ref={viewportRef}
        data-testid="notation-surface"
        role="region"
        aria-label="Score"
        tabIndex={0}
        className="isolate h-full w-full overflow-y-auto bg-white outline-none transition-[color,box-shadow] focus-visible:inset-ring-[3px] focus-visible:inset-ring-ring/50 focus-visible:-outline-offset-1 focus-visible:outline-1"
      >
        <div ref={hostRef} />
      </div>
      <span data-testid="rendered-track-count" className="sr-only">
        {renderedTrackCount}
      </span>
    </div>
  );
}
