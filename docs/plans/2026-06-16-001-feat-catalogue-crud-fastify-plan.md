# Catalogue CRUD (Fastify + Neon + Lambda) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the song/lesson **catalogue backend API** — the first cloud feature — as a Fastify 5 service on AWS Lambda (Function URL) over Neon Postgres, phased **Read → Create + Update → Delete**, at $0 free-tier.

**Architecture:** A hexagonal slice across three new Nx packages — `core/catalogue` (pure domain: entities, ports, use-cases), `adapters/neon-catalogue` (Neon HTTP repository + Drizzle migrations), `apps/handler-catalogue` (Fastify wiring, exported as a Lambda handler via `@fastify/aws-lambda`) — provisioned by the existing `infra/` Pulumi `LambdaWithUrl` component. The same Fastify app runs locally as a plain server for dev/test; on Lambda it is one "Lambdalith" behind a public Function URL.

**Tech Stack:** Fastify 5, `@fastify/aws-lambda` ^6, `@neondatabase/serverless` (HTTP `neon()` driver), Drizzle ORM + drizzle-kit, TypeBox (`@sinclair/typebox` + `@fastify/type-provider-typebox`), `node --test`, Pulumi (TypeScript), pnpm + Nx, GitHub Actions (OIDC → Pulumi).

