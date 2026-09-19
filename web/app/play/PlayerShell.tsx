'use client';

import { Button, toast } from '@notation-hero/client';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  AlphaTabEngineProvider,
  useAlphaTabEngine,
} from '../../lib/alphatab/AlphaTabEngineContext';
import { loadAlphaTabEngine } from '../../lib/alphatab/engine';
import { useAlphaTab, useAlphaTabEvent } from '../../lib/alphatab/useAlphaTab';
import { PLAYER_ERROR } from '../../lib/player-errors';
import { NotationSurface } from './NotationSurface';
import { OpenFileControl, readFailureMessage, readNotation } from './OpenFileControl';
import type * as AlphaTab from '@coderline/alphatab';

/** What the picker produces: a file read into memory, not yet parsed. */
export interface LoadedNotation {
  name: string;
  bytes: Uint8Array;
}

/** What the player holds: a name and the PARSED score. */
export interface OpenNotation {
  name: string;
  score: AlphaTab.model.Score;
}

/**
 * The score that ships with the app. The player ALWAYS has a score open (decided 2026-09-18),
 * which is why there is no empty state anywhere in the player and why the notation box is mounted
 * for the whole life of the page.
 *
 * Today this one ALWAYS loads: remembering the last score played is its own ticket (NH-303), so
 * there is no cache to consult and no branch here to choose between them.
 */
const SAMPLE_NOTATION = '/notation/1-beat.gp';

