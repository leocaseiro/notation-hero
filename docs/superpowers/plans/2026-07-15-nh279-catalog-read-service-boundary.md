# Catalog read — service boundary (NH-279, Path 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the `web/` Next.js client from reading Neon directly; make it a pure cached consumer of the server's `GET /api/catalog`, sharing one pure-TypeScript response contract, and delete the duplicated schema/policy.

**Architecture:** Today two runtimes read one Neon DB (`web → Neon` and `server → Neon`), so `web/` re-typed the server's Drizzle `playable` table and its ARCH-AUTHZ-1 visibility `WHERE`. This plan moves to **Path 2**: `web (Vercel) → GET /api/catalog → server (Lambda) → Neon` — the server stays the only DB reader, `shared/` gains a pure `CatalogResponse`/`CatalogItem` type (no drizzle, no runtime), and `web/` sheds `drizzle-orm` + `@neondatabase/serverless` entirely. The fix is deletion, not extraction — which is why it dodges the ESM/CJS dual-package hazard that killed the "shared Drizzle table" spike (a shared drizzle table fails to typecheck across the server's CJS `nodenext` and web's ESM bundler resolution; pure interfaces have no runtime and no private-member identity, so they cross the boundary cleanly).

**Tech Stack:** pnpm workspaces (no Nx/Turborepo) · TypeScript · NestJS (server, CJS `nodenext`, Vitest) · Next.js 16.2.10 App Router (web, Vercel, Cache Components) · Drizzle ORM over `@neondatabase/serverless` (server only, after this change) · Vitest + Testing Library + jsdom (new web lane) · Pulumi (untouched here).

**Source spec:** [`docs/superpowers/specs/2026-07-14-nh279-catalog-read-service-boundary-design.md`](../specs/2026-07-14-nh279-catalog-read-service-boundary-design.md) (approved, ce-doc-reviewed). This plan implements it.

## Global Constraints

Every task's requirements implicitly include this section.

- **Node 24** (`.nvmrc`); plain **pnpm workspaces** — never introduce Nx/Turborepo or a build-order dependency.
- **`shared/` stays pure types only** — NO drizzle, NO runtime values, NO new dependencies. This is the whole reason Path 2 works. The **server imports the contract type-only** (`import type { … } from '@notation-hero/shared'`) so nothing from the ESM `shared` package is `require()`d at runtime from the CJS server.
- **Co-locate tests next to source** — `Foo.ts` beside `Foo.test.ts`. NEVER create `__tests__/`, `__mocks__/`, or `stories/` directories (CI layout guard fails them).
- Tests run under **Vitest**, not Jest.
- **syncpack** (`pnpm run syncpack`) is a gate: any dependency shared across packages must use an **identical version range**. The new web test deps MUST match `client/`'s exact ranges (listed in Task 3). `@notation-hero/shared` is `workspace:*` everywhere.
- **Supply-chain release-age gate** (`minimumReleaseAge` = 7 days in `pnpm-workspace.yaml`): do NOT `pnpm add <pkg>@latest`. Add the new web deps by editing `web/package.json` to the ranges below and running `pnpm install` — they resolve to `client/`'s already-locked versions from the store, so the age gate never trips.
- **sort-package-json** is a gate: keep every `package.json`'s keys sorted (the full files below are already in sorted order).
- **Next.js 16.2.10 — read the bundled docs before writing caching code.** Training data is stale (`unstable_cache` is deprecated; plain `'use cache'` is in-memory per instance and re-hits the origin on Vercel cold starts). The design uses `'use cache: remote'`. Confirm the directive + `cacheLife`/`cacheTag`/`connection()` semantics against `web/node_modules/next/dist/docs/` (Task 4, Step 1).
- USA spelling **"catalog"** repo-wide.
- **Never** `git commit/push --no-verify`. Default branch is `master`. Commit a green checkpoint at the end of every task.
- **Governance travels with the PR:** the decision-registry Change-log entry + status flips land in this same PR (Task 5).
- **This branch → PR #140.** Work is on `claude/nh-279-catalog-service-boundary` (branched off #140's head `69c4ce5`). Final push updates PR #140: `git push origin HEAD:claude/neon-data-nextjs-table-416796` (Task 6). Do NOT open a second PR.

---

## File Structure

**`shared/` — the pure contract (new home for the response type)**

- `shared/src/contracts/catalog.ts` _(create)_ — `CatalogItem` + `CatalogResponse` interfaces. One responsibility: the FE↔BE catalog-read shape.
- `shared/src/index.ts` _(modify)_ — barrel; re-export the contract, retire the `SHARED_API_VERSION` placeholder.
- `shared/package.json` _(modify)_ — give `exports` an explicit `{ types, default }` condition so the CJS `nodenext` server resolves the pure types robustly.

**`server/` — one small response change, typed via the contract**

- `server/src/modules/catalog/catalog.controller.ts` _(modify)_ — add `level` to each item, add `.orderBy(asc(level), asc(title))`, type the response with `@notation-hero/shared`.
- `server/src/modules/catalog/catalog.controller.spec.ts` _(modify)_ — extend the fake query chain with an `orderBy` step; assert `level` + ordering.
- `server/package.json` _(modify)_ — add `@notation-hero/shared` dep.

**`web/` — becomes a pure cached API consumer**

