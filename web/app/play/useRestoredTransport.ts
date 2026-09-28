'use client';

import { useEffect, useState } from 'react';

import {
  DEFAULT_TRANSPORT_VALUES,
  readStoredTransport,
} from '../../lib/alphatab/transport-storage';
import { setAlphaTabValue } from '../../lib/alphatab/useAlphaTab';
import type { TransportValues } from '../../lib/alphatab/transport-storage';
import type * as AlphaTab from '@coderline/alphatab';

export interface RestoredTransport {
  looping: boolean;
  setLooping: (next: boolean) => void;
  metronomeVolume: number;
  setMetronomeVolume: (next: number) => void;
  countInVolume: number;
  setCountInVolume: (next: number) => void;
  masterVolume: number;
  setMasterVolume: (next: number) => void;
}

/**
 * The four transport values that survive a reload, and the one-time restore that puts them back.
 *
 * Holds only the READ side of persistence — the state, and getting the stored values into both it
 * and the engine. The writers stay in `PlayerShell`, which keeps its single-writer rule for each
 * value and calls `serializeTransport` from there on every edit.
 *
 * `playbackSpeed` is deliberately not among them; see `transport-storage.ts` for why.
 */
export function useRestoredTransport(
  api: AlphaTab.AlphaTabApi | undefined,
): Readonly<RestoredTransport> {
  // Seeded with the SHIPPED DEFAULTS, never read from storage here. The server has no localStorage,
  // so a value read during the first render disagrees with the HTML the server already sent — and
  // React does not patch a mismatched attribute, it keeps the server's and warns. Measured while
  // building this: reading it in the initial render left all three transport toggles at
  // aria-pressed="false" for the rest of the session while the engine behind them was sounding a
  // metronome, which is exactly the lying button this feature exists to prevent. (It is not a
  // string/boolean coercion: React already writes a boolean to aria-pressed as "true"/"false".
  // The two sides genuinely computed different VALUES, and that is what React will not reconcile.)
  const [looping, setLooping] = useState(DEFAULT_TRANSPORT_VALUES.isLooping);
  // Metronome and Count-In are VOLUMES in AlphaTab, not booleans: 0 is off, 1 the normal level.
  const [metronomeVolume, setMetronomeVolume] = useState(DEFAULT_TRANSPORT_VALUES.metronomeVolume);
  const [countInVolume, setCountInVolume] = useState(DEFAULT_TRANSPORT_VALUES.countInVolume);
  const [masterVolume, setMasterVolume] = useState(DEFAULT_TRANSPORT_VALUES.masterVolume);

  // The stored values reach STATE here — during render, the first time the api arrives, against a
  // state copy of the previous one. Not in an effect: react-hooks/set-state-in-effect treats
  // "derive state when something changes" inside an effect as the anti-pattern it exists to catch,
  // and this is the React-endorsed replacement ("Adjusting some state when a prop changes",
  // https://react.dev/learn/you-might-not-need-an-effect). NotationSurface uses the same shape for
  // the same reason, and a state copy rather than a ref for its reason too: react-hooks/refs treats
  // a ref read or write during render as unsafe, since React cannot see it and schedules no
  // re-render from it.
  //
  // Keying on the api's ARRIVAL is what keeps hydration honest: the api is built in an effect, so
  // it is always undefined on the first render and this branch cannot run until that render has
  // committed against the same defaults the server used.
  const [previousApi, setPreviousApi] = useState(api);
  const [toRestore, setToRestore] = useState<TransportValues | null>(null);
  if (previousApi !== api && api) {
    setPreviousApi(api);
    const stored = readStoredTransport();
    setLooping(stored.isLooping);
    setMetronomeVolume(stored.metronomeVolume);
    setCountInVolume(stored.countInVolume);
    setMasterVolume(stored.masterVolume);
    setToRestore(stored);
  }

  // The ENGINE half of the same restore. Writing into AlphaTab is an external-system write, which
  // is what an effect is for and what the render adjust above may not do.
  //
  // Once is enough, deliberately: `toRestore` is set exactly once. AlphaTab puts an
  // `AlphaSynthWrapper` between the api and the real player; it outlives every player rebuild and
  // re-applies these to each new instance — its own comment calls them "relevant state information
  // we want to remember when switching between player instances". Measured in a real browser:
  // driving Playback source from Automatic to No playback and back destroys and rebuilds the
  // player, and all four values survive it, so a re-push on playerReady would be dead code.
  //
  // Writing before the player is ready is safe for the same reason — the wrapper's setters keep
  // their own field and only forward to an instance once there is one.
  useEffect(() => {
    if (!api || !toRestore) return;
    setAlphaTabValue(api, 'isLooping', toRestore.isLooping);
    setAlphaTabValue(api, 'metronomeVolume', toRestore.metronomeVolume);
    setAlphaTabValue(api, 'countInVolume', toRestore.countInVolume);
    setAlphaTabValue(api, 'masterVolume', toRestore.masterVolume);
  }, [api, toRestore]);

  return {
    looping,
    setLooping,
    metronomeVolume,
    setMetronomeVolume,
    countInVolume,
    setCountInVolume,
    masterVolume,
    setMasterVolume,
  };
}
