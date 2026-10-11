import { readFileSync } from 'node:fs';
import path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- Vitest files are never bundled by Next, so the double-bundle reason for this fence does not apply
import * as engine from '@coderline/alphatab';
import { toast } from '@notation-hero/client';
import { captureException } from '@sentry/nextjs';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

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

// Wrapped so a case can see WHEN the score's names were remembered. Its behaviour is unchanged.
vi.mock('../../lib/monitoring/scrub', async (importOriginal) => {
  const real = (await importOriginal()) as Record<string, unknown>;
  const rememberScore = real.rememberScore as (score: unknown) => void;
  return { ...real, rememberScore: vi.fn(rememberScore) };
});

// Imported after the vi.mock calls on purpose: Vitest hoists them, and keeping the import below
// them makes the dependency order readable rather than surprising.
import { dropPlaybackSelection } from '../../lib/alphatab/playback-selection';
import { rememberScore, scrubEvent } from '../../lib/monitoring/scrub';
import { PlayerShell } from './PlayerShell';

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

/** Waits until the loading bar has left the page: it fades for 700 ms once nothing is pending. */
const loadingBarGone = () =>
  waitFor(
    () => expect(screen.queryByRole('progressbar', { name: 'Loading the player' })).toBeNull(),
    { timeout: 3000 },
  );

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