- `web/app/lib/catalog.ts` _(create)_ — `fetchCatalog()`: the testable server-side API client (replaces `db.ts`/`catalog-schema.ts` as the folder's reason to exist).
- `web/app/catalog/page.tsx` _(modify)_ — `getCatalog()` becomes the thin `'use cache: remote'` wrapper over `fetchCatalog()`.
- `web/app/catalog/catalog-table.tsx` _(modify)_ — import `CatalogItem` from `@notation-hero/shared` (drop the local duplicate).
- `web/app/catalog/error.tsx` _(modify)_ — comment only (Neon → API fetch failure).
- `web/app/lib/db.ts`, `web/app/lib/catalog-schema.ts` _(delete)_.
- `web/next.config.ts` _(modify)_ — add `@notation-hero/shared` to `transpilePackages`.
- `web/package.json` _(modify)_ — drop `drizzle-orm` + `@neondatabase/serverless`; add `@notation-hero/shared` + the vitest lane deps + a `test` script.
- `web/.env.example` _(modify)_ — `DATABASE_URL` → `API_BASE_URL`.
- `web/vitest.config.mts`, `web/vitest.setup.ts` _(create)_ — the new web test lane (mirrors `client/`).
- `web/app/lib/catalog.test.ts`, `web/app/catalog/catalog-table.test.tsx` _(create)_ — co-located tests.

**Governance**

- `docs/decisions/2026-07-14-catalog-read-service-boundary-adr.md` _(create)_ — superseding ADR + diagram.
- `docs/decisions/2026-07-14-catalog-read-service-boundary.svg` _(create)_ — the before/after diagram (referenced by the ADR; a committed `.svg` renders on GitHub, raw inline `<svg>` in Markdown does not).
- `docs/decisions/2026-07-08-fe-nextjs-vercel-aws-bff-adr.md` _(modify)_ — banner the superseded direct-Neon-read-for-catalog part.
- `docs/decisions/decision-registry.md` _(modify)_ — Change-log entry.
- `AGENTS.md` _(modify)_ — Current-direction snapshot line.
- `cspell.json` _(modify, only if the spell gate trips on a new identifier)_.

---

## Task 1: Shared catalog response contract

**Files:**

- Create: `shared/src/contracts/catalog.ts`
- Modify: `shared/src/index.ts`
- Modify: `shared/package.json`

**Interfaces:**

- Consumes: nothing.
- Produces: from `@notation-hero/shared` —
  - `CatalogItem = { id: string; slug: string; title: string; kind: 'song' | 'pattern' | 'lesson'; difficulty: string; level: number | null }`
  - `CatalogResponse = { items: CatalogItem[]; count: number }`

No runtime, so no unit test — verified by `typecheck` here and by the server/web typecheck steps that consume it in Tasks 2–4.

<!-- cspell:ignore unobserve -->

- [ ] **Step 1: Confirm the placeholder has no importers**

Run: `git grep -n "SHARED_API_VERSION" -- ':!shared/src/index.ts' ':!docs/**'`
Expected: no matches (only the spec doc mentions it). If any real importer appears, keep the `SHARED_API_VERSION` export in Step 3 instead of removing it.

- [ ] **Step 2: Create the contract**

Create `shared/src/contracts/catalog.ts`:

```ts
// Pure FE<->BE response contract for the catalog read (NH-279). Types only — no runtime, no
// drizzle. This is what lets both the ESM web bundler and the CJS NestJS server consume one
// contract without the ESM/CJS dual-package hazard that a shared drizzle table trips (see the
// 2026-07-14 catalog-read service-boundary ADR).
export interface CatalogItem {
  id: string;
  /** Friendly URL token (NH-221), distinct from the opaque id. */
  slug: string;
  title: string;
  kind: 'song' | 'pattern' | 'lesson';
  /** Difficulty band label: Debut / Beginner 1-3 / Intermediate 4-6 / Advanced 7-8 / Expert 9-10 / Ungraded. */
  difficulty: string;
  /** Nullable 0-10 grade (N-14 bands); null = ungraded. */
  level: number | null;
}

export interface CatalogResponse {
  items: CatalogItem[];
  count: number;
}
```

- [ ] **Step 3: Re-export from the barrel**

Replace the whole body of `shared/src/index.ts` with:

```ts
// Shared FE<->BE contract surface for Notation Hero. The typed oRPC contract + Zod schemas
// (spike 2026-06-20 §3) land here with their feature work and are imported by BOTH web/client and
// server. The first real contract is the catalog read response (NH-279).
export type { CatalogItem, CatalogResponse } from './contracts/catalog';
```

- [ ] **Step 4: Make the exports resolvable from the CJS `nodenext` server**

Replace the `exports` field in `shared/package.json` with an explicit types+default condition (the server resolves types via `exports` under `nodenext` + `resolvePackageJsonExports`; this makes it unambiguous). Full file:

```json
{
  "name": "@notation-hero/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    }
  },
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json --noEmit",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```

- [ ] **Step 5: Typecheck shared**

Run: `pnpm --filter @notation-hero/shared run typecheck`
Expected: PASS (no output, exit 0).

- [ ] **Step 6: Commit**

```bash
git add shared/src/contracts/catalog.ts shared/src/index.ts shared/package.json
git commit -m "feat(shared): add pure catalog response contract (NH-279)"
```

---

## Task 2: Server — add `level` + deterministic order, type via the shared contract

**Files:**

- Modify: `server/package.json`
- Modify: `server/src/modules/catalog/catalog.controller.spec.ts`
- Modify: `server/src/modules/catalog/catalog.controller.ts`

**Interfaces:**

- Consumes: `CatalogItem`, `CatalogResponse` from `@notation-hero/shared` (Task 1).
- Produces: `GET /api/catalog` returns `CatalogResponse` where each item now includes `level: number | null`; rows are ordered `level ASC, title ASC`. `CatalogController.list()` return type is `Promise<CatalogResponse>`.

- [ ] **Step 1: Add the shared dependency to the server**

Add `"@notation-hero/shared": "workspace:*"` to `server/package.json` `dependencies` (keep keys sorted), then:

Run: `pnpm install`
Expected: adds the workspace link; exit 0.

- [ ] **Step 2: Extend the controller spec to require `level` + ordering (failing test)**

In `server/src/modules/catalog/catalog.controller.spec.ts`, replace the `makeDb` factory so the fake query chain has an `orderBy` step between `where()` and `limit()`, and record it. Replace the existing `makeDb` function with:

```ts
// The fake chain now mirrors select().from().where().orderBy().limit(). `where()` returns an object
// carrying BOTH orderBy and limit so a controller that has NOT yet added .orderBy() still runs and
// fails on the assertions below (orderBy spy uncalled + missing `level`) — a clean behavior-red,
// not a TypeError.
function makeDb(rows: unknown[]): {
  db: unknown;
  spies: {
    where: ReturnType<typeof vi.fn>;
    orderBy: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
  };
} {
  const spies = { where: vi.fn(), orderBy: vi.fn(), limit: vi.fn() };
  const limited = {
    limit: (n: number) => {
      spies.limit(n);
      return Promise.resolve(rows);
    },
  };
  const afterWhere = {
    orderBy: (...cols: unknown[]) => {
      spies.orderBy(...cols);
      return limited;
    },
    limit: limited.limit,
  };
  const filtered = {
    where: (condition: unknown) => {
      spies.where(condition);
      return afterWhere;
    },
  };
  const selected = { from: () => filtered };
  const db = { select: () => selected };
  return { db, spies };
}
```

In the first test (`maps rows to the catalog envelope, deriving difficulty from level`), add `level` to the expected first item:

```ts
expect(res.items[0]).toEqual({
  id: 'pat_ssr_debut',
  slug: 'single-stroke-roll-debut',
  title: 'Single Stroke Roll (Debut)',
  kind: 'pattern',
  difficulty: 'Debut',
  level: 0,
});
```

Add a new test after the WHERE/cap test:

```ts
it('orders by level then title for a stable cached snapshot (F1)', async () => {
  const { controller, spies } = await makeController(fakeRows);
  await controller.list();
  expect(spies.orderBy).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 3: Run the spec to verify it fails**

Run: `pnpm --filter @notation-hero/server exec vitest run src/modules/catalog/catalog.controller.spec.ts`
Expected: FAIL — `orders by level then title` fails (`spies.orderBy` called 0 times) and the mapping test fails (`level` missing from the mapped item).

- [ ] **Step 4: Implement the controller change**

Replace `server/src/modules/catalog/catalog.controller.ts` with (adds `asc` to the drizzle import, `.orderBy(...)` before `.limit(50)`, `level` in the mapped item, and the shared response types — the local `CatalogPlayable`/`CatalogResponse` interfaces are removed):

```ts
import { Controller, Get, Header, Inject } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';

import { toDifficulty } from './catalog.util';
import { CATALOG_DB, type CatalogDb } from '@/adapters/neon-postgres/catalog-db.adapter';
import { playable } from '@/adapters/neon-postgres/catalog.schema';
// Type-only import: erases at runtime, so the CJS server never require()s the ESM shared package
// (the property that keeps the pure contract free of the ESM/CJS dual-package hazard). NH-279.
import type { CatalogItem, CatalogResponse } from '@notation-hero/shared';

@Controller('catalog')
export class CatalogController {
  // The nh_app neon-http client, injected as a singleton (NH-79 review F12). neon-http is per-query
  // HTTP (no pool), so one client is reused across warm invocations.
  constructor(@Inject(CATALOG_DB) private readonly db: CatalogDb) {}

  // Validation target (NH-79): a typed Drizzle select against Neon — proves the Lambda -> Neon
  // path. The real read API (oRPC contract, filters, pagination) is NH-123. Cache-Control is
  // forward-compat for the NH-247 edge cache; CORS is deferred to NH-250. A DB failure surfaces as
  // a generic 503 (never a 200) via the global DbExceptionFilter — see entry/db-exception.filter.ts.
  @Get()
  @Header('Cache-Control', 'public, max-age=300')
  async list(): Promise<CatalogResponse> {
    const rows = await this.db
      .select({
        id: playable.id,
        slug: playable.slug,
        title: playable.title,
        kind: playable.kind,
        level: playable.level,
      })
      .from(playable)
      // Public read = curated + published + listable, enforced at the DB layer (ARCH-AUTHZ-1) — not
      // by seed convention. `listable` hides internal rows (the masked single-voice leaves);
      // `origin = 'curated'` keeps user-uploads out; the kind allow-list keeps the response union
      // honest, so a 'part' row can never leak as an unknown kind.
      .where(
        and(
          eq(playable.status, 'published'),
          eq(playable.listable, true),
          eq(playable.origin, 'curated'),
          inArray(playable.kind, ['song', 'lesson', 'pattern']),
        ),
      )
      // Deterministic default order so the cached web snapshot is stable (easiest first, then A-Z);
      // interactive re-sorting stays client-side (TanStack). NH-279 F1.
      .orderBy(asc(playable.level), asc(playable.title))
      .limit(50);

    const items: CatalogItem[] = rows.map((row) => {
      // The WHERE kind allow-list keeps 'part' out at the DB layer; this guard makes the invariant
      // explicit at the boundary, so if a future change relaxes the filter an unexpected kind throws
      // (-> a generic 503) instead of leaking as an unknown kind (review F4). It also narrows
      // row.kind to the response union.
      if (row.kind !== 'song' && row.kind !== 'lesson' && row.kind !== 'pattern') {
        throw new Error(`catalog read returned an unexpected kind: ${row.kind}`);
      }
      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        kind: row.kind,
        difficulty: toDifficulty(row.level),
        level: row.level,
      };
    });
    return { items, count: items.length };
  }
}
```

- [ ] **Step 5: Run the spec to verify it passes**

Run: `pnpm --filter @notation-hero/server exec vitest run src/modules/catalog/catalog.controller.spec.ts`
Expected: PASS (all tests, including the new ordering test).

- [ ] **Step 6: Typecheck + lint the server (also proves the shared type resolves under `nodenext`)**

Run: `pnpm --filter @notation-hero/server run typecheck && pnpm --filter @notation-hero/server run lint`
Expected: PASS.
**Fallback if the `@notation-hero/shared` import fails to resolve:** add a `paths` entry to `server/tsconfig.json` `compilerOptions` — `"@notation-hero/shared": ["../shared/src/index.ts"]` — and re-run. (Not expected: `exports` + `resolvePackageJsonExports` should suffice.)

- [ ] **Step 7: Commit**

```bash
git add server/package.json server/src/modules/catalog/catalog.controller.ts server/src/modules/catalog/catalog.controller.spec.ts
git commit -m "feat(server): add level + deterministic order to catalog read, type via shared contract (NH-279)"
```

---

## Task 3: Web — stand up the vitest lane + `fetchCatalog` API client (additive)

This task is **additive**: `page.tsx` still reads Neon and `drizzle-orm`/`@neondatabase/serverless` stay, so the app keeps working. Task 4 does the cutover.

**Files:**

- Modify: `web/package.json`
- Modify: `web/next.config.ts`
- Create: `web/vitest.config.mts`
- Create: `web/vitest.setup.ts`
- Create: `web/app/lib/catalog.ts`
- Create: `web/app/lib/catalog.test.ts`

**Interfaces:**

- Consumes: `CatalogItem`, `CatalogResponse` from `@notation-hero/shared` (Task 1).
- Produces: `fetchCatalog(): Promise<CatalogItem[]>` — a server-side `fetch` of `${process.env.API_BASE_URL}/api/catalog` that throws on a non-OK response and returns the `items` array. Consumed by `page.tsx` in Task 4.

- [ ] **Step 1: Add the deps + test script to `web/package.json`**

Full file (adds `@notation-hero/shared` + the vitest lane devDeps + `"test"`; `drizzle-orm`/`@neondatabase/serverless` intentionally still present — removed in Task 4). Versions match `client/` exactly for syncpack:

```json
{
  "name": "@notation-hero/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "next build",
    "dev": "next dev --port 3002",
    "lint": "eslint . --max-warnings 0",
    "start": "next start",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@fontsource-variable/material-symbols-outlined": "^5.2.45",
    "@fontsource-variable/public-sans": "^5.2.7",
    "@neondatabase/serverless": "^1.1.0",
    "@notation-hero/client": "workspace:*",
    "@notation-hero/shared": "workspace:*",
    "drizzle-orm": "^0.45.2",
    "next": "16.2.10",
    "react": "^19.2.7",
    "react-dom": "^19.2.7"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.3.1",
    "@testing-library/dom": "^10.4.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@types/node": "^24.0.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^6.0.2",
    "babel-plugin-react-compiler": "^1.0.0",
    "eslint": "^9.20.0",
    "eslint-config-next": "16.2.10",
    "jsdom": "^29.1.1",
    "tailwindcss": "^4.3.1",
    "typescript": "^5.7.3",
    "vitest": "^4.1.9"
  }
}
```

Then run: `pnpm install`
Expected: resolves the new deps from the existing lockfile/store (client already locks these versions); exit 0.

- [ ] **Step 2: Add `@notation-hero/shared` to `transpilePackages`**

In `web/next.config.ts`, change the `transpilePackages` line to:

```ts
  transpilePackages: ['@notation-hero/client', '@notation-hero/shared'],
