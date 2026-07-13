# @notation-hero/web

The Notation Hero **product PWA** — Next.js 16 (App Router, Turbopack, React Compiler). It consumes
the `client/` design system across the package boundary.

## Scripts

| Script                                           | What                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------ |
| `pnpm --filter @notation-hero/web run dev`       | Dev server on **:3002** (:3000 and :3001 are the client SPA and the API) |
| `pnpm --filter @notation-hero/web run build`     | Production build (Turbopack)                                             |
| `pnpm --filter @notation-hero/web run start`     | Serve the production build                                               |
| `pnpm --filter @notation-hero/web run lint`      | ESLint — the shared base (`eslint.config.base.mjs`) + Next config        |
| `pnpm --filter @notation-hero/web run typecheck` | `tsc --noEmit`                                                           |

Root orchestration (`pnpm -r`) picks these up automatically; `pnpm run check:all` covers lint +
typecheck across every package.

## Deploy

Hosted on **Vercel Hobby** ($0, non-commercial). The Vercel GitHub integration auto-deploys on
push to `master` and creates preview deploys for PR branches. Configuration: [`vercel.json`](vercel.json).

## Design-system boundary

Components come from `@notation-hero/client` through its **package barrel**. **Phase 1 exposes only
`Button`** (`client/src/index.ts`); the full barrel lands with the Phase-2 design-system rename.

Import from the package specifier — never a client subpath:

```ts
import { Button } from '@notation-hero/client'; // ✅
// import { Button } from '@/components/ui/Button/Button'; // ❌ reaches into client/src, bypasses the barrel
```

The `@/*` alias exists only so Turbopack can resolve the transpiled client source's own internal
imports; a `no-restricted-imports` rule in `web/eslint.config.mjs` blocks it in `web/app/**`.

## Styling

`web/app/globals.css` imports the design system's stylesheet (`@import
'@notation-hero/client/styles.css'` — tokens + base) and scans the design-system components for
their Tailwind classes (`@source '../../client/src/components/ui/**/*.tsx'`, minus co-located
stories/tests). Moving that `@source` **into the library itself** — so consumers write only the
`@import` and hardcode nothing — is the ratified next step (Q1 spike confirmed it resolves).

Distribution architecture and its trade-offs:
[`docs/decisions/2026-07-12-design-system-distribution-adr.md`](../docs/decisions/2026-07-12-design-system-distribution-adr.md).
