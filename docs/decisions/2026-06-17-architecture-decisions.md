# Notation Hero — Architecture Decision Record (Backend · Client · Auth)

> **Status:** 🟢 DECIDED (brainstorm-approved by leocaseiro, 2026-06-17) — **pending spec review in a separate session** before the DACI/ADR rewrites + implementation planning.
> **Scope:** the 8 open questions in `docs/prompts/2026-06-17-architecture-brainstorm.md`. The north-star (NestJS modular monolith + hexagon, one Lambda behind a Function URL, React SPA + Capacitor) was already locked; this doc decides the open questions and **deliberately reopens** the DACI-locked foundation (Nx, hexagon physical form, file-structure ADR).
> **Companion:** [`docs/specs/2026-06-17-data-layer-requirements.md`](../specs/2026-06-17-data-layer-requirements.md) — what the data layer must provide, decoupled from the parallel schema redesign.
> **Supersedes (pending ratification):** parts of `2026-06-09-tooling-stack-daci.md` (`L1` Nx, the layout) and `2026-06-12-file-level-structure-enforcement-adr.md` (suffix-everything). See §9.
> **Reaffirms:** `2026-06-09-catalogue-store-postgres-neon.md` (`DS-1`), the Cognito-not-Amplify decision (NH-193).
> **Owner:** leocaseiro

---

## 0. Why this doc

A week of setup friction (Nx + pnpm + generators) stalled progress. The north-star is locked; the open questions are about the **foundation shape** and the **concrete tooling**. Two principles agreed this session drive every call below:

1. **Tooling conforms to NestJS + the React starter — not the other way around.** We pick SWC because Nest wants it, Vite-SWC because that's the React standard, and we relax our own file-naming rules to admit framework-native filenames.
2. **Now is the cheapest moment to change the foundation.** Almost no code has shipped (only `apps/handler-hello` + `infra/`; `core/`/`adapters/` are empty). The repo audit confirmed Nx is barely wired (every target is `nx:run-script`; `nx affected` is not used in CI; the only hexagon guard live in CI is dependency-cruiser, which is Nx-independent).

Each section maps to the brainstorm's open questions: §1 → Q1-3, §2 → Q5-7, §3 → Q4 + the contract/ORM, §4 → Q8.

---

## 1. North-star (locked — restated for context, not re-decided)

- **One backend service = a single NestJS 11 app** (modular monolith), **hexagonal/DDD inside**: framework-free domain core, ports (interfaces), adapters (I/O), Nest as the delivery "door".
- Deployed as **one AWS Lambda** (HTTP API) behind a **Function URL** (→ CloudFront). Async work = **extra Lambda entry points from the SAME codebase**, not more apps.
- **One React SPA** client, separate from the backend, over HTTPS; **Capacitor** for mobile; offline-first.
- **Data:** Neon Postgres (catalogue) + DynamoDB single-table (per-user). **Auth:** Cognito (Pulumi) + `aws-jwt-verify`. **Infra:** Pulumi (TS), deploy via GitHub Actions OIDC. **Runtime:** Node 24 (`nodejs24.x`), arm64.

---

## §1 — Foundation (Q1-3 + package manager)

### ARCH-MONO-1 — Drop Nx → plain pnpm workspaces
**Decision:** Remove Nx. Use plain pnpm workspaces (`client`, `server`, `shared`, `infra`). Root scripts become `pnpm -r <target>` / `pnpm --filter <pkg> <target>`.
**Why:** the audit found Nx earns nothing today — 3 plugins, every target is `nx:run-script` wrapping pnpm scripts, `nx affected` unused in CI, caching has 2 trivial projects to cache. One Nest app + one React app + shared contract + infra do not need Nx's package orchestration. Folders-in-one-app (ARCH-HEX-1) is also more NestJS-native — `nest g` scaffolds into `src/` folders, not across packages, so keeping Nx packages would *fight* the generators. Migration cost now ≈ 8-12 files; it only rises as packages are added.
**Supersedes:** `L1` (Nx orchestrator), `L2-tags` (`@nx/enforce-module-boundaries`), `L7-set-shas` (Nx affected SHAs).