```

- [ ] **Step 3: Create the vitest config**

Create `web/vitest.config.mts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['app/**/*.{test,spec}.{ts,tsx}'],
    // @notation-hero/client + @notation-hero/shared ship raw .ts(x) (no built dist); inline them so
    // Vite transforms the workspace source in tests instead of trying to load pre-built output.
    server: { deps: { inline: ['@notation-hero/client', '@notation-hero/shared'] } },
  },
});
```

- [ ] **Step 4: Create the test setup (mirrors `client/vitest.setup.ts`)**

Create `web/vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';

// jsdom has no layout engine, so it lacks ResizeObserver + the pointer-capture / scrollIntoView APIs
// some primitives use on mount. Polyfill them once so component tests render instead of crashing.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
Element.prototype.scrollIntoView = () => {};
Element.prototype.hasPointerCapture = () => false;
Element.prototype.setPointerCapture = () => {};
Element.prototype.releasePointerCapture = () => {};
```

- [ ] **Step 5: Write the failing test for `fetchCatalog`**

Create `web/app/lib/catalog.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchCatalog } from './catalog';

const OK_RESPONSE = {
  items: [
    {
      id: 'song_demo',
      slug: 'demo-song',
      title: 'Demo Song',
      kind: 'song',
      difficulty: 'Intermediate 4',
      level: 4,
    },
    {
      id: 'lesson_x',
      slug: 'ungraded-lesson',
      title: 'Ungraded Lesson',
      kind: 'lesson',
      difficulty: 'Ungraded',
      level: null,
    },
  ],
  count: 2,
};

