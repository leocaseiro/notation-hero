# Notation Hero — Architecture Decision Record (Backend · Client · Auth)

> **Status:** ✅ APPROVED (2026-06-18) — expert review complete (NH-194, 6-engineer panel); DACI + file-structure ADR superseded and the decision-registry updated. Ready for implementation planning.
> **Scope:** the 8 open questions in `docs/prompts/2026-06-17-architecture-brainstorm.md`. The north-star (NestJS modular monolith + hexagon, one Lambda behind a Function URL, React SPA + Capacitor) was already locked; this doc decides the open questions and **deliberately reopens** the DACI-locked foundation (Nx, hexagon physical form, file-structure ADR).
> **Companion:** [`docs/specs/2026-06-17-data-layer-requirements.md`](../specs/2026-06-17-data-layer-requirements.md) — what the data layer must provide, decoupled from the parallel schema redesign.
> **Supersedes (pending ratification):** parts of `2026-06-09-tooling-stack-daci.md` (`L1` Nx, the layout) and `2026-06-12-file-level-structure-enforcement-adr.md` (suffix-everything). See §9.
> **Reaffirms:** `2026-06-09-catalog-store-postgres-neon.md` (`DS-1`), the Cognito-not-Amplify decision (NH-193).
> **Owner:** leocaseiro

---

## 0. Why this doc

A week of setup friction stalled progress — much of it from wiring **Nx** into pnpm + the generators. pnpm and the generators stay; **Nx is removed because it earns nothing here** (ARCH-MONO-1), not on the friction alone. The north-star is locked; the open questions are about the **foundation shape** and the **concrete tooling**. Two principles agreed this session drive every call below:

1. **Tooling conforms to NestJS + the React starter — not the other way around.** We pick SWC because Nest wants it, Vite-SWC because that's the React standard, and we relax our own file-naming rules to admit framework-native filenames.
2. **Now is the cheapest moment to change the foundation — and the effort Nx already cost is itself a reason to change it.** Getting Nx set up "right" took ≈19 commits across several PRs and still added no value: the audit found it barely wired (every target is `nx:run-script`; `nx affected` does no real _filtering_ in CI — the scripts call `nx run-many` — it is wired only in the lefthook hooks + `nx-set-shas` (see ARCH-MONO-1); the only hexagon guard live in CI is dependency-cruiser, which is Nx-independent). That high effort for no payoff is part of why Nx goes. Removing it is real work (≈15+ files, see ARCH-MONO-1), but cheaper now — while almost no application code has shipped (`core/`/`adapters/` are empty) — than after features depend on it. The alternative (keep Nx and absorb the ongoing friction) is exactly what this reverses.

Each section maps to the brainstorm's open questions: §1 → Q1-3, §2 → Q5-7 + ORM, §3 → Q4 + the contract, §4 → Q8. (ARCH-EDGE-1, ARCH-SEC-1 and ARCH-SEC-2 are additive baseline decisions surfaced during the session — not mapped to a numbered open question.)

---

## 1. North-star (locked — restated for context, not re-decided)

- **One backend service = a single NestJS 11 app** (modular monolith), **hexagonal/DDD inside**: framework-free domain core, ports (interfaces), adapters (I/O), Nest as the delivery "door".
- Deployed as **one AWS Lambda** (HTTP API) behind a **Function URL** (→ CloudFront). Async work = **extra Lambda entry points from the SAME codebase**, not more apps.
- **One React SPA** client, separate from the backend, over HTTPS; **Capacitor** for mobile; offline-first.
- **Data:** Neon Postgres (catalog, v1) + DynamoDB single-table (per-user, **M1** — v1 stores no per-user data, so no DynamoDB table is provisioned yet; it lands as an additive adapter behind a repository port). **Auth:** Cognito (Pulumi) + `aws-jwt-verify`. **Infra:** Pulumi (TS), deploy via GitHub Actions OIDC. **Runtime:** Node 24 (`nodejs24.x`), arm64.

---

## §1 — Foundation (Q1-3 + package manager)

### ARCH-MONO-1 — Drop Nx → plain pnpm workspaces

**Decision:** Remove Nx. Use plain pnpm workspaces (`client`, `server`, `shared`, `infra`). Root scripts become `pnpm -r <target>` / `pnpm --filter <pkg> <target>`.
**Why:** the audit found Nx earns nothing today — 3 plugins, every target is `nx:run-script` wrapping pnpm scripts, and caching has 2 trivial projects. One Nest app + one React app + shared contract + infra do not need Nx's package orchestration. Folders-in-one-app (ARCH-HEX-1) is also more NestJS-native — `nest g` scaffolds into `src/` folders, not across packages, so keeping Nx packages would _fight_ the generators. **Audit correction:** `nx affected` does no real _filtering_ in CI (scripts call `nx run-many`), but it **is** wired in the lefthook `pre-commit`/`pre-push` hooks and `nrwl/nx-set-shas` runs in two CI jobs — so removing Nx breaks local commits unless those are rewritten first. **Portfolio note:** dropping Nx also retires the `nx affected`-graph "differentiating portfolio signal" the tooling DACI counted — plain pnpm workspaces is still a legitimate signal, and the folder-level depcruise fence (ARCH-GUARD-1) now carries the "named architectural enforcement" story in its place (naming the tradeoff, _not_ a reason to keep Nx).
**Migration — do this FIRST (Phase 0 of the plan):** "remove everything Nx" before anything else, preferably by **regenerating a clean root `package.json`** rather than surgically un-picking it. Inventory to delete/rewrite (≈15+ files, not the earlier "8-12"): `nx.json`, `.nx/`, `.nxignore`, 2× `project.json`, root `package.json` (`nx`/`@nx/*` devDeps + nx-wrapped scripts → `pnpm -r`), `pnpm-workspace.yaml` (→ `client`/`server`/`shared`/`infra`), `lefthook.yml` (the `nx affected` hook steps → `pnpm -r`/changed-files filter), `ci.yml` (the two `nrwl/nx-set-shas` steps + `nx.json` path-filter entries), `knip.json` (`@nx/*` ignores), `.eslintrc.cjs` (drop the `@nx` plugin + `@nx/enforce-module-boundaries` rule; re-derive the `eslint-plugin-boundaries` **element model** for the `server/src` layout (not just re-point paths — the existing elements map to the top-level `core/adapters/apps` layers), proven with a canary (a deliberate core→adapter import the rule must reject)), `tooling/check-layout.sh` (relax suffix vocab per ARCH-NAME-1 **and** re-scope paths `core/adapters/apps` → `server/src`), `AGENTS.md`. **Also in Phase 0: the Node 22→24 bump** (4 pins — see ARCH-FMT-1; the `infra/lambda-with-url.stack.test.ts:62` assertion is the one that breaks `pnpm test` on the first commit if missed).
**Supersedes:** `L1` (Nx orchestrator), `L2-tags` (`@nx/enforce-module-boundaries`), `L7-set-shas` (Nx affected SHAs).

