# Catalogue CRUD on NestJS + AWS Lambda — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the catalogue CRUD (Read → Create/Update → Delete) as a single NestJS "Lambdalith" on AWS Lambda + Neon Postgres, deployed via the existing Pulumi stack, staying on the AWS perpetual free tier ($0) — as the first real cloud/backend feature and a hexagonal-architecture learning vehicle.

**Architecture:** One NestJS app (`apps/catalogue-api`) wrapped for Lambda with `@codegenie/serverless-express` (cached-server pattern) behind the existing Lambda Function URL + CloudFront. The domain lives in a framework-free `core/catalogue` library (ports/entities); the Neon data access lives in `adapters/neon-catalogue` (Drizzle + Neon HTTP driver) and is wired to the port via NestJS dependency injection. Pulumi packages the esbuilt `dist/` exactly like `apps/handler-hello` today.

**Tech Stack:** NestJS 11 (Express adapter) · `@codegenie/serverless-express` · `@nx/nest` 22.7.5 · esbuild (`@nx/esbuild`) + `@anatine/esbuild-decorators` · Drizzle ORM (`drizzle-orm/neon-http`) + `@neondatabase/serverless` + `drizzle-kit` · Pulumi (existing `LambdaWithUrl`) · Lambda Node 24 / arm64 · Jest + supertest.

---

## 0. Context & decisions (2026-06-16 session)

