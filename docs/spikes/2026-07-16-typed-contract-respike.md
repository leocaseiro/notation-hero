# Spike — Typed API contract, re-decided from scratch — 2026-07-16

> **Status: NO DECISION. `ARCH-CONTRACT-1` is under review, not changed.**
> leocaseiro paused all decisions and implementation on 2026-07-16 pending study. This document
> records **findings only**. Nothing here is ratified. The registry is deliberately untouched.
>
> **Re-opens:** [`2026-06-17-typed-contract-orpc.md`](2026-06-17-typed-contract-orpc.md) (which fed `ARCH-CONTRACT-1` = oRPC).
> **Companion:** [`2026-07-16-contract-study-plan.md`](2026-07-16-contract-study-plan.md) — the reading list.
> **Trigger:** PR #140 (NH-279) review. The catalog read shipped a hand-written TypeScript contract;
> leocaseiro rejected hand-written types and reopened the question.

## TL;DR

- **Both pillars of the June oRPC decision were false.** One was already false when the spike ran.
- **The dual-package hazard that justified hand-written types does not exist for Zod.** Proven by running it.
- **Deriving the wire contract from the Drizzle table costs 33 kb of drizzle in the browser and yields three `z.string()`s.** Measured.
- **oRPC's headline benefit — inferred types, zero codegen — does not apply on NestJS.** It is contract-first only.
- Every candidate accepts Standard Schema, so **a hand-authored Zod schema is portable to all of them**. Deferring loses nothing structural.
- **Recommendation (not a decision): defer the framework. Nothing is installed; this is a free choice, not a migration.**

## Why this spike ran

The June spike was good work — dated, cited, with a comparison table and a flip condition. It was also
never revisited, and three things happened after it:

1. The FE pivoted from Vite SPA to Next.js on Vercel (ADR 2026-07-08). Nobody rechecked `ARCH-CONTRACT-1`.
2. The NH-279 ADR (2026-07-14) shipped a hand-written contract, silently contradicting `ARCH-CONTRACT-1`,
   citing a CJS/ESM hazard the June spike had explicitly cleared.
3. oRPC released a v2 beta **four days after** the June spike, which the spike could not have known.

## §1 — The June decision rested on two premises. Both are false

### Premise 1: "oRPC moots the `@nestjs/swagger`-under-SWC problem"

[`2026-06-17-nestjs-lambda-swc.md:31`](2026-06-17-nestjs-lambda-swc.md) records that `@nestjs/swagger`'s
CLI plugin does not run under SWC, and that oRPC was chosen partly to avoid that.

**That problem was already solved three years earlier.** `nestjs/swagger` issue #2493 ("CLI plugin does
not work with SWC") was **closed as `completed` on 2023-07-11**. The official NestJS docs carry a
dedicated "SWC builder" section with two supported paths:

- `nest start -b swc --type-check` for standard setups.
- `PluginMetadataGenerator` + `ReadonlyVisitor` → `generate-metadata.ts` → `SwaggerModule.loadPluginMetadata()`
  for monorepo/custom builds. This emits a plain `metadata.ts` — bundler-agnostic, so it fits the
  SWC → esbuild pipeline directly.

`@nestjs/swagger@11.4.5` (2026-06-30) ships the `./plugin` export this path needs.

**This claim is wrong on its own terms and should be corrected regardless of what happens to
`ARCH-CONTRACT-1`.** See §7.

### Premise 2: "post-v1.0 Dec 2025"

There is **no `1.0.0`** of oRPC on npm. The 1.x line began at **`1.0.3` on 2025-04-15**. The December
2025 date is the _InfoQ article's_ publication date, read as a release date. v1 was ~14 months old at
spike time, not ~6 — **this error was in oRPC's favour**.

### One June claim that held up

"Weekly releases" was **correct**: 85 stable 1.x releases between 2025-04-15 and 2026-07-13 = **1.31/week**.
An earlier draft of this spike called it stale. That draft was wrong; the June spike was right.

## §2 — The dual-package hazard: what is true and what is not

The NH-279 ADR justified a hand-written pure-type contract with a CJS/ESM dual-package hazard. Tested
empirically against the real repo, across every build path.

### FALSE — as applied to Zod

