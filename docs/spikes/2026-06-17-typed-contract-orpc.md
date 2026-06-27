# Spike — Typed API contract (oRPC vs ts-rest vs hey-api) — 2026-06-17

> **Feeds:** `ARCH-CONTRACT-1` (oRPC). **Verdict:** use **oRPC**; ts-rest is frozen.
> Stack: NestJS 11 + React/Vite/TanStack Query, shared contract package, pnpm workspaces.

## ts-rest issue #797 ("Future of ts-rest") — what it says

Opened 2025-05-07, still open. Maintainer (May 2025): active but **stability-only, low-ambition**. Reopened Sep–Nov 2025: users report Fastify 5 / Zod 4 / vue-query stuck + an unmerged PR backlog; discuss forking. **Migration target named repeatedly: oRPC.** hey-api appeared (Apr 2026) but OP prefers hand-authored contracts over codegen.
Independent check: **ts-rest `main` has 0 commits in all of 2026**, last commit 2025-06-02, latest stable `3.52.1` (2025-03-04), `3.53` stuck in RC.

## Maintenance (verified 2026-06-17)

- **ts-rest** — ⛔ stale (`3.52.1`, 2025-03; 0 commits to main in 2026; 3.3k★).
- **oRPC** (`@orpc/*`, canonical repo `middleapi/orpc`, docs orpc.dev) — ✅ very active (`1.14.6`, 2026-06-12; weekly releases; post-v1.0 Dec 2025; 5.3k★). _Caveat: primarily one maintainer (risk class ts-rest had) — mitigated by native OpenAPI exit ramp._
- **@hey-api/openapi-ts** — ✅ most active by volume (`0.98.2`, pre-1.0, 2026-06-08; ~3.36M wk DLs) — but it's **codegen**, a different category.
- **tRPC** — ✅ active but ❌ not idiomatic for a NestJS REST backend (RPC-over-own-protocol; no first-party Nest; no native OpenAPI).

## Comparison

| Dimension                              | **oRPC**                                   | ts-rest      | @hey-api                         | tRPC           |
| -------------------------------------- | ------------------------------------------ | ------------ | -------------------------------- | -------------- |
| Maintenance                            | ✅ weekly                                  | ⛔ frozen    | ✅ (pre-1.0)                     | ✅             |
| NestJS integration                     | ✅ first-class `@orpc/nest` (`@Implement`) | ✅ (frozen)  | ⚠️ via `@nestjs/swagger`+codegen | ❌ third-party |
| Contract in `shared/` (framework-free) | ✅                                         | ✅           | ⚠️ spec, not TS object           | ⚠️ coupled     |
| TanStack Query                         | ✅ `@orpc/tanstack-query`                  | ✅           | ✅ (generated)                   | ✅             |
| Type-safety                            | ✅ pure inference, no codegen              | ✅ inference | ⚠️ codegen step                  | ✅ inference   |
| Runtime validation                     | ✅ Standard Schema (Zod 4/Valibot)         | ✅ Zod       | ⚠️ generated                     | ⚠️             |
| OpenAPI                                | ✅ native                                  | ⚠️ limited   | ✅✅ (it _is_ the tool)          | ❌             |
| Client bundle                          | ✅ ~3.4 KB gz                              | small        | spec-sized                       | small          |

## Recommendation

**oRPC.** Contract lives framework-free in `shared/` (`oc.route().input(zod).output(zod)`); server implements via `@orpc/nest`; client via `@orpc/tanstack-query`. Pure inference (no codegen), shared Zod validation, native OpenAPI for the future admin CMS/3rd-parties, tiny client. Standard decorators → no SWC/CJS conflict. Also **moots the `@nestjs/swagger`-under-SWC problem** (OpenAPI from the contract).
**Flip:** `@hey-api/openapi-ts` if the OpenAPI spec must be the single source of truth from day one (accept a codegen step). ts-rest only if forced by existing code (then own a fork). tRPC only if abandoning NestJS-REST.
**"Nest-native default":** there is none; Nest's own path is `@nestjs/swagger` + a generated client (= the hey-api route). `@orpc/nest` is the closest first-class typed-RPC adapter.

## Sources

[ts-rest #797](https://github.com/ts-rest/ts-rest/issues/797) · [oRPC repo](https://github.com/middleapi/orpc) / [docs](https://orpc.dev) ([Nest](https://orpc.dev/docs/openapi/integrations/implement-contract-in-nest), [TanStack Query](https://orpc.dev/docs/integrations/tanstack-query)) · [oRPC v1 (InfoQ)](https://www.infoq.com/news/2025/12/orpc-v1-typesafe/) · [hey-api](https://github.com/hey-api/openapi-ts) · [LogRocket tRPC vs oRPC](https://blog.logrocket.com/trpc-vs-orpc-type-safe-rpc/) · npm/GitHub queried 2026-06-17.