describe('fetchCatalog', () => {
  const originalBase = process.env.API_BASE_URL;

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.API_BASE_URL = originalBase;
  });

  it('fetches the server catalog API and returns its items', async () => {
    process.env.API_BASE_URL = 'http://localhost:3001';
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve(OK_RESPONSE) });
    vi.stubGlobal('fetch', fetchMock);

    const items = await fetchCatalog();

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/api/catalog');
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual(OK_RESPONSE.items[0]);
  });

  it('throws when the API responds non-OK (trips the route error boundary)', async () => {
    process.env.API_BASE_URL = 'http://localhost:3001';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: () => Promise.resolve({}) }),
    );

    await expect(fetchCatalog()).rejects.toThrow(/503/);
  });
});
```

- [ ] **Step 6: Run web tests to verify the failure**

Run: `pnpm --filter @notation-hero/web run test`
Expected: FAIL — cannot resolve `./catalog` / `fetchCatalog` is not defined.

- [ ] **Step 7: Implement `fetchCatalog`**

Create `web/app/lib/catalog.ts`:

```ts
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
```

- [ ] **Step 8: Run web tests to verify they pass**

Run: `pnpm --filter @notation-hero/web run test`
Expected: PASS (2 tests).

- [ ] **Step 9: Verify the additive change kept the app green**

Run: `pnpm --filter @notation-hero/web run typecheck && pnpm --filter @notation-hero/web run lint`
Expected: PASS (page.tsx still reads Neon; nothing removed yet).

- [ ] **Step 10: Commit**

```bash
git add web/package.json web/next.config.ts web/vitest.config.mts web/vitest.setup.ts web/app/lib/catalog.ts web/app/lib/catalog.test.ts pnpm-lock.yaml
git commit -m "test(web): add vitest lane + fetchCatalog API client (NH-279)"
```

---

## Task 4: Web — cut the catalog read over to the cached API, delete the direct-Neon code

**Files:**

- Modify: `web/app/catalog/page.tsx`
- Modify: `web/app/catalog/catalog-table.tsx`
- Modify: `web/app/catalog/error.tsx`
- Delete: `web/app/lib/db.ts`, `web/app/lib/catalog-schema.ts`
- Modify: `web/package.json`
- Modify: `web/.env.example`
- Create: `web/app/catalog/catalog-table.test.tsx`

**Interfaces:**

- Consumes: `fetchCatalog` (Task 3); `CatalogItem` from `@notation-hero/shared`; the server now returns `level` + `difficulty` (Task 2).
- Produces: `/catalog` renders from the cached API read; `web/` no longer depends on `drizzle-orm` or `@neondatabase/serverless`.

- [ ] **Step 1: Read the bundled Next.js caching docs first (repo hard rule)**

Run: `ls web/node_modules/next/dist/docs/` then read the cache/`use cache`/`cacheLife`/`cacheTag`/`connection` entries for the installed **16.2.10**. Confirm `'use cache: remote'` is valid and that `cacheLife('days')` = stale 5 min / revalidate 1 day / expire 1 week before editing `page.tsx`. Do not rely on training data.

- [ ] **Step 2: Rewrite `page.tsx` as the cached wrapper over `fetchCatalog`**

Replace `web/app/catalog/page.tsx` with (drops the Drizzle imports, `createDb`, `playable`, and `toDifficulty`; keeps `'use cache: remote'` + `cacheTag` + `cacheLife` + `connection()` + `<Suspense>`):

```tsx
import { cacheLife, cacheTag } from 'next/cache';
import { connection } from 'next/server';
import { Suspense } from 'react';

