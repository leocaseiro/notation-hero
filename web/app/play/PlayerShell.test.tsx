// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- Vitest files are never bundled by Next, so the double-bundle reason for this fence does not apply
import * as engine from '@coderline/alphatab';
import { act, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

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

// Every AlphaTab subscription, captured by event name, so a test can deliver one. `useAlphaTab`
// itself returns no api: this file drives the shell's OWN state commits, and every handler that
// touches the api guards on it.
const handlers = new Map<string, (args: unknown) => void>();
vi.mock('../../lib/alphatab/useAlphaTab', () => ({
  useAlphaTab: () => [undefined, { current: null }],
  useAlphaTabEvent: (_api: unknown, name: string, handler: (args: unknown) => void) => {
    handlers.set(name, handler);
  },
  setAlphaTabValue: () => {},
}));

// Imported after the vi.mock calls on purpose: Vitest hoists them, and keeping the import below
// them makes the dependency order readable rather than surprising.
import { PlayerShell } from './PlayerShell';

import type { ReactNode } from 'react';

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
      handlers.get('playerPositionChanged')?.({
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