> **Status:** 📋 PLAN — authored 2026-06-16, ready for execution. Decisions consolidated from the 2026-06-16 BE investigation (Fastify-on-Lambda risks, CI/CD fit, cold-start mitigations, impl skeleton). Ticket: Epic [NH-177](https://leocaseiro.atlassian.net/browse/NH-177) "Catalog/CMS & Infra" (catalogue API = `K-3`).

---

## 0. Decisions consolidated (everything from this session)

These are locked for this plan. Rationale lives in the investigation; here is the contract.

| Area | Decision | Why |
|---|---|---|
| **Framework** | Fastify 5 + `@fastify/aws-lambda` ^6 (6.x is current, Fastify-5-ready, zero runtime deps, uses `inject()`) | Express/Koa-like; senior-FE muscle memory; official Fastify-org adapter |
| **App shape** | **Lambdalith** — one Fastify app, all routes, behind one Function URL. App instance built at **module scope** (compiled once per warm container) | Simplest deploy/dev; cold-start paid once per container, not per request |
| **DB driver** | `@neondatabase/serverless` **HTTP `neon()` mode**, **no VPC** | No connection pool to exhaust, no NAT Gateway ($0); right for one-shot read queries |
| **Migrations + schema** | **Drizzle ORM + drizzle-kit**, kept **inside the adapter only** (never imported by `core`) | Typed queries + portable plain-SQL migrations across a 40-column schema, without coupling the domain to Postgres |
| **Validation** | **TypeBox** (`@fastify/type-provider-typebox`) | One definition → JSON-schema request validation **+** `fast-json-stringify` response serialization **+** static TS types. zod would forfeit Fastify's serializer |
| **Test runner** | `node --test` (repo standard) + Fastify `app.inject()` + in-memory fake repo | Zero new deps; matches `handler-hello`/`infra`. Vitest is the deferred **L5 lane** — do NOT add it now |
| **Soft-delete** | `status = 'archived'` + bump `updated_at` (the schema has **NO `deleted_at` column**) | Authoritative per schema §12; archived = tombstone, feeds the future change-feed |
| **Pagination** | **Keyset/cursor** on `(updated_at, id)`, opaque base64 cursor | Stable under concurrent inserts; no deep-`OFFSET` scan |
| **Response shape** | `{ data }` (lists add `nextCursor`); errors `{ error: { code, message } }` | Consistent envelope; DTO shaping in the adapter mapper |
| **Status codes** | `200` read/update · `201`+`Location` create · `204` delete · `404` unknown · `409` duplicate · `422` validation | REST conventions interviewers probe |
| **CORS** | Owned by the **Function URL** (already configured). Do NOT add `@fastify/cors` | One owner avoids duplicate `Access-Control-Allow-Origin` headers |
| **Security (open URL)** | `@fastify/rate-limit` (key = `sourceIp`) + `reservedConcurrentExecutions: 10` (denial-of-wallet cap) + AWS Budgets alarm + strict TypeBox validation | `AuthType: NONE` is public/unmetered — the concurrency cap is the non-negotiable guardrail |
| **Write/admin auth (F1/F2)** | Writes (`POST/PUT/DELETE`) **and** admin-read (all statuses) require an in-Lambda **admin password** (shared secret via SSM SecureString, injected as `ADMIN_PASSWORD`); public reads are forced to `status='published'` | Decided CMS contract (registry 2026-06-15 **F1/F2**). `AuthType: NONE` is open *transport*, so the app-layer password is the curated-write boundary (schema DS-10) — without it anyone can write/delete and `?status=draft` leaks unpublished items |
| **Cold start** | Tiered, FE-decoupled (see §3) | Start cheap; escalate only if demos feel slow |
| **CI/CD** | Keep the Nx + pnpm + lefthook + 9-job `ci.yml` foundation; ADD a keyless OIDC deploy workflow + 2 PR jobs (see §2) | New app auto-covered by `nx affected`; only the deploy path is genuinely new |
| **esbuild output** | CJS (`--format=cjs --target=node22`), `external: @aws-sdk/*`, `sourcemap` | Matches `handler-hello` "bundled cjs/node22"; dodges every ESM-on-Lambda footgun |
| **First migration** | `catalogue_item` table **only** (+ its indexes/extensions/generated `tsvector`). **Skip** `exercise`/`pattern`/`item_pattern` (lesson-steps deferred) | Per the "skip lesson steps" instruction; schema §11 |

### 0.1 Fastify-on-Lambda risks → mitigations (verified GO)

| # | Risk | Severity | Mitigation (in this plan) |
|---|---|---|---|
| 1 | `AuthType: NONE` = public, unmetered, denial-of-wallet | High | `reservedConcurrentExecutions: 10` cap (Task 0.6) + `@fastify/rate-limit` (Task R.9) + Budgets alarm + TypeBox validation everywhere |
| 2 | Cold-start *stacking* — Lambda init **+** Neon scale-to-zero resume (~0.7–1.2 s first hit) | Medium | Neon HTTP driver (fewer round-trips) + arm64 (set) + esbuild (set) + module-scope init; accept + skeleton, warmer only warms Lambda (§3) |
| 3 | Fastify/TypeBox schema compilation inflates cold start | Medium | Build app at module scope; keep the route/schema surface small for v1 |
| 4 | ESM (`"type":"module"`) + esbuild traps (`__dirname`, top-level await) | Medium | Bundle to **CJS** (Task 0.4) — esbuild down-levels ESM source → CJS output cleanly |
| 5 | Neon connection handling | Medium | HTTP `neon()` only; **no VPC**; pooled (`-pooler`) connection string; `DATABASE_URL` via SSM (Task 0.6) |
| 6 | Function URL payload v2.0 (comma-joined multi-value query) | Low | `@fastify/aws-lambda` handles v2.0; set `parseCommaSeparatedQueryParams: true` if repeated query params are used |
| 7 | CORS double-headers | Low | One owner = Function URL; no `@fastify/cors` |
| 8 | Lambda statelessness (in-memory state, post-response work) | Low–Med | `await` all DB work before responding; no in-memory durable state; pino→stdout, no file transport |
| 9 | Open URL exposes **writes** (`POST/PUT/DELETE`) + draft listing (`?status=`) with **no app-layer auth** | High | Admin-password `preHandler` on write + admin-read routes (`ADMIN_PASSWORD` via SSM — Task 0.6 + CU.4); public reads force `status='published'` (Task R.10) — per registry F1/F2 |

---

## 1. File structure map

Three new Nx packages + infra/CI edits. Every filename obeys the enforced guards: kebab-case + an **approved role suffix** (`entity|value-object|aggregate|event|specification|port|service|error|adapter|repository|mapper|client|handler|use-case|command|query|controller|dto|stack|infra|util`), co-located `*.test.ts`, named exports only, explicit `.ts` import extensions, hexagon direction `core ← adapters ← apps`, `infra → build-output-only`.

```
core/catalogue/                         # @notation-hero/catalogue-core   tags: [type:core]
  package.json · project.json · tsconfig.json
  src/
    index.ts                            # barrel (public exports)
    catalogue-item.entity.ts            # [R] CatalogueItem + CatalogueListItem domain types
    catalogue-item-id.value-object.ts   # [R] parseItemId() — non-empty text id
    item-type.value-object.ts           # [R] 'song'|'lesson' guard
    item-status.value-object.ts         # [C+U] 'draft'|'published'|'archived' + transitions
    catalogue-repository.port.ts        # [R] CatalogueRepository interface (driven port)
    catalogue-repository.fake.ts        # [R] in-memory fake (tests; .fake = suffix-exempt)
    clock.port.ts                       # [C+U] now() seam
    id-generator.port.ts                # [C+U] newId() seam
    list-catalogue.query.ts             # [R] read use-case: filter+cursor -> ListResult
    get-catalogue-item.query.ts         # [R] read use-case: by id -> item | NotFound
    create-catalogue-item.command.ts    # [C+U]
    update-catalogue-item.command.ts    # [C+U]
    archive-catalogue-item.command.ts   # [D] soft-delete = status->archived
    catalogue.error.ts                  # ItemNotFound/DuplicateItem/Validation/InvalidTransition

adapters/neon-catalogue/                # @notation-hero/neon-catalogue-adapter  tags: [type:adapter]
  package.json · project.json · tsconfig.json · drizzle.config.ts   # .config.ts = suffix-exempt
  drizzle/migrations/0001_catalogue_item.sql                        # generated SQL (Phase R)
  src/
    index.ts
    neon-client.client.ts               # [R] neon(url) factory + query helper
    catalogue-schema.dto.ts             # [R] Drizzle table defs (.schema.ts is NOT an approved suffix → use .dto.ts)
    catalogue-row.dto.ts                # [R] DB row shape (snake_case), adapter-internal
    catalogue-item.mapper.ts            # [R] row(snake) <-> domain(camel); list projection
    list-filter.mapper.ts               # [R] domain filter+cursor -> parameterized SQL
    neon-catalogue.repository.ts        # [R] implements CatalogueRepository (read); [C+U/D] add writes

apps/handler-catalogue/                 # @notation-hero/handler-catalogue  tags: [type:app]
  package.json · project.json · tsconfig.json
  src/
    index.ts                            # Lambda entry: export const handler = awsLambdaFastify(buildServer())
    server.service.ts                   # buildServer(): Fastify instance + TypeBox provider + plugins
    composition.service.ts              # DI root: neon client -> repo -> use-cases
    catalogue.controller.ts             # [R] GET /catalogue, GET /catalogue/:id
    catalogue-create.controller.ts      # [C+U] POST, PUT /catalogue/:id
    catalogue-delete.controller.ts      # [D] DELETE /catalogue/:id
    catalogue-request.dto.ts            # TypeBox request bodies/queries + Static types
    catalogue-response.dto.ts           # TypeBox response schemas + { data } envelope
    error-mapper.mapper.ts              # [R] domain error -> HTTP status; setErrorHandler

infra/
  lambda-with-url.stack.ts              # EXTEND: + environment?, memorySize?, timeout?, reservedConcurrency?, allowMethods?, extraPolicy?
  index.ts                              # ADD: catalogue LambdaWithUrl + (Tier 2) warmer schedule
  project.json                          # ADD handler-catalogue to implicitDependencies

.github/workflows/
  deploy.yml                            # NEW: push master -> OIDC -> migrate -> pulumi up
  ci.yml                                # ADD jobs: migrations-dryrun, infra-preview; extend "CI Green"
```

---

## 2. CI/CD plan (keep the foundation, add the deploy path)

**Principle:** the new app is a directory clone of `handler-hello` + the Fastify factory split + **one** new deploy workflow. `nx affected`, lefthook, depcruise, check-layout, gitleaks/semgrep/osv, syncpack/knip/commitlint all **auto-cover** it the moment it carries `tags: [type:app]`.

| Tool / job | Decision | Note |
|---|---|---|
| `node --test`, esbuild, Nx inferred targets, `nx affected`, depcruise, eslint-boundaries, check-layout, lefthook, gitleaks/semgrep/osv/syncpack/knip/commitlint, `setup-js` composite, `infra:*` scripts | **KEEP** | Zero per-app work; clone scripts + add the tag |
| `fastify` + `@fastify/aws-lambda` + `@neondatabase/serverless` + drizzle + typebox | **ADD** | App/adapter deps |
| `.github/workflows/deploy.yml` (OIDC `pulumi up` on merge) | **ADD** | The one new workflow; keyless AWS via `aws-actions/configure-aws-credentials` role-assume + `pulumi/auth-actions`. Highest résumé value |
| `migrations-dryrun` + `infra-preview` PR jobs | **ADD** | Catch schema/infra drift on PR against a free Neon preview branch; add both to the `CI Green` aggregation |
| AWS IAM OIDC provider + scoped deploy role | **ADD (one-time, in Pulumi)** | Trust policy pinned to `repo:leocaseiro/notation-hero` refs; store only the role ARN, never keys |
| Vitest + coverage ratchet | **DEFER** | The spec'd L5 lane — migrate all apps together later, not mid-feature |
| API Gateway, Serverless Framework, per-app lefthook/boundary rules, per-app CI matrix | **DO NOT ADD** | Function URL already covers it; extra config forks the one-config principle and slows dev |

Deploy/preview jobs are authored in Task 0.7. They are **additive** to `ci.yml` and gated by `dorny/paths-filter` + `nx affected`, so untouched apps never rebuild.

---

## 3. Cold-start mitigation tiers (FE-decoupled by default)

| Tier | What | Cost | FE-coupled? | When |
|---|---|---|---|---|
| **0 — always** | arm64 (set) + esbuild CJS (set) + **module-scope init** + Neon **HTTP** driver + `memorySize: 512` + `timeout: 10s` | $0 | No | Built into Task 0.4 / 0.6 |
| **1 — launch** | Accept cold start + a generic FE loading skeleton | $0 | Backend: no | Ship Phase R with this |
| **2 — escalation** | **EventBridge Scheduler** `rate(5 minutes)` → warmer ping; handler **short-circuits before any DB query** (warms Lambda only, NOT Neon — a 24/7 Neon ping would blow the 100 CU-h free tier) | $0 (8,640 pings/mo = 0.06% of Scheduler's 14M free, 0.86% of Lambda's 1M) | No | Task 0.8 — wire but optionally leave disabled until demos feel slow |
| **3 — later** | FE-triggered warm-ping on catalogue page load | $0 | **Yes** | **Deferred to the FE session** (FE is being redesigned) — documented only |
| **4 — last resort** | Provisioned concurrency (1 unit) | ~$5–11/mo (**breaks $0**) | No | Only if ever latency-critical under real traffic |

> **Neon note (load-bearing for Tier 2):** Neon Free auto-suspends after 5 min idle (~500 ms wake) and gives 100 CU-h/mo. The warmer MUST short-circuit before touching the DB, or a continuously-awake Neon compute = ~180 CU-h/mo = 1.8× over free. Closing the Neon-wake gap is Tier 3's job (FE prefetch on real visits only).

---

## Phase 0 — Foundation (scaffold, infra, CI, app factory)

### Task 0.1: Scaffold the three packages (clone `handler-hello`)

**Files:**
- Create: `core/catalogue/{package.json,project.json,tsconfig.json,src/index.ts}`
- Create: `adapters/neon-catalogue/{package.json,project.json,tsconfig.json,src/index.ts}`
- Create: `apps/handler-catalogue/{package.json,project.json,tsconfig.json,src/index.ts}`

- [ ] **Step 1: Create the three `project.json` files** (only name/sourceRoot/tag — targets are inferred from package.json scripts, per repo convention)

```jsonc
// core/catalogue/project.json
{ "name": "@notation-hero/catalogue-core", "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "projectType": "library", "sourceRoot": "core/catalogue/src", "tags": ["type:core"] }
```
```jsonc
// adapters/neon-catalogue/project.json
{ "name": "@notation-hero/neon-catalogue-adapter", "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "projectType": "library", "sourceRoot": "adapters/neon-catalogue/src", "tags": ["type:adapter"] }
```
```jsonc
// apps/handler-catalogue/project.json
{ "name": "@notation-hero/handler-catalogue", "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "projectType": "application", "sourceRoot": "apps/handler-catalogue/src", "tags": ["type:app"] }
```

- [ ] **Step 2: Create `core/catalogue/package.json`** (emitting library — `tsc -b`, composite, isolatedDeclarations per AGENTS.md)

```jsonc
{ "name": "@notation-hero/catalogue-core", "version": "0.0.0", "private": true, "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "lint": "echo \"@notation-hero/catalogue-core: real ESLint target lands with the flat-config lane (NH-42)\"",
    "typecheck": "tsc -b tsconfig.json", "test": "node --test \"src/**/*.test.ts\"" } }
```

- [ ] **Step 3: Create `adapters/neon-catalogue/package.json`**

```jsonc
{ "name": "@notation-hero/neon-catalogue-adapter", "version": "0.0.0", "private": true, "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "lint": "echo \"@notation-hero/neon-catalogue-adapter: real ESLint target lands with the flat-config lane (NH-42)\"",
    "typecheck": "tsc -b tsconfig.json", "test": "node --test \"src/**/*.test.ts\"",
    "db:generate": "drizzle-kit generate", "db:migrate": "drizzle-kit migrate",
    "db:migrate:status": "drizzle-kit check" },
  "dependencies": { "@notation-hero/catalogue-core": "workspace:*", "@neondatabase/serverless": "^1", "drizzle-orm": "^0.36.0" },
  "devDependencies": { "drizzle-kit": "^0.30.0" } }
```

- [ ] **Step 4: Create `apps/handler-catalogue/package.json`** (clone `handler-hello` build, + Fastify deps)

```jsonc
{ "name": "@notation-hero/handler-catalogue", "version": "0.0.0", "private": true, "type": "module",
  "scripts": {
    "lint": "echo \"@notation-hero/handler-catalogue: real ESLint target lands with the flat-config lane (NH-42)\"",
    "typecheck": "tsc -p tsconfig.json --noEmit", "test": "node --test \"src/**/*.test.ts\"",
    "build": "esbuild src/index.ts --bundle --platform=node --target=node22 --format=cjs --external:@aws-sdk/* --sourcemap --outfile=dist/index.js && node -e \"require('fs').writeFileSync('dist/package.json',JSON.stringify({type:'commonjs'}))\"" },
  "dependencies": { "@notation-hero/catalogue-core": "workspace:*", "@notation-hero/neon-catalogue-adapter": "workspace:*",
    "fastify": "^5", "@fastify/aws-lambda": "^6", "@fastify/type-provider-typebox": "^5", "@sinclair/typebox": "^0.34.0", "@fastify/rate-limit": "^10" },
  "devDependencies": { "esbuild": "^0.28.0" } }
```

- [ ] **Step 5: Create the three `tsconfig.json`** mirroring `handler-hello/tsconfig.json` (extend `tsconfig.base.json`). For `core`, set `"composite": true, "isolatedDeclarations": true, "declaration": true` (AGENTS.md: first emitting library — every exported symbol needs an explicit return type or TS9007 fails).

- [ ] **Step 6: Create placeholder `src/index.ts` barrels** (one `export {}` line each so the package resolves), then install:

```bash
pnpm install
git add core/catalogue adapters/neon-catalogue apps/handler-catalogue pnpm-lock.yaml
git commit -m "feat(catalogue): scaffold core/adapter/app packages (NH-177)"
```

- [ ] **Step 7: Verify boundaries + layout pass on the empty packages**

Run: `pnpm exec nx run-many -t typecheck && bash tooling/check-layout.sh && pnpm exec depcruise core adapters apps`
Expected: PASS (empty barrels, correct tags).

### Task 0.2: Confirm `@fastify/aws-lambda` version supports Fastify 5

- [ ] **Step 1:** `pnpm why @fastify/aws-lambda fastify` and confirm `@fastify/aws-lambda` resolves to ≥6.0.0 (Fastify-5 compatible; v5.0.0+ added Fastify 5 support, 6.x is current). If pnpm picks an older major, pin `"@fastify/aws-lambda": "^6.4.0"`.

### Task 0.3: Neon client adapter (`neon-client.client.ts`)

**Files:** Create `adapters/neon-catalogue/src/neon-client.client.ts` + `.test.ts`

- [ ] **Step 1: Write the client** (HTTP driver; `DATABASE_URL` from env; module-scope-friendly factory)

```ts
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

export type Sql = NeonQueryFunction<false, false>;

export const makeSql = (connectionString: string): Sql => {
  if (!connectionString) throw new Error("DATABASE_URL is required");
  return neon(connectionString);
};
```

- [ ] **Step 2: Test it constructs and rejects empty url**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeSql } from "./neon-client.client.ts";