**Where this sits:** This is milestone **M0→M1** of the cloud-learning roadmap (the "hello-cloud walking skeleton" → "catalogue full CRUD"). It **refines** the BE-framework and data-layer choices of the earlier CMS build plan ([docs/plans/2026-06-07-001-feat-cms-k-build-plan.md](2026-06-07-001-feat-cms-k-build-plan.md)) — the framework is now **NestJS** (decided 2026-06-16) and the ORM is **Drizzle**. Epic: [NH-177](https://leocaseiro.atlassian.net/browse/NH-177) "Catalog/CMS & Infra".

**Source-of-truth references (read before implementing):**
- Catalogue schema → [docs/specs/2026-06-10-catalogue-schema.md](../specs/2026-06-10-catalogue-schema.md) (`catalogue_item` table, `data` JSONB, generated `search` tsvector, CHECK constraints, indexes)
- Datastore decision → [docs/decisions/2026-06-09-catalogue-store-postgres-neon.md](../decisions/2026-06-09-catalogue-store-postgres-neon.md) (Neon + serverless HTTP driver chosen for the Lambda↔Postgres pool problem)
- CMS approach + admin spec → [docs/cms-approach.md](../cms-approach.md), [docs/specs/2026-06-15-cms-admin.md](../specs/2026-06-15-cms-admin.md) (the dataProvider CRUD contract, password gate, archive-not-delete)
- Structure/enforcement ADR → [docs/decisions/2026-06-12-file-level-structure-enforcement-adr.md](../decisions/2026-06-12-file-level-structure-enforcement-adr.md) (kebab + role-suffix naming, the four guards)
- Existing Lambda pattern → `apps/handler-hello/` + `infra/lambda-with-url.stack.ts` + `infra/index.ts`
- Governance/conventions → `AGENTS.md`

**This plan covers (everything discussed this session):** NestJS adoption into the hexagon, the two enforcement edits it needs, the data layer (Drizzle + Neon HTTP), the full CRUD (R→CU→D), cold-start mitigations, and the one missing CI piece (Pulumi deploy automation via OIDC).

**Explicitly OUT of scope for the first CRUD (per Leo):**
- The `exercise` table (lesson steps) — first CRUD is *add-a-song*; songs carry their own `notation_key`, no steps.
- `pattern` / `item_pattern` linking UI (ships empty until Beta content).
- `audio`/`video` JSONB editing (only the `has_audio`/`has_video` booleans).
- The generated `search` tsvector column — it is `GENERATED ALWAYS … STORED`, never written by CRUD; read-only in queries.
- Auth (Cognito) — writes are protected by the existing **password gate** (cms-admin §4) for now; full Cognito is milestone M3.
- The FE (design system / router) — being evaluated in a separate session; this plan defines only the **API contract** the Next.js catalogue will consume.

---

## 1. Architecture & file map

### 1.1 The three packages (hexagon rings)

| Package | Nx tag | Responsibility | May import |
|---|---|---|---|
| `core/catalogue` (`@notation-hero/catalogue-core`) | `type:core` | Pure domain: `catalogue-item.entity.ts`, value objects, `catalogue-repository.port.ts`, domain errors. **ZERO `@nestjs/*`.** Emitting lib (`isolatedDeclarations` — explicit return types). | nothing |
| `adapters/neon-catalogue` (`@notation-hero/neon-catalogue`) | `type:adapter` | Port implementation: `neon-catalogue.repository.ts` (Drizzle + Neon HTTP), `schema/*.ts` (Drizzle tables), `drizzle.client.ts`. | `core` only |
| `apps/catalogue-api` (`@notation-hero/catalogue-api`) | `type:app` | **The only NestJS ring:** `app.module.ts`, `catalogue.module.ts`, `catalogue.controller.ts`, `*.use-case.ts`, `*.dto.ts`, `database.module.ts`, the Lambda `main.ts` (cached bootstrap). | `core` + `adapters` |
| `infra/` (existing) | `type:infra` | One added `LambdaWithUrl(...)` instance pointing at `apps/catalogue-api/dist`. Wires build OUTPUT, never source. | `@pulumi/*` only |

**Hexagon seam:** the Nest app is the **composition root**. It binds the adapter to the port via a custom provider with an injection token — never injecting the concrete class:

```ts
// apps/catalogue-api/src/catalogue/catalogue.module.ts
providers: [
  ListCatalogueUseCase,
  { provide: CATALOGUE_REPOSITORY, useClass: NeonCatalogueRepository },
]
// use-cases inject the PORT, never the Neon class:
constructor(@Inject(CATALOGUE_REPOSITORY) private readonly repo: CatalogueRepositoryPort) {}
```

### 1.2 The Lambdalith + cold-start shape

One Nest app = one Lambda behind the **existing Function URL** (Always-Free; API Gateway is 12-mo-only on this account, deferred). `main.ts` caches the bootstrapped server at module scope so `NestFactory.create()` (the heavy DI graph build) runs **once per cold start**, never per request. Cold start ~1–2s, warm ~single-digit ms. Cold-start hidden by: (a) a fire-and-forget `GET /health` ping from the SPA shell on page load (reduces — does not eliminate — perceived cold starts; reliably warms the user's own container only at concurrency=1, since Lambda routes concurrent requests to separate execution environments), and (b) a 5-minute EventBridge Scheduler warmer hitting `/health`. Neon's HTTP driver removes the DB connection cold-connect entirely (stateless fetch per query, no VPC).

### 1.3 Files created / modified

```
core/catalogue/                         # NEW package
  src/catalogue-item.entity.ts
  src/catalogue-repository.port.ts
  src/catalogue.error.ts
  src/index.ts
  project.json  tsconfig*.json  package.json
adapters/neon-catalogue/                # NEW package
  src/schema/catalogue-item.schema.ts
  src/drizzle.client.ts
  src/neon-catalogue.repository.ts
  src/index.ts
  drizzle.config.ts
  migrations/0000_extensions.sql        # hand-written (pg_trgm/unaccent + immutable wrappers)
  migrations/0001_catalogue_item.sql    # drizzle-kit generated
  project.json  tsconfig*.json  package.json
apps/catalogue-api/                     # NEW package (the Nest app)
  src/main.ts                           # cached Lambda bootstrap
  src/app.module.ts
  src/database/database.module.ts
  src/health/health.controller.ts
  src/catalogue/catalogue.module.ts
  src/catalogue/catalogue.controller.ts
  src/catalogue/list-catalogue.use-case.ts
  src/catalogue/get-catalogue-item.use-case.ts
  src/catalogue/create-catalogue-item.use-case.ts
  src/catalogue/update-catalogue-item.use-case.ts
  src/catalogue/archive-catalogue-item.use-case.ts
  src/catalogue/dto/*.dto.ts
  test/catalogue.e2e-spec.ts            # NestJS e2e (+ test/jest-e2e.json)
  project.json  tsconfig*.json  package.json  esbuild.config.cjs
infra/lambda-with-url.stack.ts          # MODIFY: add memorySize/timeout/environment args + nodejs24.x default
infra/index.ts                          # MODIFY: add catalogue-api LambdaWithUrl instance
infra/package.json                      # MODIFY: pulumi:preview/up also build catalogue-api (F8)
infra/project.json                      # MODIFY: add catalogue-api to implicitDependencies (F8)
tooling/check-layout.sh                 # MODIFY: +module suffix, exempt main.ts
.dependency-cruiser.cjs                 # MODIFY: add no-core-to-nestjs; main.ts in no-orphan allowlist
core/catalogue/eslint config            # core ESLint deny-list: add @nestjs/*
.github/workflows/deploy.yml            # NEW: OIDC + pulumi/actions, self-managed S3 backend
.github/workflows/ci.yml                # MODIFY: actions/cache on .nx/cache; nx-set-shas v4→v5
package.json                            # MODIFY: add deps (see Task 0.1)
```

---

## 2. Key decisions I made (override any of these)

| # | Decision | Why | Flip condition |
|---|---|---|---|
| D1 | **Express** adapter (not Fastify) | `@codegenie/serverless-express` is the NestJS-official documented path; best docs for a backend newcomer; RPS is irrelevant at catalogue scale | Switch to `@h4ad/serverless-adapter` + Fastify later only if a hot path is CPU-bound in-process |
| D2 | **Drizzle** (not Prisma/TypeORM) | ~7–35KB bundle, ~10–20ms cold-start; first-class `neon-http`; plain-SQL fits the JSONB/`pg_trgm`/tsvector schema without fighting an ORM; no provider lock-in (decision-doc goal) | Prisma 7 only if you want its Studio/declarative DX and accept the heavier artifact |
| D3 | **Hand-rolled DI provider**, not `@knaadh/nestjs-drizzle` | That module has no Neon-HTTP support; the ~15-line factory is trivial and teaches the wiring | — |
| D4 | **Function URL**, not API Gateway, for v1 | Already in the repo; Always-Free vs API GW's 12-mo-only tier on this account | Add API GW HTTP API when you need authorizers/throttling/usage-plans |
| D5 | Cold-start: **SPA ping (primary) + 5-min EventBridge warmer (secondary)** | Ping warms on real arrival ($0, no infra); warmer holds one instance hot off-peak. Skip Provisioned Concurrency ($); no SnapStart (Node unsupported) | — |
| D6 | **Keep all four enforcement guards**; extend two | Nest's boundaries are *runtime/DI*; the static guards are orthogonal and are the hexagon lesson. Only `check-layout.sh` + one depcruise/ESLint rule need edits | — |
| D7 | CRUD writes gated by the **existing password gate** (cms-admin §4), not Cognito | Cognito is M3; keeps this slice shippable | — |

---

## Phases (each ends green and shippable)

- **Phase 0 — Foundation:** scaffold the 3 packages + Lambda bootstrap + the 2 enforcement edits + infra wiring. **Green:** `GET /health` live on the cloud, all guards/CI pass.
- **Phase 1 — READ:** `GET /catalogue` (list) + `GET /catalogue/:id` (detail). **Green:** a curl-able list/detail backed by Neon.
- **Phase 2 — CREATE + UPDATE:** `POST /catalogue`, `PUT /catalogue/:id`, password-gated. **Green:** add/edit a song end-to-end.
- **Phase 3 — DELETE = archive + unarchive:** `DELETE /catalogue/:id`, `POST /catalogue/:id/unarchive`. **Green:** full CRUD.
- **Phase 4 — Deploy automation + warmer:** `deploy.yml` (OIDC + Pulumi), `.nx/cache`, EventBridge warmer. **Green:** push-to-master deploys; container stays warm.

---

## Phase 0 — Foundation

### Task 0.1: Add dependencies

**Files:** Modify `package.json` (root, `-w` workspace).

- [ ] **Step 1: Install runtime + dev deps**

```bash
# Nx Nest + esbuild plugins pinned to the repo's Nx version
pnpm add -D -w @nx/nest@22.7.5 @nx/esbuild@22.7.5
# Nest runtime
pnpm add -w @nestjs/common@^11 @nestjs/core@^11 @nestjs/platform-express@^11 reflect-metadata rxjs
# Lambda bridge + validation
pnpm add -w @codegenie/serverless-express class-validator class-transformer
# Data layer
pnpm add -w drizzle-orm @neondatabase/serverless
pnpm add -D -w drizzle-kit @anatine/esbuild-decorators
```

- [ ] **Step 2: Verify install + lockfile**

Run: `pnpm install --frozen-lockfile`
Expected: PASS (no lockfile drift). Run `pnpm exec syncpack list-mismatches` — expected: no new mismatches.

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): add nestjs, serverless-express, drizzle + neon for catalogue api (NH-177)"
```

### Task 0.2: Widen `check-layout.sh` BEFORE generating (it will block Nest otherwise)

**Files:** Modify `tooling/check-layout.sh`; modify `tooling/pr-checklist`/decision-registry `NAME-suffix` row for governance sync.

> **Why first:** `.module.ts`/`.schema.ts` are not in `approved_suffix`, `main.ts` has no role suffix, and `*.e2e-spec.ts` is neither an approved suffix nor an exempt test pattern → the layout guard fails on the very first Nest/Drizzle commit (pre-commit + CI red). The fix keeps every NestJS/Drizzle file at its idiomatic name and widens the guard — it does NOT rename framework files.

- [ ] **Step 1: Write a failing fixture test**

Add to `tooling/check-layout` fixtures (mirror existing fixture style): `foo.module.ts`, `main.ts`, `foo.schema.ts`, and `test/foo.e2e-spec.ts`, then run the guard.

Run: `bash tooling/check-layout.sh` (or its test runner `node --test tooling/*.test.mjs` if a layout test exists)
Expected: FAIL — `foo.module.ts`/`foo.schema.ts` rejected (suffix not approved), `main.ts` rejected (no suffix, not index.ts), `foo.e2e-spec.ts` rejected (suffix `e2e-spec` not approved + not yet exempt).

- [ ] **Step 2: Widen the guard for Nest + Drizzle idiomatic names (suffixes + entry + e2e specs)**

In `tooling/check-layout.sh`:
- **Role suffixes** — locate the `approved_suffix` regex (already includes `controller|service|dto|entity|repository|port|…`) and add `module|guard|pipe|interceptor|filter` (Nest elements) **and `schema`** (Drizzle table files, e.g. `catalogue-item.schema.ts`).
- **Entry exemption** — in the Rule 2 entry-file exemption (currently allows `index.{ts,tsx,mts,cts}`), add `main.ts` (Nest's entry has no role suffix).
- **e2e specs** — add `*.e2e-spec.*` to the Rule 2 test-file exemption so NestJS e2e specs pass. They don't trip Rule 3's co-located-sibling check (that fires only on `*.test.*`/`*.spec.*`, and e2e specs boot the whole app so they have no single source sibling), and Rule 1 allows a `test/` dir (only `__tests__/`/`__mocks__/`/`stories/` are banned).

This adapts the guard to NestJS/Drizzle conventions rather than renaming framework files to fit the guard.

- [ ] **Step 3: Re-run the guard**

Run: `bash tooling/check-layout.sh`
Expected: PASS for `foo.module.ts` and `main.ts`.

- [ ] **Step 4: Sync governance + commit**

Update the `NAME-suffix` row note in [docs/decisions/decision-registry.md](../decisions/decision-registry.md) to record the added suffixes (`module|guard|pipe|interceptor|filter|schema`) plus the `main.ts` entry and `*.e2e-spec.*` test exemptions (per AGENTS.md "change-log in the same PR").

```bash
git add tooling/check-layout.sh docs/decisions/decision-registry.md
git commit -m "build(tooling): allow nest module/guard/schema suffixes + main.ts entry + e2e-spec tests in layout guard (NH-177)"
```

### Task 0.3: Add the `no-core-to-nestjs` boundary rule (keep `core` framework-free)

**Files:** Modify `.dependency-cruiser.cjs`; modify the `core/` ESLint `no-restricted-imports` deny-list.

- [ ] **Step 1: Add a failing probe** — create a throwaway `core/catalogue/src/_probe.ts` that does `import { Module } from '@nestjs/common'`.

Run: `pnpm exec depcruise --config .dependency-cruiser.cjs core` (and `pnpm run lint`)
Expected: currently PASSES (no rule yet) — that's the gap.

- [ ] **Step 2: Add the depcruise rule** (mirror the existing `no-core-to-pulumi`):

```js
// .dependency-cruiser.cjs — in forbidden[]
{
  name: 'no-core-to-nestjs',
  comment: 'core/ is framework-free; NestJS lives only in apps/.',
  severity: 'error',
  from: { path: '^core/' },
  to: { path: '@nestjs/' },
},
```

- [ ] **Step 2b: Add `main.ts` to the `no-orphans` allowlist** — in `.dependency-cruiser.cjs`, add `"^apps/catalogue-api/src/main\\.ts$"` to the `no-orphans` rule's `pathNot` array (alongside the existing `infra/index.ts` + `handler-hello/src/index.ts` entries). The Lambda entry is invoked by AWS and imported by nothing, so depcruise flags it as an orphan otherwise. This is named in the file-map + enforcement section but was missing from the executable steps. [F9]

- [ ] **Step 3: Add `@nestjs/*` to the `core/` ESLint deny-list** (the group that already bans `react`/`@aws-sdk`/`@pulumi`): add `'@nestjs/*'` to that `no-restricted-imports` patterns array.

- [ ] **Step 4: Re-run, confirm the probe now fails, then delete the probe**

Run: `pnpm exec depcruise --config .dependency-cruiser.cjs core`
Expected: FAIL on `_probe.ts` → `no-core-to-nestjs`. Delete `_probe.ts`.

- [ ] **Step 5: Commit**

```bash
git add .dependency-cruiser.cjs core
git commit -m "build(boundaries): forbid core -> @nestjs (keep domain framework-free) (NH-177)"
```

### Task 0.4: Generate the three packages

**Files:** Create `core/catalogue/`, `adapters/neon-catalogue/`, `apps/catalogue-api/`.

- [ ] **Step 1: Generate the app + libs with the correct tags**

```bash
# app/library generators set the type:* tags the boundary rules need
pnpm exec nx g @nx/nest:application catalogue-api --directory=apps/catalogue-api --tags=type:app --unitTestRunner=jest --e2eTestRunner=jest
pnpm exec nx g @nx/nest:library catalogue --directory=core/catalogue --tags=type:core --buildable
pnpm exec nx g @nx/js:library neon-catalogue --directory=adapters/neon-catalogue --tags=type:adapter --buildable
```

> `--e2eTestRunner=jest` (NestJS default): keeps Nest's standard e2e setup — `apps/catalogue-api/test/*.e2e-spec.ts` + `test/jest-e2e.json`. The layout guard is taught to exempt `*.e2e-spec.*` in Task 0.2 (a `test/` dir is allowed; only `__tests__/`/`__mocks__/`/`stories/` are banned), so no NestJS files get renamed to satisfy the guard.

- [ ] **Step 2: Set the app build target to the Nx-native esbuild executor (generator defaults to webpack)**

> **Precedent note (corrected):** `apps/handler-hello` builds via a **raw `esbuild` CLI script** in its `package.json` (`esbuild src/index.ts … --outfile=dist/index.js && node -e "…writeFileSync('dist/package.json',{type:'commonjs'})"`) — it has **no Nx build target**, and `@nx/esbuild` is not yet a dependency. For catalogue-api, adopt the **Nx-native `@nx/esbuild:esbuild` executor** instead (Nx caching + `affected`); `@nx/esbuild@22.7.5` is added in Task 0.1. [F3]

Replace the generated `apps/catalogue-api/project.json` `build` target with `@nx/esbuild:esbuild` (CJS, `platform: node`, single bundle, `FileArchive`-friendly `dist/`). Key options:
- **`outputFileName: 'main.js'`** — keep NestJS's `main.ts` entry, so the bundle is `dist/main.js` and the Pulumi handler is **`main.handler`** (resolves Open Q1; aligned in Task 0.6). [F6]
- **`target: 'node24'`** — Node 24 (Active LTS); the repo-wide bump (handler-hello, infra default, `engines`, CI) is a prerequisite chore — verify `nodejs24.x` in `ap-southeast-2`. [F4b]
- **`dist/package.json` must contain `{"type":"commonjs"}`** — REQUIRED because the workspace root is `"type":"module"`, so without it Node loads the CJS bundle as ESM and the Lambda crashes at import (`require is not defined`). Achieve via `@nx/esbuild`'s `generatePackageJson` or a post-build write step, mirroring handler-hello's shim. [F4]

Add the decorator-metadata plugin + externals via `esbuild.config.cjs`:

```js
// apps/catalogue-api/esbuild.config.cjs
const { esbuildDecorators } = require('@anatine/esbuild-decorators');
module.exports = {
  bundle: true, minify: true, treeShaking: true,
  format: 'cjs', platform: 'node', target: 'node24',
  plugins: [esbuildDecorators()],          // esbuild does NOT emit decorator metadata without this
  external: [
    '@aws-sdk/*',                           // present in the Lambda runtime
    '@nestjs/microservices', '@nestjs/websockets', '@fastify/*', '@grpc/*',
    'class-transformer/storage',
  ],
};
```

Set the app `tsconfig` to `experimentalDecorators: true, emitDecoratorMetadata: true` (apps ring only — NOT core).

- [ ] **Step 3: `import 'reflect-metadata'` as the FIRST line of `main.ts`** (see Task 0.5).

- [ ] **Step 4: Verify each project is tagged + builds the empty skeleton**

Run: `pnpm exec nx build catalogue-api`
Expected: PASS — produces `apps/catalogue-api/dist/main.js` + `dist/package.json` `{"type":"commonjs"}`. The Pulumi `handler` is `main.handler` (Task 0.6).

- [ ] **Step 5: Run the layout guard + boundaries on the new packages**

Run: `bash tooling/check-layout.sh && pnpm run lint && pnpm exec depcruise --config .dependency-cruiser.cjs core adapters apps`
Expected: PASS (this proves Tasks 0.2/0.3 covered the Nest file shapes).

- [ ] **Step 6: Commit**

```bash
git add core/catalogue adapters/neon-catalogue apps/catalogue-api
git commit -m "feat(catalogue): scaffold core/adapter/app hexagon packages for catalogue api (NH-177)"
```

### Task 0.5: The cached-server Lambda bootstrap + `/health`

**Files:** Create `apps/catalogue-api/src/main.ts`, `src/app.module.ts`, `src/health/health.controller.ts`.

- [ ] **Step 1: Write a failing e2e test for `/health`**

```ts
// apps/catalogue-api/test/health.e2e-spec.ts
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';

describe('health', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(async () => app.close());

  it('GET /health returns 200 without touching the database', async () => {
    await request(app.getHttpServer()).get('/health').expect(200).expect({ status: 'ok' });
  });
});
```

- [ ] **Step 2: Run it — fails (no module/controller yet)**

Run: `pnpm exec nx test catalogue-api`
Expected: FAIL — cannot find `AppModule`/route 404.

- [ ] **Step 3: Implement `health.controller.ts`, `app.module.ts`, `main.ts`**

```ts
// apps/catalogue-api/src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
@Controller('health')
export class HealthController {
  @Get()
  check() { return { status: 'ok' }; }   // MUST NOT touch Neon — this is the warm-ping target
}
```

```ts
// apps/catalogue-api/src/app.module.ts
import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
@Module({ controllers: [HealthController] })
export class AppModule {}
```

```ts
// apps/catalogue-api/src/main.ts
import 'reflect-metadata';                         // FIRST — required for Nest DI under esbuild
import serverlessExpress from '@codegenie/serverless-express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { Handler, Context } from 'aws-lambda';
import { AppModule } from './app.module';

let cachedServer: Handler;                          // module scope = survives warm invocations

async function bootstrap(): Promise<Handler> {
  if (!cachedServer) {
    const expressApp = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
    app.enableCors();
    await app.init();                               // NOT app.listen() — Lambda opens no port
    cachedServer = serverlessExpress({ app: expressApp });
  }
  return cachedServer;
}

export const handler = async (event: unknown, context: Context, callback: unknown) => {
  const server = await bootstrap();
  return (server as any)(event, context, callback);
};
```

- [ ] **Step 4: Run the test — passes**

Run: `pnpm exec nx test catalogue-api`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/catalogue-api/src
git commit -m "feat(catalogue-api): cached-server lambda bootstrap + /health (NH-177)"
```

### Task 0.6: Wire the Lambda in Pulumi (+ memory/timeout/env/runtime args)

**Files:** Modify `infra/lambda-with-url.stack.ts` (add `memorySize`/`timeout`/`environment` args, `nodejs24.x` default, widen CORS verbs); `infra/index.ts` (add instance); `infra/package.json` + `infra/project.json` (build catalogue-api on deploy).

- [ ] **Step 1: Extend `LambdaWithUrl` args + set the catalogue instance** (keep existing `arm64`). Add three OPTIONAL args to `LambdaWithUrlArgs` — `memorySize?`, `timeout?`, and `environment?: pulumi.Input<Record<string, pulumi.Input<string>>>` — and wire `environment` into the `aws.lambda.Function` (`environment: { variables: args.environment }`; it is not passed today). Default all three so `handler-hello` is unaffected. Set the catalogue instance to `memorySize: 1024, timeout: 15, runtime: 'nodejs24.x'` (Node 24 — also bump the `LambdaWithUrl` default + repo `engines`/`@types/node`/CI as a prerequisite chore; verify `nodejs24.x` in `ap-southeast-2`). Also add `ssmParameterArns?: pulumi.Input<string>[]` — when set, attach an inline `RolePolicy` granting `ssm:GetParameter` on those ARNs + `kms:Decrypt`; the catalogue instance passes its DB-URL param ARN so the Lambda reads the SecureString at runtime. [F5, F4b, F7]

- [ ] **Step 2: Make CORS per-instance + set the catalogue verbs** — add an optional `cors?: { allowOrigins?: string[]; allowMethods?: string[] }` arg to `LambdaWithUrl` (default `{ allowOrigins: ['*'], allowMethods: ['GET'] }` so `handler-hello` stays GET-only), and pass it through to the `FunctionUrl`. Set the catalogue instance to `cors: { allowMethods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowOrigins: ['*'] }`. Do NOT widen the shared stack default (that would loosen `handler-hello` too). `allowOrigins` is tightened to the CloudFront origin in Phase 4 (Task 4.4). [F19]

- [ ] **Step 3: Add the catalogue instance in `infra/index.ts`**

```ts
const catalogueApi = new LambdaWithUrl('catalogue-api', {
  functionName: 'notation-hero-catalogue-api',               // REQUIRED (deterministic LogGroup name)
  handler: 'main.handler',                                    // matches dist/main.js (NestJS entry; Open Q1 resolved)
  runtime: 'nodejs24.x',                                      // Node 24 (Active LTS); bump repo default too
  code: new pulumi.asset.FileArchive('../apps/catalogue-api/dist'),
  memorySize: 1024,
  timeout: 15,                                                // first cold request may also wake Neon
  environment: { DB_URL_PARAM: '/notation-hero/catalogue/database-url' },  // SSM param NAME only — value fetched in main.ts (F7 / Task 0.6a)
  ssmParameterArns: [dbUrlParamArn],                          // arn:aws:ssm:<region>:<acct>:parameter/notation-hero/catalogue/database-url — scoped grant (F7)
});
export const catalogueApiUrl = catalogueApi.url;
```

- [ ] **Step 3b: Make `infra:preview`/`up` build catalogue-api** — change `infra/package.json` `pulumi:preview`/`pulumi:up` from `nx build @notation-hero/handler-hello && pulumi …` to also build catalogue-api (e.g. `nx run-many --target=build --projects=@notation-hero/handler-hello,@notation-hero/catalogue-api && pulumi …`), and add `@notation-hero/catalogue-api` to `infra/project.json` `implicitDependencies` — otherwise `infra:up` packages a stale `dist`. [F8]

- [ ] **Step 4: Build + preview (no apply yet)**

Run: `pnpm exec nx build catalogue-api && pnpm run infra:preview` (the repo's `pulumi preview` shortcut)
Expected: preview shows one new Lambda + Function URL, no errors.

- [ ] **Step 5: Deploy + smoke-test `/health`**

Run: `pnpm run infra:up`, then `curl "$（pulumi stack output catalogueApiUrl)/health"`
Expected: `{"status":"ok"}` over HTTPS. **This is the M0 "I have a cloud backend" checkpoint.**

- [ ] **Step 6: Commit**

```bash
git add infra
git commit -m "feat(infra): deploy catalogue-api lambda (function url, 1024mb/15s, crud cors) (NH-177)"
```

---

### Task 0.6a: Resolve `DATABASE_URL` from SSM at cold start (runtime fetch — F7 approach 2️⃣)

**Files:** Modify `apps/catalogue-api/src/main.ts` (cold-start SSM fetch). The SecureString is created out-of-band (value never in repo/CI logs/Pulumi state).

- [ ] **Step 1: One-time — create the SecureString** (before the first DB-touching deploy):

```bash
aws ssm put-parameter --name /notation-hero/catalogue/database-url \
  --type SecureString --value '<neon POOLED connection string>' --region ap-southeast-2
```

- [ ] **Step 2: Fetch + cache in `main.ts` BEFORE `NestFactory.create`** (so the Task 1.2 Drizzle client sees a populated `process.env.DATABASE_URL`). `@aws-sdk/client-ssm` is externalized (present in the Lambda runtime — not bundled):

```ts
import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';
async function loadDbUrl(): Promise<void> {
  if (process.env.DATABASE_URL) return;                       // warm reuse — fetch once per cold start
  const ssm = new SSMClient({});
  const out = await ssm.send(new GetParameterCommand({ Name: process.env.DB_URL_PARAM!, WithDecryption: true }));
  process.env.DATABASE_URL = out.Parameter!.Value!;
}
// in bootstrap(), as the FIRST statement inside the `if (!cachedServer)` block:
await loadDbUrl();
```

> Role grant (`ssm:GetParameter` on the param ARN + `kms:Decrypt`) comes from `LambdaWithUrl`'s `ssmParameterArns` (Task 0.6 Step 1). The warmer short-circuits before `bootstrap()` (Task 4.3), so warmer pings never pay the SSM fetch. The plaintext URL never lands in Pulumi state, the Lambda env config, or the repo — only the param NAME does. [F7]

- [ ] **Step 3: Commit**

```bash
git add apps/catalogue-api/src/main.ts
git commit -m "feat(catalogue-api): resolve DATABASE_URL from SSM at cold start (NH-177)"
```

---

## Phase 1 — READ (list + detail)

> Build first; unblocks both the player app and the admin list. Operates on `catalogue_item` ONLY.

### Task 1.1: Drizzle schema + extensions migration

**Files:** Create `adapters/neon-catalogue/src/schema/catalogue-item.schema.ts`, `drizzle.config.ts`, `migrations/0000_extensions.sql`; modify `adapters/neon-catalogue/project.json` (add `generate`/`migrate` targets).

> **Prereq (F10):** `drizzle-kit` reads `DATABASE_URL` — set it (Neon **DIRECT**, non-pooler) in your shell or a gitignored `.env` before Steps 3–4; CI injects it as a secret (Task 4.2). The runtime Lambda uses the **pooled** URL via SSM (Task 0.6a) — these are two different connection strings.
> **nx targets (F17):** add `generate` + `migrate` targets to `adapters/neon-catalogue/project.json` (`nx:run-commands` wrapping `drizzle-kit generate`/`migrate`) so `nx run @notation-hero/neon-catalogue:migrate` (used by `deploy.yml`, Task 4.2) resolves. Invoke them as `nx run …:generate` / `:migrate` in Steps 3–4.

- [ ] **Step 1: Hand-write the prerequisite-extensions migration** (drizzle-kit can't author these from table defs; the generated `search` column + functional indexes depend on them):

```sql
-- adapters/neon-catalogue/migrations/0000_extensions.sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE OR REPLACE FUNCTION immutable_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT unaccent('unaccent', $1) $$;
```

- [ ] **Step 2: Author the Drizzle table** from the schema spec (`catalogue_item` columns, `data` JSONB typed via `$type<CatalogueData>()`, the `search` column as `generatedAlwaysAs(...)` read-only, CHECK constraints via `.check()`, GIN/btree/pg_trgm indexes). Keep `exercise`/`pattern` tables modeled for completeness but unused.

- [ ] **Step 3: Generate the table migration**

Run: `pnpm exec drizzle-kit generate` (config points at Neon DIRECT url)
Expected: emits `migrations/0001_catalogue_item.sql` + snapshot. Commit the SQL.

- [ ] **Step 4: Apply to a Neon branch + verify**

Run: `pnpm exec drizzle-kit migrate` against a Neon dev branch.
Expected: table + indexes exist (`\d catalogue_item`).

- [ ] **Step 5: Commit**

```bash
git add adapters/neon-catalogue/src/schema adapters/neon-catalogue/migrations adapters/neon-catalogue/drizzle.config.ts
git commit -m "feat(neon-catalogue): drizzle schema + extensions/catalogue_item migrations (NH-177)"
```

### Task 1.2: The port (core) + the Drizzle client (adapter)

**Files:** Create `core/catalogue/src/catalogue-repository.port.ts`, `catalogue-item.entity.ts`; `adapters/neon-catalogue/src/drizzle.client.ts`.

- [ ] **Step 1: Define the port + entity in `core` (explicit return types — `isolatedDeclarations`)**

```ts
// core/catalogue/src/catalogue-repository.port.ts
import type { CatalogueListItem, CatalogueItem, CatalogueQuery } from './catalogue-item.entity';
export const CATALOGUE_REPOSITORY = Symbol('CATALOGUE_REPOSITORY');
export interface CatalogueRepositoryPort {
  list(query: CatalogueQuery, includeAllStatuses: boolean): Promise<CatalogueListItem[]>;
  findById(id: string, includeAllStatuses: boolean): Promise<CatalogueItem | null>;
}
```

- [ ] **Step 2: Module-cached Drizzle client over Neon HTTP**

```ts
// adapters/neon-catalogue/src/drizzle.client.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema/catalogue-item.schema';
const sql = neon(process.env.DATABASE_URL!);        // pooled (-pooler); populated by main.ts loadDbUrl() at cold start (F7/Task 0.6a)
export const db = drizzle(sql, { schema });          // module-scope singleton — reused across warm invocations
export type Db = typeof db;
```

- [ ] **Step 3: Commit**

```bash
git add core/catalogue/src adapters/neon-catalogue/src/drizzle.client.ts
git commit -m "feat(catalogue): repository port + module-cached neon-http drizzle client (NH-177)"
```

### Task 1.3: List + detail (TDD)

**Files:** Create `adapters/neon-catalogue/src/neon-catalogue.repository.ts`; `apps/catalogue-api/src/catalogue/*` (controller, use-cases, DTOs, `database.module.ts`, `catalogue.module.ts`); e2e test `apps/catalogue-api/test/catalogue.e2e-spec.ts`.

- [ ] **Step 1: Failing e2e test** — `GET /catalogue` returns only `published` for public callers and the §9 list projection (no `data`, no `notation_key`); `GET /catalogue/:id` returns the full row. Use a seeded Neon test branch (or a fake repo bound to the port for the unit layer).

```ts
it('GET /catalogue returns published-only list projection', async () => {
  const res = await request(app.getHttpServer()).get('/catalogue').expect(200);
  expect(res.body.data[0]).toHaveProperty('title');
  expect(res.body.data[0]).not.toHaveProperty('data');          // projection excludes jsonb
  expect(res.body.data.every((i: any) => i.status === 'published')).toBe(true);
});
```

- [ ] **Step 2: Run — fails.** Run: `pnpm exec nx test catalogue-api` → 404/empty.

- [ ] **Step 3: Implement** the Neon repository (`db.select({...projection}).from(catalogueItem).where(and(eq(status,'published'), ...))` with filters as **bound params**, never interpolated), the `ListCatalogueUseCase`/`GetCatalogueItemUseCase` (inject `@Inject(CATALOGUE_REPOSITORY)`), the controller (`GET /catalogue`, `GET /catalogue/:id`), and `database.module.ts` (`@Global()` provider `{ provide: DRIZZLE, useValue: db }`). Bind the port in `catalogue.module.ts`: `{ provide: CATALOGUE_REPOSITORY, useClass: NeonCatalogueRepository }`.

- [ ] **Step 4: Run — passes.** Run: `pnpm exec nx test catalogue-api` → PASS. Then `bash tooling/check-layout.sh && pnpm run lint && pnpm exec depcruise --config .dependency-cruiser.cjs core adapters apps` → PASS.

- [ ] **Step 5: Deploy + curl** `GET /catalogue` and `/catalogue/:id` against the live Function URL. **M1-read checkpoint.**

- [ ] **Step 6: Commit**

```bash
git add core adapters apps
git commit -m "feat(catalogue): read endpoints (list projection + detail) over neon (NH-177)"
```

---

## Phase 2 — CREATE + UPDATE (password-gated)

### Task 2.1: Password gate guard

- [ ] Implement a Nest guard (`apps/catalogue-api/src/catalogue/admin.guard.ts`) that checks the cms-admin §4 shared password header on **all writes** and on the gated admin-read (which returns ALL statuses, decision F1). TDD: failing test for 401 without the header → implement → pass → commit.

### Task 2.2: Create

- [ ] **TDD** `POST /catalogue`: insert `catalogue_item` with `status` defaulting `'draft'`; `source` is **write-once** — hardcode `'curated'` at insert (NOT settable via the form, schema §5). DTO validated via `class-validator`. Test create → 201 with id; verify `source` cannot be overridden by the payload. Commit.

### Task 2.3: Update

- [ ] **TDD** `PUT /catalogue/:id`: patch editable fields; re-assert publish gates app-side before `status → 'published'` (curated item requires non-null `license`, backed by the `ci_pub_license` DB CHECK). Test: update draft→published without license → 422; with license → 200. Commit.

> File upload (`POST /catalogue/:id/file` → presigned S3 quarantine) is **deferred within Phase 2** — create/edit works against an already-present file first.

---

## Phase 3 — DELETE = archive (+ unarchive)

### Task 3.1: Archive

- [ ] **TDD** `DELETE /catalogue/:id` → `archive()`: set `status = 'archived'`, bump `updated_at`. The CMS **never hard-deletes** (schema §12). Test: archived rows disappear from the public list but appear in the gated admin-read. Commit.

### Task 3.2: Unarchive

- [ ] **TDD** `POST /catalogue/:id/unarchive` (decision F3): `archived → draft` (or `published` if gates pass). Both are password-gated. Commit. **Full-CRUD checkpoint.**

---

## Phase 4 — Deploy automation + cold-start warmer

### Task 4.1: Nx local cache in CI

- [ ] Add an `actions/cache@v4` step on `.nx/cache` (key `nx-${{ runner.os }}-${{ hashFiles('pnpm-lock.yaml') }}-${{ github.sha }}`, restore-keys ladder) to the `quality` + `build` jobs in `.github/workflows/ci.yml`, right after checkout. (Remote cache is off the table — Nx deprecated the free self-hosted cache packages 2026-05-21, CVE-2025-36852.) Commit `chore(ci): persist .nx/cache`.

### Task 4.2: `deploy.yml` (OIDC + Pulumi, self-managed S3 backend = $0)

- [ ] One-time (outside CI): create the GitHub OIDC identity provider + a least-privilege IAM deploy role trusting `repo:leocaseiro/notation-hero:ref:refs/heads/master`; create the Pulumi state S3 bucket; add secrets `AWS_DEPLOY_ROLE_ARN`, `PULUMI_CONFIG_PASSPHRASE`, state-bucket name.
- [ ] Create `.github/workflows/deploy.yml` (push:master, `permissions: id-token: write`, `concurrency: deploy-master` non-cancelling):

```yaml
- uses: actions/checkout@v6
- uses: ./.github/actions/setup-js
- uses: aws-actions/configure-aws-credentials@v6.2.0
  with: { role-to-assume: ${{ secrets.AWS_DEPLOY_ROLE_ARN }}, aws-region: ap-southeast-2 }
- run: pnpm exec nx run @notation-hero/neon-catalogue:migrate     # drizzle-kit migrate, DIRECT url, BEFORE deploy
- run: pnpm exec nx build catalogue-api                            # dist/ must exist for FileArchive
- uses: pulumi/actions@v7.0.0
  with: { command: up, stack-name: dev, work-dir: infra, cloud-url: 's3://<state-bucket>' }
  env: { PULUMI_CONFIG_PASSPHRASE: ${{ secrets.PULUMI_CONFIG_PASSPHRASE }} }
```

- [ ] Add a `pull_request` `command: preview` variant (read-only role) for plan-on-PR. Add a PR check that `drizzle-kit generate` produces no diff (schema-vs-migrations in sync). Commit.

### Task 4.3: Cold-start warmer + SPA ping contract

- [ ] **EventBridge Scheduler (5-min) warmer** in Pulumi: a schedule invoking the catalogue Lambda with `{ "warmer": true }`; in `main.ts`, short-circuit `if (event?.warmer) return { statusCode: 200 }` before routing (don't hit Neon). ~8.6K invokes/mo — inside the 1M/400K-GB-s free tier ($0). Commit.
- [ ] **Document the SPA ping contract** for the FE session: on SPA shell load, fire `fetch('<catalogueApiUrl>/health', { method: 'GET', keepalive: true })` once per session (sessionStorage-guarded), *before* React hydration. This is FE work (separate session) — add it to the API contract doc, don't implement here.
- [ ] Bump `nrwl/nx-set-shas` v4→v5 (or let Dependabot's `github-actions` group do it). Commit.

### Task 4.4: Tighten CORS to the CloudFront origin

- [ ] Set the catalogue Function URL `allowOrigins` from `['*']` to the CloudFront distribution URL once it is stable (wire the CloudFront origin as a Pulumi stack reference). Alternatively, consciously accept `['*']` for a single-admin internal API and delete the deferral note — but do not leave it as a stranded promise. Commit. [F19]

---

## Risks & mitigations

| Risk | Likelihood / effort | Mitigation |
|---|---|---|
| `check-layout.sh` blocks the Nest app on first commit (Nest `main.ts`/e2e specs, Drizzle `*.schema.ts`) | HIGH / LOW | **Task 0.2 does this first** — widens suffixes (+`schema`), exempts `main.ts` + `*.e2e-spec.*` — before generating |
| esbuild silently drops decorator metadata → Nest DI + DTO validation break at runtime | HIGH / LOW | `@anatine/esbuild-decorators` plugin + `import 'reflect-metadata'` first + app-tsconfig `emitDecoratorMetadata` (Task 0.4) |
| Generator scaffolds **webpack**, contradicting the esbuild Lambda convention + inflating cold start | HIGH / LOW-MED | Override build target to `@nx/esbuild:esbuild` immediately (Task 0.4) |
| `isolatedDeclarations` (core) clashes with decorators | MED / MED | Keep ALL `@nestjs/*` + decorators in `apps/` (a leaf `tsc --noEmit` package); never in `core` — walled by `no-core-to-nestjs` |
| DI lulls you into injecting the concrete Neon class (defeats the hexagon lesson) | MED / arch | Inject via the `CATALOGUE_REPOSITORY` **token**, bind `useClass` in the module |
| Cold start per concurrent request (warmer holds only ONE instance) | LOW | Acceptable for a learning CRUD; don't claim "no cold starts" |
| Neon compute auto-suspend adds ~0.5–few s on first query | LOW | Lambda `timeout: 15s`; `/health` must NOT wake Neon; disable auto-suspend later on paid Neon |
| `neon-http` driver is non-transactional (`db.transaction` throws) | LOW | Keep all writes single-statement; if a multi-statement transaction is ever needed, switch that path to `@neondatabase/serverless` WebSocket Pool + `drizzle-orm/neon-serverless` (F11) |

---

## Enforcement / tooling — exact change set (principles preserved)

- **KEEP** all four guards (`@nx/enforce-module-boundaries`, `eslint-plugin-boundaries`, `dependency-cruiser`, `check-layout.sh`) + lefthook/commitlint/gitleaks/semgrep — Nest's boundaries are *runtime*; these are the *static* hexagon walls (the lesson).
- **EDIT 1 (Task 0.2):** `check-layout.sh` — add `module|guard|pipe|interceptor|filter|schema` suffixes, exempt `main.ts` (entry) and `*.e2e-spec.*` (NestJS e2e). Keeps every Nest/Drizzle file at its idiomatic name.
- **EDIT 2 (Task 0.3):** add `no-core-to-nestjs` to `.dependency-cruiser.cjs` + `@nestjs/*` to the `core/` ESLint deny-list; add `apps/catalogue-api/src/main.ts` to the depcruise no-orphan entry allowlist (Lambda invokes it, nothing imports it — same as `handler-hello/src/index.ts`).
- **`@nx/nest` usage:** `nx g @nx/nest:application|library` for the app/libs (sets tags), but **Nest CLI (`nest g`) for elements** (controllers/modules/DTOs) — `@nx/nest` will deprecate element wrappers in v23.

---

## Open questions for review

1. **App build output name** — `index.js` vs `main.js`? The Pulumi `handler: 'index.handler'` must match the esbuild output. (Plan assumes `index.handler` like `handler-hello`.)
2. **Neon dev branch per PR** — free tier allows 10 branches/project; wire PR-time migrate+test against an ephemeral branch now, or defer? (Plan defers to a "nice-to-have" note.)
3. **Password-gate location** — header vs a tiny login that sets a cookie? (Plan assumes the cms-admin §4 shared-password header.)

---

## References

- Investigation findings (this session, 4-agent workflow `wf_b04af626-e6f`): adapter = `@codegenie/serverless-express`; ORM = Drizzle `neon-http`; `@nx/nest` 22.7.5; the two enforcement edits; the `deploy.yml` OIDC+S3 recipe.
- Starters: [CodeGenieApp/serverless-express](https://github.com/CodeGenieApp/serverless-express) (`examples/nestjs`) · [NestJS serverless docs](https://docs.nestjs.com/faq/serverless) · [pulumi/actions](https://github.com/pulumi/actions) · [drizzle-orm neon-http](https://orm.drizzle.team/docs/connect-neon).

---

## Self-review notes

- **Spec coverage:** NestJS adoption ✓ (Phase 0) · CI/CD ready-to-use + keep/replace ✓ (Phase 4 + enforcement section) · full CRUD R→CU→D ✓ (Phases 1–3) · Neon + current schema ✓ (Task 1.1, skips lesson steps) · cold-start mitigations ✓ (Task 4.3 + D5). All session topics covered.
- **Skips honored:** exercise/lesson-steps, pattern linking, audio/video editing, generated tsvector — all explicitly deferred.
- **Type consistency:** `CATALOGUE_REPOSITORY` token + `CatalogueRepositoryPort` used identically in port (1.2), use-cases, and module binding (1.3).
- **Placeholder scan:** Phase 0–1 are full bite-sized TDD with complete code; Phases 2–4 are task-level (they repeat the Phase-1 controller/use-case/repo pattern — intentionally not re-pasted to keep the doc reviewable). Flag for the executor: expand each Phase 2–4 task into the same 5-step TDD rhythm at execution time.
