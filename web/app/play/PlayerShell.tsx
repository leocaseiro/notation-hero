'use client';

import { Button } from '@notation-hero/client';
import { useRef, useState } from 'react';

import {
  AlphaTabEngineProvider,
  useAlphaTabEngine,
} from '../../lib/alphatab/AlphaTabEngineContext';
import { useAlphaTab, useAlphaTabEvent } from '../../lib/alphatab/useAlphaTab';
import { NotationSurface } from './NotationSurface';

/** A score held in memory. The bytes never touch disk and never cross a route. */
export interface LoadedNotation {
  name: string;
  bytes: Uint8Array;
}

/**
 * The score that ships with the app. The player ALWAYS has a score open (decided 2026-09-18):
 * this one loads when nothing else is cached, which is why there is no empty state anywhere in
 * the player and why the notation box is mounted for the whole life of the page.
 */
const SAMPLE_NOTATION = '/notation/1-beat.gp';

function Player() {
  const { engine } = useAlphaTabEngine();
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

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

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 p-6">
      <h1 className="sr-only">Player</h1>
      <NotationSurface api={api} hostRef={hostRef} viewportRef={viewportRef} />
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
            they just used. The dimming and pointer-events rules ship in buttonVariants too, so the
            className carries only this button's own size and colour. */}
        <Button
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
      </div>
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
