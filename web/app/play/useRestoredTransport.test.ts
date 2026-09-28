import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

// The one indirection this file mocks, and only to COUNT the calls: the restore has to go through
// `readStoredTransport` rather than reaching for localStorage itself, because that function owns
// the catch for a browser with site data blocked — where the GETTER throws, not only setItem. The
// real one is still what runs, so every parse, merge, clamp and fallback stays on the tested path.
const storageReads = vi.fn();
vi.mock('../../lib/alphatab/transport-storage', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../lib/alphatab/transport-storage')>();
  return {
    ...real,
    readStoredTransport: () => {
      storageReads();
      return real.readStoredTransport();
    },
  };
});

// Imported below the vi.mock call on purpose: Vitest hoists the mock, and keeping the imports here
// makes the dependency order readable rather than surprising. Same shape as PlayerShell.test.tsx.
import {
  DEFAULT_TRANSPORT_VALUES,
  serializeTransport,
  TRANSPORT_STORAGE_KEY,
} from '../../lib/alphatab/transport-storage';
import { useRestoredTransport } from './useRestoredTransport';

import type * as AlphaTab from '@coderline/alphatab';

/**
 * Four stored values, every one of them DIFFERENT from its shipped default.
 *
 * That is what gives each assertion below teeth: a restore that never ran, or one that dropped a
 * line, leaves the default in place, so no expectation here can be satisfied by accident.
 */
const STORED = { metronomeVolume: 1, countInVolume: 0.5, masterVolume: 0.4, isLooping: true };

/**
 * Just enough AlphaTabApi to be written to. `setAlphaTabValue` does a plain property assignment —
 * that IS AlphaTab's documented interface for these four, none of them has a method form — so a
 * bare object records every write the real engine would have taken, with no engine to build.
 */
type TransportStub = Pick<
  AlphaTab.AlphaTabApi,
  'isLooping' | 'metronomeVolume' | 'countInVolume' | 'masterVolume'
>;

/**
 * Renders the hook the way a real first render always sees it — with no api, because the api is
 * built in an effect — and hands back the lever that makes one arrive.
 *
 * `engine` starts on the engine's own defaults, so a value found on it afterwards was PUT there.
 * Calling `arrive()` more than once re-renders with the SAME api object, which is the ordinary
 * case: this hook sits in a shell that re-renders on every transport position commit.
 */
function renderTransport() {
  const engine: TransportStub = { ...DEFAULT_TRANSPORT_VALUES };
  const { result, rerender } = renderHook(({ api }) => useRestoredTransport(api), {
    initialProps: { api: undefined as AlphaTab.AlphaTabApi | undefined },
  });
  return {
    engine,
    result,
    arrive: () => {
      rerender({ api: engine as unknown as AlphaTab.AlphaTabApi });
    },
  };
}

/** What the hook returns, in the shape `STORED` is written in, so one assertion covers all four. */
const restoredValues = (current: ReturnType<typeof useRestoredTransport>) => ({
  metronomeVolume: current.metronomeVolume,
  countInVolume: current.countInVolume,
  masterVolume: current.masterVolume,
  isLooping: current.looping,
});

const seed = (stored: string) => {
  globalThis.localStorage.setItem(TRANSPORT_STORAGE_KEY, stored);
};

