import { readFileSync } from 'node:fs';
import path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- Vitest files are never bundled by Next, so the double-bundle reason for this fence does not apply
import * as engine from '@coderline/alphatab';
import { toast } from '@notation-hero/client';
import { addBreadcrumb, captureException } from '@sentry/nextjs';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// The per-row work, counted — the same instrument SettingsPopover.test.tsx uses. valueOf calls
// readSettingValue once for every settings-sourced row, so the call count IS the number of rows
// rebuilt, with no profiler.
const rowRead = vi.fn();
vi.mock('../../lib/alphatab/settings-paths', async (importOriginal) => {
  const real = (await importOriginal()) as Record<string, unknown>;
  const readSettingValue = real.readSettingValue as (...a: unknown[]) => unknown;
  return {
    ...real,
    readSettingValue: (...args: unknown[]) => {
      rowRead();
      return readSettingValue(...args);
    },
  };
});

// PlayerHeader calls useRouter, which throws outside an app-router tree.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, replace: () => {}, back: () => {} }),
  usePathname: () => '/play',
  useSearchParams: () => new URLSearchParams(),
}));

// The real engine NAMESPACE, so buildSettingGroups yields all the real rows rather than an empty
// tree. The provider is a passthrough: the component under test needs the rows, not a live engine.
vi.mock('../../lib/alphatab/AlphaTabEngineContext', () => ({
  AlphaTabEngineProvider: ({ children }: { readonly children: ReactNode }) => children,
  useAlphaTabEngine: () => ({ engine, error: null }),
}));

// Every AlphaTab subscription, kept per event AND per call site, so a case can deliver an event to
// every component listening for it — not only the last one to subscribe. Each call site keeps one
// slot (a ref), so a component that re-renders replaces its own handler instead of adding another.
const handlers = new Map<string, Map<object, (args: unknown) => void>>();
// The api the shell sees. Undefined is the original harness, with no engine at all; a case that
// needs the player ready, or a file opened, sets a stand-in first.
let currentApi: object | undefined;
vi.mock('../../lib/alphatab/useAlphaTab', async () => {
  const { useRef } = await import('react');
  function useAlphaTabEvent(_api: unknown, name: string, handler: (args: unknown) => void): void {
    const slot = useRef({});
    const byName = handlers.get(name) ?? new Map<object, (args: unknown) => void>();
    byName.set(slot.current, handler);
    handlers.set(name, byName);
  }
  return {
    useAlphaTab: () => [currentApi, { current: null }],
    useAlphaTabEvent,
    setAlphaTabValue: () => {},
  };
});

// The step right after the parse and before the swap. A case makes it throw, to stand for a bug of
// ours there.
vi.mock('../../lib/alphatab/playback-selection', () => ({ dropPlaybackSelection: vi.fn() }));

// Wrapped so a case can see WHEN a file's name and a score's names were remembered. Their
// behaviour is unchanged.
vi.mock('../../lib/monitoring/scrub', async (importOriginal) => {
  const real = (await importOriginal()) as Record<string, unknown>;
  const rememberOpenFile = real.rememberOpenFile as (fileName: string) => void;
  const rememberScore = real.rememberScore as (score: unknown) => void;
  return {
    ...real,
    rememberOpenFile: vi.fn(rememberOpenFile),
    rememberScore: vi.fn(rememberScore),
  };
});

// Imported after the vi.mock calls on purpose: Vitest hoists them, and keeping the import below
// them makes the dependency order readable rather than surprising.
import { dropPlaybackSelection } from '../../lib/alphatab/playback-selection';
import { SETTINGS_STORAGE_KEY } from '../../lib/alphatab/settings-storage';
import { addInstrumentsTag } from '../../lib/monitoring/report';
import { rememberOpenFile, rememberScore, scrubEvent } from '../../lib/monitoring/scrub';
import { PlayerShell } from './PlayerShell';

import type * as Sentry from '@sentry/nextjs';
import type { ReactNode } from 'react';

/** Delivers one AlphaTab event to every component subscribed to it. */
const deliver = (name: string, args?: unknown): void => {
  for (const handler of handlers.get(name)?.values() ?? []) handler(args);
};

