---
paths:
  - 'web/**'
---

# Next.js 16 — this is NOT the Next.js you know

Next.js 16 has breaking changes from earlier versions: APIs, conventions, caching, and file
structure differ from model training data.

**Before writing or advising on any Next.js / Vercel code, read the version-exact docs bundled in
the installed package:** `web/node_modules/next/dist/docs/`. Heed the deprecation notices there.
Do not rely on training knowledge for Next.js caching, rendering, or config — it is stale.

## Caching (the highest-risk area)

- The recommended model is **Cache Components** (`cacheComponents: true`) with the `'use cache'` and
  `'use cache: remote'` directives. See `01-app/03-api-reference/01-directives/use-cache.md`,
  `use-cache-remote.md`, and `01-app/02-guides/migrating-to-cache-components.md`.
- Plain `'use cache'` is **in-memory per serverless instance**. On Vercel it does NOT persist across
  cold starts or separate instances, so the upstream source (Neon) is re-queried. Use
  `'use cache: remote'` for durable caching shared across instances.
- `unstable_cache` is the documented **previous model** and is deprecated — do not reach for it in
  new code.
- Defer request-time work with `connection()` + `<Suspense>`, not
  `export const dynamic = 'force-dynamic'`.