test("makeSql throws on empty connection string", () => {
  assert.throws(() => makeSql(""), /DATABASE_URL is required/);
});
test("makeSql returns a callable tagged-template fn", () => {
  const sql = makeSql("postgresql://localhost/db"); // placeholder; real url via DATABASE_URL
  assert.equal(typeof sql, "function");
});
```

- [ ] **Step 3:** Run `pnpm --filter @notation-hero/neon-catalogue-adapter test` — Expected: PASS. Commit `feat(catalogue): neon http client adapter`.

### Task 0.4: esbuild + ESM/CJS sanity (the app builds to a Lambda zip)

- [ ] **Step 1:** Put a trivial `buildServer()` returning a Fastify instance behind `index.ts` (full version in Task R.7); confirm `pnpm --filter @notation-hero/handler-catalogue build` produces `dist/index.js` + `dist/package.json {type:commonjs}` with **no** `__dirname`/top-level-await errors (CJS output sidesteps them). Commit.

### Task 0.5: Drizzle config + schema source (inside the adapter)

**Files:** Create `adapters/neon-catalogue/drizzle.config.ts`, `adapters/neon-catalogue/src/catalogue-schema.dto.ts`

- [ ] **Step 1: `drizzle.config.ts`** (config.ts = suffix-exempt; output SQL to `drizzle/migrations`)

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/catalogue-schema.dto.ts",
  out: "./drizzle/migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
```

