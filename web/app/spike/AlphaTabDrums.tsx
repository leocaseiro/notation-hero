'use client';

/**
 * SPIKE (NH — alphatab-in-nextjs): scratch quality on purpose.
 * Owns an AlphaTabApi instance in a ref, renders drum notation + plays it through AlphaSynth.
 * Not the real player UI — see docs/spikes/2026-09-10-alphatab-in-nextjs-app-router.md.
 */

import * as alphaTab from '@coderline/alphatab';
import { useCallback, useEffect, useRef, useState } from 'react';

type TrackInfo = { index: number; name: string; isPercussion: boolean };

/**
 * Module-level so React 19's strict-mode double-invoke is COUNTABLE. Deliberately not state:
 * the repo's shared ESLint base runs `react-hooks/set-state-in-effect`, which forbids calling
 * setState synchronously in an effect body — so the counters live here and are mirrored into the
 * DOM (`window.__spikeLifecycle`) for the Playwright probe to read.
 */
const lifecycle = { mounts: 0, disposes: 0 };

/** Formats an alphaSynth millisecond position as m:ss. Hoisted out of the effect for lint. */
function formatMs(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * A track is percussion when ANY of its staves is — that is the flag to trust. Track name and MIDI
 * program are not reliable (a GP5 drum track reports `program: 0`, same as Acoustic Grand Piano;
 * what actually marks it is channel 9 + `staff.isPercussion`).
 */
function toTrackInfo(track: alphaTab.model.Track): TrackInfo {
  return {
    index: track.index,
    name: track.name,
    isPercussion: track.staves.some((staff) => staff.isPercussion),
  };
}

export function AlphaTabDrums() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<alphaTab.AlphaTabApi | null>(null);

  const [status, setStatus] = useState('booting');
  const [lastError, setLastError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [soundFontLoaded, setSoundFontLoaded] = useState(false);
  const [tracks, setTracks] = useState<TrackInfo[]>([]);
  const [tempo, setTempo] = useState(1);
  const [position, setPosition] = useState('0:00 / 0:00');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    lifecycle.mounts += 1;
    (globalThis as unknown as { __spikeLifecycle?: typeof lifecycle }).__spikeLifecycle = lifecycle;

    const settings = new alphaTab.Settings();
    // THE load-bearing line under Turbopack. AlphaTab locates its web worker + audio worklet from
    // `import.meta.url`, which Turbopack does not leave as a usable http URL in a production chunk
    // (Environment.webPlatform comes out `Browser`, not `BrowserModule`). Without this, both the
    // render worker AND AlphaSynth fail with "Could not detect alphaTab script file". Pointing at a
    // self-hosted classic build makes AlphaTab fall back to its `importScripts()` blob worker.
    // Must be ABSOLUTE. The worker is constructed from a `blob:` URL, and `importScripts()` inside
    // it resolves relative to that blob origin — a root-relative '/alphatab/...' throws
    // "The URL '/alphatab/alphaTab.min.js' is invalid". (fontDirectory/soundFont below are fetched
    // from the main thread, so those may stay root-relative.)
    settings.core.scriptFile = new URL('/alphatab/alphaTab.min.js', globalThis.location.href).href;
    // Assets are served from public/ — see next.config.ts note.
    settings.core.fontDirectory = '/alphatab/font/';
    settings.core.file = '/charts/drums.gp5';
    settings.core.tracks = 'all';
    settings.core.logLevel = alphaTab.LogLevel.Debug;
    settings.player.playerMode = alphaTab.PlayerMode.EnabledAutomatic;
    settings.player.soundFont = '/alphatab/soundfont/sonivox.sf3';
    settings.player.enableCursor = true;
    settings.player.enableAnimatedBeatCursor = true;
    settings.player.scrollMode = alphaTab.ScrollMode.Continuous;
    settings.player.scrollElement = host;

    let api: alphaTab.AlphaTabApi;
    try {
      api = new alphaTab.AlphaTabApi(host, settings);
    } catch (error) {
      // Deferred one tick: `react-hooks/set-state-in-effect` forbids a synchronous setState here.
      queueMicrotask(() => setLastError(`AlphaTabApi ctor threw: ${String(error)}`));
      return;
    }
    apiRef.current = api;
    // Handy for poking at the API from the devtools console / Playwright.
    (globalThis as unknown as { __at?: alphaTab.AlphaTabApi }).__at = api;

    api.error.on((error) =>
      setLastError(`alphaTab error: ${String((error as { message?: string })?.message ?? error)}`),
    );
    api.scoreLoaded.on((score) => {
      setStatus(`score loaded: ${score.title || '(untitled)'}`);
      setTracks(score.tracks.map((track) => toTrackInfo(track)));
    });
    api.renderFinished.on(() => {
      setReady(true);
      setStatus('rendered');
    });
    api.soundFontLoaded.on(() => setSoundFontLoaded(true));
    api.playerStateChanged.on((a) => setPlaying(a.state === alphaTab.synth.PlayerState.Playing));
    api.playerPositionChanged.on((a) =>
      setPosition(`${formatMs(a.currentTime)} / ${formatMs(a.endTime)}`),
    );

    return () => {
      apiRef.current = null;
      lifecycle.disposes += 1;
      api.destroy();
    };
  }, []);

  const changeTempo = useCallback((value: number) => {
    setTempo(value);
    const api = apiRef.current;
    if (api) api.playbackSpeed = value;
  }, []);

  const toggleMute = useCallback((index: number, mute: boolean) => {
    const api = apiRef.current;
    const track = api?.score?.tracks[index];
    if (api && track) api.changeTrackMute([track], mute);
  }, []);

  const toggleSolo = useCallback((index: number, solo: boolean) => {
    const api = apiRef.current;
    const track = api?.score?.tracks[index];
    if (api && track) api.changeTrackSolo([track], solo);
  }, []);

  return (
    <div className="space-y-4">
      <div
        data-testid="spike-status"
        data-ready={ready}
        data-soundfont={soundFontLoaded}
        data-playing={playing}
        data-mounts={lifecycle.mounts}
        data-disposes={lifecycle.disposes}
        data-error={lastError ?? ''}
        className="rounded-md border border-border bg-secondary p-3 font-mono text-xs"
      >
        <div>status: {status}</div>
        <div>soundfont: {soundFontLoaded ? 'loaded' : 'pending'}</div>
        <div>
          lifecycle: {lifecycle.mounts} mount(s) / {lifecycle.disposes} dispose(s)
        </div>
        <div>position: {position}</div>
        {lastError ? <div className="text-destructive">ERROR: {lastError}</div> : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="play"
          onClick={() => apiRef.current?.playPause()}
          disabled={!soundFontLoaded}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          data-testid="stop"
          onClick={() => apiRef.current?.stop()}
          className="rounded-md bg-secondary px-4 py-2"
        >
          Stop
        </button>
        <label className="flex items-center gap-2 text-sm">
          Tempo {Math.round(tempo * 100)}%
          <input
            type="range"
            data-testid="tempo"
            min={0.25}
            max={2}
            step={0.05}
            value={tempo}
            onChange={(e) => changeTempo(Number(e.target.value))}
          />
        </label>
      </div>

      <ul data-testid="tracks" className="flex flex-wrap gap-3 text-sm">
        {tracks.map((t) => (
          <li key={t.index} className="rounded-md border border-border p-2">
            <span className="font-medium">
              {t.name} {t.isPercussion ? '(percussion)' : ''}
            </span>
            <span className="ml-2 inline-flex gap-2">
              <label className="flex items-center gap-1">
                <input type="checkbox" onChange={(e) => toggleMute(t.index, e.target.checked)} />
                mute
              </label>
              <label className="flex items-center gap-1">
                <input type="checkbox" onChange={(e) => toggleSolo(t.index, e.target.checked)} />
                solo
              </label>
            </span>
          </li>
        ))}
      </ul>

      <div
        ref={hostRef}
        data-testid="alphatab-host"
        className="h-[520px] overflow-y-auto rounded-md border border-border bg-white"
      />
    </div>
  );
}
