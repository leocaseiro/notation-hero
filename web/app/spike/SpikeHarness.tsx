'use client';

/**
 * SPIKE harness: mounts/unmounts <AlphaTabDrums /> on demand so the Playwright probe can exercise
 * the destroy() + recreate path directly. React 19 strict mode's double-invoke did NOT fire for
 * this component under Next 16 (see the findings doc), so a manual remount is how the lifecycle
 * actually gets tested for leaked workers / surfaces.
 */

import { useState } from 'react';

import { AlphaTabDrums } from './AlphaTabDrums';

export function SpikeHarness() {
  const [mounted, setMounted] = useState(true);
  const [generation, setGeneration] = useState(0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          data-testid="toggle-mount"
          onClick={() => setMounted((m) => !m)}
          className="rounded-md bg-secondary px-4 py-2"
        >
          {mounted ? 'Unmount player' : 'Mount player'}
        </button>
        <button
          type="button"
          data-testid="remount"
          onClick={() => setGeneration((g) => g + 1)}
          className="rounded-md bg-secondary px-4 py-2"
        >
          Remount (new key)
        </button>
        <span data-testid="generation" className="font-mono text-xs">
          generation {generation} · {mounted ? 'mounted' : 'unmounted'}
        </span>
      </div>
      {mounted ? <AlphaTabDrums key={generation} /> : null}
    </div>
  );
}