function Player() {
  const { engine } = useAlphaTabEngine();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [notation, setNotation] = useState<OpenNotation | null>(null);

  // The open succeeded — say so, and put focus where the person goes next. Both live on the shell
  // because the shell is what knows an open finished; the picker only hands over bytes.
  const [announcement, setAnnouncement] = useState('');
  const playRef = useRef<HTMLButtonElement | null>(null);

  // The ONE owner of the api. There is no second apiRef and no onApiReady callback: a callback
  // prop in the hook's dependency list rebuilds the engine on an ordinary state change, throwing
  // away the loaded score, the downloaded soundfont and both workers.
  //
  // `alphaTab` is the namespace object the hook passes in — the self-hosted-ESM delivery decision
  // forbids importing it, so this is the only way a call site reaches an enum.
  const [api, hostRef] = useAlphaTab((settings, alphaTab) => {
    // No settings.core.scriptFile. AlphaTab finds its own worker and worklet relative to
    // /alphatab/esm/alphaTab.mjs — that is the entire point of self-hosting the ESM.
    // fontDirectory, logLevel and soundFont are already applied by setAlphaTabDefaults().
    settings.core.file = SAMPLE_NOTATION;
    settings.core.tracks = 'all';
    // EnabledAutomatic on purpose (2026-09-16): a Guitar Pro file that embeds an audio track plays
    // that recording, with the notation on screen — that is how this player plays along to a
    // person's own files. AlphaTab resolves EnabledAutomatic to its backing-track player whenever
    // `score.backingTrack.rawAudioFile` exists, and that player's synthesizer stubs out
    // channelSetMute, channelSetSolo, channelSetMixVolume and the metronome channel (verified in
    // 1.8.4). Nothing here drives those, but the transport's metronome and count-in and the mixer
    // rows MUST render disabled, with a tooltip saying the file is playing its own recording
    // (spec §4). A toggle between the recording and the synth is deferred (NH-298).
    //
    // It also keeps the empty page cheap: with EnabledAutomatic and no score yet, AlphaTab creates
    // no player at all — no AudioContext, no synth worker, no soundfont fetch
    // (alphaTab.core.mjs:46680-46685).
    settings.player.playerMode = alphaTab.PlayerMode.EnabledAutomatic;
    settings.player.enableCursor = true;
    settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
    // The OUTER div scrolls — never AlphaTab's own element. This runs inside the hook's effect,
    // after both divs are committed, so the ref is filled; the `if` is for the type, and because
    // `@typescript-eslint/no-non-null-assertion` is not worth fighting over one line.
    if (viewportRef.current) settings.player.scrollElement = viewportRef.current;
    // Ten pixels of air above the cursor, so it does not sit flush against the top edge. The
    // fork sets the same (AlphaTabRhythmGame/index.tsx:151).
    settings.player.scrollOffsetY = -10;
  });

  // Both subscriptions go through the helper, so each one is removed when this component
  // unmounts or the api changes. No `.on()` by hand anywhere in the app.
  //
  // PlayerState is an AlphaTab enum and cannot be imported; read it off the namespace object
  // instead of comparing against the literal 1, which would rot if the ordering ever changed.
  useAlphaTabEvent(api, 'playerStateChanged', (args) => {
    setPlaying(args.state === engine?.synth.PlayerState.Playing);
  });
  // `playerReady`, not `soundFontLoaded`: 1.8.4 builds soundFontLoaded as a bare `new EventEmitter()`,
  // so it fires once and is never replayed — a subscription that lands one commit after the api was
  // constructed can miss it and latch Play disabled forever. `api.playerReady` returns the player
  // wrapper's `readyForPlayback`, built as `new EventEmitter(() => this.isReadyForPlayback)`, which
  // reports the current value to a late subscriber.
  useAlphaTabEvent(api, 'playerReady', () => setPlayerReady(true));

  // Parse BEFORE any state change — the staged load spec §4 specifies. A file that does not parse
  // never becomes the open notation, so the score on screen is untouched by construction and
  // there is no rollback path to build.
  const requestNotation = useCallback(
    async (file: LoadedNotation) => {
      let at = engine;
      if (!at) {
        // Opened before the engine arrived — a very fast pick, or a stalled engine import. Wait on
        // the SAME memoised import the provider is waiting on. The sample score is already on
        // screen, so there is nothing to fill and nothing to hide.
        at = await loadAlphaTabEngine().catch(() => null);
        // The engine failed; that failure is reported by the engine-error message, not by a toast.
        if (!at) return;
      }

      let score: AlphaTab.model.Score;
      try {
        score = at.importer.ScoreLoader.loadScoreFromBytes(file.bytes);
      } catch {
        toast.error(
          `${file.name} could not be opened — it is not a score format the player reads. (Error ${PLAYER_ERROR.notAScore})`,
        );
        return;
      }

      setNotation({ name: file.name, score });
      // Success only. Neither line runs on the parse failure above, on the read failures the
      // picker catches, or for the bundled score — nobody asked for that one, so nothing is
      // announced and nothing is focused at page load.
      setAnnouncement(`Opened ${file.name}`);
      playRef.current?.focus();
    },
    [engine],
  );

  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);
  const endDrag = useCallback(() => {
    depth.current = 0;
    setDragging(false);
  }, []);

  // Same boundary as OpenFileControl's `accept`: the 25 MB check, then the same failure toast
  // (E101 or E102). Without the try/catch, `void acceptDropped(...)` would hide a rejected read
  // and show nothing.
  const acceptDropped = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      try {
        await requestNotation(await readNotation(file));
      } catch {
        toast.error(readFailureMessage(file));
      }
    },
    [requestNotation],
  );

  // A cancelled drag (Esc, or releasing outside the window) fires NO further drag event, so the
  // counter never unwinds and the overlay would stay up forever. Pointer events are suppressed for
  // the duration of a drag, so the first pointermove afterwards is a reliable "it is over" signal
  // and does not fire mid-drag.
  useEffect(() => {
    const onEnd = () => {
      if (depth.current !== 0) endDrag();
    };
    globalThis.addEventListener('dragend', onEnd);
    globalThis.addEventListener('pointermove', onEnd);
    return () => {
      globalThis.removeEventListener('dragend', onEnd);
      globalThis.removeEventListener('pointermove', onEnd);
    };
  }, [endDrag]);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
      <h1 className="sr-only">Player</h1>

      {/* A dragenter/dragleave COUNTER, never a bare setDragging(false). `dragleave` also fires on
          the container whenever the pointer crosses into a CHILD, with relatedTarget set to that
          child, so the naive form cannot tell "left for a child" from "left the surface" — measured
          14 state transitions on one drag across the control, a visible strobe. Clamped at 0 so a
          stray leave cannot make the next enter a no-op. */}
      <section
        className="relative flex flex-col gap-4"
        data-dragging={dragging || undefined}
        onDragEnter={(event) => {
          event.preventDefault();
          depth.current += 1;
          setDragging(true);
        }}
        onDragLeave={() => {
          depth.current = Math.max(0, depth.current - 1);
          setDragging(depth.current > 0);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (event.dataTransfer) event.dataTransfer.dropEffect = 'link';
        }}
        onDrop={(event) => {
          event.preventDefault();
          endDrag();
          // One file, no extension filter — the same size gate and the same failure toasts
          // the picker uses. ScoreLoader sniffs content, so a filter here would buy nothing.
          void acceptDropped(event.dataTransfer.files[0]);
        }}
      >
        <div className="relative">
          {/* NotationSurface is ALWAYS mounted — it renders its own engine-error message as an
              overlay. Do not reintroduce a branch that renders something INSTEAD of it: unmounting
              the box while the api is alive leaves AlphaTab drawing into a detached node, with no
              error raised anywhere. When the engine never loaded, nothing can open or play, and the
              Play button stays where it is, disabled (spec §4). */}
          <NotationSurface
            api={api}
            hostRef={hostRef}
            viewportRef={viewportRef}
            notation={notation}
          />
          {dragging ? (
            /* MUST be a descendant of the drop container AND pointer-events-none. An overlay
               mounted outside the container oscillated forever: every dragleave's relatedTarget was
               the overlay, which is not a descendant, so no matching dragenter ever arrived inside
               and the counter could not balance. aria-hidden is deliberate — it is decorative
               during a pointer gesture, and the keyboard path is the labelled Open file button. */
            <div
              aria-hidden
              className="nh-drop-overlay pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-primary" aria-hidden="true">
                upload
              </span>
              <p className="text-lg font-semibold text-foreground">Drop to open</p>
              <p className="text-sm text-foreground opacity-75">
                Guitar Pro, MusicXML, Capella or alphaTex
              </p>
            </div>
          ) : null}
        </div>

        <div
          data-testid="player-status"
          data-playing={playing}
          data-player-ready={playerReady}
          className="flex items-center gap-3"
        >
          {/* Play stays unavailable until the synth is ready (spec §4). size-11 = the 44px minimum
              hit area; the glyph keeps its drawn size. This is NOT client/'s PlayButton — that one
              is the catalog row's control and has no pause state. */}
          {/* `disabled` here renders `aria-disabled="true"`, never the native attribute, and the
              design system blocks activation itself — so no guard belongs at this call site. That
              matters because a natively disabled button cannot receive focus, and opening a file
              moves focus to this button: while the engine is still loading, a native `disabled`
              would make that focus call a silent no-op and strand the person's focus on the control
              they just used. The dimming and pointer-events rules ship in buttonVariants too, so
              the className carries only this button's own size and colour. */}
          <Button
            ref={playRef}
            data-testid="transport-play"
            size="icon"
            variant="ghost"
            aria-label={playing ? 'Pause' : 'Play'}
            disabled={!playerReady}
            onClick={() => api?.playPause()}
            className="size-11 rounded-full text-primary"
          >
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 34 }}>
              {playing ? 'pause_circle' : 'play_circle'}
            </span>
          </Button>
          {/* Permanent, never conditional. The control sits beside Play for the whole life of the
              page: a score is always open, so there is no other place for it to live, the replace
              tests always find `open-file-input`, and the person's focus is never moved by a
              control disappearing out from under them. */}
          <OpenFileControl onNotation={requestNotation} />
        </div>

        {/* Visually hidden, and polite so it waits for a gap rather than cutting the reader off. It
            is mounted for the whole life of the page: a live region added to the DOM at the same
            moment its text appears is not announced at all — the region has to be there first.
            Empty until the first successful open, and that open is the only thing that writes to
            it. */}
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </section>
    </main>
  );
}

export function PlayerShell() {
  return (
    <AlphaTabEngineProvider>
      <Player />
    </AlphaTabEngineProvider>
  );
}