### ARCH-PM-1 — Keep pnpm (bun stays dropped)

**Decision:** Keep **pnpm**. Do not switch to bun.
**Why:** the original pnpm-over-bun rationale was partly Nx-coupling (Nx is pnpm-first); dropping Nx _unblocks_ bun, but the Lambda runtime is Node 24 regardless — bun would only be a package-manager/script-runner. The pnpm setup (lockfile, curated `allowBuilds`, `engine-strict`) already works; switching is a lateral move that spends time on JS tooling, not the AWS-learning goal.
**Reaffirms:** `PM-1`, `F6-bun`. **Flip:** only if bun's speed/test-runner becomes a deliberate learning goal.

### ARCH-LAYOUT-1 — Repo layout `client/ server/ shared/ infra/`

**Decision:**

```
notation-hero/
├─ client/     React SPA (Vite) + Capacitor — entire frontend
├─ server/     ONE NestJS app = entire backend (hexagon in src/, see ARCH-HEX-1)
├─ shared/     oRPC contract + Zod schemas, imported by client AND server
├─ infra/      Pulumi TS — all AWS (Lambda, Function URL, Cognito, SQS, S3…)
├─ .dependency-cruiser.cjs   the hexagon fence
└─ pnpm-workspace.yaml       workspaces: client, server, shared, infra
```

**Supersedes:** the Nx `apps/ + core/ + adapters/ + infra/` top-level layout.

### ARCH-HEX-1 — Hexagon as folders inside the one Nest app

**Decision:** the hexagon lives as **folders inside `server/src/`**, not separate packages:

```
server/src/
├─ core/        framework-FREE domain: entities, *.port.ts (interfaces), *.policy.ts
├─ adapters/    I/O implementing ports (Drizzle/Neon repo, Cognito verifier) — may use Nest decorators
├─ modules/     NestJS wiring = the "door": controllers, use-cases, DTOs, guards
└─ entry/       Lambda entry points (http.ts now; worker-*.ts later)
```

**Why:** simpler (no package ceremony), and **NestJS-native** (generators scaffold into folders). The hexagon's payoff — a framework-free core — is preserved by the dependency-cruiser fence (ARCH-GUARD-1), which works at the folder level.
**Cost:** weaker _compile-time_ isolation than separate packages (no per-package tsconfig wall), accepted in exchange for far less ceremony; depcruise still enforces direction.
**Supersedes:** `FOLD-hex` ("hexagon as real Nx libs, each with a `type:` tag").

### ARCH-GUARD-1 — Keep dependency-cruiser (folder-level); drop the Nx tag rule

**Decision:** Keep **dependency-cruiser** as the hexagon fence; rewrite its rules from package/tag level to **folder level** under `server/src/`. Drop `@nx/enforce-module-boundaries` (dies with Nx); `eslint-plugin-boundaries` adapts to the new folders (editor-realtime).
**Why:** NestJS DI wires _runtime_ collaborators but does **not** enforce architectural direction — nothing in DI stops `core/` from `import`-ing an adapter or `@nestjs/*`, which would silently kill the framework-free core. depcruise is the static fence that prevents it (one config file, the only guard already live in CI, ~zero maintenance, and it catches AI agents crossing boundaries). Example rules:

```js
{ name:'no-core-to-adapters', from:{path:'^server/src/core'}, to:{path:'^server/src/adapters'}, severity:'error' },
{ name:'no-core-to-nestjs',   from:{path:'^server/src/core'}, to:{path:'node_modules/@nestjs'},  severity:'error' },
```

**Fail-closed core-purity — don't rely on per-package deny-rules:** the two examples above are a _deny-list_, and depcruise's live `doNotFollow: { path: 'node_modules' }` can make `to: node_modules/@nestjs` match **zero edges and pass green** while `core/` imports `@nestjs`. Enforce purity with a **positive allow-rule** instead — `core/` may resolve only Node builtins + `^server/src/core` + a tiny explicit allowlist (e.g. `zod`), forbidding everything else (fails _closed_: any unlisted framework import errors by default). **Prove it fires:** add a CI "canary" — a deliberate `import '@nestjs/common'` in a throwaway core file that the depcruise step MUST flag red — so the fence is verified, not assumed.
**Supersedes:** `H8`-`H14` rule _paths_ (rewritten folder-level), `STRUCT-sibling` (re-pointed). (`L2-tags` dies with Nx — owned by ARCH-MONO-1, not double-listed here.)

### ARCH-NAME-1 — Relax the suffix-everything ADR to NestJS-native filenames

