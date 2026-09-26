// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- Vitest files are never bundled by Next, so the double-bundle reason for this fence does not apply
import * as engine from '@coderline/alphatab';
import { act, render, screen } from '@testing-library/react';
import { useCallback, useMemo, useState } from 'react';
import { expect, test, vi } from 'vitest';

// The per-row work, counted. valueOf calls readSettingValue once for every settings-sourced row, so
// the call count IS the number of rows rebuilt — no profiler needed.
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

// The real engine namespace, so buildSettingGroups yields all the real rows rather than an empty
// tree. The popover reaches it through the context hook, which would otherwise load it over the
// network.
vi.mock('../../lib/alphatab/AlphaTabEngineContext', () => ({
  useAlphaTabEngine: () => ({ engine, error: null }),
}));
vi.mock('../../lib/alphatab/useAlphaTab', () => ({
  useAlphaTabEvent: () => {},
  setAlphaTabValue: () => {},
}));

// Imported after the vi.mock calls on purpose: Vitest hoists them, and keeping the import below
// them makes the dependency order readable rather than surprising.
import { SettingsPopover } from './SettingsPopover';

/**
 * Stands in for PlayerShell while the transport runs: `tick` is the once-per-animation-frame
 * position commit (PlayerShell coalesces AlphaTab's ~345 positionChanged events per second down to
 * one state write per frame, so one tick here is one real frame).
 *
 * Every other prop mirrors the real shell, where they are all reference-stable: applySetting,
 * applyApiValue and runAction are useCallback-wrapped, `settings` and `api` are state, and
 * mixUnavailable is a module constant or undefined.
 */
function Shell({ stableApiValues }: { readonly stableApiValues: boolean }) {
  const [tick, setTick] = useState(0);
  const stable = useMemo(() => ({ masterVolume: 1, playbackSpeed: 100 }), []);
  const settings = useMemo(() => ({ display: { scale: 1 } }), []);
  const onSettingChange = useCallback(() => {}, []);
  const onApiValueChange = useCallback(() => {}, []);
  const onAction = useCallback(() => {}, []);

  return (
    <>
      <button type="button" onClick={() => setTick((t) => t + 1)}>
        frame
      </button>
      <span data-testid="tick">{tick}</span>
      <SettingsPopover
        api={undefined as never}
        settings={settings as never}
        onSettingChange={onSettingChange}
        apiValues={(stableApiValues ? stable : { masterVolume: 1, playbackSpeed: 100 }) as never}
        onApiValueChange={onApiValueChange}
        onAction={onAction}
      />
    </>
  );
}

/** Three animation frames of transport position commits, and proof the shell really re-rendered. */
function runFrames(): number {
  rowRead.mockClear();
  const frame = screen.getByRole('button', { name: 'frame' });
  for (let index = 0; index < 3; index += 1) act(() => frame.click());
  expect(screen.getByTestId('tick').textContent).toBe('3');
  return rowRead.mock.calls.length;
}

test('a CLOSED popover rebuilds no rows while the transport runs', () => {
  render(<Shell stableApiValues />);
  // The rows ARE built once on mount, closed: the row map sits in JSX children, which are
  // evaluated when the element is created, not when the popover opens.
  expect(rowRead.mock.calls.length).toBeGreaterThan(0);
  expect(screen.queryByRole('dialog')).toBeNull();

  // Nothing rebuilt across three frames — memo() skips the whole body when no prop changed.
  expect(runFrames()).toBe(0);
});

test('an unstable apiValues defeats memo() on its own — why PlayerShell keeps it memoised', () => {
  // Why the other half of the fix exists. memo() is a SHALLOW comparison, so one fresh object
  // literal per render is enough to fail it and re-render the whole tree — measured at every
  // settings row re-read on every frame, popover closed. This case proves the MECHANISM on the
  // stand-in shell above; PlayerShell is not rendered here, so it cannot fail when PlayerShell's
  // own useMemo goes. PlayerShell.test.tsx is the case that does.
  render(<Shell stableApiValues={false} />);
  expect(runFrames()).toBeGreaterThan(0);
});
