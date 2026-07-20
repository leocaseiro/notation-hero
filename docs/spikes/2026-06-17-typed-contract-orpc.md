# Spike — Typed API contract (oRPC vs ts-rest vs hey-api) — 2026-06-17

> ⚠️ **SUPERSEDED (decided 2026-07-21) — do not act on this verdict. Read the re-spike:**
> [`2026-07-16-typed-contract-respike.md`](2026-07-16-typed-contract-respike.md). `ARCH-CONTRACT-1` was
> **DECIDED = DEFER the framework** (not oRPC) — leocaseiro reversed this June pick after study — because this spike's two load-bearing
> premises were both falsified:
>
> 1. **"Moots the `@nestjs/swagger`-under-SWC problem"** — that problem was already solved.
>    `nestjs/swagger#2493` closed as **completed 2023-07-11**, three years before this spike cited it.
> 2. **"post-v1.0 Dec 2025"** — there is no `1.0.0`; the 1.x line began **2025-04-15**. December 2025
>    is the InfoQ _article's_ date. (This error favoured oRPC.)
>
> Also stale/absent: oRPC **v2 entered beta 2026-06-21 — four days after this spike** (rewrite, no
> migration guide); bus factor is **1** (945 commits vs next-human 3, no company behind `middleapi`);
> `@orpc/nest` is **28,450/wk**, 3× fewer than _frozen_ ts-rest's Nest adapter; oRPC's live docs describe
> v2-beta and **`@orpc/openapi@1.14.8` does not export `openapi()`**, so there is no documented path to
> adopt stable. Critically, **oRPC + NestJS is contract-first ONLY** — the "types infer for free, zero
> codegen" benefit this spike sells **does not apply to a NestJS backend**. The stack also changed:
> the FE pivoted from Vite SPA to **Next.js 16 on Vercel** (ADR 2026-07-08), and oRPC's Next.js pattern
> forwards `headers()`, which **fails immediately** inside `'use cache'`.
>
> **What still holds:** ts-rest is dead (re-verified — no publish in 13.5 months); "weekly releases" was
> accurate (1.31/week measured); the `@hey-api` flip condition is sound and now looks stronger.
>
> **Feeds:** `ARCH-CONTRACT-1` (oRPC). **Verdict:** use **oRPC**; ts-rest is frozen.
> Stack: NestJS 11 + React/Vite/TanStack Query, shared contract package, pnpm workspaces.
> ⚠️ _That stack line is itself superseded — the FE is now Next.js 16 on Vercel._

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