/**
 * Enough of the live api for the shell, NotationSurface and the popovers to mount, report the
 * player ready, and open a file.
 */
const standInApi = () => ({
  settings: {
    player: { playerMode: engine.PlayerMode.EnabledAutomatic },
    notation: { transpositionPitches: [] as number[] },
  },
  actualPlayerMode: engine.PlayerMode.EnabledSynthesizer,
  isReadyForPlayback: true,
  score: undefined,
  tracks: [],
  playbackRange: null,
  renderScore: vi.fn(),
  pause: vi.fn(),
  play: vi.fn(),
  playPause: vi.fn(),
});

/** A file from web/e2e/fixtures. Read by path: under jsdom, new URL(…, import.meta.url) fails. */
const fixture = (name: string): File =>
  new File([readFileSync(path.join(process.cwd(), 'e2e/fixtures', name))], name);

/** Picks `file` through the real open-file control. */
function pick(file: File): void {
  fireEvent.change(screen.getByTestId('open-file-input'), { target: { files: [file] } });
}

/** The reports sent with `code`, as captureException received them. */
const reported = (code: string) =>
  vi
    .mocked(captureException)
    .mock.calls.filter(
      ([, hint]) =>
        (hint as { captureContext?: { tags?: { code?: string } } } | undefined)?.captureContext
          ?.tags?.code === code,
    );

/** The level of each report sent with `code`. */
const levelsReported = (code: string) =>
  reported(code).map(
    ([, hint]) =>
      (hint as { captureContext?: { level?: string } } | undefined)?.captureContext?.level,
  );

/** Waits until the loading bar has left the page: it fades for 700 ms once nothing is pending. */
const loadingBarGone = () =>
  waitFor(
    () => expect(screen.queryByRole('progressbar', { name: 'Loading the player' })).toBeNull(),
    { timeout: 3000 },
  );

/** The instruments tag a report captured on `pathname` would carry right now. */
function tagNow(pathname = '/play'): unknown {
  history.replaceState(null, '', pathname);
  const event: Sentry.Event = {};
  addInstrumentsTag(event);
  return event.tags?.instruments;
}

/** Each report's tag, read at the moment it was captured, as Sentry's hook reads it. */
let atCapture: unknown[] = [];
function readTagAtCapture(): void {
  atCapture = [];
  vi.mocked(captureException).mockImplementation(() => {
    atCapture.push(tagNow());
    return 'event-id';
  });
}