- [ ] **Step 2: `catalogue-schema.dto.ts`** — the Drizzle table for `catalogue_item` ONLY (skip exercise/pattern). Mirror the authoritative DDL in `docs/specs/2026-06-10-catalogue-schema.md` §4. Columns: `id, type, title, level, artist, bpm, time_sig, genre, musical_key, instruments[], skill[], tags[], lesson_type, sort_order, source, license, cover_image_key, notation_key, notation_format, notation_checksum, notation_bytes, has_audio, has_video, audio(jsonb), video(jsonb), status, data(jsonb), created_at, updated_at`. (The generated `search` tsvector column + the extensions/`immutable_*` functions + indexes are appended by hand to the generated SQL in Task R.10 — drizzle-kit won't emit the functional/generated-column DDL.)

- [ ] **Step 3:** `pnpm --filter ...adapter exec drizzle-kit generate` then **hand-edit** `drizzle/migrations/0001_*.sql` to add (verbatim from schema §4 + §9): `CREATE EXTENSION pg_trgm/unaccent`, `immutable_unaccent`, `immutable_array_to_string`, the `search` generated column, and every index in §9. Rename to `0001_catalogue_item.sql`. Commit `feat(catalogue): drizzle schema + 0001 migration (catalogue_item)`.

### Task 0.6: Extend the `LambdaWithUrl` Pulumi component

**Files:** Modify `infra/lambda-with-url.stack.ts`, `infra/index.ts`, `infra/project.json`

- [ ] **Step 1: Add optional args** to `LambdaWithUrlArgs` (keep existing defaults; all additive):

```ts
  environment?: pulumi.Input<Record<string, pulumi.Input<string>>>;
  memorySize?: pulumi.Input<number>;          // default 512
  timeout?: pulumi.Input<number>;             // default 10
  reservedConcurrentExecutions?: pulumi.Input<number>;
  allowMethods?: pulumi.Input<string[]>;      // default ["GET"]
```

- [ ] **Step 2: Wire them** into the `aws.lambda.Function` (`memorySize: args.memorySize ?? 512`, `timeout: args.timeout ?? 10`, `environment: args.environment ? { variables: args.environment } : undefined`, `reservedConcurrentExecutions: args.reservedConcurrentExecutions`) and the Function URL `cors.allowMethods: args.allowMethods ?? ["GET"]`. Keep the existing `setMocks` unit test green; add an assertion that `memorySize === 512` when omitted.

- [ ] **Step 3: Add the catalogue Lambda in `infra/index.ts`** (reuse the component; pull `DATABASE_URL` from a Pulumi secret config):

```ts
const cfg = new pulumi.Config();
const catalogue = new LambdaWithUrl("catalogue", {
  functionName: "nh-catalogue",
  code: new pulumi.asset.FileArchive("../apps/handler-catalogue/dist"),
  handler: "index.handler",
  environment: { DATABASE_URL: cfg.requireSecret("neonDatabaseUrl"), ADMIN_PASSWORD: cfg.requireSecret("adminPassword") },
  memorySize: 512, timeout: 10, reservedConcurrentExecutions: 10,
  allowMethods: ["GET", "POST", "PUT", "DELETE"],
});
export const catalogueUrl = catalogue.url;
```

- [ ] **Step 4:** Add `"@notation-hero/handler-catalogue"` to `infra/project.json` `implicitDependencies` **and edit the `infra/package.json` `pulumi:*` scripts to actually build it.** `implicitDependencies` does NOT change the shell command, and the scripts today hardcode `nx build @notation-hero/handler-hello` — so deploy/preview would ship the wrong app (F2). Change **both** (covers the prod-deploy *and* PR-preview paths): `"pulumi:preview": "nx run-many -t build -p @notation-hero/handler-hello @notation-hero/handler-catalogue && pulumi preview"` and `"pulumi:up": "nx run-many -t build -p @notation-hero/handler-hello @notation-hero/handler-catalogue && pulumi up"`. Set the Neon + admin secrets **per stack**: `cd infra && pulumi stack select dev && pulumi config set --secret neonDatabaseUrl "<neon -pooler url>" && pulumi config set --secret adminPassword "<admin pw>"`, then repeat for the `prod` stack (Task 0.7 Step 3). Commit `feat(infra): catalogue lambda + env/memory/timeout/concurrency args`.

### Task 0.7: GitHub Actions — keyless OIDC deploy + PR jobs

**Files:** Create `.github/workflows/deploy.yml`; Modify `.github/workflows/ci.yml`

- [ ] **Step 1: `deploy.yml`** — push to `master` → assume an IAM role via OIDC (no stored keys) → migrate → `pulumi up`:

```yaml
name: Deploy
on: { push: { branches: [master] } }
concurrency: { group: deploy-master, cancel-in-progress: false }
permissions: { contents: read }
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production
    permissions: { id-token: write, contents: read }
    steps:
      - uses: actions/checkout@v6
        with: { fetch-depth: 0 }
      - uses: nrwl/nx-set-shas@v4
        with: { main-branch-name: master }
      - uses: ./.github/actions/setup-js
      - uses: aws-actions/configure-aws-credentials@v4
        with: { role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}, aws-region: ap-southeast-2 }
      - uses: pulumi/auth-actions@v1
        with: { organization: leocaseiro, requested-token-type: urn:pulumi:token-type:access_token:organization }
      - name: Select prod stack + export the single-source Neon URL (F4)
        working-directory: infra
        run: |
          pulumi stack select prod
          echo "::add-mask::$(pulumi config get neonDatabaseUrl --show-secrets)"
          echo "DATABASE_URL=$(pulumi config get neonDatabaseUrl --show-secrets)" >> "$GITHUB_ENV"
      - name: DB migrate (apply) — reads the SAME secret the Lambda runtime uses
        run: pnpm --filter @notation-hero/neon-catalogue-adapter run db:migrate
      - name: Pulumi up (prod)   # infra:up -> pulumi:up builds both apps (Task 0.6 Step 4) first
        run: pnpm run infra:up
```

- [ ] **Step 2: Add two PR jobs to `ci.yml`** (`migrations-dryrun` running `db:migrate:status` against `${{ secrets.NEON_PREVIEW_URL }}`, and `infra-preview` running `pnpm run infra:preview` with the same OIDC + `pulumi/auth-actions`, read-only). Add **both** to the `needs:` list and the result-check of the `CI Green` aggregation job (the existing comment warns: forgetting this = false-green).

- [ ] **Step 3: One-time AWS setup (author in Pulumi or document):** create the GitHub OIDC provider (`token.actions.githubusercontent.com`); an IAM role whose trust `sub` is restricted to `repo:leocaseiro/notation-hero:ref:refs/heads/master` (deploy) and `repo:leocaseiro/notation-hero:pull_request` (preview); store **only** the role ARN as the `AWS_DEPLOY_ROLE_ARN` secret. **Create both Pulumi stacks (F3):** keep `dev` for local + the `infra-preview` PR job, and `pulumi stack init prod` for `deploy.yml`; set each stack's `neonDatabaseUrl` + `adminPassword` secrets. `deploy.yml` selects `prod` and reads `neonDatabaseUrl` from it, so the migrate step and the Lambda runtime share one source (F4). Commit `ci(catalogue): keyless OIDC deploy + PR migration/infra preview`.

### Task 0.8: (Tier 2) Scheduled warmer — wire, optionally disabled

**Files:** Modify `infra/index.ts`; `apps/handler-catalogue/src/server.service.ts` (guard clause)

- [ ] **Step 1: Handler guard** — in `buildServer()`/`index.ts`, short-circuit synthetic warmer events **before any route/DB work**:

```ts
// index.ts (wrap the proxy)
import awsLambdaFastify from "@fastify/aws-lambda";
import { buildServer } from "./server.service.ts";
const proxy = awsLambdaFastify(buildServer());
export const handler = async (event: { warmer?: boolean }, context: unknown) => {
  if (event && event.warmer === true) return { statusCode: 204, body: "" }; // warm Lambda only, NO DB
  return proxy(event as never, context as never);
};
```

- [ ] **Step 2: Pulumi schedule** (EventBridge Scheduler `rate(5 minutes)` invoking with `{"warmer":true}`; a role allowing `lambda:InvokeFunction`). Gate behind a Pulumi config flag `enableWarmer` (default `false`) so it ships disabled and is a one-line flip. Commit `feat(infra): optional 5-min lambda warmer (tier-2, default off)`.

---

## Phase R — Read (GET list + GET by id) · ships standalone

### Task R.1: Domain types — `catalogue-item.entity.ts`

**Files:** Create `core/catalogue/src/catalogue-item.entity.ts` + `.test.ts`

- [ ] **Step 1: Define the entity + list projection + read query types** (camelCase domain; explicit exports for isolatedDeclarations)

```ts
export type ItemType = "song" | "lesson";
export type ItemStatus = "draft" | "published" | "archived";

export interface CatalogueItem {
  readonly id: string;
  readonly type: ItemType;
  readonly title: string;
  readonly level: number | null;
  readonly artist: string | null;
  readonly bpm: number | null;
  readonly timeSig: string | null;
  readonly genre: string | null;
  readonly instruments: readonly string[];
  readonly tags: readonly string[];
  readonly lessonType: string | null;
  readonly sortOrder: number | null;
  readonly coverImageKey: string | null;
  readonly hasAudio: boolean;
  readonly hasVideo: boolean;
  readonly status: ItemStatus;
  readonly createdAt: string; // ISO
  readonly updatedAt: string; // ISO
}

// §9 list projection — excludes data jsonb / notation_key / notation_checksum
export interface CatalogueListItem {
  readonly id: string;
  readonly type: ItemType;
  readonly title: string;
  readonly artist: string | null;
  readonly genre: string | null;
  readonly level: number | null;
  readonly bpm: number | null;
  readonly timeSig: string | null;
  readonly instruments: readonly string[];
  readonly hasAudio: boolean;
  readonly hasVideo: boolean;
  readonly sortOrder: number | null;
  readonly coverImageUrl: string | null; // resolved from coverImageKey
  readonly status: ItemStatus;
  readonly updatedAt: string;
}

export interface ListFilter {
  readonly type?: ItemType;
  readonly status?: ItemStatus; // public read defaults to 'published'
  readonly level?: number;      // bounded → excludes NULL (ungraded) by design (§9)
  readonly bpmMin?: number;
  readonly bpmMax?: number;
  readonly timeSig?: string;
  readonly instrument?: string;
  readonly q?: string;          // fuzzy/full-text search
}

export interface ListResult {
  readonly items: readonly CatalogueListItem[];
  readonly nextCursor: string | null;
}
```

- [ ] **Step 2: Test the type guard helper** (add `isPublic()` used by read defaults)

```ts
import { test } from "node:test"; import assert from "node:assert/strict";
import { isPublicListFilter } from "./catalogue-item.entity.ts";
test("defaults status to published when unset", () => {
  assert.deepEqual(isPublicListFilter({}), { status: "published" });
});
```

Add to the entity file: `export const isPublicListFilter = (f: ListFilter): ListFilter => f.status ? f : { ...f, status: "published" };`

- [ ] **Step 3:** Run `pnpm --filter @notation-hero/catalogue-core test` → PASS. Commit.

### Task R.2: Value objects — `catalogue-item-id` + `item-type`

**Files:** Create `core/catalogue/src/catalogue-item-id.value-object.ts`, `item-type.value-object.ts` (+ tests)

- [ ] **Step 1: Write the parsers** (throw `ItemValidationError` — defined in Task R.3)

```ts
// catalogue-item-id.value-object.ts
import { ItemValidationError } from "./catalogue.error.ts";
export const parseItemId = (raw: unknown): string => {
  if (typeof raw !== "string" || raw.trim().length === 0)
    throw new ItemValidationError("id must be a non-empty string");
  if (raw.length > 256) throw new ItemValidationError("id too long");
  return raw;
};
```
```ts
// item-type.value-object.ts
import { ItemValidationError } from "./catalogue.error.ts";
import type { ItemType } from "./catalogue-item.entity.ts";
export const parseItemType = (raw: unknown): ItemType => {
  if (raw === "song" || raw === "lesson") return raw;
  throw new ItemValidationError("type must be 'song' or 'lesson'");
};
```

- [ ] **Step 2: Tests** — valid passes, empty/long/wrong throws. Run → PASS. Commit.

### Task R.3: Errors — `catalogue.error.ts`

**Files:** Create `core/catalogue/src/catalogue.error.ts` + `.test.ts`

- [ ] **Step 1: Define the domain error hierarchy** (each carries a stable `code` for the HTTP mapper)

```ts
export class CatalogueError extends Error {
  constructor(readonly code: string, message: string) { super(message); this.name = "CatalogueError"; }
}
export class ItemNotFoundError extends CatalogueError {
  constructor(id: string) { super("ITEM_NOT_FOUND", `catalogue item not found: ${id}`); }
}
export class DuplicateItemError extends CatalogueError {
  constructor(id: string) { super("DUPLICATE_ITEM", `catalogue item already exists: ${id}`); }
}
export class ItemValidationError extends CatalogueError {
  constructor(message: string) { super("VALIDATION", message); }
}
export class InvalidStatusTransitionError extends CatalogueError {
  constructor(from: string, to: string) { super("INVALID_TRANSITION", `cannot move status ${from} -> ${to}`); }
}
```

- [ ] **Step 2: Test** `code` values + `instanceof CatalogueError`. Run → PASS. Commit.

### Task R.4: Repository port + fake

**Files:** Create `core/catalogue/src/catalogue-repository.port.ts`, `catalogue-repository.fake.ts` (+ fake test)

- [ ] **Step 1: The driven port** (read methods now; write methods added in C+U/D)

```ts
import type { CatalogueItem, CatalogueListItem, ListFilter, ListResult } from "./catalogue-item.entity.ts";

export interface CatalogueRepository {
  list(filter: ListFilter, cursor: string | null, limit: number): Promise<ListResult>;
  findById(id: string): Promise<CatalogueItem | null>;
  // C+U/D add: insert(item), update(id, patch), archive(id)
}
```

- [ ] **Step 2: In-memory fake** (drives every unit test; `.fake` is suffix-exempt)

```ts
import type { CatalogueRepository } from "./catalogue-repository.port.ts";
import type { CatalogueItem, CatalogueListItem, ListFilter, ListResult } from "./catalogue-item.entity.ts";

const toListItem = (i: CatalogueItem): CatalogueListItem => ({
  id: i.id, type: i.type, title: i.title, artist: i.artist, genre: i.genre, level: i.level,
  bpm: i.bpm, timeSig: i.timeSig, instruments: i.instruments, hasAudio: i.hasAudio, hasVideo: i.hasVideo,
  sortOrder: i.sortOrder, coverImageUrl: i.coverImageKey, status: i.status, updatedAt: i.updatedAt });

export class FakeCatalogueRepository implements CatalogueRepository {
  constructor(private items: CatalogueItem[] = []) {}
  async list(filter: ListFilter, _cursor: string | null, limit: number): Promise<ListResult> {
    const rows = this.items
      .filter((i) => (filter.status ? i.status === filter.status : true))
      .filter((i) => (filter.type ? i.type === filter.type : true))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    return { items: rows.slice(0, limit).map(toListItem), nextCursor: rows.length > limit ? rows[limit].id : null };
  }
  async findById(id: string): Promise<CatalogueItem | null> { return this.items.find((i) => i.id === id) ?? null; }
}
```

- [ ] **Step 3: Test the fake** filters by status + returns null on miss. Run → PASS. Commit.

### Task R.5: Read use-cases — `list-catalogue.query.ts`, `get-catalogue-item.query.ts`

**Files:** Create both `.query.ts` + tests

- [ ] **Step 1: `list-catalogue.query.ts`** (applies the public-status default; clamps limit)

```ts
import type { CatalogueRepository } from "./catalogue-repository.port.ts";
import { isPublicListFilter, type ListFilter, type ListResult } from "./catalogue-item.entity.ts";

const DEFAULT_LIMIT = 30; const MAX_LIMIT = 100;
export const makeListCatalogue =
  (repo: CatalogueRepository) =>
  (filter: ListFilter, cursor: string | null, limit = DEFAULT_LIMIT): Promise<ListResult> =>
    repo.list(isPublicListFilter(filter), cursor, Math.min(Math.max(limit, 1), MAX_LIMIT));
```

- [ ] **Step 2: `get-catalogue-item.query.ts`** (throws `ItemNotFoundError`; public read hides archived)

```ts
import type { CatalogueRepository } from "./catalogue-repository.port.ts";
import type { CatalogueItem } from "./catalogue-item.entity.ts";
import { ItemNotFoundError } from "./catalogue.error.ts";

export const makeGetCatalogueItem =
  (repo: CatalogueRepository) =>
  async (id: string, opts: { includeArchived?: boolean } = {}): Promise<CatalogueItem> => {
    const item = await repo.findById(id);
    if (!item || (item.status === "archived" && !opts.includeArchived)) throw new ItemNotFoundError(id);
    return item;
  };
```

- [ ] **Step 3: Tests with the fake** — list defaults to published + respects limit; get returns item, throws on missing, hides archived unless `includeArchived`. Run → PASS. Commit.

- [ ] **Step 4: Export everything** from `core/catalogue/src/index.ts` (entity types, value-objects, port, fake, errors, query factories). Run `nx typecheck` + `check-layout.sh`. Commit `feat(catalogue): core read domain (entity, port, queries)`.

### Task R.6: Neon repository (read) + mappers

**Files:** Create `adapters/neon-catalogue/src/catalogue-row.dto.ts`, `catalogue-item.mapper.ts`, `list-filter.mapper.ts`, `neon-catalogue.repository.ts` (+ tests)

- [ ] **Step 1: `catalogue-row.dto.ts`** — the snake_case DB row type (subset needed for read; full record on detail). Mirror schema columns.

- [ ] **Step 2: `catalogue-item.mapper.ts`** — `rowToItem(row)` (snake→camel domain) and `rowToListItem(row, resolveCoverUrl)` (the §9 projection; `coverImageUrl` resolved from `cover_image_key`). Pure; unit-tested with a literal row, **no DB**.

- [ ] **Step 3: `list-filter.mapper.ts`** — builds a **parameterized** `WHERE` + keyset cursor clause from `ListFilter` (every user value bound, never interpolated — schema §9). Cursor = base64 of `{updatedAt,id}`; clause `(updated_at, id) < ($cur_ts, $cur_id)` ordered `updated_at DESC, id DESC`.

- [ ] **Step 4: `neon-catalogue.repository.ts`** — `list()` and `findById()` using the `neon()` tagged-template (parameterized). `list()` selects only the §9 projection columns; `findById()` selects the full record.

```ts
import type { Sql } from "./neon-client.client.ts";
import type { CatalogueRepository } from "@notation-hero/catalogue-core";
import { rowToItem, rowToListItem } from "./catalogue-item.mapper.ts";
// ... list(): SELECT <projection> FROM catalogue_item WHERE <built clause> ORDER BY updated_at DESC, id DESC LIMIT $n+1
// findById(): SELECT * FROM catalogue_item WHERE id = ${id}
export class NeonCatalogueRepository implements CatalogueRepository { constructor(private sql: Sql) {} /* ... */ }
```

- [ ] **Step 5: Unit-test the mappers** (pure, no DB). The repository SQL is covered by the **integration** suite (Task R.11). Run mapper tests → PASS. Commit `feat(catalogue): neon read repository + mappers`.

### Task R.7: Fastify server + composition root

**Files:** Create `apps/handler-catalogue/src/server.service.ts`, `composition.service.ts` (+ server test)

- [ ] **Step 1: `composition.service.ts`** — DI root: read `DATABASE_URL`, build the Neon client, repo, and use-case functions; return them as a typed `Deps` object.

```ts
import { makeSql } from "@notation-hero/neon-catalogue-adapter";
import { NeonCatalogueRepository } from "@notation-hero/neon-catalogue-adapter";
import { makeListCatalogue, makeGetCatalogueItem } from "@notation-hero/catalogue-core";

export interface Deps {
  listCatalogue: ReturnType<typeof makeListCatalogue>;
  getCatalogueItem: ReturnType<typeof makeGetCatalogueItem>;
}
export const buildDeps = (connectionString = process.env.DATABASE_URL ?? ""): Deps => {
  const repo = new NeonCatalogueRepository(makeSql(connectionString));
  return { listCatalogue: makeListCatalogue(repo), getCatalogueItem: makeGetCatalogueItem(repo) };
};
```

- [ ] **Step 2: `server.service.ts`** — `buildServer(deps?)`: Fastify instance with the TypeBox type-provider, the error handler (Task R.8), rate-limit (Task R.9), and the controllers registered. Accept injectable `deps` so tests can pass a fake-repo-backed `Deps`.

```ts
import Fastify, { type FastifyInstance } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import { buildDeps, type Deps } from "./composition.service.ts";
import { registerCatalogueController } from "./catalogue.controller.ts";
import { registerErrorMapper } from "./error-mapper.mapper.ts";

export const buildServer = (deps: Deps = buildDeps()): FastifyInstance => {
  const app = Fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>();
  registerErrorMapper(app);
  registerCatalogueController(app, deps);
  return app;
};
```

- [ ] **Step 3: Server smoke test** via `app.inject()` with a `FakeCatalogueRepository`-backed `Deps`. Run → PASS. Commit.

### Task R.8: Error mapper — domain error → HTTP status

**Files:** Create `apps/handler-catalogue/src/error-mapper.mapper.ts` + test

- [ ] **Step 1: `registerErrorMapper(app)`** — `setErrorHandler` mapping `code → status` (`ITEM_NOT_FOUND`→404, `DUPLICATE_ITEM`→409, `VALIDATION`→422, `INVALID_TRANSITION`→409) and Fastify's `FST_ERR_VALIDATION` (default 400) → **422**; body `{ error: { code, message } }`. Unknown → 500 (logged).

- [ ] **Step 2: Test** each mapping via `app.inject()` against a throwaway route that throws each error. Run → PASS. Commit.

### Task R.9: Rate limit (open-URL guardrail)

**Files:** Modify `server.service.ts`

- [ ] **Step 1:** Register `@fastify/rate-limit` keyed on `request.headers['x-forwarded-for']` / the Function-URL source IP (`requestContext.http.sourceIp`), e.g. `max: 100, timeWindow: '1 minute'`. Note: in-memory store is per-container (leaky but a cheap cap; the hard cap is `reservedConcurrentExecutions` from Task 0.6). Test a 429 fires past the limit via `inject()`. Commit `feat(catalogue): rate-limit the public function url`.

### Task R.10: Read controllers + response DTOs

**Files:** Create `apps/handler-catalogue/src/catalogue.controller.ts`, `catalogue-response.dto.ts`, `catalogue-request.dto.ts` (+ controller test)

- [ ] **Step 1: `catalogue-response.dto.ts`** — TypeBox schemas: `ListItemSchema`, `ListResponseSchema` (`{ data: ListItem[], nextCursor: string|null }`), `ItemResponseSchema` (`{ data: Item }`). Export `Static` types.

- [ ] **Step 2: `catalogue-request.dto.ts`** — TypeBox `ListQuerySchema` (type/status/level/bpmMin/bpmMax/timeSig/instrument/q/cursor/limit, all optional) + `Static`.

- [ ] **Step 3: `catalogue.controller.ts`** — `registerCatalogueController(app, deps)`:

```ts
import type { FastifyInstance } from "fastify";
import type { Deps } from "./composition.service.ts";
import { ListQuerySchema } from "./catalogue-request.dto.ts";
import { ListResponseSchema, ItemResponseSchema } from "./catalogue-response.dto.ts";

export const registerCatalogueController = (app: FastifyInstance, deps: Deps): void => {
  app.get("/catalogue", { schema: { querystring: ListQuerySchema, response: { 200: ListResponseSchema } } },
    async (req) => {
      const q = req.query;
      const result = await deps.listCatalogue(
        { type: q.type, status: q.status, level: q.level, bpmMin: q.bpmMin, bpmMax: q.bpmMax, timeSig: q.timeSig, instrument: q.instrument, q: q.q },
        q.cursor ?? null, q.limit);
      return { data: result.items, nextCursor: result.nextCursor };
    });
  app.get("/catalogue/:id", { schema: { response: { 200: ItemResponseSchema } } },
    async (req) => ({ data: await deps.getCatalogueItem((req.params as { id: string }).id) }));
};
```

- [ ] **Step 3b (F1 — public-status enforcement):** For unauthenticated callers the controller MUST drop any caller-supplied `status`/`includeArchived` and force `status='published'` — `isPublicListFilter` only *defaults* an unset status, so a public `?status=draft` would otherwise leak unpublished items. Only requests carrying a valid admin token (the CU.4 `admin-auth.service.ts` preHandler) may pass arbitrary `status`/`includeArchived` (admin-read, registry F1).

- [ ] **Step 4: Controller tests** via `app.inject()` + fake repo: `GET /catalogue` → 200 `{data,nextCursor}`; `GET /catalogue/:id` → 200; missing id → 404; bad query (`limit: 'x'`) → 422; **public `?status=draft` still returns only published (F1)**. Run → PASS. Commit `feat(catalogue): read controllers (GET list + by id)`.

### Task R.11: Integration test (real SQL, free-tier-safe)

**Files:** Create `adapters/neon-catalogue/src/neon-catalogue.repository.test.ts`

- [ ] **Step 1:** Guard behind `process.env.RUN_DB_TESTS === "1"` (so default `nx test` and CI-without-secret skip it). When enabled, connect to a **Neon branch** (`DATABASE_URL_TEST`), run migration `0001`, seed two rows, assert `list()` projection + cursor + `findById()`. Document the `RUN_DB_TESTS=1 DATABASE_URL_TEST=... pnpm --filter ...adapter test` invocation in the package and AGENTS.md. Commit `test(catalogue): neon integration suite (opt-in)`.

### Task R.12: Deploy + manual verify (green checkpoint)

- [ ] **Step 1:** `pnpm --filter @notation-hero/handler-catalogue build` → `pnpm run infra:up` (local, with the Neon secret set). `curl "$(pulumi stack output catalogueUrl)/catalogue"` → `{ "data": [...], "nextCursor": ... }`. `curl .../catalogue/does-not-exist` → 404. **Commit + open PR for Phase R** (commit-before-review rule).

---

## Phase C+U — Create + Update

### Task CU.1: `item-status` value-object + `clock`/`id-generator` ports

**Files:** Create `core/catalogue/src/item-status.value-object.ts`, `clock.port.ts`, `id-generator.port.ts` (+ tests)

- [ ] **Step 1:** `item-status.value-object.ts` — `parseStatus()` + `assertTransition(from,to)` (draft→published, published→archived, draft→archived; reject others with `InvalidStatusTransitionError`).
- [ ] **Step 2:** `clock.port.ts` (`export interface Clock { now(): string }` ISO) + `id-generator.port.ts` (`export interface IdGenerator { newId(): string }`), plus `system` impls and `fixed`/`sequential` fakes for tests. Run → PASS. Commit.

### Task CU.2: Create + Update commands

**Files:** Create `core/catalogue/src/create-catalogue-item.command.ts`, `update-catalogue-item.command.ts` (+ tests)

- [ ] **Step 1:** `makeCreateCatalogueItem(repo, clock, idGen)` — validates required fields (`type`, `title`; `bpm` required when `type==='song'` per schema CHECK `ci_song_bpm`), sets `createdAt/updatedAt` via `clock`, id via supplied id or `idGen`; calls `repo.insert()`; surfaces a PK collision as `DuplicateItemError` (`409`).
- [ ] **Step 2:** `makeUpdateCatalogueItem(repo, clock)` — partial patch of editable fields, bumps `updatedAt`; `ItemNotFoundError` if absent.
- [ ] **Step 3:** Tests with fake repo + fixed clock/id: create returns item; duplicate id → `DuplicateItemError`; song without bpm → `ItemValidationError`; update bumps `updatedAt`. Run → PASS. Commit.

### Task CU.3: Repository writes

**Files:** Modify `core/catalogue/src/catalogue-repository.port.ts`, `catalogue-repository.fake.ts`, `adapters/neon-catalogue/src/neon-catalogue.repository.ts` + `catalogue-item.mapper.ts` (write mapping)

- [ ] **Step 1:** Add `insert(item): Promise<void>` + `update(id, patch): Promise<CatalogueItem>` to the port and the fake (fake throws `DuplicateItemError` on existing id; `ItemNotFoundError` on update-missing).
- [ ] **Step 2:** Implement in `NeonCatalogueRepository` with parameterized `INSERT`/`UPDATE`; map a Postgres unique-violation (`23505`) → `DuplicateItemError`. Add `itemToInsertRow()` to the mapper. Run mapper tests + (opt-in) integration. Commit `feat(catalogue): write repository (insert/update)`.

### Task CU.4: Create/Update controller + request DTOs + infra methods

**Files:** Create `apps/handler-catalogue/src/catalogue-create.controller.ts`, `admin-auth.service.ts`; Modify `catalogue-request.dto.ts`, `server.service.ts`, `composition.service.ts`

- [ ] **Step 0 (F1/F2 — admin gate):** Add an admin-auth Fastify plugin/`preHandler` (`admin-auth.service.ts`) on `POST/PUT/DELETE /catalogue[...]` (and the admin-read path) comparing an `x-admin-token`/`Authorization` header against `process.env.ADMIN_PASSWORD` (from SSM via Task 0.6); return `401` when missing/wrong. Secret never in the repo. Test via `inject()`: write without the token → 401; with it → reaches the handler.

- [ ] **Step 1:** TypeBox `CreateItemBody` / `UpdateItemBody` in `catalogue-request.dto.ts` (required `type`,`title`; optional rest; song-bpm enforced in the command, not the schema, so the error is a domain `422`).
- [ ] **Step 2:** `registerCatalogueCreateController(app, deps)`: `POST /catalogue` → `201` + `Location: /catalogue/:id`, `409` on duplicate; `PUT /catalogue/:id` → `200`, `404` if absent. Wire `buildDeps` to expose `createCatalogueItem`/`updateCatalogueItem`; register in `buildServer`.
- [ ] **Step 3:** Confirm `allowMethods` already includes `POST,PUT` (Task 0.6). Controller tests via `inject()`: create 201+Location; duplicate 409; invalid body 422; update 200; update-missing 404. Run → PASS. **Commit + PR for Phase C+U.**

---

## Phase D — Delete (soft-delete via archive)

### Task D.1: Archive command + repository

**Files:** Create `core/catalogue/src/archive-catalogue-item.command.ts` (+ test); Modify port/fake/`neon-catalogue.repository.ts`

- [ ] **Step 1:** `makeArchiveCatalogueItem(repo, clock)` — loads the item (`ItemNotFoundError` if absent or already archived → idempotent: treat already-archived as success or 404, choose **404 only if absent**; already-archived → 204), sets `status='archived'`, bumps `updatedAt` via `repo.archive(id)`.
- [ ] **Step 2:** Add `archive(id): Promise<void>` to port + fake + Neon repo (`UPDATE catalogue_item SET status='archived', updated_at=now() WHERE id=$id`). Tests: archive sets status; missing → `ItemNotFoundError`. Run → PASS. Commit.

### Task D.2: Delete controller

**Files:** Create `apps/handler-catalogue/src/catalogue-delete.controller.ts` (+ test); Modify `server.service.ts`, `composition.service.ts`

- [ ] **Step 1:** `registerCatalogueDeleteController(app, deps)`: `DELETE /catalogue/:id` → `204` (no body); `404` if absent. Wire `archiveCatalogueItem` into `Deps` + `buildServer`.
- [ ] **Step 2:** Test via `inject()`: delete returns 204 and a subsequent public `GET /catalogue/:id` returns 404 (archived hidden by Task R.5's default); delete-missing → 404. Run → PASS. **Commit + PR for Phase D.**

---

## Self-review (spec coverage)

- **Read → Create+Update → Delete phasing** — Phases R / C+U / D, each a standalone green checkpoint + PR. ✅
- **Neon + current schema** — `catalogue_item` columns mapped (entity + Drizzle `catalogue-schema.dto.ts`); migration `0001` is `catalogue_item` only; **lesson-steps (`exercise`/`pattern`) skipped** per instruction. ✅
- **Soft-delete** — `status='archived'` (NOT `deleted_at` — schema has none); reads hide archived. ✅
- **Cold-start mitigations** — Tier 0 (arm64+esbuild+module-scope+HTTP driver+512MB/10s) in Task 0.4/0.6; Tier 2 warmer (DB-safe guard) in Task 0.8; Tiers 3/4 documented. ✅
- **Fastify adoption risks** — §0.1 table; each mitigated by a task (concurrency cap 0.6, rate-limit R.9, CJS bundle 0.4, HTTP-driver 0.3, CORS one-owner via Function URL). ✅
- **CI/CD fit** — §2 keep/add/defer; OIDC deploy + PR jobs in Task 0.7; no new test runner, no API Gateway, no per-app config. ✅
- **Hexagon + naming** — every file uses an approved role suffix; `core` pure (no `@neondatabase` import); Drizzle confined to the adapter; verified against `tooling/check-layout.sh` + depcruise in Task 0.1/R.5. ✅
- **Security** — open-URL guardrails (concurrency cap + rate-limit + Budgets + validation); `DATABASE_URL`/secrets via SSM/Pulumi secret; all SQL parameterized (`list-filter.mapper.ts`). ✅

**Known follow-ups (out of this plan):** real ESLint target (NH-42 flat-config lane); Vitest + coverage ratchet (L5 lane); `exercise`/`pattern` tables + lesson-steps; signed CloudFront notation URLs on item-open; per-user score join (DynamoDB).

---

## Execution handoff

Two options:
1. **Subagent-Driven (recommended)** — a fresh subagent per task, review between tasks.
2. **Inline Execution** — batch tasks in-session with checkpoints.

Recommended order: **Phase 0 → Phase R (ship + PR) → Phase C+U → Phase D**, committing at every green checkpoint.