**Decision:** Replace the strict "suffix everything" file taxonomy with **NestJS + React framework-native filenames** (`.module.ts`, `.guard.ts`, `.controller.ts`, `.pipe.ts`, `.interceptor.ts`, `.filter.ts`, Drizzle `.schema.ts`, the `main.ts`/entry files, `*.e2e-spec.ts`). Keep kebab-case (Nest emits it by default → zero fight) and co-located tests.
**Why:** the locked `check-layout.sh` allowlist would fail NestJS on its first commit; per the "tooling conforms to the framework" principle, we relax the rule rather than rename framework files.
**Concrete `approved_suffix` (commit this exact set — don't leave it to the implementer):** extend the allowlist with `module|guard|pipe|interceptor|filter|middleware|strategy|resolver|schema|policy` (on top of the existing `controller|dto|…`; **`policy` was missing** — it is the core-domain suffix the strict subset below names, but the current `check-layout.sh` `approved_suffix` omits it, so the first `*.policy.ts` that ARCH-AUTHZ-1/ARCH-OWN-1 mandate would fail the layout guard on commit). Keep `server/src/core/` on the **strict pure-domain subset** (`entity|value-object|aggregate|event|specification|port|policy` — the framework-free domain suffixes already in the base allowlist; no framework suffixes), while `modules/` + `adapters/` admit the framework suffixes. This is the same `check-layout.sh` edit the ARCH-MONO-1 migration inventory calls out (relax vocab + re-scope paths to `server/src`).
**Supersedes:** `NAME-suffix` (suffix-everything), the relevant `check-layout.sh` allowlist; co-location (`CONV-1`/`CONV-2`) is kept.

---

## §2 — Backend build & Lambda topology (Q5-7)

### ARCH-BUILD-1 — pnpm runner + SWC compiler everywhere; bundler by target

**Decision:**

- **Runner:** pnpm everywhere (uniform `pnpm -r` / `pnpm --filter`).
- **Compiler (TS→JS):** **SWC everywhere** — `server/` runs SWC directly (emits the decorator metadata Nest needs); `client/` uses Vite's official `@vitejs/plugin-react-swc`; `infra/` needs no compile (Node strips types).
- **Bundler (final artifact) — differs by target, deliberately:** `server/` → **esbuild** per entry → Lambda zip; `client/` → **Vite/Rollup** → browser assets; `infra/` → none.
  **Why:** answers the consistency concern — "same compiler, different output target." A Lambda zip and a browser bundle are different artifacts; forcing one bundler across both is worse. Dropping Nx removes the orchestration layer that caused most of the prior friction.

### ARCH-LAMBDA-1 — One API Lambda now; workers later from the same codebase

**Decision:**

- **HTTP API:** `server/src/entry/http.ts` bootstraps NestJS **once at module scope** (cached singleton), via **`@codegenie/serverless-express`** (the maintained fork; v5 supports Node 24), behind a **Function URL** (Always-Free; payload = API-Gateway-v2 format, so the adapter works as-is). No API Gateway (12-month-only on this account).
  - **Origin lockdown (security — don't leave the Function URL public):** set `authorizationType: 'AWS_IAM'` and grant **only** CloudFront via `aws.lambda.Permission` (`principal: cloudfront.amazonaws.com` + `sourceArn: <distribution_arn>`, pinned to the one distribution), with the `AllViewerExceptHostHeader` origin-request policy on `/api/*` so bodies forward for SigV4. Default `AuthType: NONE` leaves the raw `*.lambda-url` endpoint internet-reachable, **bypassing CloudFront/WAF** (the JWT guard would be the only gate). OAC-for-Function-URLs is GA (Apr 2024); cost-neutral, still no API Gateway.
- **Async workers (when they land):** `server/src/entry/worker-*.ts` using **`NestFactory.createApplicationContext`** (DI container, no HTTP server), each importing a **slim per-worker module** (only what it needs → smaller bundle, faster cold start), resolving providers via `ctx.get(Service)`. This is the idiomatic "many entry points, one codebase" — **not** more apps.
  **Why:** matches the locked north-star; research-verified current packages (codegenie v5, Apr 2026) and idiom.

### ARCH-FMT-1 — Server CJS, client ESM

**Decision:** `server/` (Lambda) emits **CommonJS**; `client/` (browser) emits **ESM**.
**Why:** tree-shaking happens at _bundle time_ from ESM **source**, independent of output format — so CJS output keeps tree-shaking. The real axis is runtime ergonomics: NestJS + decorators + `reflect-metadata` + serverless-express are CJS-rooted (ESM-on-Lambda adds `__dirname`/interop/`"type":"module"` friction for zero gain), while browsers run ESM natively (smaller downloads).
**SWC/esbuild settings:** `.swcrc` (**created new in the `server/` scaffold — none exists in the repo today**) `legacyDecorator + decoratorMetadata + keepClassNames`, `module.type=commonjs`, target es2022. esbuild per entry: `--format=cjs --platform=node --target=node24 --minify --keep-names --external:@aws-sdk/*`. Pulumi zips each entry → arm64 `nodejs24.x`.
**ESM-only deps must be bundled, not externalized:** the oRPC packages the server imports (`@orpc/server`, `@orpc/contract`, `@orpc/nest`) are **ESM-only** (`"type":"module"`, no `require` path) — a CJS Lambda cannot `require()` them, so esbuild MUST bundle them into the artifact (never add oRPC to `--external`). `zod`/`drizzle` ship dual-format and are safe either way.
**`shared/` output strategy:** `shared/` (oRPC contract + Zod = runtime values, not just types) is consumed by both the CJS server and the ESM client — ship it as **TS source compiled by each app's own build** (server→CJS via SWC/esbuild, client→ESM via Vite), so no dual-format package or `exports` map is needed.
**Node runtime alignment:** the repo currently pins **Node 22** in **four places** (`engines.node >=22.18`, the placeholder esbuild `--target=node22`, infra `runtime` default `nodejs22.x`, **and the infra test assertion** `infra/lambda-with-url.stack.test.ts:62` — `assert.equal(fn.runtime, "nodejs22.x")`, which fails `pnpm test` on the first migration commit if missed); only `.nvmrc` is 24. The Nx-removal migration must bump all four to **Node 24** (`nodejs24.x` is GA in every region incl. `ap-southeast-2` since Nov 2025).
**Note:** the `@nestjs/swagger` CLI plugin does not run under SWC — **moot** because oRPC (ARCH-CONTRACT-1) emits OpenAPI from the contract; `@nestjs/swagger` is not used.

### ARCH-EDGE-1 — One CloudFront distribution, two origins

**Decision:** a single CloudFront distribution (custom domain + TLS) with two origins: default behavior `/*` → **S3** (static FE assets, edge-cached), `/api/*` → **Lambda Function URL** (dynamic, ~uncached). The Lambda _code bundle_ is loaded by the Lambda runtime from Lambda storage at cold start — never via CloudFront, never downloaded by the browser.
**Why:** same-origin (kills CORS), one domain, one TLS cert, edge-cache the FE — the `S3 + CloudFront + OAC` item on the AWS learning-map. The `/api/*` origin (the Lambda Function URL) is locked to this distribution via OAC + `AWS_IAM` (see ARCH-LAMBDA-1), so it can't be reached directly.

### ARCH-ORM-1 — Drizzle (reaffirmed over Prisma/TypeORM/Kysely) _(moved here from §3 — it's a backend/data-layer decision)_

**Decision:** keep **Drizzle** (`drizzle-orm/neon-http` + `drizzle-kit` + `drizzle-zod`), wired as a custom `DRIZZLE` provider in an adapter behind the repository port.
**Why:** the 🔬 ORM spike confirmed Drizzle is the best fit for _this_ stack — only true ORM that natively rides Neon's **HTTP driver** (best cold-start), **zero SWC/decorator friction** (schema-as-TS, no `emitDecoratorMetadata`), and lets the **raw SQL DDL stay source of truth** (references the `GENERATED` tsvector column, doesn't fight it). There is **no built-in NestJS ORM** (Nest is ORM-agnostic; `@nestjs/typeorm` is the most "blessed" but is TCP-pool-only on Neon + has SWC decorator footguns). Neon's own NestJS guide uses raw `pg` (no ORM).
**Caveat:** Drizzle `latest` is still 0.x with a 1.0 RC mid-flight (no GA date) — track the v1 / Relational-Queries-V2 migration. **Flip:** Kysely if the adapter ends up in the raw `sql` tag for most JSONB/tsvector queries anyway.
**Reaffirms:** `DS-1` (Neon Postgres catalog store).

---

## §3 — Client stack (Q4 + the contract)

> **Frontend libraries — learning note.** Of the three frontend libraries, only **oRPC** is new to the developer; **TanStack and Dexie have been used before**, so the added learning effort is small. **oRPC and TanStack are adopted at v1** because they are simple to configure and the admin CMS requires them. **Full offline support (Dexie) is not built at v1** — it is deferred to M1, with only the placeholders added now so no later rework is needed (ARCH-OFFLINE-1). This frontend work is **not a distraction from the AWS goal**: a recruiter cannot evaluate an API with no interface, so a visible UI is a required part of the portfolio. Priority order: deliver real product features first, and do not let complex configuration delay them.

### ARCH-CONTRACT-1 — oRPC for the typed API contract (not ts-rest); ditch kanel-zod

**Decision:** use **oRPC** (`@orpc/*`): the contract lives framework-free in `shared/` (`oc.route().input(zod).output(zod)`), `server/` implements it via `@orpc/nest` (`@Implement`), `client/` consumes it via `@orpc/tanstack-query`. **Ditch kanel-zod** — the DB→Zod layer is owned by Drizzle + `drizzle-zod` (derive a base from the DB schema, then `.omit()/.extend()` to curate the API DTO — DB-change awareness without coupling the API to the DB).
**Why:** the 🔬 contract spike found **ts-rest is effectively frozen** (0 commits to `main` in 2026; issue #797 "Future of ts-rest" — its own users are migrating to oRPC). oRPC is actively shipping (v1.14.x, weekly releases, post-1.0), has a first-class Nest adapter, pure TS inference (no codegen), shared Zod runtime validation, native OpenAPI (for the future admin CMS / 3rd-parties), and a ~3.4 KB client (good for Capacitor).
**Three type-safety layers (the mental model):** ① DB↔server = Drizzle; ② server↔client = oRPC; ③ Zod = the shared validation currency. The API shape ≠ the DB shape (the hexagon maps row→entity→DTO), so the contract is hand-authored, not auto-mirrored from the DB.
**Caveat:** oRPC is primarily one maintainer (same risk class ts-rest had) — mitigated because it emits standard OpenAPI, so the exit ramp (regenerate a client from the spec) is cheap. **Flip:** `@hey-api/openapi-ts` if the OpenAPI spec should be the single source of truth from day one (accepts a codegen step).

### ARCH-FE-1 — Vite + TanStack Router + TanStack Query

**Decision:** **Vite 8** (build/dev) + **TanStack Router** (type-safe routes + typed search params) + **TanStack Query** (server cache, pairs with `@orpc/tanstack-query`). Scaffold: `npx @tanstack/cli create --router-only` (NOT the deprecated `create-tsrouter-app`).
**Why:** keeps routing in the same typed/ecosystem story as Query + oRPC; typed search params suit the rhythm-game deep-links (`/play?songId=&difficulty=&speed=`). This was the closest call — **React Router v7 (data mode)** is the legitimate alternative if minimizing FE learning to focus on AWS matters more. **Flip:** RR v7 to spend zero learning budget on the FE router.
**Supersedes:** the **2026-06-16 Next.js FE ADR** (`2026-06-16-fe-framework-nextjs-adr.md`, NH-185) — leocaseiro chose 2026-06-17 to supersede yesterday's Next.js decision; the OpenNext SSR target + the one-source/two-target build are dropped (pure Vite SPA; Capacitor wraps the static build). **Decision recorded 2026-06-18 (PROD-1):** Next.js is no longer an option. A Next.js front-end is not a portfolio piece leocaseiro needs (he already has that experience), and Next.js as front-end-only is not useful; making its SSR fit the AWS perpetual-free-tier is a battle not worth fighting. The visible SPA UI plus the AWS depth is the portfolio signal — dropping SSR needs no replacement.

### ARCH-OFFLINE-1 — Plain Dexie + insert-only outbox, syncs via the API
**Decision:** offline store = **plain Dexie** (`dexie` + `dexie-react-hooks` + `ulid`) with a **hand-rolled insert-outbox + blob queue** — **no sync framework** (RxDB / Replicache / Dexie Cloud). Offline-first; the outbox pushes to the NestJS API (`POST /api/sync/batch`), which persists per-user data to **DynamoDB** and serves the catalog from **Neon**. Dexie talks only to *our API*, never to Neon/Dynamo directly.
**Load-bearing constraint (makes it free AND conflict-free):** **offline writes are INSERT-ONLY; updates & deletes are online-first; the client mints its own ULID PKs; settings are the one exception → last-write-wins by `updated_at`.** A row created offline is immutable until it syncs, the server is authoritative, and re-sends are idempotent upserts by client ULID — so **merge conflicts are avoided by the insert-only rule, not made impossible** — settings are the one accepted exception (last-write-wins, which discards the older concurrent write), and offline edits of shared rows are deferred precisely because they would bring real conflicts back (this is why the old "push conflict resolution" question is **N/A for v1's write model**).
**Why plain Dexie (not RxDB):** the only thing a sync framework buys here — conflict resolution — is *designed away* by the constraint above, and RxDB's fast storages (OPFS/SQLite) are paid (€99/mo) while its free Dexie/IndexedDB tier is what we'd hand-roll anyway. Plain Dexie is free, has a real local query engine, and doesn't fight the fixed NestJS/oRPC/Neon/S3 stack. **Rejected:** RxDB (premium-storage paywall + a sync engine we don't need), Legend-State (sync still `@beta` after ~2 yrs).
**Sync topology:** curated catalog (Neon) → pull-to-cache, read-only mirror, disposable (re-pull if evicted); user-created notation/source (Neon, `origin='user-upload'`, `listable=false`) → insert-outbox, push when online; per-user scores (DynamoDB) → append-only outbox; settings → LWW; binary files (S3) → Capacitor Filesystem (offline, eviction-safe) → presigned S3 PUT → patch `source.s3_key`.
**iOS durability:** Capacitor's WKWebView ≠ Safari, so 7-day ITP eviction doesn't apply; the real risk is **storage-pressure LRU**, and `navigator.storage.persist()` is unreliable on iOS. So **local = cache**: curated content is disposable (re-pull); the durable risk is *user-created-but-unsynced* rows → **sync eagerly** + keep blobs in **Capacitor Filesystem** (native, eviction-safe). Optional v1.x hardening: mirror the outbox to Capacitor Preferences/Filesystem — ship without it, add only if field data shows eviction-before-sync. **This ADR owns offline-write durability** (no separate per-user durability doc).
**4 gating schema/server changes (REQUIRED for the free Dexie path; formalized as companion R13-R16, fed to the parallel schema redesign):** (1) keep **client-minted `text` ULID PKs** (no server `uuid DEFAULT`/`bigint`); (2) a transactional **`POST /sync/batch`** (idempotent by `batchId`; **behind the Cognito guard + `can()` self-scope — each upsert limited to rows whose `created_by` = the caller's `sub`, no cross-user writes; per-user rate-limits → M1**) so an offline-created graph commits all-or-nothing; (3) **`source.upload_status`** (`pending_blob`｜`ready`) + relaxed `source_one_of` CHECK so a file-backed upload syncs first and the blob backfills; (4) **`DEFERRABLE INITIALLY IMMEDIATE`** on cross-row FKs so one batch txn commits a whole graph regardless of intra-batch order/cycles.
**Flip conditions (when a framework WOULD be warranted):** drop insert-only → allow true offline edits of shared rows (real conflicts → TanStack DB / Zero / Replicache); real-time multi-device collaboration becomes a goal; the hand-rolled outbox sprawls past a few hundred lines / sprouts edge-case bugs; or Dexie stalls (no release in ~12+ months).
**Evidence:** offline-first spike (`docs/spikes/2026-06-17-offline-first-sync.md`). **v1 wiring scope:** Dexie is **installed-but-stubbed at v1** — behind a client repository seam backed by direct online API calls; the insert-outbox, `POST /sync/batch`, mirror tables + blob queue are wired at **M1** (v1 = one admin, one device, online CMS). Schema stays offline-ready via companion R13-R16.

### ARCH-MOBILE-1 — Plain Capacitor (no Ionic)

**Decision:** add **Capacitor** to the plain Vite/React app; **do not** use the Ionic UI framework.
**Why:** Ionic's value is its mobile UI kit, but a rhythm game is a custom canvas/low-latency-audio surface — Ionic's components are dead weight and its page lifecycle can fight the game loop. Capacitor still provides every native device API (haptics, filesystem, audio) via plugins. **Flip:** Ionic only if the app later wants lots of standard native-styled UI.

---

## §4 — Auth, authorization & ownership (Q8)

### ARCH-AUTH-1 — Cognito in Pulumi + Google federation (v1)

**Decision:** provision Cognito in **Pulumi** — User Pool (Essentials tier, managed-login v2) + PKCE App Client + Hosted-UI domain + a **Google `IdentityProvider`**. Verify tokens with **`aws-jwt-verify`** (`tokenUse: "access"`) in a Nest guard. **No Amplify.** **Google-only sign-in for v1** (sidesteps the duplicate-account/linking pitfall entirely).
**Why:** reaffirms the Cognito-not-Amplify decision (NH-193); matches the stated "Google sign-in v1" preference; 10k-MAU always-free (social Google counts in the 10k bucket, not the 50-MAU OIDC bucket) → **$0**. Auth lands **early for the admin gate** (Alpha CMS), reversing the old feature-freeze "CloudFront Basic Auth, no Cognito".
**Implementation detail (→ plan):** Google Cloud OAuth Web client (redirect = Cognito `…/oauth2/idpresponse`), Testing-status consent screen + self as test user (non-sensitive scopes need no verification), Google client secret in **SSM SecureString + KMS**, refresh-token rotation ON, SPA via `oidc-client-ts`. See the Google-federation spike (Sources).

### ARCH-ROLE-1 — Roles via Cognito groups; one pool; admin-now / users-M1

**Decision:** one Cognito user pool serves both. An **`admin` group**; the role rides in the JWT as the **`cognito:groups`** claim; the Nest guard checks it. v1: only the admin (you) signs in (for the CMS). End-users sign up into the **same pool** (ungrouped = regular user) at **M1** — additive, no migration. **M1 gate (blocking):** before enabling native (email+password) or a second IdP sign-up, a Pre-SignUp Lambda doing `AdminLinkProviderForUser` **only on verified email** is required — otherwise an attacker who registers a victim's email gains account takeover (the Google-only v1 avoids this; see federation spike G1). Admin-group assignment for one admin = a one-time `admin-add-user-to-group` (no Lambda trigger needed).
**Why:** RBAC via groups is the cheap, standard model; modeling for end-users now (one pool) avoids a later migration.

### ARCH-AUTHZ-1 — `can(user, item, action)` policy port (minimal v1)

**Decision:** split **authentication** (Cognito guard: valid token? which group?) from **authorization** (a small **framework-free `can(user, item, action)` in `core/`**, called by use-cases). v1 implementation: admin → any action; anyone → read items that are **`status = 'published'` AND `source = 'curated'`** — both conditions ANDed. `status` defaults to `draft` (companion R3), so the status filter is **mandatory** or anonymous callers could read drafts/archived. Enforce it at the **DB layer too** (a query filter or a CHECK-guarded view), so the adapter can never accidentally omit the status check. (~15 lines, no UGC logic yet.)
**Why:** the forward-compat goal wants authorization as a domain policy so UGC is _additive_ (extend the policy: `owner can edit own draft`) instead of unpicking hardcoded guards. Fits the hexagon (domain policy in core).

### ARCH-OWN-1 — Add `created_by` (ownership-by-identity seam)
**Decision:** add a **`created_by`** field (the Cognito `sub`) to the catalog item. v1 admin items set it to the admin's sub; later UGC items set the uploader's sub → v1-vs-UGC differ only by **column values**, not schema. Stated abstractly in the companion data-layer-requirements doc (the parallel schema redesign satisfies it under whatever name).
**Why:** the schema audit found `created_by` **does not exist** today (only `source` provenance-by-category + `status`). This is the cheap UGC ownership seam the north-star asks for.
**Backfill (v1 migration):** existing curated rows get `created_by = <admin sub>` in the **same** migration that adds the column (an `UPDATE` before any NOT-NULL-dependent or owner-based policy ships); NULL is reserved for legacy-unowned rows, which the `can()` policy treats as admin-only-editable.
**PII / exposure:** the Cognito `sub` is an internal identity key — `.omit()` it from public/list DTOs by default (expose only to admin/owner), and on user deletion anonymize or reassign it (GDPR right-to-erasure) per the future UGC spec. The catalog is otherwise "not a PII landing zone"; `created_by` is the one identity column, so it carries this guardrail. (Mirrored in companion R1.)
**Deferred (future specs):** the upload pipeline itself (M1; **forward-reference only — nothing in Phase 0-2 builds it**) — but the **untrusted-uploader seam** is noted: presigned S3 → quarantine prefix → magic-byte validate → promote (the schema spec already has the quarantine prefix design).

---

## 5. Security (JWT + CSP)

### ARCH-SEC-1 — JWT security model

Recorded in response to the "is a JWT in localStorage hackable like an MD5?" concern. Two distinct threats:

- **Tampering / privilege-escalation — prevented by design.** Cognito signs every token with its private RS256 key; `aws-jwt-verify` checks the signature against Cognito's public JWKS on **every** request. Editing the token to add `"admin"` to `cognito:groups` invalidates the signature → rejected. Forging requires Cognito's private key (AWS-only). The group check is a cryptographic, server-side double-check on every call — fundamentally unlike a recomputable hash.
- **Token theft (the real risk) — mitigated.** XSS could steal and replay a legitimately-signed token. Mitigations: tokens in **memory only** — a module-scoped variable, **not** localStorage _or_ `sessionStorage` (both are equally readable by any same-origin script under XSS, so `oidc-client-ts` must be pointed at an in-memory store, off its `sessionStorage` default); **short access-token lifetime (60 min) + refresh-token rotation**; a **strict Content-Security-Policy** (see ARCH-SEC-2) + Zod input validation; the server re-verifies signature + expiry + group every request (never trusts client state). **(→ plan, CI-checked):** point `oidc-client-ts` at an in-memory `userStore`/`stateStore` (a plain-object-backed `WebStorageStateStore`, **not** its `sessionStorage` default), and fail the build via a CI check if `localStorage` or `sessionStorage` appears in any auth/OIDC configuration file. See the token-storage spike (`docs/spikes/2026-06-17-spa-token-storage.md`).

### ARCH-SEC-2 — CSP baseline (CloudFront Response Headers Policy + native `<meta>`)

**Decision:** enforce a strict CSP via a **CloudFront Response Headers Policy** on the SPA's HTML, and ship a **mirrored `<meta http-equiv>` CSP in `index.html`** for the Capacitor native build — the CloudFront header does **not** reach the WebView (native loads from `capacitor://localhost` / `https://localhost`), so the native policy needs a wider `connect-src`.

Baseline (web):

```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
font-src 'self';
connect-src 'self' https://<pool>.auth.<region>.amazoncognito.com https://cognito-idp.<region>.amazonaws.com;
frame-src https://<pool>.auth.<region>.amazoncognito.com;
form-action 'self' https://<pool>.auth.<region>.amazoncognito.com;
frame-ancestors 'none'; base-uri 'self'; object-src 'none';
worker-src 'self' blob:; manifest-src 'self'; upgrade-insecure-requests
```

**Key points:** the Cognito Hosted-UI domain must appear in **three** directives — `connect-src` (token/JWKS fetch), `frame-src` (the `oidc-client-ts` silent-renew iframe navigates _to_ Cognito), and `form-action` (Hosted-UI login + Google button). Google federation is brokered by Cognito → the SPA never calls Google directly, so **no** Google hosts. `script-src 'self'` (no `unsafe-inline`/`unsafe-eval`) is achievable by **externalizing Vite's inline bootstrap** (`build.modulePreload.polyfill:false`) or SHA-256-hashing it; `oidc-client-ts` uses Web Crypto (no WASM). Roll out as `Content-Security-Policy-Report-Only` first, then enforce.
**Input "sanitization" = validation, not scrubbing:** oRPC + **Zod** validates every API input at the Lambda boundary; rely on React's default escaping in the UI and add **DOMPurify only** in the admin-CMS rich-text render path (if it ever renders authored HTML). Don't bolt string sanitizers onto Zod.
**Confirm before enforcing:** (a) **[resolved 2026-06-18]** AlphaTab ships **no** WASM build (verified in the local source `~/Sites/alphaTab` — no `.wasm` files in the repo, no `WebAssembly`/`wasm` references in src/dist) → **`script-src` needs no `wasm-unsafe-eval`**; re-confirm only if AlphaTab is later upgraded to a WASM build. (b) **[resolved by ARCH-OFFLINE-1]** sync is the Dexie insert-outbox POSTing to same-origin `/api/sync/batch` (no separate host, no `wss://`) → **no extra `connect-src` needed**.

---

## 6. Forward-compatibility seams baked into v1 (UGC-ready, additive later)

| Seam          | v1                                            | UGC later                            |
| ------------- | --------------------------------------------- | ------------------------------------ |
| Ownership     | `created_by` set to admin sub (ARCH-OWN-1)    | set to uploader sub — same column    |
| Provenance    | `source` = `curated`                          | `source` = `user-upload`             |
| Lifecycle     | `status` draft/published/archived             | same                                 |
| Authorization | `can()` policy: admin=all (ARCH-AUTHZ-1)      | extend: owner-edits-own-draft        |
| Identity      | one Cognito pool, admin + roles (ARCH-ROLE-1) | end-users in same pool               |
| Uploads       | seam noted, **not built**                     | presigned S3 → quarantine → validate |

**Deferred (future specs, not built now):** moderation UI/queue, per-user quotas + rate-limits, content reporting/abuse, public-scale search tuning.

---

## 7. Decisions feeding the implementation plan (spikes done, no rework)

- **Contract spike:** oRPC over ts-rest (frozen). → ARCH-CONTRACT-1.
- **ORM spike:** Drizzle confirmed for Neon-HTTP + SWC + raw-DDL. → ARCH-ORM-1.
- **Google-federation spike:** Google-only v1, `tokenUse: access`, manual admin-group, rotation, $0, the account-linking gotcha sidestepped. → ARCH-AUTH-1.
- **NestJS-on-Lambda/SWC research:** `@codegenie/serverless-express` v5, `createApplicationContext` workers, `.swcrc` + esbuild per-entry. → ARCH-LAMBDA-1 / ARCH-FMT-1.

---

## 8. Decision summary

| ID | Decision | Supersedes / Reaffirms |
|---|---|---|
| ARCH-MONO-1 | Drop Nx → plain pnpm workspaces | supersedes `L1`, `L2-tags`, `L7-set-shas` |
| ARCH-PM-1 | Keep pnpm (bun stays dropped) | reaffirms `PM-1`, `F6-bun` |
| ARCH-LAYOUT-1 | `client/ server/ shared/ infra/` | supersedes Nx `apps/core/adapters/infra` |
| ARCH-HEX-1 | Hexagon = folders in one Nest app | supersedes `FOLD-hex` |
| ARCH-GUARD-1 | Keep depcruise (folder-level); drop Nx tag rule | supersedes `H8`-`H14` paths, `STRUCT-sibling` |
| ARCH-NAME-1 | NestJS-native filenames (relax suffix ADR) | supersedes `NAME-suffix` |
| ARCH-BUILD-1 | pnpm runner + SWC compiler everywhere; bundler by target | new |
| ARCH-LAMBDA-1 | One API Lambda now; workers via createApplicationContext | implements north-star |
| ARCH-FMT-1 | Server CJS / client ESM | new |
| ARCH-EDGE-1 | One CloudFront, two origins (S3 + Lambda) | new |
| ARCH-CONTRACT-1 | oRPC contract; ditch kanel-zod | new |
| ARCH-ORM-1 | Drizzle | reaffirms `DS-1` |
| ARCH-FE-1 | Vite + TanStack Router + Query | **supersedes 2026-06-16 Next.js ADR (NH-185)** |
| ARCH-OFFLINE-1 | Plain Dexie + insert-only outbox, sync via API | new |
| ARCH-MOBILE-1 | Plain Capacitor (no Ionic) | new |
| ARCH-AUTH-1 | Cognito (Pulumi) + Google federation v1 | reaffirms Cognito-not-Amplify |
| ARCH-ROLE-1 | Roles via Cognito groups; one pool | new |
| ARCH-AUTHZ-1 | `can(user,item,action)` policy port | new |
| ARCH-OWN-1 | Add `created_by` ownership seam | extends catalog schema |
| ARCH-SEC-1 | JWT security model | new |
| ARCH-SEC-2 | CSP baseline (CloudFront RHP + native `<meta>`) | new |

---

## 9. Supersedes — reopened DACI/ADR (pending ratification)

These foundation decisions were **DACI-locked**; leocaseiro pre-authorized reopening them. The DACI/ADR text edits are deferred to a follow-up change; this doc + the registry entry record the reversal now.

- `2026-06-09-tooling-stack-daci.md`: `L1` (Nx) → **dropped** (ARCH-MONO-1); the `apps/core/adapters/infra` layout → **client/server/shared/infra** (ARCH-LAYOUT-1); `PM-1`/`F6-bun` → **unchanged** (pnpm kept).
- `2026-06-12-file-level-structure-enforcement-adr.md`: `NAME-suffix` suffix-everything → **relaxed to NestJS-native filenames** (ARCH-NAME-1); co-location kept; depcruise rules → **folder-level** (ARCH-GUARD-1).
- `2026-06-09-catalog-store-postgres-neon.md` (`DS-1`) → **reaffirmed**; the schema gains `created_by` (ARCH-OWN-1, see companion doc).
- **`2026-06-16-fe-framework-nextjs-adr.md` (NH-185) → ⛔ SUPERSEDED** by `ARCH-FE-1` (Vite + TanStack SPA). leocaseiro chose 2026-06-17 to supersede yesterday's Next.js decision; the OpenNext SSR target is dropped. That ADR's status header now points here.

---

## 10. Sources (spike reports, 2026-06-17)

- Contract spike (oRPC vs ts-rest vs hey-api) — ts-rest#797 "Future of ts-rest" thread; oRPC v1.14.x maintenance verified.
- ORM spike (Drizzle vs Prisma vs TypeORM vs Kysely) — Neon-HTTP-driver fit; `@nestjs/typeorm` TCP-pool-only; Neon NestJS guide uses raw `pg`.
- Google-federation spike (Cognito Hosted UI + Google IdP in Pulumi) — managed-login v2, account-linking pitfall, `tokenUse` access, $0 free-tier.
- NestJS-on-Lambda + SWC best-practices research — `@codegenie/serverless-express` v5 (Node 24), `createApplicationContext`, `.swcrc` + esbuild per-entry.
- React-SPA stack research — Vite + TanStack + Capacitor (plain vs Ionic); offline store = plain Dexie + insert-only outbox (see offline-first spike).
- Offline-first spike (`docs/spikes/2026-06-17-offline-first-sync.md`) — plain Dexie vs RxDB/Replicache, the insert-only constraint, the 4 gating schema changes, iOS WebView durability.

---

## 11. Next steps

**After approval:**

1. **Rewrite the DACI + file-structure ADR text** — supersede `2026-06-09-tooling-stack-daci.md` (`L1` Nx, the layout) and `2026-06-12-file-level-structure-enforcement-adr.md` (`NAME-suffix`) per §9, and flip the affected decision-registry rows.
2. **Invoke `writing-plans`** for the phased implementation plan, sequenced **slice-first** so the build stays deployable and the FE scaffold can't balloon into "whole stack first":
   - **Phase 0 — remove everything Nx** (per the ARCH-MONO-1 migration inventory; regenerate a clean root `package.json`). **Phase 0 is not complete until the ARCH-GUARD-1 core-purity canary passes as a _required_ CI check** — a deliberate `import '@nestjs/common'` in `core/` that the depcruise step must reject (SCOPE-4).
   - **Phase 1 — a thin deployable AWS slice:** an **About-page hello-world wired end-to-end** (CloudFront → Function URL → Lambda), so the recruiter-clickable artifact exists early (honours the DACI 4-week-pivot guardrail). **Implemented in NH-206** (slice shape (c): the real Nest app on Lambda; ARCH-EDGE-1 two-origin; ARCH-LAMBDA-1 AWS_IAM+OAC) — see the 2026-06-21 registry change-log entry.
   - **Phase 2 — CRUD (the admin catalog CMS)** next, **layering the FE libraries (oRPC / TanStack Router+Query / Dexie / auth) only as CRUD actually needs them** — not all up front.

   Then execute.

Until then: ✅ decided · ⏳ no repo code/config changed.

---

## Open questions & deferred scope

A couple of items are intentionally scoped out of v1 — recorded here so they're tracked, not overlooked:

- **DynamoDB single-table key design → deferred to M1.** v1 (the admin catalog CMS) stores no per-user data — scores/settings/sync are M1 features — so no DynamoDB table is provisioned in v1. This is **not a v1 refactor risk:** the per-user store slots in as an *additive* adapter behind a new repository port (ARCH-HEX-1); nothing is provisioned yet (so "a partition key can't change in place" doesn't bite); and the one cross-store seam — stable, client-mintable catalog IDs (R13) — is already locked, so a future `SCORE#<songId>` reference is safe. **Guardrail:** lock the key schema *before* provisioning at M1 — starter sketch: PK=`USER#<sub>`; append-only `SCORE#<songId>#<ulid>`; `SONGSTAT#` rollup via DynamoDB Streams; `GSI1` for pull-since. Tracked in NH-120.
- **CSP × AlphaTab WASM — resolved 2026-06-18.** AlphaTab ships **no** WebAssembly build (verified in the local source `~/Sites/alphaTab`: no `.wasm` files, no `WebAssembly`/`wasm` references), so `script-src` needs **no** `wasm-unsafe-eval` (ARCH-SEC-2, flag a). Re-confirm only if AlphaTab is later upgraded to a WASM build.

The offline-sync design — conflict handling (none, by the insert-only constraint), un-synced-write durability, and v1 wiring — is **decided in `ARCH-OFFLINE-1`**, not open. The locked decisions + these deferrals feed the implementation-planning stage and the parallel schema/data-layer redesign.

### From the 2026-06-17/18 expert review (all resolved 2026-06-18)

The ce-doc-review panel's judgment calls (NH-194) were walked with leocaseiro and actioned in the body above:

- **SCOPE-1** → R13/R15/R16 are schema seams; **R14 (`/sync/batch`) marked as M1**, not v1 (data-layer doc).
- **SCOPE-4** → the core-purity **canary is now a required CI check** (§11 Phase 0).
- **SEC-4** → **resolved:** AlphaTab ships no WebAssembly (verified in `~/Sites/alphaTab`), so no `wasm-unsafe-eval` (ARCH-SEC-2).
- **PROD-1** → **Next.js dropped on purpose;** the SPA UI + AWS depth is the portfolio, no replacement needed (ARCH-FE-1).
- **ADV-1** → "cheapest moment" reworded — the Nx setup cost is itself a reason to drop it; removal is real work but cheaper now (§0).
- **ADV-2** → the drop-Nx reason now leads with "Nx earns nothing here"; the friction claim is softened (§0).
- **ADV-3** → "no conflicts by construction" reworded to state the limit (insert-only rule; settings LWW the one exception) (ARCH-OFFLINE-1).
- **ADV-4** → the eslint-boundaries migration item now says re-derive the element model + canary (ARCH-MONO-1).

Still open for the **W2 registry rewrite:** COH-1 (decision count 20→21) and COH-2 (`L2-tags` double-listed under ARCH-GUARD-1).
