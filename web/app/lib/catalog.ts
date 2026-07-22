import type { CatalogItem, CatalogResponse } from '@notation-hero/shared';

// Server-side read of the catalog via the server API (NH-279 service boundary). Runs inside the
// cached getCatalog() wrapper in page.tsx ('use cache: remote'), so a user waits on the Lambda only
// on a cache miss. No CORS: this is a server-to-server fetch (Vercel function -> Lambda), not a
// browser-origin call. A non-OK response throws, tripping the /catalog route error boundary
// (error.tsx). The JSON is trusted to match the shared contract; a runtime Zod check is a
// recommended fast-follow (spec §10), not part of this PR.
export async function fetchCatalog(): Promise<CatalogItem[]> {
  // AWS Lambda Function URLs come WITH a trailing slash; strip trailing slashes so
  // `${base}/api/catalog` never doubles into `//api/catalog` (NH-279). A loop (not a `/\/+$/`
  // regex) keeps it linear — sonarjs flags the `+$` regex as super-linear backtracking.
  let base = process.env.API_BASE_URL ?? '';
  while (base.endsWith('/')) {
    base = base.slice(0, -1);
  }
  if (!base) {
    throw new Error('API_BASE_URL is not set');
  }

  // 8s abort so a cold or hung Lambda fails fast into error.tsx instead of holding the Vercel
  // function to its platform timeout (NH-279; restores the bound the deleted db.ts once had).
  const response = await fetch(`${base}/api/catalog`, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) {
    throw new Error(`catalog API returned ${response.status}`);
  }

  const data = (await response.json()) as CatalogResponse;
  return data.items;
}
