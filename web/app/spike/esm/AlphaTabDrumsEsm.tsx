'use client';

/**
 * SPIKE variant B — AlphaTab loaded as SELF-HOSTED ESM from `public/`, never bundled by Turbopack.
 *
 * Variant A (`../AlphaTabDrums.tsx`) lets Turbopack bundle `@coderline/alphatab` and repairs the
 * broken worker lookup with `settings.core.scriptFile`. That works, but ships AlphaTab TWICE:
 * ~276 KB gzip inside the app chunk plus ~273 KB gzip as the classic build the blob workers
 * `importScripts()`.
 *
 * This variant imports the library at runtime through a `/* turbopackIgnore: true *\/` dynamic
 * import, so the browser — not the bundler — resolves it. `import.meta.url` inside the module is
 * then a real http URL, `Environment.webPlatform` becomes `BrowserModule`, and AlphaTab takes its
 * native `new Worker(new URL('./alphaTab.worker.mjs', import.meta.url), { type: 'module' })` path.
 * One copy, real module workers, no `scriptFile` override.
 */

// Type-only: erased at build time, so this does NOT pull the library into the bundle.
import { useEffect, useRef, useState } from 'react';
import type * as AlphaTab from '@coderline/alphatab';

type AlphaTabModule = typeof AlphaTab;

/** Served from `web/public/alphatab/esm/` — see the copy step in the findings doc. */
const ALPHATAB_ESM_URL = '/alphatab/esm/alphaTab.mjs';

const lifecycle = { mounts: 0, disposes: 0 };

export function AlphaTabDrumsEsm() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<AlphaTab.AlphaTabApi | null>(null);

  const [status, setStatus] = useState('booting');
  const [lastError, setLastError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [soundFontLoaded, setSoundFontLoaded] = useState(false);
  const [platform, setPlatform] = useState('unknown');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    lifecycle.mounts += 1;
    (globalThis as unknown as { __spikeLifecycle?: typeof lifecycle }).__spikeLifecycle = lifecycle;

    let api: AlphaTab.AlphaTabApi | undefined;
    let disposed = false;

    void (async () => {
      // The specifier is a runtime URL, not a package. It must be a VARIABLE, not a string
      // literal: a literal makes `tsc` try to resolve it at compile time and fail with
      // "Cannot find module '/alphatab/esm/alphaTab.mjs'". Holding it in a variable also stops
      // Turbopack from statically analysing (and therefore bundling) it — which is the goal here.
      const alphaTab = (await import(
        /* turbopackIgnore: true */ ALPHATAB_ESM_URL
      )) as AlphaTabModule;

      if (disposed) return;

      setPlatform(alphaTab.WebPlatform[alphaTab.Environment.webPlatform] ?? 'unknown');

      const settings = new alphaTab.Settings();
      // NOTE: no `settings.core.scriptFile`. AlphaTab finds its own worker + worklet relative to
      // /alphatab/esm/alphaTab.mjs, which is the whole point of this variant.
      settings.core.fontDirectory = '/alphatab/font/';
      settings.core.file = '/charts/drums.gp5';
      settings.core.tracks = 'all';
      settings.core.logLevel = alphaTab.LogLevel.Debug;
      settings.player.playerMode = alphaTab.PlayerMode.EnabledAutomatic;
      settings.player.soundFont = '/alphatab/soundfont/sonivox.sf3';
      settings.player.enableCursor = true;
      settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
      settings.player.scrollElement = host;

      api = new alphaTab.AlphaTabApi(host, settings);
      apiRef.current = api;

      api.error.on((error) => setLastError(String(error)));
      api.scoreLoaded.on((score) => setStatus(`score loaded: ${score.title || '(untitled)'}`));
      api.renderFinished.on(() => {
        setReady(true);
        setStatus('rendered');
      });
      api.soundFontLoaded.on(() => setSoundFontLoaded(true));
      api.playerStateChanged.on((a) => setPlaying(a.state === alphaTab.synth.PlayerState.Playing));
    })();

    return () => {
      disposed = true;
      apiRef.current = null;
      lifecycle.disposes += 1;
      api?.destroy();
    };
  }, []);

  return (
    <div className="space-y-4">
      <div
        data-testid="spike-status"
        data-ready={ready}
        data-soundfont={soundFontLoaded}
        data-playing={playing}
        data-platform={platform}
        data-error={lastError ?? ''}
        className="rounded-md border border-border bg-secondary p-3 font-mono text-xs"
      >
        <div>status: {status}</div>
        <div>soundfont: {soundFontLoaded ? 'loaded' : 'pending'}</div>
        <div>Environment.webPlatform: {platform}</div>
        {lastError ? <div className="text-destructive">ERROR: {lastError}</div> : null}
      </div>
      <button
        type="button"
        data-testid="play"
        onClick={() => apiRef.current?.playPause()}
        disabled={!soundFontLoaded}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
      >
        {playing ? 'Pause' : 'Play'}
      </button>
      <div
        ref={hostRef}
        data-testid="alphatab-host"
        className="h-[420px] overflow-y-auto rounded-md border border-border bg-white"
      />
    </div>
  );
}
