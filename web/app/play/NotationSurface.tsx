'use client';

import { Skeleton } from '@notation-hero/client';
import { useEffect, useRef, useState } from 'react';

import { useAlphaTabEngine } from '../../lib/alphatab/AlphaTabEngineContext';
import { useAlphaTabEvent } from '../../lib/alphatab/useAlphaTab';
import { PLAYER_ERROR } from '../../lib/player-errors';
import type * as AlphaTab from '@coderline/alphatab';
import type { RefObject } from 'react';

interface NotationSurfaceProps {
  /** The live api, or undefined until the engine has loaded. `Player` owns it. */
  api: AlphaTab.AlphaTabApi | undefined;
  /** AlphaTab's own element, from `useAlphaTab`. */
  hostRef: RefObject<HTMLDivElement | null>;
  /** The scroll box: ours. The landmark, the focus ring, the overflow, `player.scrollElement`. */
  viewportRef: RefObject<HTMLDivElement | null>;
}

export function NotationSurface({ api, hostRef, viewportRef }: Readonly<NotationSurfaceProps>) {
  const { error: engineError } = useAlphaTabEngine();
  const [rendered, setRendered] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  // ReturnType<typeof globalThis.setTimeout>, not `number`: web/tsconfig.json sets no `types`
  // array, so @types/node is in scope and globalThis.setTimeout resolves to Node's overload,
  // which returns a Timeout object rather than a handle. ReturnType is correct under both.
  const timeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(undefined);

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
        setRuntimeError(
          `Error ${PLAYER_ERROR.musicFontFailed}: the music font could not be downloaded`,
        );
      }
    };
    document.fonts.addEventListener('loadingerror', onFontError);

    // Backstop for a download that hangs without ever failing: no event arrives, so give up after
    // 60 s. Long on purpose — the 306 KB font on a slow link must not trip it.
    timeoutRef.current = globalThis.setTimeout(
      () =>
        setRuntimeError(
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
  useAlphaTabEvent(api, 'renderFinished', () => {
    globalThis.clearTimeout(timeoutRef.current);
    setRendered(true);
  });

  const failure = engineError
    ? `Error ${PLAYER_ERROR.engineImport}: ${engineError.message}`
    : runtimeError;

  return (
    <div className="relative min-h-[420px] w-full">
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
          420 px makes this box scroll, and axe's scrollable-region-focusable (serious, wcag2a) fails
          a scroll box with nothing focusable inside, whatever its role. `region`, not `img`: the
          notation takes mouse input (AlphaTab moves the cursor and selects bars on click) and needs
          keyboard control too, and an `img`'s children are presentational. Never `aria-label`
          without a role — on a plain div that fails axe's aria-prohibited-attr (serious). The focus
          ring copies client/'s ScrollArea viewport, which solved the same axe rule. The
          accessibility gate audits the scrolling state with Punk.gp. */}
      <div
        ref={viewportRef}
        data-testid="notation-surface"
        role="region"
        aria-label="Score"
        tabIndex={0}
        className="h-[420px] w-full overflow-y-auto rounded-md border border-border bg-white outline-none transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
      >
        <div ref={hostRef} />
      </div>
    </div>
  );
}
