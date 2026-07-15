import type { CatalogItem, CatalogResponse } from '@notation-hero/shared';

// Server-side read of the catalog via the server API (NH-279 service boundary). Runs inside the
// cached getCatalog() wrapper in page.tsx ('use cache: remote'), so a user waits on the Lambda only
// on a cache miss. No CORS: this is a server-to-server fetch (Vercel function -> Lambda), not a
// browser-origin call. A non-OK response throws, tripping the /catalog route error boundary
// (error.tsx). The JSON is trusted to match the shared contract; a runtime Zod check is a
// recommended fast-follow (spec §10), not part of this PR.
export async function fetchCatalog(): Promise<CatalogItem[]> {
  const base = process.env.API_BASE_URL;
  if (!base) {
    throw new Error('API_BASE_URL is not set');
  }

  const response = await fetch(`${base}/api/catalog`);
  if (!response.ok) {
    throw new Error(`catalog API returned ${response.status}`);
  }

  const data = (await response.json()) as CatalogResponse;
  return data.items;
}