A CJS `nodenext` NestJS server **successfully `require()`s the ESM `shared` package at runtime**, receives
the Zod schemas, and validates with them. Node 24 supports `require(esm)`.

```
shared exports: [ 'catalogItemSchema', 'catalogResponseSchema' ]
runtime zod parse from CJS: {"items":[{"id":"1",...,"level":0}],"count":1}
zod REJECTS bad data -> threw ZodError as expected
```

**Important correction: the ADR never claimed Zod-in-`shared` was impossible.** Its hazard paragraph is
scoped to _drizzle types_, and ADR line 70 explicitly lists "Runtime response validation (Zod in `shared/`)"
as a recommended fast-follow. **The over-broad claim lives in a code comment** in
`server/src/modules/catalog/catalog.controller.ts`:

> `// Type-only import: erases at runtime, so the CJS server never require()s the ESM shared package`
> `// (the property that keeps the pure contract free of the ESM/CJS dual-package hazard). NH-279.`

That comment is what hardened a scoped trade-off into a blanket rule.

### The real bug is module resolution, not CJS/ESM

Every failure across every build path is one error:

```
Cannot find module '.../shared/src/contracts/catalog.js'
imported from .../shared/src/index.ts
```

`shared/src/index.ts` re-exports `'./contracts/catalog.js'`, but only `catalog.ts` exists. esbuild and
Vite rewrite `.js`→`.ts`; Node's type-stripping and Turbopack do not.

**The clincher: `web`/Turbopack fails identically, and `web` is pure ESM with no CJS anywhere.** A CJS/ESM
hazard cannot explain a pure-ESM failure. `export type` merely _hid_ the bug by erasing before resolution.

| Path                                | Raw-`.ts` (current)               | With a `shared` build |
| ----------------------------------- | --------------------------------- | --------------------- |
| server typecheck (CJS nodenext)     | PASS                              | PASS                  |
| server build (SWC → `dist/`)        | PASS                              | PASS                  |
| `node require(dist/…controller.js)` | **FAIL** (resolution, not hazard) | PASS                  |
| `build:lambda` (esbuild + DI smoke) | PASS                              | PASS                  |
| `nest start` dev                    | **FAIL**                          | PASS                  |
| **web build (Turbopack)**           | **FAIL**                          | PASS                  |
| server / web vitest                 | PASS                              | PASS                  |

**Fix: give `shared` a real build** (single ESM; dual format not needed). ~10 lines. All eight
builds/tests plus `depcheck`, `check:layout` and `check:supply-chain-pins` verified green. The ADR's
"build-order tax" objection is weaker than stated — pnpm ordered `shared build` first automatically from
`workspace:*` topology.

### TRUE — as applied to drizzle

Sharing a drizzle table genuinely fails, even with a build:

```
Property 'config' is protected but type 'Column<...>' is not a class derived from 'Column<...>'
```

Drizzle ships **split** declarations (`index.d.ts` import / `index.d.cts` require) → two nominal class
identities. **Zod ships a single `types: ./index.d.cts` for both modes, so it structurally cannot trip
this.** The hazard is _library-specific_, not a property of `shared` being ESM.

**So the ADR's engineering judgment was defensible; only its generalization was wrong. Hand-written
types were never required by any CJS/ESM constraint.**

### A fragility worth knowing, independent of all of this

The raw-`.ts` shape works today only because pnpm symlinks `shared` to a realpath **outside**
`node_modules`. Node disables type-stripping under `node_modules`; copying the package physically in
yields `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`.

## §3 — Deriving the contract from the DB: measured, not argued

### It puts drizzle in the browser

The produced _value_ is drizzle-free — a 26-node object-graph walk of `createSelectSchema(playable)` found
zero drizzle references. The _import graph_ is not:

| Bundle (esbuild, minified)  | drizzle modules | drizzle bytes |    total |
| --------------------------- | --------------: | ------------: | -------: |
| A — derived via drizzle-zod |          **54** |    **33,156** | 356.7 kb |
| B — plain Zod               |               0 |             0 | 319.7 kb |

`createSelectSchema(table)` is a runtime call needing `getTableColumns`, `is`, `Column`, `SQL`, and the
table module imports `pgTable/text/smallint`. **Tree-shaking cannot remove it.** Bundle A ships
`drizzle:IsDrizzleTable` and 11 other internals to the browser. This breaks the NH-279 ADR.

