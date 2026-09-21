'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';

import { useAlphaTabEngine } from './AlphaTabEngineContext';
import { setAlphaTabDefaults } from './defaults';
import type { AlphaTabEngine } from './engine';
import type * as AlphaTab from '@coderline/alphatab';
import type { RefObject } from 'react';

/** The host div carries the live api for DevTools: `$0.at` on a selected notation box. */
type HostWithApi = HTMLDivElement & { at?: AlphaTab.AlphaTabApi };

/**
 * Creates one AlphaTabApi bound to the returned host element, and destroys it on unmount.
 *
 * The host div MUST stay mounted for the component's whole life (spec: the player always has a
 * score, so it is never hidden). A conditionally mounted host would leave `hostRef.current` null
 * on the only run of this effect, and nothing would ever build the api.
 */
export function useAlphaTab(
  settingsInit: (settings: AlphaTab.Settings, engine: AlphaTabEngine) => void,
): [api: AlphaTab.AlphaTabApi | undefined, hostRef: RefObject<HTMLDivElement | null>] {
  const { engine } = useAlphaTabEngine();
  const [api, setApi] = useState<AlphaTab.AlphaTabApi>();
  const hostRef = useRef<HTMLDivElement | null>(null);

  // useEffectEvent, never a dependency. `settingsInit` is a fresh arrow at every call site on
  // every render: in the dependency list it would destroy the api and construct a new one on an
  // ordinary state change, throwing away the loaded score, the downloaded soundfont and both
  // workers. Verified exported by the installed React 19.2.7 under this exact name.
  const init = useEffectEvent(settingsInit);

  useEffect(() => {
    const host = hostRef.current;
    if (!engine || !host) return;

    const settings = new engine.Settings();
    setAlphaTabDefaults(settings, engine);
    // The engine goes to the call site too: every AlphaTab enum (PlayerMode, ScrollMode) is a
    // runtime value that the self-hosted-ESM delivery decision forbids importing, so a call site
    // has no other way to reach one. The fork passes only `settings`; it can afford to, because it
    // imports the namespace.
    init(settings, engine);

    const created = new engine.AlphaTabApi(host, settings);
    setApi(created);
    // Shipped in production on purpose (approved 2026-09-18): one property assignment at
    // construction, no cost while running, and it lets you inspect a live player from DevTools.
    // It is the deliberate exception to "no test-only code in production" — this one is for
    // debugging a real deployment, not for a test.
    (host as HostWithApi).at = created;

    return () => {
      (host as HostWithApi).at = undefined;
      setApi(undefined);
      created.destroy();
    };
  }, [engine]);

  return [api, hostRef];
}

/** The AlphaTabApi members the transport writes: plain values, not methods. */
type AlphaTabApiValue =
  | 'isLooping'
  | 'metronomeVolume'
  | 'countInVolume'
  | 'playbackRange'
  | 'playbackSpeed'
  | 'timePosition';

/**
 * Writes one of AlphaTab's transport values.
 *
 * Plain property assignment IS AlphaTab's documented interface for these (`api.metronomeVolume =
 * 0.5`); none of them has a method form, and `api.updateSettings()` is not involved. The write
 * lives here, not in a component, because the api reaches components through `useState`: React's
 * compiler lint (`react-hooks/immutability`) treats a value returned from a hook as immutable and
 * rejects an assignment to it inside a component or a `useCallback`. That rule is right about
 * React data and wrong about this object — the api is a handle to an engine outside React, and
 * writing to it from an event handler is the same kind of effect as `api.playPause()`.
 */
export function setAlphaTabValue<K extends AlphaTabApiValue>(
  api: AlphaTab.AlphaTabApi,
  key: K,
  value: AlphaTab.AlphaTabApi[K],
): void {
  api[key] = value;
}

/**
 * Emitters that must NOT be subscribed to, so the type below leaves them out and
 * `useAlphaTabEvent(api, 'midiLoaded', …)` does not compile.
 *
 * `midiLoaded`: subscribing replays `player.loadedMidiInfo` to the new listener, and in 1.8.4 the
 * worker-backed synth — the one every browser uses — defines that getter as
 * `get loadedMidiInfo() { return this.loadedMidiInfo; }`, which calls itself until the stack
 * overflows (alphaTab.core.mjs:33572; the no-worker class returns `this._loadedMidiInfo`, which is
 * why a headless run never sees it). It only throws once the player instance exists, so it is a
 * race: measured 3 crashed page loads in 18, each landing on the error boundary. Everything
 * `midiLoaded` carries also arrives on `playerPositionChanged`. Drop the entry once a release fixes
 * the getter.
 */
type UnsafeAlphaTabApiEvents = 'midiLoaded';

/** The AlphaTabApi members that are event emitters — the only valid `event` names below. */
export type AlphaTabApiEvents = {
  [K in Exclude<
    keyof AlphaTab.AlphaTabApi,
    UnsafeAlphaTabApiEvents
  > as AlphaTab.AlphaTabApi[K] extends AlphaTab.IEventEmitter | AlphaTab.IEventEmitterOfT<never>
    ? K
    : never]: AlphaTab.AlphaTabApi[K];
};

/**
 * Subscribes for as long as `api` lives, and ALWAYS unsubscribes. An earlier draft hand-wrote five
 * `.on()` calls across two components and no `.off()` anywhere, leaning entirely on `api.destroy()`;
 * the settings and tracks popovers mount and unmount while the api stays alive, so they need a
 * pattern that detaches.
 *
 * `api` may be undefined, so call sites need no guard. The handler is read through a ref, so an
 * inline arrow does NOT cause a resubscribe on every render — which matters more than it looks:
 * AlphaTab re-fires several events at the moment you subscribe (`alphaTab.core.mjs:24721-24727`),
 * so resubscribe churn is a feedback loop, not merely waste. That is the failure that produced
 * four separate "maximum update depth" commits in the earlier alpha-drums attempt.
 */
export function useAlphaTabEvent<
  T extends keyof AlphaTabApiEvents,
  H extends Parameters<AlphaTab.AlphaTabApi[T]['on']>[0],
>(api: AlphaTab.AlphaTabApi | undefined, event: T, handler: H): void {
  const latest = useRef(handler);
  // Written in an effect, never during render: `react-hooks/refs` is an error in web/.
  useEffect(() => {
    latest.current = handler;
  });

  useEffect(() => {
    if (!api) return;
    const listener = (...args: unknown[]) => {
      (latest.current as (...a: unknown[]) => void)(...args);
    };
    // Narrow the emitter ONCE, here — not by indexing at the call site. While `event` is still
    // generic, `api[event]` is the union of every emitter member and TypeScript resolves `.on` to
    // IEventEmitter's zero-argument overload, which a union-typed listener cannot satisfy (TS2345).
    const emitter = api[event] as unknown as AlphaTab.IEventEmitterOfT<unknown>;
    emitter.on(listener);
    return () => {
      emitter.off(listener);
    };
    // `handler` is deliberately absent — see the ref above. Upstream reached the same conclusion
    // in commit a614efdb, but without the ref, which froze its handlers at first render and
    // silently defeated its own position throttle. Do not copy that half.
  }, [api, event]);
}