beforeEach(() => {
  handlers.clear();
  currentApi = undefined;
  vi.mocked(captureException).mockReset();
  vi.mocked(dropPlaybackSelection).mockReset();
  // jsdom has no document.fonts, and NotationSurface listens on it as soon as an api exists.
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { addEventListener: () => {}, removeEventListener: () => {} },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * The elapsed clock, mm:ss — where a committed position lands on screen, and the proof a frame
 * actually ran. Read off the scrubber's own first cell rather than by role: with no api the rail
 * renders disabled, and a disabled Base UI slider exposes no `slider` role to query.
 */
const shownClock = (): string | null =>
  document.querySelector('[data-slot="scrubber"] span')?.textContent ?? null;

/**
 * One animation frame of transport position commits per iteration, and the count of settings rows
 * rebuilt across them.
 *
 * PlayerShell coalesces AlphaTab's ~345 positionChanged events per second down to one state write
 * per animation frame, so one iteration here is one real frame. The timeout lets that frame run:
 * the handler only stashes the args and schedules the write.
 */
async function runFrames(count: number): Promise<number> {
  rowRead.mockClear();
  for (let index = 0; index < count; index += 1) {
    // Sequential by definition: each frame has to commit before the next one is delivered.
    await act(async () => {
      deliver('playerPositionChanged', {
        currentTime: 1000 + index * 100,
        endTime: 60_000,
        currentTick: index,
        endTick: 1000,
        isSeek: false,
        originalTempo: 120,
        modifiedTempo: 120,
      });
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
  }
  return rowRead.mock.calls.length;
}

// The OTHER half of the memo() fix, on the real component rather than a stand-in: SettingsPopover
// is memo()'d, and memo() is a SHALLOW comparison, so one fresh object literal per render defeats
// it on its own. `apiValues` was that literal. Removing the useMemo around it in PlayerShell puts
// every row back on every frame — measured here at 213 reads across three frames, against 0 with
// it. SettingsPopover.test.tsx proves the same mechanism on a stand-in shell; only this case can
// fail when PlayerShell's own useMemo goes.
test('the transport running rebuilds no settings rows, because apiValues stays memoised', async () => {
  render(<PlayerShell />);
  // The rows ARE built once on mount, popover closed: the row map sits in JSX children, which are
  // evaluated when the element is created, not when the popover opens.
  expect(rowRead.mock.calls.length).toBeGreaterThan(0);
  expect(screen.queryByRole('dialog')).toBeNull();

  const reads = await runFrames(3);

  // The harness has to prove it ran before a zero above means anything: a count of nothing is what
  // a handler that never fired looks like too. The elapsed clock is the shell's own per-frame state
  // write reaching the screen, and the last frame carried 1200 ms, so 00:01 is that proof.
  expect(shownClock()).toBe('00:01');
  expect(reads).toBe(0);
});

test('an open that fails after the parse shows E105 and leaves no loading bar', async () => {
  currentApi = standInApi();
  const toastError = vi.spyOn(toast, 'error');
  vi.mocked(dropPlaybackSelection).mockImplementation(() => {
    throw new Error('a bug of ours, after the parse');
  });
  render(<PlayerShell />);
  act(() => deliver('playerReady'));
  // First, the bar must be gone with the player ready; otherwise "no bar" below proves nothing.
  await loadingBarGone();

  pick(fixture('Punk.gp'));
  await waitFor(
    () =>
      expect(toastError).toHaveBeenCalledWith(expect.stringContaining('(Error E105)'), {
        id: 'E105:Punk.gp',
      }),
    { timeout: 5000 },
  );
  await loadingBarGone();
});

test('a dropped file that fails after the read reports E105 and announces it', async () => {
  currentApi = standInApi();
  vi.mocked(dropPlaybackSelection).mockImplementation(() => {
    throw new Error('a bug of ours, after the parse');
  });
  render(<PlayerShell />);

  fireEvent.drop(screen.getByTestId('drop-zone'), {
    dataTransfer: { files: [fixture('Punk.gp')] },
  });
  await waitFor(() => expect(reported('E105')).toHaveLength(1), { timeout: 5000 });
  // Our own bug: an error, never the warning the visitor's file gets.
  expect(levelsReported('E105')).toEqual(['error']);
  expect(await screen.findByText('Punk.gp could not be opened. Error E105.')).toBeInTheDocument();
});

test('a picked file whose open fails after the swap says it opened, and reports E105 once', async () => {
  currentApi = standInApi();
  const toastError = vi.spyOn(toast, 'error');
  // The first step after the swap. A throw there stands for a bug of ours with the score on screen.
  vi.spyOn(toast, 'success').mockImplementation(() => {
    throw new Error('a bug of ours, after the swap');
  });
  render(<PlayerShell />);
  act(() => deliver('playerReady'));
  await loadingBarGone();

  pick(fixture('Punk.gp'));
  await waitFor(() => expect(reported('E105')).toHaveLength(1), { timeout: 5000 });
  expect(toastError).toHaveBeenCalledWith(
    'Punk.gp opened, but something went wrong on our side. If the player misbehaves, reload the page. (Error E105)',
    { id: 'E105:Punk.gp' },
  );
  expect(toastError).not.toHaveBeenCalledWith(
    expect.stringContaining('could not be opened'),
    expect.anything(),
  );
  await loadingBarGone();
});

test('a dropped file whose open fails after the swap says it opened, not that it failed', async () => {
  currentApi = standInApi();
  const toastError = vi.spyOn(toast, 'error');
  vi.spyOn(toast, 'success').mockImplementation(() => {
    throw new Error('a bug of ours, after the swap');
  });
  render(<PlayerShell />);

  fireEvent.drop(screen.getByTestId('drop-zone'), {
    dataTransfer: { files: [fixture('Punk.gp')] },
  });
  await waitFor(() => expect(reported('E105')).toHaveLength(1), { timeout: 5000 });
  expect(toastError).toHaveBeenCalledWith(
    expect.stringContaining('Punk.gp opened, but something went wrong on our side.'),
    { id: 'E105:Punk.gp' },
  );
  expect(screen.queryByText('Punk.gp could not be opened. Error E105.')).toBeNull();
});

test("the score's names are remembered before the swap, so an E105 quoting one is filtered", async () => {
  currentApi = standInApi();
  // Earlier cases opened files too; only this case's call may count.
  vi.mocked(rememberScore).mockClear();
  vi.mocked(dropPlaybackSelection).mockImplementation(() => {
    throw new Error("Cannot read properties of undefined (reading 'Distortion Guitar')");
  });
  render(<PlayerShell />);
  pick(fixture('Punk.gp'));
  await waitFor(() => expect(reported('E105')).toHaveLength(1), { timeout: 5000 });

  // The names arrived before the step that threw. The list lasts the whole tab, so the order of
  // the two calls is the proof, whatever an earlier case in this file has already remembered.
  const [remembered] = vi.mocked(rememberScore).mock.invocationCallOrder;
  const [threw] = vi.mocked(dropPlaybackSelection).mock.invocationCallOrder;
  expect(remembered).toBeLessThan(threw ?? 0);

  // And once filtered, the report's message holds no name.
  const [[bug]] = reported('E105');
  const event = scrubEvent({
    type: undefined,
    exception: { values: [{ value: (bug as Error).message }] },
  });
  expect(event.exception?.values?.[0]?.value).toBe(
    "Cannot read properties of undefined (reading '[file]')",
  );
});

test('a dropped file is remembered by name before it is read, even when the read fails', async () => {
  currentApi = standInApi();
  // Earlier cases opened files too; only this case's call may count.
  vi.mocked(rememberOpenFile).mockClear();
  const file = fixture('Punk.gp');
  const read = vi.spyOn(file, 'arrayBuffer').mockRejectedValue(new Error('the volume went away'));
  render(<PlayerShell />);

  fireEvent.drop(screen.getByTestId('drop-zone'), { dataTransfer: { files: [file] } });
  await waitFor(() => expect(reported('E102')).toHaveLength(1), { timeout: 5000 });
  // The visitor's file, not our bug: a warning.
  expect(levelsReported('E102')).toEqual(['warning']);

  // The name arrived before the read that failed, so a report quoting it is filtered.
  expect(rememberOpenFile).toHaveBeenCalledWith('Punk.gp');
  const [remembered] = vi.mocked(rememberOpenFile).mock.invocationCallOrder;
  const [tried] = read.mock.invocationCallOrder;
  expect(remembered).toBeLessThan(tried ?? 0);
});

test('the tag is sample once the player mounts', () => {
  render(<PlayerShell />);
  expect(tagNow()).toBe('sample');
});

test('opening Punk.gp sets drums,030', async () => {
  currentApi = standInApi();
  render(<PlayerShell />);
  pick(fixture('Punk.gp'));
  await waitFor(() => expect(tagNow()).toBe('drums,030'), { timeout: 5000 });
});

test('after an unmount, /play keeps the last score and / has none; a new player says sample', async () => {
  currentApi = standInApi();
  const first = render(<PlayerShell />);
  pick(fixture('Punk.gp'));
  await waitFor(() => expect(tagNow()).toBe('drums,030'), { timeout: 5000 });

  first.unmount();
  // The E901 that /play's error page sends after a crash: React has already unmounted the player.
  expect(tagNow('/play')).toBe('drums,030');
  expect(tagNow('/')).toBeUndefined();

  render(<PlayerShell />);
  expect(tagNow('/play')).toBe('sample');
});

test('an open left running across an unmount sets nothing when it ends', async () => {
  currentApi = standInApi();
  const file = fixture('Punk.gp');
  const bytes = await file.arrayBuffer();
  // Set as soon as the read starts: picking the file calls arrayBuffer() at once.
  let release!: (value: ArrayBuffer) => void;
  file.arrayBuffer = () =>
    new Promise((resolve) => {
      release = resolve;
    });

  const first = render(<PlayerShell />);
  pick(file);
  first.unmount();
  render(<PlayerShell />);
  release(bytes);

  // The count returns to zero once the old open ends, and the old player set nothing.
  await waitFor(() => expect(tagNow()).toBe('sample'), { timeout: 5000 });
});

test('with Punk.gp open, a non-score and a Cancel each leave drums,030, and the E103 is untagged', async () => {
  currentApi = standInApi();
  const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
  render(<PlayerShell />);
  pick(fixture('Punk.gp'));
  await waitFor(() => expect(tagNow()).toBe('drums,030'), { timeout: 5000 });

  readTagAtCapture();
  pick(new File(['this is not a guitar pro file'], 'not-a-score.gp'));
  await waitFor(() => expect(reported('E103')).toHaveLength(1), { timeout: 5000 });
  expect(atCapture).toEqual([undefined]);
  await waitFor(() => expect(tagNow()).toBe('drums,030'));

  confirm.mockReturnValue(false);
  pick(fixture('guitar-no-percussion.gp'));
  expect(tagNow()).toBeUndefined(); // the open runs
  await waitFor(() => expect(confirm).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(tagNow()).toBe('drums,030'));
});

test('an E105 before the swap leaves the old value; one just after it, the new one', async () => {
  currentApi = standInApi();
  render(<PlayerShell />);
  readTagAtCapture();

  vi.mocked(dropPlaybackSelection).mockImplementationOnce(() => {
    throw new Error('a bug of ours, before the swap');
  });
  pick(fixture('Punk.gp'));
  await waitFor(() => expect(reported('E105')).toHaveLength(1), { timeout: 5000 });
  await waitFor(() => expect(tagNow()).toBe('sample'));

  vi.spyOn(toast, 'success').mockImplementationOnce(() => {
    throw new Error('a bug of ours, just after the swap');
  });
  pick(fixture('Punk.gp'));
  await waitFor(() => expect(reported('E105')).toHaveLength(2), { timeout: 5000 });
  await waitFor(() => expect(tagNow()).toBe('drums,030'));
  expect(atCapture).toEqual([undefined, undefined]);
});

test("a late score-loaded event for the bundled beat keeps the file's value", async () => {
  currentApi = standInApi();
  render(<PlayerShell />);
  pick(fixture('Punk.gp'));
  await waitFor(() => expect(tagNow()).toBe('drums,030'), { timeout: 5000 });

  const sample = engine.importer.ScoreLoader.loadScoreFromBytes(
    new Uint8Array(readFileSync(path.join(process.cwd(), 'public/notation/1-beat.gp'))),
  );
  act(() => deliver('scoreLoaded', sample));
  expect(tagNow()).toBe('drums,030');
});

test('two opens at once: the one that returns early still puts the tag back', async () => {
  currentApi = standInApi();
  const loading = vi.spyOn(toast, 'loading');
  render(<PlayerShell />);

  // A picked file still being read…
  const picked = fixture('Punk.gp');
  const bytes = await picked.arrayBuffer();
  // Set as soon as the read starts: picking the file calls arrayBuffer() at once.
  let release!: (value: ArrayBuffer) => void;
  picked.arrayBuffer = () =>
    new Promise((resolve) => {
      release = resolve;
    });
  pick(picked);

  // …while a dropped file opens. Once the drop is in flight, the pick's read finishes, and its
  // open returns early (one open at a time).
  fireEvent.drop(screen.getByTestId('drop-zone'), {
    dataTransfer: { files: [fixture('guitar-no-percussion.gp')] },
  });
  await waitFor(() => expect(loading).toHaveBeenCalled());
  release(bytes);

  // Both ended: the count is back to zero, and the tag names the dropped file's one guitar.
  await waitFor(() => expect(tagNow()).toBe('025'), { timeout: 5000 });
});

const refused = (name: 'SecurityError' | 'QuotaExceededError') => new DOMException('blocked', name);

/** Storage throws `error`, but only for the settings document; every other key behaves. */
const settingsKeyThrows = (method: 'getItem' | 'setItem', error: unknown) => {
  const real = Storage.prototype[method] as (this: Storage, ...args: string[]) => unknown;
  vi.spyOn(Storage.prototype, method).mockImplementation(function (
    this: Storage,
    ...args: string[]
  ) {
    if (args[0] === SETTINGS_STORAGE_KEY) throw error;
    return real.apply(this, args) as never;
  });
};

/** The breadcrumbs left with `message`. */
const crumbs = (message: string) =>
  vi
    .mocked(addBreadcrumb)
    .mock.calls.map(([crumb]) => crumb)
    .filter((crumb) => crumb.message === message);

/** Every report sent at the error level, as captureException received it. */
const errorsReported = () =>
  vi
    .mocked(captureException)
    .mock.calls.filter(
      ([, hint]) =>
        (hint as { captureContext?: { level?: string } } | undefined)?.captureContext?.level ===
        'error',
    );

const crumb = (message: string, error: string) => ({
  category: 'notation-hero',
  level: 'warning',
  message,
  data: { error },
});

/** Opens Settings and types a new Zoom. With no engine yet, the edit goes straight to storage. */
const editZoom = () => {
  fireEvent.click(screen.getByTestId('settings-trigger'));
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Zoom' }), { target: { value: '2' } });
};

// Each of the shell's three storage catches tells the visitor's browser (a refusal: a breadcrumb
// that travels with the next real report) from our own bug (anything else: an error). The lint rule
// cannot see a report made in only one branch, so these cases are what pin both arms.
describe('what a settings storage failure reports', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    vi.mocked(addBreadcrumb).mockClear();
  });

  afterEach(() => {
    globalThis.localStorage.clear();
  });

  test('a settings read the browser blocks leaves a breadcrumb, never a report', () => {
    settingsKeyThrows('getItem', refused('SecurityError'));
    render(<PlayerShell />);
    expect(crumbs('Player settings could not be read from storage')).toEqual([
      crumb('Player settings could not be read from storage', 'SecurityError'),
    ]);
    expect(captureException).not.toHaveBeenCalled();
  });

  test('a settings read that fails for any other reason reports an error', () => {
    const bug = new TypeError('our bug');
    settingsKeyThrows('getItem', bug);
    render(<PlayerShell />);
    expect(errorsReported()).toEqual([[bug, { captureContext: { level: 'error', tags: {} } }]]);
    expect(crumbs('Player settings could not be read from storage')).toEqual([]);
  });

  test('a repaired settings write-back the browser refuses leaves a breadcrumb, never an error', async () => {
    globalThis.localStorage.setItem(SETTINGS_STORAGE_KEY, '{broken');
    settingsKeyThrows('setItem', refused('QuotaExceededError'));
    render(<PlayerShell />);
    expect(crumbs('Repaired player settings could not be written back')).toEqual([
      crumb('Repaired player settings could not be written back', 'QuotaExceededError'),
    ]);
    // The corrupt document still sends its own E603 warning; the refusal adds no report.
    await waitFor(() => expect(reported('E603')).toHaveLength(1));
    expect(errorsReported()).toEqual([]);
  });

  test('a repaired settings write-back that fails for any other reason reports an error', async () => {
    globalThis.localStorage.setItem(SETTINGS_STORAGE_KEY, '{broken');
    const bug = new TypeError('our bug');
    settingsKeyThrows('setItem', bug);
    render(<PlayerShell />);
    expect(errorsReported()).toEqual([[bug, { captureContext: { level: 'error', tags: {} } }]]);
    expect(crumbs('Repaired player settings could not be written back')).toEqual([]);
    await waitFor(() => expect(reported('E603')).toHaveLength(1));
  });

  test('a settings edit the browser refuses to save leaves a breadcrumb, never a report', () => {
    render(<PlayerShell />);
    settingsKeyThrows('setItem', refused('SecurityError'));
    editZoom();
    expect(crumbs('Player settings could not be saved')).toEqual([
      crumb('Player settings could not be saved', 'SecurityError'),
    ]);
    expect(captureException).not.toHaveBeenCalled();
  });

  test('a settings edit that fails to save for any other reason reports an error', () => {
    render(<PlayerShell />);
    const bug = new TypeError('our bug');
    settingsKeyThrows('setItem', bug);
    editZoom();
    expect(errorsReported()).toEqual([[bug, { captureContext: { level: 'error', tags: {} } }]]);
    expect(crumbs('Player settings could not be saved')).toEqual([]);
  });
});
