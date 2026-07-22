import { z } from 'zod';

import type { CatalogItem, CatalogResponse } from '@notation-hero/shared';

// The catalog read response as a runtime Zod schema. It lives HERE, not in shared/, because shared/
// ships raw .ts with a `.js`-specifier re-export that Turbopack cannot resolve as a runtime VALUE
// import (NH-284) — so shared/ stays type-only. `satisfies z.ZodType<CatalogResponse>` binds the
// schema to shared's type so the two cannot drift; a mismatch fails the web typecheck. (This is the
// approved "Option C" fallback for NH-279 F-2: promote the schema into shared/ once shared emits a
// real JS build, so web and the server can share one schema.)
const catalogResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      title: z.string(),
      kind: z.enum(['song', 'pattern', 'lesson']),
      difficulty: z.string(),
      level: z.number().nullable(),
    }),
  ),
  count: z.number(),
}) satisfies z.ZodType<CatalogResponse>;

// Server-side read of the catalog via the server API (NH-279 service boundary). Runs inside the
// cached getCatalog() wrapper in page.tsx ('use cache: remote'), so a user waits on the Lambda only
// on a cache miss. No CORS: this is a server-to-server fetch (Vercel function -> Lambda), not a
// browser-origin call. A non-OK response throws, tripping the /catalog route error boundary
// (error.tsx). The response is validated at runtime against catalogResponseSchema: a bad-shape
// response (e.g. a deploy-skew window where web and server disagree) throws into error.tsx instead
// of caching undefined fields (NH-279 F-2/F-3).
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

  const data = catalogResponseSchema.parse(await response.json());
  return data.items;
}
