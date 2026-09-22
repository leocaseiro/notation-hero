import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// DI token + factory for the nh_app neon-http client (NH-79 review F12). neon-http is per-query HTTP
// with no connection pool, so a single client is reused for the container's life via the Nest
// singleton provider — no module-level mutable, and tests override CATALOG_DB instead of mocking the
// driver module.
export const CATALOG_DB = Symbol('CATALOG_DB');
export type CatalogDb = ReturnType<typeof drizzle>;

export function createCatalogDb(): CatalogDb {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set (the nh_app connection string).');
  // Per-fetch 8s abort so a slow Neon wake returns a clean 503 (via DbExceptionFilter) instead of a
  // 502 at the Lambda's 10s timeout (review F5). The signal MUST be fresh per request — a single
  // AbortSignal.timeout() in fetchOptions on the singleton client would fire once, 8s after cold
  // start, and break every later request. neonConfig.fetchFunction runs per fetch, so each call gets
  // a fresh signal; there is exactly one neon-http client in the app, so the global config is safe.
  neonConfig.fetchFunction = (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) });
  return drizzle(neon(url));
}