import type { CatalogItem } from '@notation-hero/shared';

import { fetchCatalog } from '../lib/catalog';
import { CatalogDataTable } from './catalog-table';

async function getCatalog(): Promise<CatalogItem[]> {
  // Durable cache in the platform runtime cache (Vercel), shared across all server instances —
  // unlike plain 'use cache', which is in-memory per instance and re-hits the origin on every cold
  // start. Busted on demand with revalidateTag('catalog') (the admin publish/refresh button ships
  // with the CMS work — spec §6); otherwise self-heals within the 'days' window. The Neon read now
  // lives behind the server API (GET /api/catalog); web is a pure cached consumer (NH-279).
  'use cache: remote';
  cacheTag('catalog');
  cacheLife('days');

  return fetchCatalog();
}

async function CatalogList() {
  // Defer to request time: the build prerenders the static shell (below) without needing the API,
  // and the cached read runs at request time (hitting the Lambda only on a cache miss).
  await connection();
  const items = await getCatalog();

  return (
    <>
      <p className="text-muted-foreground">
        {items.length} {items.length === 1 ? 'piece' : 'pieces'} available
      </p>
      <CatalogDataTable data={items} />
    </>
  );
}

function CatalogSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <div className="h-5 w-40 animate-pulse rounded bg-muted" />
      <div className="h-64 w-full animate-pulse rounded bg-muted" />
    </div>
  );
}

export default function CatalogPage() {
  return (
    <main className="mx-auto max-w-5xl space-y-6 p-8">
      <h1 className="text-2xl font-bold">Catalog</h1>
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogList />
      </Suspense>
    </main>
  );
}
```

- [ ] **Step 3: Point `catalog-table.tsx` at the shared type**

Replace `web/app/catalog/catalog-table.tsx` with (drops the local `CatalogItem` interface for the shared one):

```tsx
'use client';

import { DataTable, LevelPill } from '@notation-hero/client';
import type { ColumnDef } from '@notation-hero/client';
import type { CatalogItem } from '@notation-hero/shared';

const columns: ColumnDef<CatalogItem>[] = [
  { accessorKey: 'title', header: 'Name' },
  { accessorKey: 'kind', header: 'Kind', meta: { align: 'center' as const } },
  {
    accessorKey: 'level',
    header: 'Level',
    meta: { align: 'center' as const },
    cell: ({ getValue }) => <LevelPill level={getValue<number | null>()} />,
  },
  { accessorKey: 'difficulty', header: 'Difficulty', meta: { align: 'center' as const } },
];

export function CatalogDataTable({ data }: Readonly<{ data: CatalogItem[] }>) {
  return (
    <DataTable
      data={data}
      columns={columns}
      appearance="cards"
      getRowId={(r) => r.id}
      emptyState="No pieces found"
    />
  );
}
```

- [ ] **Step 4: Update the `error.tsx` comment**

In `web/app/catalog/error.tsx`, replace the boundary comment (behavior unchanged — only the described cause):

```tsx
// Route-level error boundary for /catalog. A catalog API outage, a non-OK response, or an unset
// API_BASE_URL throws inside getCatalog(); this renders a recoverable fallback with a retry instead
// of the framework default error page.
```

- [ ] **Step 5: Delete the direct-Neon code**

```bash
git rm web/app/lib/db.ts web/app/lib/catalog-schema.ts
```

- [ ] **Step 6: Drop `drizzle-orm` + `@neondatabase/serverless` from `web/package.json`**

Full file (the two deps removed; everything else identical to Task 3's file):

```json
{
  "name": "@notation-hero/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "next build",
    "dev": "next dev --port 3002",
    "lint": "eslint . --max-warnings 0",
    "start": "next start",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@fontsource-variable/material-symbols-outlined": "^5.2.45",
    "@fontsource-variable/public-sans": "^5.2.7",
    "@notation-hero/client": "workspace:*",
    "@notation-hero/shared": "workspace:*",
    "next": "16.2.10",
    "react": "^19.2.7",
    "react-dom": "^19.2.7"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.3.1",
    "@testing-library/dom": "^10.4.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@types/node": "^24.0.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^6.0.2",
    "babel-plugin-react-compiler": "^1.0.0",
    "eslint": "^9.20.0",
    "eslint-config-next": "16.2.10",
    "jsdom": "^29.1.1",
    "tailwindcss": "^4.3.1",
    "typescript": "^5.7.3",
    "vitest": "^4.1.9"
  }
}
```

Then run: `pnpm install`
Expected: removes the two packages from `web`'s tree; updates `pnpm-lock.yaml`; exit 0.

- [ ] **Step 7: Swap `.env.example` to `API_BASE_URL`**

Replace `web/.env.example` with:

```bash
# Base URL of the Notation Hero server API for the BFF catalog read (NH-279). The Next.js server
# component fetches `${API_BASE_URL}/api/catalog` server-side — a service boundary; web no longer
# reads Neon directly (see the 2026-07-14 catalog-read service-boundary ADR). Copy to .env.local.
#
# Local dev: the NestJS server runs on :3001 with a global `/api` prefix.
# Production: set API_BASE_URL in Vercel environment variables (redeploy after adding — existing
# deploys don't pick up new env vars).
API_BASE_URL=http://localhost:3001
```

- [ ] **Step 8: Add the render test for `CatalogDataTable`**

Create `web/app/catalog/catalog-table.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { CatalogItem } from '@notation-hero/shared';

