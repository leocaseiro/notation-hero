# @notation-hero/web

The Notation Hero **product PWA** — Next.js 16 (App Router, Turbopack, React Compiler). It consumes
the `client/` design system across the package boundary.

**`/play`** is the v0 player: open a score from disk — with the file picker, or by dropping one
onto the player — see it as drum notation, and press play. AlphaTab is self-hosted, vendored into
`public/alphatab/` by `scripts/vendor-alphatab.mjs`, which runs from both `dev` and `build`.

## Scripts

| Script                                                | What                                                                                                                                                                             |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter @notation-hero/web run dev`            | Dev server on **:3002**, or the next free port if it is busy (:3000 and :3001 are the client SPA and the API)                                                                    |
| `pnpm --filter @notation-hero/web run build`          | Production build (Turbopack)                                                                                                                                                     |
| `pnpm --filter @notation-hero/web run start`          | Serve the production build                                                                                                                                                       |
| `pnpm --filter @notation-hero/web run lint`           | ESLint — the shared base (`eslint.config.base.mjs`) + Next config                                                                                                                |
| `pnpm --filter @notation-hero/web run typecheck`      | `tsc --noEmit`                                                                                                                                                                   |
| `pnpm --filter @notation-hero/web run test`           | Vitest unit tests                                                                                                                                                                |
| `pnpm --filter @notation-hero/web run test:e2e`       | Behaviour + accessibility against the built app. The `web` CI job runs this together with `test:vr` in ONE unscoped `playwright test`, so a red `web` job can be a pixel failure |
| `pnpm --filter @notation-hero/web run test:e2e:ui`    | The same suite in Playwright's interactive UI mode                                                                                                                               |
| `pnpm --filter @notation-hero/web run test:vr`        | The ten page screenshots, compared against the committed Linux baselines                                                                                                         |
| `pnpm --filter @notation-hero/web run test:vr:update` | Rewrite those baselines. Linux-only: regenerate through `pnpm test:web:docker:update`, never from a local Mac run                                                                |

Root orchestration (`pnpm -r`) picks these up automatically; `pnpm run check:all` covers lint +
typecheck across every package.

## Deploy

Hosted on **Vercel Hobby** ($0, non-commercial) at <https://notation-hero-web.vercel.app>.
The Vercel GitHub integration auto-deploys on push to `master` and creates preview deploys for
PR branches. Configuration: [`vercel.json`](vercel.json).

**Error monitoring (Sentry).** Two environment variables, both in Vercel's **Production**
environment only — previews, CI and local builds have neither, so they send nothing and upload
nothing:

| Variable                 | What it is                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SENTRY_DSN` | Where error reports go. Public by design: it ships inside the page.                                                                                                             |
| `SENTRY_AUTH_TOKEN`      | The organization token the production build uses to upload source maps. Marked **Secret** (Vercel's name for what it called Sensitive). Never in chat, never in the repository. |

A production deploy **fails**, and the previous one stays live, when the source-map upload fails —
Sentry is down, or the token was revoked or has expired — when the token is set but
`next.config.ts` names no Sentry `org` and `project`, and when the token's value reaches a file a
browser downloads (`scripts/assert-no-auth-token.mjs`). Redeploy once Sentry answers; replace the
token in Vercel if it was revoked. Only a production build reads the token (`VERCEL_ENV` is
`production`), so a `SENTRY_AUTH_TOKEN` in your own shell — Sentry's command-line tools read that
name — never makes a local build upload: the build script hands `next build` your shell's
`VERCEL_ENV`, so a `web/.env` file cannot make it `production`. Do not pull Production variables
into `web/` (`vercel env pull --environment=production`): they include the production DSN, so
`pnpm dev` would report into the production project. The one-time setup is section 5 of
[the spec](../docs/specs/2026-10-03-nh-124-sentry-error-monitoring-design.md).

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