### ARCH-PM-1 — Keep pnpm (bun stays dropped)
**Decision:** Keep **pnpm**. Do not switch to bun.
**Why:** the original pnpm-over-bun rationale was partly Nx-coupling (Nx is pnpm-first); dropping Nx *unblocks* bun, but the Lambda runtime is Node 24 regardless — bun would only be a package-manager/script-runner. The pnpm setup (lockfile, curated `allowBuilds`, `engine-strict`) already works; switching is a lateral move that spends time on JS tooling, not the AWS-learning goal.
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
**Cost:** weaker *compile-time* isolation than separate packages (no per-package tsconfig wall), accepted in exchange for far less ceremony; depcruise still enforces direction.
**Supersedes:** `FOLD-hex` ("hexagon as real Nx libs, each with a `type:` tag").

### ARCH-GUARD-1 — Keep dependency-cruiser (folder-level); drop the Nx tag rule
**Decision:** Keep **dependency-cruiser** as the hexagon fence; rewrite its rules from package/tag level to **folder level** under `server/src/`. Drop `@nx/enforce-module-boundaries` (dies with Nx); `eslint-plugin-boundaries` adapts to the new folders (editor-realtime).
**Why:** NestJS DI wires *runtime* collaborators but does **not** enforce architectural direction — nothing in DI stops `core/` from `import`-ing an adapter or `@nestjs/*`, which would silently kill the framework-free core. depcruise is the static fence that prevents it (one config file, the only guard already live in CI, ~zero maintenance, and it catches AI agents crossing boundaries). Example rules:
```js
{ name:'no-core-to-adapters', from:{path:'^server/src/core'}, to:{path:'^server/src/adapters'}, severity:'error' },
{ name:'no-core-to-nestjs',   from:{path:'^server/src/core'}, to:{path:'node_modules/@nestjs'},  severity:'error' },
```
**Supersedes:** `H8`-`H14` rule *paths* (rewritten folder-level), `L2-tags` (removed), `STRUCT-sibling` (re-pointed).

### ARCH-NAME-1 — Relax the suffix-everything ADR to NestJS-native filenames
**Decision:** Replace the strict "suffix everything" file taxonomy with **NestJS + React framework-native filenames** (`.module.ts`, `.guard.ts`, `.controller.ts`, `.pipe.ts`, `.interceptor.ts`, `.filter.ts`, Drizzle `.schema.ts`, the `main.ts`/entry files, `*.e2e-spec.ts`). Keep kebab-case (Nest emits it by default → zero fight) and co-located tests.
**Why:** the locked `check-layout.sh` allowlist would fail NestJS on its first commit; per the "tooling conforms to the framework" principle, we relax the rule rather than rename framework files.
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
- **Async workers (when they land):** `server/src/entry/worker-*.ts` using **`NestFactory.createApplicationContext`** (DI container, no HTTP server), each importing a **slim per-worker module** (only what it needs → smaller bundle, faster cold start), resolving providers via `ctx.get(Service)`. This is the idiomatic "many entry points, one codebase" — **not** more apps.
**Why:** matches the locked north-star; research-verified current packages (codegenie v5, Apr 2026) and idiom.

### ARCH-FMT-1 — Server CJS, client ESM
**Decision:** `server/` (Lambda) emits **CommonJS**; `client/` (browser) emits **ESM**.
**Why:** tree-shaking happens at *bundle time* from ESM **source**, independent of output format — so CJS output keeps tree-shaking. The real axis is runtime ergonomics: NestJS + decorators + `reflect-metadata` + serverless-express are CJS-rooted (ESM-on-Lambda adds `__dirname`/interop/`"type":"module"` friction for zero gain), while browsers run ESM natively (smaller downloads).
**SWC/esbuild settings:** `.swcrc` `legacyDecorator + decoratorMetadata + keepClassNames`, `module.type=commonjs`, target es2022. esbuild per entry: `--format=cjs --platform=node --target=node24 --minify --keep-names --external:@aws-sdk/*`. Pulumi zips each entry → arm64 `nodejs24.x`.
**Note:** the `@nestjs/swagger` CLI plugin does not run under SWC — **moot** because oRPC (ARCH-CONTRACT-1) emits OpenAPI from the contract; `@nestjs/swagger` is not used.

### ARCH-EDGE-1 — One CloudFront distribution, two origins
**Decision:** a single CloudFront distribution (custom domain + TLS) with two origins: default behavior `/*` → **S3** (static FE assets, edge-cached), `/api/*` → **Lambda Function URL** (dynamic, ~uncached). The Lambda *code bundle* is loaded by the Lambda runtime from Lambda storage at cold start — never via CloudFront, never downloaded by the browser.
**Why:** same-origin (kills CORS), one domain, one TLS cert, edge-cache the FE — the `S3 + CloudFront + OAC` item on the AWS learning-map.

