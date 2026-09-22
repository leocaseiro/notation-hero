import type * as AlphaTab from '@coderline/alphatab';

/** The awaited namespace object — the ONLY runtime source of AlphaTab values (spec §5). */
export type AlphaTabEngine = typeof AlphaTab;

/**
 * Served from web/public/alphatab/esm/ by scripts/vendor-alphatab.mjs.
 *
 * This MUST stay a variable. A string literal in the import below makes `tsc` resolve it at
 * compile time and fail the build, and it lets Turbopack statically analyse (and therefore
 * re-bundle) the library — which is exactly what this whole arrangement avoids.
 */
const ALPHATAB_ESM_URL = '/alphatab/esm/alphaTab.mjs';

let pending: Promise<AlphaTabEngine> | null = null;

/**
 * Imports the self-hosted AlphaTab ESM and resolves with the namespace object.
 *
 * There is deliberately NO font wait here. AlphaTab registers its SMuFL face under the family
 * `alphaTab` (generated as `alphaTab${fontSuffix}` in BrowserUiFacade), not `Bravura` — "Bravura"
 * survives only as the FILE NAME in the @font-face src — and it injects that face during
 * `AlphaTabApi` construction, long after this import resolves. So `document.fonts.load('1em Bravura')`
 * matches zero registered faces and settles instantly: verified in Chromium, 0 faces matched in
 * both orderings. (`document.fonts.check('1em Bravura')` is worse — it returns TRUE with no faces
 * registered, reporting the system fallback.) The Skeleton still covers the 306 KB font fetch,
 * because it lifts on `api.renderFinished`, which AlphaTab holds until its own FontLoadingChecker
 * reports the `alphaTab` family available.
 *
 * Memoised: two mounts (React 19 strict mode double-invokes effects in dev) share one module
 * instance.
 *
 * The memo caches a REJECTION as well as a success: `pending ??=` keeps the first promise whatever
 * it settles to, so one failed import is permanent for the page and a reload is the only recovery —
 * which is exactly what the engine-error message tells the visitor. The `.catch(() => null)` retry
 * in the file-open path therefore cannot succeed after a failure; it only covers the case where
 * the import is still in flight.
 */
export function loadAlphaTabEngine(): Promise<AlphaTabEngine> {
  pending ??= (async () => {
    const engine = (await import(/* turbopackIgnore: true */ ALPHATAB_ESM_URL)) as AlphaTabEngine;
    return engine;
  })();
  return pending;
}

/**
 * Reads the log level from NEXT_PUBLIC_ALPHATAB_LOG_LEVEL, defaulting to Info.
 *
 * The worklet regression test asserts AlphaTab's `Platform: BrowserModule` debug line, which needs
 * Debug — but shipping Debug prints the visitor's user agent, window size and screen size to their
 * console. The Playwright config sets the variable for its own build; production stays on Info.
 *
 * NEXT_PUBLIC_* is inlined at BUILD time, so the lane's webServer command must run `next build`
 * with the variable set — setting it only for `next start` does nothing.
 */
export function resolveLogLevel(engine: AlphaTabEngine): AlphaTab.LogLevel {
  const configured = process.env.NEXT_PUBLIC_ALPHATAB_LOG_LEVEL;
  return configured === 'Debug' ? engine.LogLevel.Debug : engine.LogLevel.Info;
}

/** Test seam: drops the memoised module so a test can force a fresh import. Not used in the app. */
export function resetAlphaTabEngineForTests(): void {
  pending = null;
}
