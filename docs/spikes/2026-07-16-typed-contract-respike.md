# Spike — Typed API contract, re-decided from scratch — 2026-07-16

> **Status: DECIDED 2026-07-21 — `ARCH-CONTRACT-1` = DEFER the framework** (reverses the June oRPC pick).
> leocaseiro decided personally after the 2026-07-16 study pause. Outcome: a **hand-authored Zod contract in
> `shared/` + `z.infer` + `.parse()`**; **no framework now**; flip-default `@nestjs/swagger` + `nestjs-zod`
> (**not** oRPC). Rejected: nestjs-trpc, drizzle-zod. Parked: Kanel → CMS. Recorded in the
> [decision registry](../decisions/decision-registry.md) change log (2026-07-21); §9 holds the per-item calls.
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
- **Two more candidates were spiked later** (§8): **Kanel** — works, and the live-DB objection is dead via an offline PGlite trick, but it yields three `z.string()`s here; **`nestjs-trpc`** — the client validates NOTHING (5/5 bad payloads pass), so it does not fix the bug.
- **➡️ The decision checklist with confidence ratings is [§9](#9--decision-checklist).** Start there.

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

## §8 — Candidate spikes run after the initial re-spike

Two candidates were spiked empirically after the sections above were written — one because the user asked
for it (Kanel), one because the user found it (`nestjs-trpc`). Both **ran against the real repo**; findings
are measured, not reasoned.

### §8.1 — Kanel (`kanel` + `kanel-zod`): the DB→Zod codegen the user wanted

Ran `kanel@4.0.2` + `kanel-zod@4.0.0` against the real Neon `schema-validation` branch.

**It works, and every objection raised against it before the spike was wrong:**

- **The live-DB requirement is DEAD.** `extract-pg-schema` (Kanel's engine) routes a `file:` connection
  string to **PGlite** (Postgres compiled to WASM, in-process). Ran the real `0000_playable_init.sql` into
  PGlite with `DATABASE_URL` unset and diffed against the live-Neon output: **byte-identical, 1.8 s, no
  network, no secret, works on fork PRs.** It generates from the DDL, which `ARCH-ORM-1` already declares
  the source of truth — arguably _more_ correct than introspecting a shared branch.
- **The registry rejection was misread (again, by this agent).** `ARCH-CONTRACT-1` does not reject kanel-zod
  for introspecting a DB. Its actual reasons: **(a)** the DB→Zod layer was "owned by Drizzle + drizzle-zod",
  and **(b)** API shape ≠ DB shape. **Reason (a) has evaporated** — drizzle-zod is barred from `web` by
  NH-279's no-drizzle rule, so the layer is now unowned. Reason (b) survives and the spike proves it.
- **Zero drizzle in the browser — CONFIRMED by bundling.** `grep` of a minified browser bundle: **0**
  occurrences of `drizzle`. Kanel's marginal cost is **4,788 bytes / 2 modules** (555 gzipped). (The honest
  number: the bundle is 64.6 kb gzipped and _all_ of it is zod — the price of any runtime validation, not a
  Kanel cost. Today's contract is a TS `interface` at 0 runtime bytes.)

**But it does not pay off for THIS contract, and the reason is the same as everywhere in this doc — API
shape ≠ DB shape:**

- The response has 6 fields. Kanel generates **3** (`id`, `slug`, `title`), all plain `z.string()`.
- The other 3 are hand-written regardless: `kind` narrowed to 3 values, `level` ranged 0–10, and
  `difficulty` **is not a column** (computed by `toDifficulty(level)`). Kanel cannot know any of this.
- **Kanel never reads CHECK constraints.** The real DDL is `text` + `CHECK (kind IN (...))` with **zero**
  `CREATE TYPE ... AS ENUM`, so `kind → z.string()` and `level → z.number().nullable()` (not even `.int()`,
  and the `CHECK (level BETWEEN 0 AND 10)` is invisible). A **real** pg enum would emit
  `z.enum(['song','part','lesson','pattern'])` for free — **Kanel's automation quality is a direct function
  of the DDL modelling.**
- **The alarms mostly do not fire.** With `.pick()`/`.extend()` curation: renaming `slug` fires (cryptically —
  `Type 'true' is not assignable to type 'never'`, never names `slug`); but `level` smallint→text is
  **SILENT**, and `title` type-change is **SILENT** (proved — `title` became `number`, compiled green),
  because `.extend()` replaces the field so the generated type is never consulted. **Only the committed-file
  `git diff` drift check is reliable** — and that is the cheap part.
- **Required config is non-obvious** (would be rediscovered painfully later): `castToSchema: false` (or
  `.pick()` does not exist on the output), `generateIdentifierType: undefined` (or every fixture/MSW handler
  breaks on branded ids), `importsExtension: '.ts'` (or the value import fails under `shared/`'s `type:
module`), plus an explicit conformance anchor to the published contract or type drift is silent.

**Verdict: not for this contract now** (1,278 generated lines to replace a 20-line file, gaining three
`string` types). **Revisit at the 8-table admin CMS (NH-207)**, where the shape genuinely is the table and
it runs server-side. **Carry forward regardless:** (1) the **PGlite `file:` trick** is reusable and
undocumented — record it; (2) the cheapest real win is **migrating `kind`/`status`/`origin` from `text`+CHECK
to real pg enums**, after which _any_ generator emits the union for free and Postgres enforces the domain.

### §8.2 — `nestjs-trpc`: the Relay-style codegen the user found

Ran `nestjs-trpc@2.12.0` + `@trpc/server@11.18.0` + `@trpc/client@11.18.0` against a real port of the
catalog controller.

**It works far better mechanically than expected — and does not fix the bug the user needs fixed:**

- **THE DECISIVE FINDING — the tRPC client validates NOTHING.** `.output()` runs **server-side** (validates
  what the server sends before sending). The client only receives compile-time types, which are erased at
  runtime. Pointed a real `@trpc/client` at a server returning bad payloads — **5 of 5 passed through with
  no throw** (missing field, wrong shape, `items` a string, `null` items, wrong types). A hand-written Zod
  `.parse()` threw `ZodError` on all 5. It **reproduces `catalog.ts:20` exactly** — `typeof difficulty →
  undefined → React renders "undefined"\*\*.
- **Deploy skew is worse than stated.** Vercel deploys on push and is normally _faster_ than the GitHub-OIDC
  Lambda deploy, so **web-newer-than-Lambda is the DEFAULT skew** — exactly the case that renders "undefined".
  A server-side `.output()` cannot help: the old Lambda's response is valid against its own old schema, so it
  returns 200 happily.
- **Corrections to this agent's priors, all in nestjs-trpc's favour:** the Rust CLI does **not** have the
  `@nestjs/swagger`-under-SWC problem (it is a standalone binary that parses `.ts` source, never touches
  tsc/SWC — proved by deleting `dist/` and regenerating); the output path **is** configurable
  (`-o ../shared/src/@generated`, so `web` need not depend on `server`); the full pipeline stays green **and
  the DI smoke test passes** (decorator metadata survives SWC→esbuild); generation is deterministic (5 runs,
  identical SHA-256).
- **A real packaging bug:** the published tarball lost the execute bit on **4 of 5** binaries — only
  `x86_64-unknown-linux-gnu` is executable, so **CI (ubuntu) passes while an Apple-Silicon Mac fails**
  (`EACCES`). Reproduced with a clean `npm install` outside the workspace. One `chmod +x` fixes it, carried
  forever. Also: `--version` reports `0.1.0`; pins an exact `rxjs 7.8.1` peer the repo already violates.
- **Friction with this repo's gates:** the generated file fails Prettier and ESLint (`--max-warnings 0`) and
  the layout guard's role-suffix rule; all solvable (`.prettierignore`, `-r "**/*.resolver.ts"`, emit into
  `shared/`) but each is deliberate work. **And lefthook's `prettier --write` fights the generator's own
  formatting** — a format-on-commit and a `generate && git diff --exit-code` gate would undo each other.
- **OpenAPI, confirmed on all three counts:** `trpc-openapi` is **archived** (last push 2024-11-19, 100
  issues frozen); **every** published `@trpc/openapi` version is alpha/canary (`latest` = `11.18.0-alpha`,
  no stable ever); `nestjs-trpc` itself has no OpenAPI (0 matches in `dist/`, README, or the Rust binary).
  **The user's instinct that OpenAPI is the reason to prefer oRPC is verified correct.**

**Verdict: no.** At one endpoint it adds a Rust binary, a CI drift gate, three lint/format workarounds, a
`chmod +x`, and a **bus-factor-1 (KevinEdry 220 / next human 8), 4,497/wk** dependency — to avoid writing 20
lines, **and still leaves the validation bug**. The codegen benefit is real and grows with endpoint count,
but the client-does-not-validate problem grows with it too, and oRPC gives the same scaling benefit with
stable OpenAPI and 6× the adoption.

### §8.3 — What both later spikes agree on

- **Add the Zod `.parse()` in `fetchCatalog` now, regardless of the contract choice.** It is the only thing
  measured to fix the live bug. `z.infer<typeof schema>` is automated typing too — the real choice was never
  "automated vs hand-written types", it is **"automated types that do NOT validate" vs "automated types that
  DO"**.
- Neither candidate is the answer. The framework decision (defer / oRPC / other) is unchanged by them and
  remains the user's to make.

## §9 — Decision checklist

> Confidence basis matters more than the number. **measured** = a spike ran it (trust these); **verified** =
> read from real code/docs; **reasoned** = agent judgment (the category that was wrong repeatedly this
> session — weight accordingly); **disputed** = this doc's own spikes disagree, the user decides.

### Group 1 — Do regardless of `ARCH-CONTRACT-1`

| Item                                                                                  | Call                                                                                                   | Confidence · basis                                     |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Zod `.parse()` in `fetchCatalog` — kills the "undefined" bug                          | Do                                                                                                     | **95%** measured (both spikes)                         |
| `shared/` gets a real build (~10 lines)                                               | Do                                                                                                     | **90%** measured (8 build paths)                       |
| R-1 — no fetch timeout → `AbortSignal.timeout(8000)`                                  | Do                                                                                                     | **95%** verified (3 reviewers)                         |
| F-8 — `API_BASE_URL` unset in prod → user sets CloudFront URL in Vercel, redeploy     | Do (user action)                                                                                       | **90%** verified (`pulumi stack output cloudfrontUrl`) |
| R-4 — Difficulty sorts alphabetically → sort by `level`                               | Do                                                                                                     | **85%** verified                                       |
| R-3 — sort order untested → snapshot `orderBy.mock.calls[0]`; Neon-in-CI = own ticket | Do (interim)                                                                                           | **80%** verified fact, agent's fix idea                |
| R-5 — Level sorts Ungraded above 0 → null-aware comparator                            | Do (caveat: TanStack negates for desc)                                                                 | **75%** verified                                       |
| R-6 — trailing-slash guard on `API_BASE_URL`                                          | **Probably skip** — user's CloudFront URL has no trailing slash, so the review's reason does not apply | **40%** verified                                       |

### Group 2 — The `ARCH-CONTRACT-1` (NH-284) decisions

| Decision                        | Call                                           | Confidence · basis           |
| ------------------------------- | ---------------------------------------------- | ---------------------------- |
| `nestjs-trpc`?                  | **No**                                         | **95%** measured (§8.2)      |
| drizzle-zod in `shared/`?       | **No**                                         | **95%** measured (§3)        |
| Kanel for the catalog contract? | **Not now** (revisit at CMS)                   | **85%** measured (§8.1)      |
| Hand-author the Zod contract?   | **Yes, for now** (`z.infer` = still automated) | **85%** reasoned             |
| Adopt oRPC now, or defer?       | **⚠️ Lean defer**                              | **50%** DISPUTED — see below |

**The disputed one:** the initial re-spike says _defer_ (no framework at N=1; bus factor 1; `@orpc/openapi@1.14.8`
does not export `openapi()`, so **no documented path to adopt stable**). The nestjs-trpc spike says _oRPC_ — but
that is a **relative** verdict (oRPC beats nestjs-trpc); it never re-examined "any framework at N=1", nor the
undocumented-stable problem. The tiebreaker is the user's OpenAPI need: it is now **verified** that oRPC is the
only live OpenAPI option (tRPC's is permanently alpha). Deferring loses nothing structural (the Zod drops into
`oc.route().output()` unchanged).

### Group 3 — Newly found, need triage

| Item                                                                                                         | Call                                                    | Confidence · basis                                          |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ----------------------------------------------------------- |
| `revalidateTag(tag)` deprecated in 16.2.10 — F-5's admin button plans that form → use `updateTag('catalog')` | Fix in F-5                                              | **90%** verified (bundled docs)                             |
| `About.tsx` fetches `/api/catalog` from the browser, uncached                                                | Own ticket                                              | **85%** verified (`CACHE_DISABLED`)                         |
| Runtime Cache silently drops items > 2 MB                                                                    | Add a guard                                             | **70%** verified hazard, fix undesigned                     |
| Migrate `kind`/`status`/`origin` from `text`+CHECK → real pg enums                                           | Worth doing on its own merits                           | **65%** reasoned (Kanel measured the enum payoff)           |
| Record the PGlite offline-codegen trick                                                                      | Record it                                               | **85%** measured (§8.1)                                     |
| ESLint ban on `as` casts (user's idea)                                                                       | Own ticket (needs scoping — 4 legit casts in `server/`) | **60%** verified                                            |
| R-8 — commit `f02f78a` (NH-277) stranded in the #140 branch                                                  | Name NH-277 in PR body, or cherry-pick                  | **70%** verified                                            |
| Banner the stale bare `'use cache'` in the 2026-07-08 spike                                                  | Banner it                                               | **90%** verified                                            |
| PR #140 (draft) — unpark once Group 1 lands                                                                  | Unpark later                                            | **80%** reasoned (boundary work endorsed by every reviewer) |

**The one load-bearing 95%:** the Zod `.parse()`. It fixes a live bug, is ~20 lines, and every option leads
through it. Confidence is inverted from intuition — highest on the small mechanical items, genuinely 50/50 on
the big architectural one, because that is where this doc's own evidence conflicts.

## Sources

All npm/GitHub data queried live **2026-07-15/16**. Empirical tests run against a detached worktree of
`origin/claude/neon-data-nextjs-table-416796` on Node 24.16.0, TypeScript 5.9.3, esbuild 0.28.1;
working tree left clean. §8.1/§8.2 spikes run **2026-07-16** against the same base; `kanel@4.0.2` /
`kanel-zod@4.0.0` and `nestjs-trpc@2.12.0` / `@trpc/server|client@11.18.0`.

[nestjs/swagger#2493](https://github.com/nestjs/swagger/issues/2493) ·
[NestJS OpenAPI CLI Plugin](https://docs.nestjs.com/openapi/cli-plugin) ·
[oRPC — Implement Contract in NestJS](https://orpc.dev/docs/openapi/integrations/implement-contract-in-nest) ·
[oRPC repo](https://github.com/middleapi/orpc) ·
[ts-rest #797](https://github.com/ts-rest/ts-rest/issues/797) ·
[drizzle-orm#941](https://github.com/drizzle-team/drizzle-orm/issues/941) ·
[drizzle-zod docs](https://orm.drizzle.team/docs/zod) ·
[Standard Schema](https://github.com/standard-schema/standard-schema) ·
Next.js 16.2.10 bundled docs (`web/node_modules/next/dist/docs/`)