### It would derive almost nothing here

Run against the real `playable` table, three of six response fields fight it:

- **`kind` derives nothing.** The schema uses `text('kind').$type<'song'|'part'|'lesson'|'pattern'>()`.
  `$type` is a **compile-time cast** — `enumValues` stays empty at runtime, so drizzle-zod emits
  `z.string()`, not a union. Narrowing would require rewriting the table to `text('kind', { enum: [...] })`.
- **`level` derives ±32768** — the `smallint` storage bound. The domain is 0–10 (N-14 bands).
  Derivation gives what Postgres allows, not what the product means.
- **`difficulty` is not a column** — it is computed by `toDifficulty(level)`.

After overwriting those three by hand, derivation contributes `id`, `slug`, `title`: **three bare
`z.string()`s**. The response was never a projection of the table.

### The registry line was misread — by this agent, in this session

`decision-registry.md:485` reads:

```
`ARCH-CONTRACT-1` oRPC (ts-rest frozen — #797); ditch kanel-zod (drizzle-zod derive+curate).
```

**kanel-zod introspects a live database.** The decision recorded was _"don't introspect the DB; derive
from the table definition you already have."_ It was **not** _"the public wire contract must be generated
from storage."_

**The hand-written contract in PR #140 does not violate `ARCH-CONTRACT-1`.** A finding claiming it did
was raised during review and is retracted here.

### drizzle-zod's own trajectory

`drizzle-zod@0.8.3` (2025-08-06, ~11 months static). Peers `drizzle-orm >=0.36.0` and `zod ^3.25 || ^4` —
the repo's 0.45.2 / 4.4.3 are both in range. But **`drizzle-orm@1.0.0-rc.4` ships `./zod`, `./zod/schema`,
`./zod/column` subpaths**: the standalone package is being absorbed into core. Adopting it today buys a
migration to `drizzle-orm/zod` later. That explains the stalled beta train — relocation, not abandonment.

### No codegen tool exists

- **`drizzle-kit` has no zod command** — verified via `--help` on `0.31.10` and `1.0.0-rc.4`. `export`
  emits SQL only.