---

## §3 — Client stack (Q4 + the contract)

### ARCH-CONTRACT-1 — oRPC for the typed API contract (not ts-rest); ditch kanel-zod
**Decision:** use **oRPC** (`@orpc/*`): the contract lives framework-free in `shared/` (`oc.route().input(zod).output(zod)`), `server/` implements it via `@orpc/nest` (`@Implement`), `client/` consumes it via `@orpc/tanstack-query`. **Ditch kanel-zod** — the DB→Zod layer is owned by Drizzle + `drizzle-zod` (derive a base from the DB schema, then `.omit()/.extend()` to curate the API DTO — DB-change awareness without coupling the API to the DB).
**Why:** the 🔬 contract spike found **ts-rest is effectively frozen** (0 commits to `main` in 2026; issue #797 "Future of ts-rest" — its own users are migrating to oRPC). oRPC is actively shipping (v1.14.x, weekly releases, post-1.0), has a first-class Nest adapter, pure TS inference (no codegen), shared Zod runtime validation, native OpenAPI (for the future admin CMS / 3rd-parties), and a ~3.4 KB client (good for Capacitor).
**Three type-safety layers (the mental model):** ① DB↔server = Drizzle; ② server↔client = oRPC; ③ Zod = the shared validation currency. The API shape ≠ the DB shape (the hexagon maps row→entity→DTO), so the contract is hand-authored, not auto-mirrored from the DB.
**Caveat:** oRPC is primarily one maintainer (same risk class ts-rest had) — mitigated because it emits standard OpenAPI, so the exit ramp (regenerate a client from the spec) is cheap. **Flip:** `@hey-api/openapi-ts` if the OpenAPI spec should be the single source of truth from day one (accepts a codegen step).

### ARCH-ORM-1 — Drizzle (reaffirmed over Prisma/TypeORM/Kysely)
**Decision:** keep **Drizzle** (`drizzle-orm/neon-http` + `drizzle-kit` + `drizzle-zod`), wired as a custom `DRIZZLE` provider in an adapter behind the repository port.
**Why:** the 🔬 ORM spike confirmed Drizzle is the best fit for *this* stack — only true ORM that natively rides Neon's **HTTP driver** (best cold-start), **zero SWC/decorator friction** (schema-as-TS, no `emitDecoratorMetadata`), and lets the **raw SQL DDL stay source of truth** (references the `GENERATED` tsvector column, doesn't fight it). There is **no built-in NestJS ORM** (Nest is ORM-agnostic; `@nestjs/typeorm` is the most "blessed" but is TCP-pool-only on Neon + has SWC decorator footguns). Neon's own NestJS guide uses raw `pg` (no ORM).
**Caveat:** Drizzle `latest` is still 0.x with a 1.0 RC mid-flight (no GA date) — track the v1 / Relational-Queries-V2 migration. **Flip:** Kysely if the adapter ends up in the raw `sql` tag for most JSONB/tsvector queries anyway.
**Reaffirms:** `DS-1` (Neon Postgres catalogue store).

### ARCH-FE-1 — Vite + TanStack Router + TanStack Query
**Decision:** **Vite 8** (build/dev) + **TanStack Router** (type-safe routes + typed search params) + **TanStack Query** (server cache, pairs with `@orpc/tanstack-query`). Scaffold: `npx @tanstack/cli create --router-only` (NOT the deprecated `create-tsrouter-app`).
**Why:** keeps routing in the same typed/ecosystem story as Query + oRPC; typed search params suit the rhythm-game deep-links (`/play?songId=&difficulty=&speed=`). This was the closest call — **React Router v7 (data mode)** is the legitimate alternative if minimizing FE learning to focus on AWS matters more. **Flip:** RR v7 to spend zero learning budget on the FE router.
**Supersedes:** the **2026-06-16 Next.js FE ADR** (`2026-06-16-fe-framework-nextjs-adr.md`, NH-185) — leocaseiro chose 2026-06-17 to supersede yesterday's Next.js decision; the OpenNext SSR target + the one-source/two-target build are dropped (pure Vite SPA; Capacitor wraps the static build).