beforeEach(() => {
  globalThis.localStorage.clear();
  storageReads.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// The near-miss this hook is shaped around, pinned. Reading storage in the FIRST render is a
// hydration mismatch — the server has no localStorage, so the two sides compute different values,
// and React keeps the server's and warns rather than patching. Measured while NH-295 was built: it
// left all three transport toggles at aria-pressed="false" for the rest of the session while the
// engine behind them was sounding a metronome. Moving the read out of the `previousApi !== api`
// branch and into the useState initialisers fails here.
test('nothing is read from storage until the api arrives', () => {
  seed(serializeTransport(STORED));
  const { result } = renderTransport();

  expect(storageReads).not.toHaveBeenCalled();
  expect(restoredValues(result.current)).toEqual(DEFAULT_TRANSPORT_VALUES);
});

test('the api arriving puts all four stored values into state', () => {
  seed(serializeTransport(STORED));
  const { result, arrive } = renderTransport();

  arrive();

  expect(restoredValues(result.current)).toEqual(STORED);
});

// The restore is a one-shot, and the shell it lives in re-renders constantly — once per animation
// frame while the transport runs. A restore that re-read on every render would stamp storage back
// over a value the drummer had just changed, since the writers in PlayerShell persist on a later
// tick than the state they set.
test('the restore reads storage exactly once, however many renders follow', () => {
  seed(serializeTransport(STORED));
  const { arrive } = renderTransport();

  arrive();
  arrive();
  arrive();

  expect(storageReads).toHaveBeenCalledTimes(1);
});

// The other half of the same restore, and the half a repainted button cannot fake: state alone is
// a Loop button drawn pressed on an engine that is not looping.
test('all four stored values reach the engine', () => {
  seed(serializeTransport(STORED));
  const { engine, arrive } = renderTransport();

  arrive();

  expect(engine).toEqual(STORED);
});

// `repaired` drives a warning toast. A first visit and a clean document must not raise it, or the
// warning cries wolf; and nothing may be written back, or the write would fire on every load.
test('a clean document raises no repair signal and writes nothing back', () => {
  const setItem = vi.spyOn(Storage.prototype, 'setItem');
  seed(serializeTransport(STORED));
  setItem.mockClear();
  const { result, arrive } = renderTransport();

  arrive();

  expect(result.current.repaired).toBeNull();
  expect(setItem).not.toHaveBeenCalled();
});

// A corrected value is named so the drummer can go and look at that control, and the healed
// document is written back so the same correction is not made — and announced — on every later
// visit. 9 is outside the master volume's 0-1 range, which a tab closed mid-edit really can store.
test('a corrected value is named, clamped, and healed in storage exactly once', () => {
  const setItem = vi.spyOn(Storage.prototype, 'setItem');
  seed(JSON.stringify({ version: 1, settings: { ...STORED, masterVolume: 9 } }));
  setItem.mockClear();
  const { result, arrive } = renderTransport();

  arrive();

  expect(result.current.repaired).toEqual(['masterVolume']);
  // Clamped to the top of its range, not dropped to the shipped default of 1 — which here would
  // read the same, so the other three carry the assertion that the rest of the document survived.
  expect(restoredValues(result.current)).toEqual({ ...STORED, masterVolume: 1 });
  expect(setItem).toHaveBeenCalledExactlyOnceWith(
    TRANSPORT_STORAGE_KEY,
    serializeTransport({ ...STORED, masterVolume: 1 }),
  );

  arrive();
  arrive();
  expect(setItem).toHaveBeenCalledTimes(1);
});

// An unreadable document is a DIFFERENT event from a corrected key: everything fell back, so there
// is no key to name. The empty array is what tells the two apart downstream — PlayerShell shows
// "reset to the defaults" for this one and names the rows for the case above — so `[]` here is
// meaningful and must not collapse into null.
test('an unreadable document reports a reset with no key to name', () => {
  seed('{broken');
  const { result, arrive } = renderTransport();

  arrive();

  expect(result.current.repaired).toEqual([]);
  expect(restoredValues(result.current)).toEqual(DEFAULT_TRANSPORT_VALUES);
});

// Site data blocked throws from the localStorage GETTER itself, which `readStoredTransport`
// catches. Storage being unreadable is not a repair — nothing was corrected — so this must fall
// back silently rather than accusing the drummer's settings of being corrupt.
test('a browser with storage blocked falls back to the defaults and says nothing', () => {
  seed(serializeTransport(STORED));
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('The operation is insecure.', 'SecurityError');
  });
  const setItem = vi.spyOn(Storage.prototype, 'setItem');
  const { engine, result, arrive } = renderTransport();

  arrive();

  expect(restoredValues(result.current)).toEqual(DEFAULT_TRANSPORT_VALUES);
  expect(engine).toEqual(DEFAULT_TRANSPORT_VALUES);
  expect(result.current.repaired).toBeNull();
  expect(setItem).not.toHaveBeenCalled();
});

// The write-back's own swallow. A full quota and private browsing both throw from setItem, and the
// restore has already happened by then: losing the heal is survivable, losing the transport is not.
test('a blocked write-back keeps the restore and the warning', () => {
  seed(JSON.stringify({ version: 1, settings: { ...STORED, masterVolume: 9 } }));
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
  });
  const { engine, result, arrive } = renderTransport();

  expect(() => {
    arrive();
  }).not.toThrow();

  expect(restoredValues(result.current)).toEqual({ ...STORED, masterVolume: 1 });
  expect(engine).toEqual({ ...STORED, masterVolume: 1 });
  expect(result.current.repaired).toEqual(['masterVolume']);
});