- [drizzle-orm#941 "Codegen for zod schemas"](https://github.com/drizzle-team/drizzle-orm/issues/941) —
  **open since 2023-07-26**; community PR unmerged and unanswered since 2026-05-23.
- `@lucaconlaq/drizzle-zod-to-code` (0.2.3) **fails on Zod 4** — reads zod-3 internals (`_def.typeName`).
  `drizzle-zod-codegen` is vaporware (repo 404s).
- **The `z.toJSONSchema` → `json-schema-to-zod` round-trip runs and silently corrupts validation**:
  `timestamp()` degrades to `z.any()` (accepting `'not-a-date'`); injected `.strict()` rejects extra keys
  the original accepted. **A false-accept in a validation layer is worse than no layer.** Do not use it.

The viable path is a hand-rolled emitter over `getTableColumns()` drift-checked with
`git diff --exit-code`. **No prior art exists** for "drizzle-zod at build time, commit, drift-check."

## §4 — oRPC, current state (verified 2026-07-15/16)

### Works technically — the strongest objection to it is false

Tested with a verbatim copy of `server/.swcrc` and the exact esbuild flags from `build-lambda.mjs`:

```
bundle require:      OK
controller class:    CatalogController
design:paramtypes:   CatalogService
>>> ESM-only oRPC bundled into CJS + DI metadata intact: true
```

oRPC is ESM-only (`type: module`, no `require` condition across `@orpc/server|nest|contract|client@1.14.8`).
Under TypeScript **5.7.3** this fails with `TS1479` — but the repo's `^5.7.3` range resolves **5.9.3**,
where it typechecks clean and Node 24 `require(esm)` works. **The case against oRPC is maintenance and
documentation, not capability.**

> ⚠️ **Two agents disagreed here.** One inferred from oRPC's docs that adopting it needs an ESM migration
> of the NestJS server. The other **ran the build** and it worked. Trust the build. oRPC's docs _say_ you
> need ESM; esbuild bundling makes that untrue for this repo.

### The disqualifying facts

- **The live docs describe a version you would not install.** The current Nest integration doc says
  `npm install @orpc/nest@beta` and shows `oc.meta(openapi({ path: '/example' }))`. **`@orpc/openapi@1.14.8`
  does not export `openapi()`** — following the current docs against stable throws
  `(0, _openapi.openapi) is not a function`. **There is no correct, documented way to adopt oRPC stable today.**
- **v2 is a rewrite with no migration guide.** `2.0.0-beta.1` on 2026-06-21 (four days after the June spike);
  `beta.17` by 2026-07-14. Honest source churn: **656 files under `packages/` (+21,874/−33,779)**, plus 379
  test files and 209 doc files. (The "300 files" figure quoted in review is the GitHub compare API's page cap,
  not a real count; the raw diff is 1,651 files but inflated by the lockfile and one generated `.d.ts`.) The
  merge PR (#1593, "feat: v2") was **merged 33 minutes after opening with an empty description**. Release
  notes: one line, "V2". Repo-wide search for a migration guide returns **0**.
- **Bus factor 1.** `dinwwwh` 945 commits; the next **human** is `hunterwilhelm` at **3**. Everything between
  is bots. The `middleapi` org's sole public member is `dinwwwh`; **middleapi.com 302-redirects to orpc.dev**
  — there is no company. npm `funding: null`.
- **`@orpc/nest` = 28,450 downloads/week** — **3× fewer than _frozen_ ts-rest's Nest adapter** (82,850).
  `@trpc/server` is 3,871,573.
- **The repo's own supply-chain gate blocks it.** `pnpm-workspace.yaml` sets `minimumReleaseAge: 10080`
  (7 days); oRPC 1.14.8 was 2 days old. A dependency shipping 1.31 releases/week is in permanent tension
  with a 7-day release-age gate.

### oRPC's headline benefit does not apply to this stack

**[oRPC + NestJS is contract-first ONLY](https://orpc.dev/docs/openapi/integrations/implement-contract-in-nest).**
There is no inference-first path for NestJS. The famous "write the server, types flow to the client for
free, zero codegen" selling point — the entire reason tRPC and oRPC are exciting — **is not available here.**
You hand-write the contract either way. This makes oRPC's workflow essentially **ts-rest's model**.

It also removes the only theoretical escape from §3: the contract must be a runtime value in `shared/`, so
if it derives from drizzle, drizzle reaches the browser. There is no type-only-import way out.

### The Next.js conflict

oRPC's SSR guide calls `headers: await headers()`. Next 16.2.10's **bundled** docs
(`web/node_modules/next/dist/docs/.../use-cache.md`) state at line 196 that cached functions "cannot
directly access runtime APIs like `cookies()`, `headers()`" and at line 607 that doing so "**fails
immediately**". **Cache Components appear 0 times across the entire oRPC repo.**

Deeper: oRPC's Next.js guide is titled _"Optimizing SSR"_ and exists to provide an **internal link that
avoids the HTTP hop** by calling the router in-process. This topology is **Vercel → CloudFront → Lambda** —
separate processes on different clouds. **oRPC's headline Next.js feature has nothing to optimize here.**
Strip it away and oRPC on the web side is a typed `fetch` wrapper.

Correct usage if adopted anyway: **`OpenAPILink`, not `RPCLink`** (`OpenAPILink` produces `GET /api/catalog`;
`RPCLink` produces `POST /rpc/catalog/list`). Keep the client a **module-scope binding**, never a closure
var — the bundled docs show closure vars are serialized into the cache key, and the client is a callable
Proxy; `JSON.stringify(client)` **triggered a live network call** (the Proxy read `toJSON` as a procedure path).

## §5 — The other candidates

| Candidate                                     | Verified state (2026-07-15/16)                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **tRPC 11.18**                                | 3,871,573/wk, healthy. **`@trpc/nest` is a 404** — no first-party Nest adapter; third-party only (`nestjs-trpc` etc.), so bus-factor-1 returns at the adapter. **`trpc/trpc-openapi` is ARCHIVED (Nov 2024)**; successor `@trpc/openapi` has **no stable release** — `latest` is `11.18.0-alpha`. URL shape is `/api/trpc/catalog.list?input=…`. |
| **ts-rest**                                   | **Dead.** `main` untouched since 2025-06-02; `3.52.1` (2025-03-04) latest stable; `3.53.0-rc.1` stuck in RC; #797 still open, updated 2026-04-14. **Nothing changed. Correctly rejected.**                                                                                                                                                       |
| **@hey-api/openapi-ts 0.99.0**                | 2,733,014/wk. **Best bus factor of any candidate** — three substantial humans (mrlubos 2440, ferdikoomen 669, jordanshatford 370). Needs a spec first, so it presupposes the swagger path. Pre-1.0, 509 open issues. Does **not** consume a hand-authored Zod schema — it generates its own.                                                     |
| **@nestjs/swagger 11.4.5 + nestjs-zod 5.4.0** | **Materially stronger than in June** — its blocking premise is dead (§1). 5,030,535/wk against `@nestjs/core`'s 9,253,095 = **~54% attach rate**, first-party, framework-team maintained. `nestjs-zod` at 725,678/wk (**25× `@orpc/nest`**) drives OpenAPI from Zod schemas. Costs the `generate-metadata.ts` pre-build step.                    |
| **Plain REST + hand-authored Zod**            | Zero new frameworks. Fixes the one real defect that exists (`web/app/lib/catalog.ts:20` `as CatalogResponse`). Preserves `GET /api/catalog`. Works inside `'use cache: remote'` with no `headers()`. **Schema is 100% portable** — Zod 4 _is_ a Standard Schema, which oRPC and tRPC both consume.                                               |

### Two corrections to claims made during review

- **"tRPC's RPC-over-POST fights CDN GET caching" is FALSE.** tRPC's official RPC spec maps **`GET` → `.query()`**,
  `POST` → `.mutation()`; `httpLink.md:10`: _"httpLink supports both POST and GET requests."_ The real
  objection is the **URL shape**, not the method. This reason was invented during review and does not
  appear in the June spike.
- **CloudFront never cached `/api/*` anyway.** `infra/cloudfront-site.stack.ts:151-159` sets
  `cachePolicyId: CACHE_DISABLED` on the `/api/*` behavior, with the comment _"Dynamic API: no caching,
  forward everything except Host (so SigV4 stays valid)."_ **The CDN-caching rationale never existed in
  any version of this architecture.**

### What actually protects the free tier

`web/app/catalog/page.tsx` wraps the read in `'use cache: remote'` + `cacheTag('catalog')` +
`cacheLife('days')` — **Vercel's durable cache**, which caches the _function return value_ before any HTTP
call happens. Roughly one Lambda invocation per day against a 1M/month free tier.

**This means the contract-framework choice has no bearing on the free tier.** Vercel does not care whether
the call underneath was GET, POST, REST or RPC.

> 🚩 **Separate exposure, unrelated to the contract question.** The legacy Vite SPA is still deployed to S3
> behind the same CloudFront, and `client/src/components/About.tsx` does a browser-side
> `fetch('/api/catalog')`. That path is browser → CloudFront (**caching disabled**) → Lambda: **one Lambda
> invocation and one Neon query per page view, uncached**. Worth its own ticket.

## §6 — Where this leaves the decision

**Nothing is installed.** No oRPC, tRPC, Zod, or `@nestjs/swagger` appears in any `package.json`. `zod@4.4.3`
is in the lockfile only **transitively, via `eslint-plugin-react-hooks`**. `ARCH-CONTRACT-1` is paper-only.
**This is a free choice, not a migration.**

### Is a framework justified at N=1 endpoint?

A contract framework's value amortizes over endpoints — route tables, derived client types, OpenAPI. At
**N=1** the denominator is 1. The entire benefit oRPC would deliver today is replacing one
`as CatalogResponse` cast with a validated parse, which Zod does alone in ~15 lines with no framework.

**Is "decide later, lose nothing" true? Very nearly, and the mechanism was verified:** `zod@4.4.3` implements
Standard Schema natively (`~standard`, vendor `zod`, version 1); `@orpc/contract@1.14.8` depends on
`@standard-schema/spec ^1.1.0`; tRPC v11 accepts Standard Schema too. **A hand-authored schema transfers
unchanged into oRPC or tRPC later.**

Honest caveats — "lose nothing" is not literally zero:

1. The **wiring** is not portable — controller signature and client call get rewritten at adoption
   (mechanical, ~an hour per endpoint, and you would rewrite it anyway).
2. `@hey-api` and `@nestjs/swagger` do **not** consume a Zod schema (they generate/derive). So portability
   holds for the _RPC-style_ candidates, not the _spec-first_ ones. `nestjs-zod` closes that gap.
3. Deferring costs nothing structural and buys real information: whether oRPC v2 stabilizes, gets a
   migration guide, and gains a second maintainer.

### Recommendation (NOT a decision — leocaseiro decides after study)

Defer `ARCH-CONTRACT-1`. Do not adopt oRPC in any form yet. If the boundary needs fixing before that,
the cheapest correct step is the ADR's own recorded fast-follow: hand-authored Zod in `shared/` +
`z.infer` types + a `shared` build, plus a server-side type-level drift guard:

```ts
// server-side only; `import type` erases at compile time — ships nothing to web
type Row = InferSelectModel<typeof playable>;
export type _SlugMatches = Assert<Extends<Row['slug'], CatalogItem['slug']>>;
export type _KindNarrows = Assert<Extends<CatalogItem['kind'], Row['kind']>>;
```

Verified: renaming `slug` → `url_token` fails with **TS2339**; changing `level` `smallint` → `text` fails
with **TS2344**. Zero deps, zero bundle cost, zero codegen — and it encodes intent derivation cannot
express (`kind` is _deliberately_ narrower on the wire than in storage).

**Flip conditions — revisit when either fires:**

- **Endpoint count reaches ~5**, or the admin/CMS write surface over the 8 tables begins (NH-207) —
  whichever comes first. `createInsertSchema`/`createUpdateSchema` across many columns is where derivation
  genuinely pays, and that is **server-side, where drizzle already lives** and no codegen is needed.
- A **real external consumer** needs a published OpenAPI spec.

At that point the default is **`@nestjs/swagger` + `nestjs-zod` (+ `@hey-api` for the client)**. Reconsider
oRPC only if v2 has reached stable, published a migration guide, and gained a second substantive human
maintainer.

## §7 — Follow-ups this spike creates

- [ ] **Correct [`2026-06-17-nestjs-lambda-swc.md:31`](2026-06-17-nestjs-lambda-swc.md)** — the
      "Swagger CLI plugin doesn't run under SWC" claim is factually wrong (issue #2493 closed **completed**
      2023-07-11). **Wrong on its own terms; fix independently of the contract decision.**
- [ ] **Banner [`2026-06-17-typed-contract-orpc.md`](2026-06-17-typed-contract-orpc.md)** as under review.
- [ ] **Registry `ARCH-CONTRACT-1`** — status change is a DECISION; deliberately not made. Pending study.
- [ ] **Stale forward references to oRPC** now that it is under review:
      `docs/decisions/2026-07-14-catalog-read-service-boundary-adr.md:57` and
      `server/src/modules/catalog/catalog.controller.ts:20` both name oRPC as the assumed future
      ("The real read API (oRPC contract, filters, pagination) is NH-123").
- [ ] **The `shared/` package has no build** and its `index.ts` re-exports a `.js` specifier that does not
      resolve under Node type-stripping or Turbopack. Latent today because `export type` erases it. Real
      bug, independent of the contract decision.
- [ ] **The uncached legacy `/api/catalog` browser path** (§5) — free-tier exposure, own ticket.

## Sources

All npm/GitHub data queried live **2026-07-15/16**. Empirical tests run against a detached worktree of
`origin/claude/neon-data-nextjs-table-416796` on Node 24.16.0, TypeScript 5.9.3, esbuild 0.28.1;
working tree left clean.

[nestjs/swagger#2493](https://github.com/nestjs/swagger/issues/2493) ·
[NestJS OpenAPI CLI Plugin](https://docs.nestjs.com/openapi/cli-plugin) ·
[oRPC — Implement Contract in NestJS](https://orpc.dev/docs/openapi/integrations/implement-contract-in-nest) ·
[oRPC repo](https://github.com/middleapi/orpc) ·
[ts-rest #797](https://github.com/ts-rest/ts-rest/issues/797) ·
[drizzle-orm#941](https://github.com/drizzle-team/drizzle-orm/issues/941) ·
[drizzle-zod docs](https://orm.drizzle.team/docs/zod) ·
[Standard Schema](https://github.com/standard-schema/standard-schema) ·
Next.js 16.2.10 bundled docs (`web/node_modules/next/dist/docs/`)