import { CatalogDataTable } from './catalog-table';

const rows: CatalogItem[] = [
  {
    id: 'song_demo',
    slug: 'demo-song',
    title: 'Demo Song',
    kind: 'song',
    difficulty: 'Intermediate 4',
    level: 4,
  },
];

describe('CatalogDataTable', () => {
  it('renders a row from the data', () => {
    render(<CatalogDataTable data={rows} />);
    expect(screen.getByText('Demo Song')).toBeInTheDocument();
  });

  it('renders the empty state when there is no data', () => {
    render(<CatalogDataTable data={[]} />);
    expect(screen.getByText('No pieces found')).toBeInTheDocument();
  });
});
```

- [ ] **Step 9: Run web tests**

Run: `pnpm --filter @notation-hero/web run test`
Expected: PASS (`fetchCatalog` ×2 + `CatalogDataTable` ×2).

- [ ] **Step 10: Full web verification (typecheck + lint + build)**

Run: `pnpm --filter @notation-hero/web run typecheck && pnpm --filter @notation-hero/web run lint && pnpm --filter @notation-hero/web run build`
Expected: PASS. The build must succeed **without** `API_BASE_URL` set — `connection()` defers the read to request time, so the build prerenders only the static shell. (If the build tries to read the API at build time, confirm `connection()` is inside `CatalogList` before `getCatalog()`, as written in Step 2.)

- [ ] **Step 11: Repo-level dependency gates**

Run: `pnpm run depcheck && pnpm run syncpack`
Expected: PASS. `depcheck` (server hexagon fence) is unaffected; `syncpack` confirms the dep add/remove left no version drift.

- [ ] **Step 12: Commit**

```bash
git add -A web/
git commit -m "feat(web): read catalog via cached server API, drop direct-Neon code + deps (NH-279)"
```

---

## Task 5: Governance — superseding ADR, banner, registry, AGENTS.md

**Files:**

- Create: `docs/decisions/2026-07-14-catalog-read-service-boundary-adr.md`
- Create: `docs/decisions/2026-07-14-catalog-read-service-boundary.svg`
- Modify: `docs/decisions/2026-07-08-fe-nextjs-vercel-aws-bff-adr.md`
- Modify: `docs/decisions/decision-registry.md`
- Modify: `AGENTS.md`
- Modify (only if the spell gate trips): `cspell.json`

**Interfaces:** none (docs).

- [ ] **Step 1: Create the diagram**

Create `docs/decisions/2026-07-14-catalog-read-service-boundary.svg` (a committed `.svg` renders on GitHub via the ADR's image reference; raw inline `<svg>` inside Markdown is stripped by GitHub's sanitizer):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 340" font-family="system-ui, sans-serif" font-size="14">
  <rect x="0" y="0" width="720" height="340" fill="#ffffff"/>
  <text x="16" y="28" font-weight="700">NH-279 — catalog read: before vs after</text>

  <text x="16" y="64" font-weight="600" fill="#555">Before — two readers, one DB (duplicated schema + WHERE)</text>
  <rect x="16" y="80" width="150" height="44" rx="6" fill="#eef2ff" stroke="#6366f1"/>
  <text x="91" y="107" text-anchor="middle">web (Vercel)</text>
  <rect x="285" y="80" width="150" height="44" rx="6" fill="#ecfeff" stroke="#0891b2"/>
  <text x="360" y="107" text-anchor="middle">server (Lambda)</text>
  <rect x="554" y="80" width="150" height="44" rx="6" fill="#f0fdf4" stroke="#16a34a"/>
  <text x="629" y="107" text-anchor="middle">Neon</text>
  <line x1="166" y1="102" x2="554" y2="102" stroke="#ef4444" stroke-width="2" stroke-dasharray="5 4"/>
  <line x1="435" y1="102" x2="554" y2="102" stroke="#16a34a" stroke-width="2"/>
  <text x="300" y="94" text-anchor="middle" fill="#ef4444" font-size="12">direct-Neon (duplicated)</text>

  <text x="16" y="196" font-weight="600" fill="#555">After — one reader (the server); web is a pure cached API consumer</text>
  <rect x="16" y="212" width="150" height="44" rx="6" fill="#eef2ff" stroke="#6366f1"/>
  <text x="91" y="239" text-anchor="middle">web (Vercel)</text>
  <rect x="285" y="212" width="150" height="44" rx="6" fill="#ecfeff" stroke="#0891b2"/>
  <text x="360" y="239" text-anchor="middle">server (Lambda)</text>
  <rect x="554" y="212" width="150" height="44" rx="6" fill="#f0fdf4" stroke="#16a34a"/>
  <text x="629" y="239" text-anchor="middle">Neon</text>
  <line x1="166" y1="234" x2="285" y2="234" stroke="#0891b2" stroke-width="2"/>
  <text x="225" y="226" text-anchor="middle" fill="#0891b2" font-size="12">GET /api/catalog</text>
  <line x1="435" y1="234" x2="554" y2="234" stroke="#16a34a" stroke-width="2"/>
  <text x="91" y="284" text-anchor="middle" font-size="12" fill="#555">cache (use cache: remote,</text>
  <text x="91" y="300" text-anchor="middle" font-size="12" fill="#555">cacheLife 'days')</text>
  <text x="360" y="292" text-anchor="middle" font-size="12" fill="#555">user waits on Lambda only on a cache miss</text>
</svg>
```