### ARCH-OFFLINE-1 — RxDB (free Dexie storage), syncs via the API
**Decision:** **RxDB** with the free **Dexie/IndexedDB** storage; offline-first; replication (pull/push HTTP handlers) to the NestJS API, which persists per-user data to **DynamoDB** and serves the catalogue from **Neon**. RxDB is backend-agnostic — it talks to *our API*, not to Neon/Dynamo directly.
**Why:** purpose-built for "sync with your own backend" + a real local query engine; matches the locked data split. **Caveat:** fast storages (OPFS/SQLite) are paid (€99/mo); on iOS WebView IndexedDB can be evicted — acceptable since DynamoDB is the source of truth (local = cache). **Flip:** paid SQLite storage only if iOS eviction bites in device testing. **Rejected:** Legend-State (sync engine still `@beta` after ~2 years; custom-backend sync more DIY).

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
**Decision:** one Cognito user pool serves both. An **`admin` group**; the role rides in the JWT as the **`cognito:groups`** claim; the Nest guard checks it. v1: only the admin (you) signs in (for the CMS). End-users sign up into the **same pool** (ungrouped = regular user) at **M1** — additive, no migration. Admin-group assignment for one admin = a one-time `admin-add-user-to-group` (no Lambda trigger needed).
**Why:** RBAC via groups is the cheap, standard model; modeling for end-users now (one pool) avoids a later migration.

### ARCH-AUTHZ-1 — `can(user, item, action)` policy port (minimal v1)
**Decision:** split **authentication** (Cognito guard: valid token? which group?) from **authorization** (a small **framework-free `can(user, item, action)` in `core/`**, called by use-cases). v1 implementation: admin → any action; anyone → read `published` + `curated` only (~15 lines, no UGC logic yet).
**Why:** the forward-compat goal wants authorization as a domain policy so UGC is *additive* (extend the policy: `owner can edit own draft`) instead of unpicking hardcoded guards. Fits the hexagon (domain policy in core).

### ARCH-OWN-1 — Add `created_by` (ownership-by-identity seam)
**Decision:** add a **`created_by`** field (the Cognito `sub`) to the catalogue item. v1 admin items set it to the admin's sub; later UGC items set the uploader's sub → v1-vs-UGC differ only by **column values**, not schema. Stated abstractly in the companion data-layer-requirements doc (the parallel schema redesign satisfies it under whatever name).
**Why:** the schema audit found `created_by` **does not exist** today (only `source` provenance-by-category + `status`). This is the cheap UGC ownership seam the north-star asks for.
**Deferred (future specs):** the upload pipeline itself (M1) — but the **untrusted-uploader seam** is noted: presigned S3 → quarantine prefix → magic-byte validate → promote (the schema spec already has the quarantine prefix design).

---

## 5. Security model (JWT) — ARCH-SEC-1

Recorded in response to the "is a JWT in localStorage hackable like an MD5?" concern. Two distinct threats:

- **Tampering / privilege-escalation — prevented by design.** Cognito signs every token with its private RS256 key; `aws-jwt-verify` checks the signature against Cognito's public JWKS on **every** request. Editing the token to add `"admin"` to `cognito:groups` invalidates the signature → rejected. Forging requires Cognito's private key (AWS-only). The group check is a cryptographic, server-side double-check on every call — fundamentally unlike a recomputable hash.
- **Token theft (the real risk) — mitigated.** XSS could steal and replay a legitimately-signed token. Mitigations: tokens in **memory/sessionStorage** (not localStorage); **short access-token lifetime (60 min) + refresh-token rotation**; **strict Content-Security-Policy** + input sanitization; the server re-verifies signature + expiry + group every request (never trusts client state).

---

## 6. Forward-compatibility seams baked into v1 (UGC-ready, additive later)

