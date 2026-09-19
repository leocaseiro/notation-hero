'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { loadAlphaTabEngine } from './engine';
import type { AlphaTabEngine } from './engine';
import type { ReactNode } from 'react';

export interface AlphaTabEngineState {
  /** The loaded namespace, or null while it is still arriving. */
  engine: AlphaTabEngine | null;
  /** Set when the dynamic import itself rejected — api.error cannot see this (spec §4). */
  error: Error | null;
}

// The context is scoped to web/ consumers on purpose. The dependency edge runs one way, so a
// context created here is invisible inside client/ — which is why every client/ control takes its
// enum options and accessors as props instead of reading them off the library (spec §7).
const AlphaTabEngineContext = createContext<AlphaTabEngineState>({ engine: null, error: null });

export function AlphaTabEngineProvider({ children }: Readonly<{ children: ReactNode }>): ReactNode {
  const [state, setState] = useState<AlphaTabEngineState>({ engine: null, error: null });

  useEffect(() => {
    let disposed = false;
    // The spike's bare `void (async () => …)()` has no catch. Without one, a failed engine import
    // rejects into an unhandled promise and the UI shows a Skeleton forever instead of the error
    // message the spec's failure table requires.
    loadAlphaTabEngine()
      .then((engine) => {
        if (!disposed) setState({ engine, error: null });
        // `promise/always-return` is an error in web/: every .then must return or throw.
        return engine;
      })
      .catch((error: unknown) => {
        if (!disposed) {
          setState({
            engine: null,
            error: error instanceof Error ? error : new Error(String(error)),
          });
        }
      });
    return () => {
      disposed = true;
    };
  }, []);

  const value = useMemo(() => state, [state]);
  return <AlphaTabEngineContext value={value}>{children}</AlphaTabEngineContext>;
}

export function useAlphaTabEngine(): AlphaTabEngineState {
  return useContext(AlphaTabEngineContext);
}