- [ ] **Step 2: Write the superseding ADR**

Create `docs/decisions/2026-07-14-catalog-read-service-boundary-adr.md`:

```markdown
# ADR: Catalog read via the server API (service boundary) — NH-279

**Date:** 2026-07-14 · **Status:** Accepted · **Supersedes:** the direct-Neon catalog-read path of the [2026-07-08 hybrid-BFF ADR](2026-07-08-fe-nextjs-vercel-aws-bff-adr.md) (that ADR otherwise stands).

## Context

PR #140 had `web/` read Neon directly, per the 2026-07-08 BFF ADR. Review found it re-implemented the
server's catalog read almost verbatim: `web/app/lib/catalog-schema.ts` duplicated the server's Drizzle
`playable` table, and `web/app/catalog/page.tsx` duplicated the ARCH-AUTHZ-1 visibility `WHERE`
(`status='published' AND listable=true AND origin='curated' AND kind IN (...)`), the `.limit(50)`, the
kind-guard, and `toDifficulty`. The visibility `WHERE` had already diverged once (web was missing
`origin = 'curated'`), and the surface grows with every filter/sort.

The obvious fix — extract the schema/policy into `@notation-hero/shared` and import from both runtimes —
does not work. `shared` is ESM (`type: module`); the NestJS server is CJS + `nodenext`. TypeScript
resolves `drizzle-orm`'s types in import-mode for one and require-mode for the other and treats them as
two incompatible `PgColumn`/`SQL` types (the "separate declarations of private property
`shouldInlineParams`" error), so a shared `playable` table cannot be used with the server's
`eq`/`and`/`inArray`. Both `pnpm typecheck` and `nest build` failed; the server is the hard wall.
Making it work would need a dual-built (CJS+ESM) data-access package — a build toolchain + build-order
dependency, against the repo's plain-pnpm ethos.

## Decision

Web stops reading Neon and instead fetches the server's existing `GET /api/catalog` **server-side**,
caching the response. `shared/` holds only a **pure TypeScript response contract**
(`CatalogItem`/`CatalogResponse` — no drizzle, no runtime), imported by the server (to type its
response) and web (to type the fetch). The server keeps the schema, visibility `WHERE`, `toDifficulty`,
kind-guard, and the Neon client in its `adapters/`/`modules/`.

![Catalog read: before vs after](2026-07-14-catalog-read-service-boundary.svg)

**Supersede-scope:** this replaces the direct-Neon read path **for the catalog and any
Drizzle-schema-dependent read**. It is not a blanket prohibition — a future read that does not share a
Drizzle schema across the CJS/ESM boundary may still use direct Neon access per the 2026-07-08 ADR.

## Consequences

**Positive:** removes the duplication and the ESM/CJS hazard in one move (the fix is deletion); web sheds
`drizzle-orm` + `@neondatabase/serverless`; `shared/` carries only its chartered pure contract; the
service boundary matches database-per-service. The duplication was a symptom of the shared-DB coupling —
this removes the coupling.

**Negative (accepted):** it amends the ratified 2026-07-08 ADR, and re-adds a Lambda hop on cache-miss
reads. The latency is bounded and cacheable-away — a user waits on the Lambda only on a cold blocking
miss (first load / >1 week idle) or the first visit right after an admin purge; steady-state hits and the
background stale-while-revalidate refresh never make a user wait. Cold-start latency is not yet measured
(follow-up).

## Alternatives rejected

- **Built shared `db` package (dual CJS+ESM).** Keeps direct-Neon reads but entrenches the shared DB and
  pays a build-tool + build-order tax. Manages the coupling instead of removing it.
- **Share pure-only** (`toDifficulty` + kind allow-list + guard). Zero hazard, but the schema — the
  biggest duplication — stays duplicated.
- **Accept the duplication** (status quo). The `WHERE` already diverged once and the surface grows with
  every filter; deferring to oRPC (NH-123) compounds the drift risk.
- **Server ESM migration.** Rejected in `ARCH-FMT-1` — NestJS decorator metadata / `reflect-metadata` /
  `@codegenie/serverless-express` are CJS-rooted; ESM output adds interop friction for zero gain.

## Enforcement

Prose-grade, with machine-visible signals: web's `package.json`/`pnpm-lock.yaml` no longer list
`drizzle-orm` or `@neondatabase/serverless` (a regression re-adds them, visible in review); the
dependency-cruiser hexagon fence keeps the schema/policy in the server's `adapters/`/`modules/`.

## Follow-ups

- Secured `revalidateTag('catalog')` route + admin publish/refresh button (ships with admin/CMS work).
- Runtime response validation (Zod in `shared/`) — recommended fast-follow; relocates, doesn't remove, the drift risk of the current type cast.
- Cold-start latency benchmark for the catalog endpoint.
- Server-side filtering/search/pagination (NH-123) — the API grows query params and caching shifts to per-key; Path 2 is the right base (query logic lives once in the server).
```

- [ ] **Step 3: Banner the superseded part of the 2026-07-08 BFF ADR**

In `docs/decisions/2026-07-08-fe-nextjs-vercel-aws-bff-adr.md`, add a banner directly under the H1 title:

```markdown
> **⚠️ Partially superseded (2026-07-14, NH-279):** the **catalog** read no longer goes web→Neon directly.
> Web now reads the catalog via the server API (`GET /api/catalog`, cached) — see the
> [catalog-read service-boundary ADR](2026-07-14-catalog-read-service-boundary-adr.md). This applies to
> the catalog and any Drizzle-schema-dependent read; the rest of this ADR (framework, hosting, topology,
> DynamoDB, Cognito, non-Drizzle direct reads) stands.
```

- [ ] **Step 4: Add a Change-log entry to the registry**

In `docs/decisions/decision-registry.md`, insert this entry at the top of the Change-log list (immediately after the `> **Merge note (NH-16):** …` blockquote, before the `### 2026-07-12 …` entry):