| Seam | v1 | UGC later |
|---|---|---|
| Ownership | `created_by` set to admin sub (ARCH-OWN-1) | set to uploader sub — same column |
| Provenance | `source` = `curated` | `source` = `user-upload` |
| Lifecycle | `status` draft/published/archived | same |
| Authorization | `can()` policy: admin=all (ARCH-AUTHZ-1) | extend: owner-edits-own-draft |
| Identity | one Cognito pool, admin + roles (ARCH-ROLE-1) | end-users in same pool |
| Uploads | seam noted, **not built** | presigned S3 → quarantine → validate |

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
| ARCH-GUARD-1 | Keep depcruise (folder-level); drop Nx tag rule | supersedes `H8`-`H14` paths, `L2-tags`, `STRUCT-sibling` |
| ARCH-NAME-1 | NestJS-native filenames (relax suffix ADR) | supersedes `NAME-suffix` |
| ARCH-BUILD-1 | pnpm runner + SWC compiler everywhere; bundler by target | new |
| ARCH-LAMBDA-1 | One API Lambda now; workers via createApplicationContext | implements north-star |
| ARCH-FMT-1 | Server CJS / client ESM | new |
| ARCH-EDGE-1 | One CloudFront, two origins (S3 + Lambda) | new |
| ARCH-CONTRACT-1 | oRPC contract; ditch kanel-zod | new |
| ARCH-ORM-1 | Drizzle | reaffirms `DS-1` |
| ARCH-FE-1 | Vite + TanStack Router + Query | **supersedes 2026-06-16 Next.js ADR (NH-185)** |
| ARCH-OFFLINE-1 | RxDB (free Dexie), sync via API | new |
| ARCH-MOBILE-1 | Plain Capacitor (no Ionic) | new |
| ARCH-AUTH-1 | Cognito (Pulumi) + Google federation v1 | reaffirms Cognito-not-Amplify |
| ARCH-ROLE-1 | Roles via Cognito groups; one pool | new |
| ARCH-AUTHZ-1 | `can(user,item,action)` policy port | new |
| ARCH-OWN-1 | Add `created_by` ownership seam | extends catalogue schema |
| ARCH-SEC-1 | JWT security model | new |

---

## 9. Supersedes — reopened DACI/ADR (to ratify in the review session)

These foundation decisions were **DACI-locked**; leocaseiro pre-authorized reopening them this session. The DACI/ADR text edits are deferred to the post-review session (W2 decision); this doc + the registry entry record the reversal now.

- `2026-06-09-tooling-stack-daci.md`: `L1` (Nx) → **dropped** (ARCH-MONO-1); the `apps/core/adapters/infra` layout → **client/server/shared/infra** (ARCH-LAYOUT-1); `PM-1`/`F6-bun` → **unchanged** (pnpm kept).
- `2026-06-12-file-level-structure-enforcement-adr.md`: `NAME-suffix` suffix-everything → **relaxed to NestJS-native filenames** (ARCH-NAME-1); co-location kept; depcruise rules → **folder-level** (ARCH-GUARD-1).
- `2026-06-09-catalogue-store-postgres-neon.md` (`DS-1`) → **reaffirmed**; the schema gains `created_by` (ARCH-OWN-1, see companion doc).
- **`2026-06-16-fe-framework-nextjs-adr.md` (NH-185) → ⛔ SUPERSEDED** by `ARCH-FE-1` (Vite + TanStack SPA). leocaseiro chose 2026-06-17 to supersede yesterday's Next.js decision; the OpenNext SSR target is dropped. That ADR's status header now points here.

---

## 10. Sources (spike reports, 2026-06-17)

- Contract spike (oRPC vs ts-rest vs hey-api) — ts-rest#797 "Future of ts-rest" thread; oRPC v1.14.x maintenance verified.
- ORM spike (Drizzle vs Prisma vs TypeORM vs Kysely) — Neon-HTTP-driver fit; `@nestjs/typeorm` TCP-pool-only; Neon NestJS guide uses raw `pg`.
- Google-federation spike (Cognito Hosted UI + Google IdP in Pulumi) — managed-login v2, account-linking pitfall, `tokenUse` access, $0 free-tier.
- NestJS-on-Lambda + SWC best-practices research — `@codegenie/serverless-express` v5 (Node 24), `createApplicationContext`, `.swcrc` + esbuild per-entry.
- React-SPA stack research — Vite + TanStack + RxDB vs Legend-State + Capacitor (plain vs Ionic).

---

## 11. Next steps (after spec review)

This brainstorm ends at a committed, reviewable spec. **After approval (in a separate review session):**

1. **Rewrite the DACI + file-structure ADR text** (the W2 deferral) — supersede `2026-06-09-tooling-stack-daci.md` (`L1` Nx, the layout) and `2026-06-12-file-level-structure-enforcement-adr.md` (`NAME-suffix`) per §9, and flip the affected decision-registry rows.
2. **Invoke `writing-plans`** for the phased implementation plan (foundation migration → scaffolding → first feature), then execute.

Until then: ✅ decided · ⏳ no code/config changed.
