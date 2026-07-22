# Catalog read — service boundary + de-duplication (NH-279)

**Date:** 2026-07-14 · **Ticket:** NH-279 · **PR:** #140 · **Status:** approved by leocaseiro
2026-07-14 (pending a `ce-doc-review` pass)

## 1. Problem

PR #140 review flagged that `web/` re-implements the server's catalog read almost verbatim
(findings #3/#5/#7/#11):

- `web/app/lib/catalog-schema.ts` duplicates the server's Drizzle `playable` table.
- `web/app/catalog/page.tsx` duplicates the ARCH-AUTHZ-1 visibility `WHERE`
  (`status='published' AND listable=true AND origin='curated' AND kind IN (...)`), the `.limit(50)`,
  the kind-guard, and `toDifficulty`.
- `web/app/lib/db.ts` drops the server's per-request `AbortSignal.timeout(8000)`.

The duplication exists because the 2026-07-08 hybrid-BFF ADR has **web read Neon directly**, not via
the NestJS API — so both runtimes need the same schema + policy, and NH-279 re-typed it instead of
sharing it.

## 2. What the investigation found (spike + precedent scan)

We spiked the "obvious" fix — extract schema/policy/factory into `@notation-hero/shared` and import
from both runtimes. **It does not work**, for a structural reason:

- **ESM/CJS dual-package hazard.** `shared` is ESM (`type: module`) so it resolves drizzle-orm's types
  in _import-mode_; the NestJS server is CJS + `nodenext` so it resolves them in _require-mode_.
  TypeScript treats those as two incompatible `PgColumn`/`SQL` types ("separate declarations of private
  property `shouldInlineParams`"), so a shared `playable` table **cannot** be used with the server's
  `eq`/`and`/`inArray`. Both `pnpm typecheck` **and** `nest build` (this repo's build type-checks via
  TSC) failed. Web (bundler resolution) + Vitest (SWC) + dependency-cruiser passed — **the server is the
  hard wall**.
- Making it work would require a **dual-built (CJS+ESM) data-access package** — a build toolchain +
  a build-order dependency, which cuts against the repo's deliberate "plain pnpm, no Nx/Turborepo" ethos.
- **Precedent scan** (create-t3-turbo `packages/db`, Turborepo, Drizzle guidance): mature monorepos keep
  a drizzle-carrying package a _separate leaf_ only server-side code depends on, and ship **built `dist`**
  whenever a non-bundler consumer (a NestJS/Node server) is involved. Raw-`.ts` sharing works only when
  _every_ consumer bundles.

## 3. Decision — Path 2: web reads via the server API

Web stops reading Neon directly and instead fetches the server's existing `GET /api/catalog`
**server-side**, caching the response. Chosen over the alternatives because:

- **Eliminates the dual-package hazard and the duplicated visibility WHERE** — the two problems §1
  identified. The server already owns the schema, policy, and Neon client; web becomes a pure API
  consumer, matching the service-boundary direction (aligns with database-per-service) without requiring
  a dual-built shared package. The duplication was a _symptom_ of the shared-DB coupling; this removes
  the coupling.
- **Dissolves the duplication and the ESM/CJS hazard in one move** — the fix is _deletion_, not
  extraction. Web sheds `drizzle-orm` + `@neondatabase/serverless` entirely.
- **`shared/` holds only a pure TypeScript response contract** — its chartered purpose — with no drizzle,
  no dual-package hazard, no build tax.

**Costs, accepted:** it amends the ratified 2026-07-08 BFF ADR (§8), and re-adds an AWS Lambda hop on
_cache-miss_ reads. The latency cost is bounded and cacheable-away (§6): a user only waits on the Lambda
on a truly-cold blocking miss (first load / week-idle) or immediately after an admin-triggered purge.

### Alternatives rejected

- **Built shared `db` package (dual CJS+ESM).** Keeps direct-Neon reads (fast, no ADR change) but
  _entrenches_ the shared DB and pays a build-tool + build-order tax. Manages the coupling instead of
  removing it.
- **Share pure-only** (`toDifficulty` + kind allow-list + guard). Zero hazard/tax, but the schema — the
  biggest duplication — stays duplicated. Fails the primary goal.
- **Accept the duplication** (status quo). Keeps the ratified BFF ADR intact and defers to oRPC (NH-123),
  which will unify the contract anyway. Rejected because: the visibility WHERE already diverged once
  (web was missing `origin = 'curated'`), and the duplication surface grows with every filter/sort
  addition — deferral compounds the drift risk rather than containing it.
- **Server ESM migration** (`type: module` in `server/package.json`). Would dissolve the dual-package
  hazard by making both runtimes ESM, enabling the shared schema approach. Already rejected in
  `ARCH-FMT-1` (2026-06-17 ADR + NestJS Lambda SWC spike): NestJS decorator metadata, `reflect-metadata`,
  and `@codegenie/serverless-express` are CJS-rooted; esbuild bundles ESM-only deps into the CJS artifact,
  and tree-shaking operates on ESM source regardless of output format — server ESM output adds interop
  friction for zero gain.

## 4. Architecture

**Before:** `web (Vercel) → Neon` _and_ `server (Lambda) → Neon` — two readers, one DB, duplicated
schema/policy.

**After:** `web (Vercel) → GET /api/catalog → server (Lambda) → Neon` — one DB reader (the server); web
is a pure API consumer.

- **Hexagon:** unchanged and cleaner. The schema, visibility filter, `toDifficulty`, kind-guard, and the
  Neon client stay in the server's `adapters/`/`modules/` (their natural home). `core/` purity is
  untouched.
- **`shared/`:** gains `shared/src/contracts/catalog.ts` — the pure response types, imported by the
  server (to type its response) and web (to type the fetch). No runtime, no drizzle.
- **CORS:** none needed — the fetch is **server-side** (Vercel function → Lambda), not browser-origin.

## 5. Changes

### `shared/` (pure contract — no new deps, stays `--noEmit` typecheck)

- Add `shared/src/contracts/catalog.ts`: `CatalogItem` (`id, slug, title, kind, difficulty, level`) and
  `CatalogResponse` (`{ items: CatalogItem[]; count: number }`). Plain TS types.
- Export via the barrel (`shared/src/index.ts`) — replaces the `SHARED_API_VERSION` placeholder.

### `server/`

- `catalog.controller.ts`: **add `level`** to the response object (it already selects `level` for
  `toDifficulty`; include it in the output). **Add `.orderBy(asc(level), asc(title))`** (F1, non-optional)
  so the cached response snapshot has a stable default order; interactive re-sorting stays client-side
  (TanStack).
- Type the response with `@notation-hero/shared` `CatalogResponse`/`CatalogItem` (shared contract).
  `CatalogPlayable` becomes `CatalogItem` from shared.
- Everything else (schema, `catalog.util`, db-adapter, the WHERE, the guard) **stays as-is** — no
  extraction.

### `web/`

- `app/catalog/page.tsx` `getCatalog()`: replace the Drizzle query with a **server-side cached fetch** to
  `${process.env.API_BASE_URL}/api/catalog`, keeping `'use cache: remote'` + `cacheTag('catalog')` +
  `cacheLife('days')` + `connection()` + `<Suspense>`. Parse the JSON to the shared `CatalogResponse`;
  map `items` → `CatalogItem[]` (near 1:1). `toDifficulty` is no longer needed on web (the API returns
  `difficulty`).
- `app/catalog/catalog-table.tsx`: its local `CatalogItem` interface is now identical to the shared
  contract — import `CatalogItem` from `@notation-hero/shared` instead (one shared type, not two).
- **Delete** `app/lib/db.ts` and `app/lib/catalog-schema.ts`.
- **Remove** `drizzle-orm` + `@neondatabase/serverless` from `web/package.json`.
- Add `@notation-hero/shared` as a `workspace:*` dep; add `'@notation-hero/shared'` to
  `transpilePackages` in `next.config.ts` (raw-TS types — safe, pure contract).
- Add `API_BASE_URL` env var (local: `http://localhost:3001`; prod: the deployed API origin) — web env +
  Vercel project env (redeploy after adding — existing deploys don't pick up new env vars).
- Guard `getCatalog()` with `if (!response.ok) throw new Error(...)` before parsing — the route error
  boundary (`error.tsx`) handles the throw.
- `error.tsx` stays — a fetch failure trips the same route error boundary.

## 6. Caching & revalidation

Cache lives on the **web (Vercel remote cache)** wrapping the `/api/catalog` fetch. `cacheLife('days')` =
`stale` 5 min · `revalidate` 1 day · `expire` 1 week (Next 16 preset; verified against the bundled docs).

- **Default = timer delay.** `revalidate: 1 day` (customizable via a `cacheLife` profile) is the
  "delay after latest save" behavior. **No auto-purge on catalog writes** — per the requirement, we do
  not wire `revalidateTag` into every write.
- **Admin-triggered purge (immediate).** `cacheTag('catalog')` is kept in place now so a future
  `updateTag('catalog')` can force-refresh on demand. The **secured revalidation route + the admin
  "publish/refresh" button ship with the admin/CMS work** (they need the admin UI; out of scope here).
  This is a documented follow-up, not dropped.
- A true "1 day _after the last save_" debounce would need a scheduler — deemed overkill; the timer +
  admin trigger covers the intent.

**Latency profile (why the Lambda hop is acceptable):** a user waits on the Lambda cold start only on a
cold blocking miss (first load / >1 week idle) or the first visit right after an admin purge. Steady-state
hits and the background stale-while-revalidate refresh never make a user wait on the Lambda. Cold-start
latency has not been measured yet — add a benchmark before merge (see §10).

## 7. Testing (integration-first for web)

- **Server (existing lane):** the schema DDL-drift spec, `toDifficulty` spec, and the visibility/guard
  behavior stay server-side and keep their coverage (unchanged — the logic never left the server).
  The `level` field and `orderBy` additions (§5) require extending the controller spec: update the `makeDb` mock chain to include an `orderBy` step between `where()` and `limit()`, and add `level` to the expected response assertions.
- **Web (new vitest lane — the "test web now" decision):** stand up `vitest` + Testing Library + jsdom,
  mirroring `client/`. Cover:
  - `getCatalog()` maps a mocked `/api/catalog` JSON response to `CatalogItem[]` (mock `fetch`); asserts
    the shape + a failure path (fetch error → throws → error boundary).
  - `CatalogDataTable` renders rows from data + the empty state.
- **Shared contract:** pure types (no runtime to test). Runtime response validation (Zod) is a
  recommended fast follow (§10 — risk mitigation), not required for this PR.

## 8. Governance — supersede the BFF ADR + capture the diagram

- **New superseding ADR** (`docs/decisions/2026-07-14-catalog-read-service-boundary-adr.md`): documents the
  Path 2 decision and **supersedes the direct-Neon read path for catalog (and any Drizzle-dependent read)**
  from the 2026-07-08 hybrid-BFF ADR — not a blanket prohibition. Future reads that don't share Drizzle
  schema across CJS/ESM boundaries may still use direct Neon access per the original BFF ADR. Embed the
  cache / cold-start scenarios diagram as inline **SVG** (renders on GitHub; the HTML widget does not).
- **Banner** the superseded direct-Neon part of the 2026-07-08 ADR (`docs/decisions/2026-07-08-fe-nextjs-vercel-aws-bff-adr.md`), and add a `decision-registry.md`
  Change-log entry (date, outcome, reasoning: DB-boundary principle + ESM/CJS hazard + spike evidence).
  The register update travels in this PR so it lands atomically.
- Update `AGENTS.md`'s "Current direction" snapshot line about the web reading Neon directly.

## 9. Scope

**In:** shared contract type · server adds `level` (+ optional orderBy) + types via shared · web fetches
the cached API + deletes its DB code + sheds drizzle/neon deps · `API_BASE_URL` wiring · web vitest lane +
tests · superseding ADR (+ embedded diagram) + registry + AGENTS.md · keep `cacheTag('catalog')` +
`cacheLife` hooks.

**Out:** the secured revalidation endpoint + admin "publish/refresh" button (ship with admin/CMS work) ·
any Neon schema/migration change · web Playwright/VR/a11y lanes · a debounce-since-save scheduler ·
Zod runtime validation of the response (recommended fast follow — §10).

## 10. Open questions / follow-ups

- **`API_BASE_URL` in production:** the exact origin (Function URL vs CloudFront vs API Gateway) — confirm
  against the current infra. Local dev = `http://localhost:3001`.
- **Cold-start latency benchmark:** measure Lambda cold start (Lambda init + Neon connect + query) for the
  catalog endpoint before merge. Record the number in §6 so the "acceptable" claim is grounded.
- **Response validation (risk mitigation):** the shared contract is currently a TS type cast
  (`as CatalogResponse`). Moving from compile-time Drizzle types to a runtime JSON convention relocated
  the drift risk rather than eliminating it. A Zod schema in `shared/` would catch server-side shape
  drift at runtime instead of silently producing undefined fields. Low cross-package risk (Zod has no
  private-member hazard). Recommended as a fast follow.
- **Revalidation endpoint + admin button:** follow-up ticket with the admin/CMS work (§6).
- **Server-side filtering / search / pagination (NH-123):** today the API returns the full curated list
  (≤50) pre-sorted (F1), and web caches it whole + sorts/filters on the client (TanStack). When the
  catalog needs real search + pagination, the API grows query params
  (`?search=&level=&page=&sort=`) and does the work DB-side; caching then shifts to per-key (cache the
  default page; short/no cache for high-cardinality searches — Next's cache-key guidance). Path 2 is the
  right base: the query logic lives once in the server, and web stays a thin cached client (direct-Neon
  would force web to duplicate the paginated-search query).

## 11. Verification gates (all must pass before push)

`pnpm run lint` · `pnpm run typecheck` · server `test` + `build:lambda` (DI smoke) · web `typecheck` +
`build` + new `test` · `pnpm run depcheck` · `pnpm run syncpack` · the `pr-checklist` gate (verbatim
template checklist ticked + NH-279 in title/body).