```markdown
### 2026-07-14 — Catalog read: service boundary (web reads via the server API) (NH-279)

leocaseiro approved having `web/` read the catalog via the server's `GET /api/catalog` (cached) instead of
querying Neon directly. Full record: [`docs/decisions/2026-07-14-catalog-read-service-boundary-adr.md`](2026-07-14-catalog-read-service-boundary-adr.md).

- **Why:** PR #140 review found `web/` duplicated the server's Drizzle schema + the ARCH-AUTHZ-1 visibility
  `WHERE`; the "extract to a shared drizzle table" fix fails the CJS/ESM dual-package hazard (server is
  CJS `nodenext`, `shared` is ESM). Path 2 dissolves the duplication by deletion — `shared/` carries only a
  pure TypeScript contract; web sheds `drizzle-orm` + `@neondatabase/serverless`.
- **Scope:** supersedes the direct-Neon read path **for the catalog + Drizzle-schema-dependent reads**
  only (not a blanket ban); the 2026-07-08 BFF ADR otherwise stands (bannered).
- **Cost accepted:** a Lambda hop on cache-miss reads (bounded, cacheable-away).

**Status:** ✅ decided · 🟡 partial enforcement — machine-visible via web `package.json`/lockfile no longer
listing drizzle/neon; the revalidation endpoint + admin refresh button + Zod runtime validation remain
follow-ups. Approved by leocaseiro 2026-07-14; lands with PR #140.
```

- [ ] **Step 5: Update the AGENTS.md snapshot**

In `AGENTS.md`, append to the **Data** bullet under "Current direction" (the line beginning "**Data** — **Neon Postgres** …") this sentence:

```markdown
Web reads the catalog via the server API (`GET /api/catalog`, cached) — a service boundary, not direct-Neon (ADR 2026-07-14, supersedes the 2026-07-08 direct-read path for Drizzle-dependent reads).
```

- [ ] **Step 6: Lint the docs**

Run: `pnpm run lint:md && pnpm run lint:spell`
Expected: PASS. If `cspell` flags a new identifier, add it to `cspell.json` `words` (sorted) and re-run.

- [ ] **Step 7: Commit**

```bash
git add docs/decisions/ AGENTS.md cspell.json
git commit -m "docs(decisions): supersede direct-Neon catalog read with service-boundary ADR (NH-279)"
```

---

## Task 6: Full verification + ready PR #140

**Files:** none (verification + push).

- [ ] **Step 1: Run the full spec §11 gate suite locally**

```bash
pnpm run lint
pnpm run typecheck
pnpm --filter @notation-hero/server run test
pnpm --filter @notation-hero/server run build:lambda
pnpm --filter @notation-hero/web run typecheck
pnpm --filter @notation-hero/web run build
pnpm --filter @notation-hero/web run test
pnpm run depcheck
pnpm run syncpack
```

Expected: every command exits 0. (`build:lambda` is the server DI smoke — it must bundle without the shared package leaking a runtime require, which the type-only import guarantees.)

- [ ] **Step 2: Broader parity check (optional but recommended)**

Run: `pnpm run check:all`
Expected: PASS. This is what CI's `lint` + `quality` jobs run (markdownlint/cspell/yaml/shell/etc. + layout + depcheck + syncpack + all package tests). It surfaces doc-lint or layout issues before CI does.

- [ ] **Step 3: Tick the PR checklist**

In the PR body, tick each checklist box — every item is a past-tense claim you can now verify (tests added, docs updated, no `--no-verify`, registry updated). Ensure `NH-279` is in the title/body.

- [ ] **Step 4: Push to update PR #140**

```bash
git push origin HEAD:claude/neon-data-nextjs-table-416796
```

This fast-forwards PR #140's branch (this branch was cut from its head, which is unchanged). Do **not** open a new PR; do **not** delete any remote branch.

- [ ] **Step 5: Watch CI to green**

Confirm the PR's CI run passes (lint, quality, and the `pr-checklist` gate). Only then is the work done.

---

## Self-Review (author's checklist against the spec)

**Spec coverage** — every §5/§7/§8 change maps to a task:

- §5 `shared/` contract → **Task 1**. §5 server (`level` + `orderBy` + shared types) → **Task 2**. §5 web (cached fetch, delete db files, shed deps, `transpilePackages`, `API_BASE_URL`, `!response.ok` guard, `error.tsx`) → **Tasks 3–4**. §6 caching (`'use cache: remote'` + `cacheTag` + `cacheLife('days')` kept) → **Task 4 Step 2**. §7 testing (server spec extension; web vitest lane + `fetchCatalog` + `CatalogDataTable`) → **Tasks 2, 3, 4**. §8 governance (ADR + diagram + banner + registry + AGENTS.md) → **Task 5**. §11 gates → **Task 6**.
- §9 **Out-of-scope confirmed absent:** no revalidation endpoint / admin button, no Neon schema/migration change, no web Playwright/VR/a11y lanes, no debounce scheduler, no Zod runtime validation. Kept as follow-ups in the ADR + registry.

**Placeholder scan:** every code/config step carries complete content; no "TBD"/"add error handling"/"similar to Task N". The one genuine unknown (server `nodenext` resolving the pure `shared` type) is de-risked in Task 1 Step 4 (explicit `exports`) with a concrete fallback in Task 2 Step 6.

**Type consistency:** `CatalogItem` = `{ id, slug, title, kind: 'song'|'pattern'|'lesson', difficulty, level: number|null }` and `CatalogResponse = { items, count }` are identical everywhere they appear (contract, server response, `fetchCatalog` return, `catalog-table` prop, both test fixtures). `fetchCatalog(): Promise<CatalogItem[]>` is named identically in Task 3's Produces and Task 4's Consumes and `page.tsx`.

**Deviation from the spec (noted):** the spec keeps `getCatalog()` inline in `page.tsx`. To satisfy §7's "test `getCatalog()` maps a mocked response" without importing a Next `'use cache'` directive into vitest, the fetch/parse/guard/return logic is extracted to a testable `web/app/lib/catalog.ts::fetchCatalog()`, and `page.tsx`'s `getCatalog()` is the thin cached wrapper that calls it. This also gives `web/app/lib/` a purpose after `db.ts`/`catalog-schema.ts` are deleted. Behavior and caching directives are unchanged.
