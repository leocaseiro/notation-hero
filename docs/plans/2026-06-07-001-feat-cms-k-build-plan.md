---
title: "feat: Area K — Admin/CMS build plan (custom AWS backend + React-Admin SPA)"
type: feat
status: active
date: 2026-06-07
revised: 2026-06-10 # catalogue store DynamoDB → Neon Postgres (Track 3 lock) — see Revision changelog
origin: docs/cms-approach.md
deepened: 2026-06-07
---

# feat: Area K — Admin/CMS build plan (custom AWS backend + React-Admin SPA)

> [!WARNING]
> ⛔ **SUPERSEDED / PARTIALLY STALE.** This doc predates the **2026-06-09 decision cliff**
> (pnpm + Nx replaced Bun; the song/lesson catalogue moved to **Neon Postgres + JSONB**,
> DynamoDB is per-user data only) and/or the 2026-06-10 schema lock. **Do not build from the
> struck lines below.**
>
> **Authoritative now →** `docs/decisions/decision-registry.md` (every decision + status),
> `docs/decisions/2026-06-09-tooling-stack-daci.md`, `docs/decisions/2026-06-09-catalogue-store-postgres-neon.md`,
> `docs/specs/2026-06-10-catalogue-schema.md`, `AGENTS.md`.
>
> _Kept for history (per "strike, don't delete"). Stale lines are ~~struck~~ with a reason._

> **REVISED 2026-06-10 for the Postgres catalogue.** Track 3 locked the catalogue contract as **Neon PostgreSQL + JSONB** with a richer model (`catalogue_item` / `exercise` / `pattern` / `item_pattern`) — see [specs/2026-06-10-catalogue-schema.md](../specs/2026-06-10-catalogue-schema.md) (**THE authoritative contract** — implement as-written, do not re-litigate fields/constraints) and [decisions/2026-06-09-catalogue-store-postgres-neon.md](../decisions/2026-06-09-catalogue-store-postgres-neon.md) (why Neon; why DynamoDB stays per-user-only). The original R6 trigger ("if Track 3 lands changes, update the core model") has fired: this revision swaps the **catalogue data store DynamoDB → Postgres** and keeps every piece of schema-agnostic AWS plumbing (Lambdas, S3 + validator, CloudFront + OAC + KVS edge-auth, two distributions, React-Admin SPA, SNS, Pulumi components, CI + dependency-cruiser).
>
> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement unit-by-unit. Revised units carry checkbox (`- [ ]`) TDD task lists.

## Revision changelog (2026-06-10) — what moved DynamoDB → Postgres

| # | Area | Was (2026-06-07) | Now (this revision) |
|---|---|---|---|
| RC-1 | U2 domain model | single `core/lesson/Lesson.ts` interface (draft `song-schema.md`) | `core/catalogue/` — `CatalogueItem` (`type='song'\|'lesson'`, shared facets as typed fields) + `Exercise` (ordered steps, start→goal BPM ladder) + `Pattern` (discriminated by `kind`) + `CatalogueFilter` (type, nullable level 1–10, bpm-range, time_sig, genre, tags[], skill[], instruments[], lesson_type, pattern, fuzzy + accent-insensitive search); ports `CatalogueRepository` + `PatternRepository` |
| RC-2 | U4 adapter | `adapters/dynamodb/LessonRepositoryDynamoDB` (catalogue) | **NEW `adapters/postgres/`** (`@notation-hero/adapters-postgres`): repository port via `@neondatabase/serverless` + raw **parameterized** SQL (no ORM — portability is the point). **Migrations live here**: spec §4 DDL **verbatim** (extensions, immutable wrappers, 4 tables + all CHECKs) + §9 indexes + GENERATED `search` tsvector. Tests run against **local Docker `postgres:16`** (`docker-compose.test.yml`), NOT LocalStack — Postgres isn't an AWS service |
| RC-3 | DynamoDB scope | inline DynamoDB table in `infra/index.ts` (U9) + catalogue repo (U4) | **dropped from K v1** — the catalogue no longer needs it. DynamoDB returns for **per-user** data (scores/settings/mappings/sync) at **M1** — a separate plan, not this one |
| RC-4 | U5–U7 Lambdas | K-3 read + K-2 CRUD query DynamoDB; loose list projection | query Postgres via the new repository; **§9 K-3 list projection exactly**; **publish gates** enforced (curated-only `ci_shared_curated` CHECK + write-once `source`; ≥1 exercise before a lesson publishes; license required for published curated items); **§10 ingest** honored (parse-once-at-upload seeds metadata; bounded-buffer zip inspection with decompression aborted at the ~20 MB ceiling; checksum/size capture) |
| RC-5 | MIDI + alphaTex | `.mid` + `.alphatex` accepted as uploads; `pending_validation` status + async hard-validator deferral | **`.mid` uploads REJECTED** (AlphaTab can't render MIDI — curators convert to Guitar Pro **before** upload; automated convert = M1). alphaTex is **CMS-authored inline** on `exercise.notation_tex` (parse-validated client-side at authoring), never an uploaded file. `pending_validation` machinery **removed** — locked status vocab is `draft\|published\|archived` |
| RC-6 | U9 infra | DynamoDB table provisioned by Pulumi | **Pulumi does NOT provision the database** (Neon = off-AWS SaaS). Neon connection string = **Pulumi secret** → injected into Lambda env (least-privilege). AWS-managed equivalent (**Aurora Serverless v2 / RDS + RDS Proxy**, with the connection-pooling rationale) documented as the interview talking point; store swappable behind the K-3 API |
| RC-7 | Cover images | DEFERRED (R1 narrowed to source-file-only; curator pastes a URL) | **DITCHED from K v1** (owner decision, 2026-06-10 walkthrough): the locked `cover_image_key` column is *optional* — it ships in the DDL, stays `NULL`, and the library shows the icon fallback (spec §4). No upload pipeline, no cover signing, no image magic-bytes. Revisit with library polish (H-11) |
| RC-8 | Problem frame | "don't move data off AWS (SaaS)" used to justify the custom backend | tension **explicitly reconciled** — see Problem Frame |
| RC-9 | Toolchain | bun 1.3.11 workspaces | superseded by the **2026-06-09 tooling DACI** ([decisions/2026-06-09-tooling-stack-daci.md](../decisions/2026-06-09-tooling-stack-daci.md)): **pnpm 11.5.2 + Nx; bun fully dropped**. All commands are now pnpm. **U1 skeleton is already built/committed on pnpm** |
| RC-10 | Per-Lambda IaC | `apps/<fn>/infra.ts` colocated with the handler | DACI serverless layout: Nx `enforce-module-boundaries` is **project-level only**, so handler + IaC must not share a project. Per-Lambda IaC moves to **`infra/cms/*.ts`** modules inside the `infra` project; infra references the handler's **build output** (`dist/`), never its source |
| RC-11 | Events | `LessonEvent` (`lesson.{published,updated,deleted}`) | SNS topic **`lesson-events` kept** (plumbing unchanged); event schema becomes `CatalogueEvent` — `catalogue_item.{created,updated,published,archived}` + `catalogue_item.file.validated` |
| RC-12 | Optimistic concurrency | DynamoDB `version` attribute + `If-Match` | the locked schema has **no `version` column** → `updated_at` is the concurrency token (`If-Match: <updatedAt ISO>`; `UPDATE … WHERE id=$1 AND updated_at=$2`) |
| RC-13 | File delivery | S3 **presigned GET** URLs minted by K-3 | spec §2 mandates **CloudFront signed URLs** (private, never public, ~5 min TTL — anti-hotlink/anti-bulk-download): the public distribution gains a `catalogue/*` S3-origin behavior (OAC + **trusted key group**); K-3 signs with `@aws-sdk/cloudfront-signer`; the key pair is a Pulumi secret. uploads use presigned **POST** (size-conditioned policy; uploads aren't delivery) |

## Summary

Implement the locked Track 4 approach (custom serverless AWS backend, mounting React-Admin as the admin front-end) by delivering K-1 (lesson store), K-3 (public catalog API), and K-2 (admin SPA + CRUD) as a Hexagonal/Clean Architecture (Layout 4) TypeScript monorepo. The **catalogue store is Neon PostgreSQL + JSONB** per the locked Track 3 contract ([specs/2026-06-10-catalogue-schema.md](../specs/2026-06-10-catalogue-schema.md)); files stay in S3; DynamoDB is out of K's scope (per-user data at M1). Build 9 implementation units in dependency order: bootstrap (✅ done) → core domain → Pulumi infra primitives → runtime adapters (Postgres + S3 + SNS) → three Lambda composition roots → admin SPA → infra composition root. All inside the AWS Always-Free tier (~$0/mo) plus Neon's $0 free tier (the one deliberate off-AWS exception), using `@pulumi/aws` v7, Node.js 22 Lambda runtime, React-Admin 5.14, `@neondatabase/serverless`, CloudFront KeyValueStore (KVS) for Basic-Auth credential rotation, and OAC-gated Lambda Function URLs. Toolchain: pnpm 11.5.2 + Nx per the 2026-06-09 DACI.

---

## Problem Frame

Area `K` was placed in Alpha specifically as the **#3-ranked AWS-portfolio piece** (per `feature-freeze.md` AWS-portfolio candidates table). The build must intentionally exercise S3, Lambda Function URL, CloudFront (incl. signed-URL delivery), CloudFront Functions (edge auth), Pulumi IaC, and IAM least-privilege — because *those* are the interview-tellable assets. (DynamoDB left K's scope with the catalogue decision — it returns as the per-user centerpiece at M1; the catalogue adds the relational/Postgres breadth instead.) The admin UX itself is single-user-internal and gets a default React-Admin Material-UI shell (no `/design-shotgun` pass).

The core tension was resolved in `docs/cms-approach.md` (locked 2026-06-05): every headless-CMS alternative either breaks the AWS-Always-Free constraint (self-hosted needs an always-on container) or deletes the custom Lambda/S3/CloudFront/IaC plumbing wholesale — the plumbing being the portfolio value `K` exists to create. (The original framing also cited "moves data off AWS" as a rejection reason; that data-locality leg was retired in the 2026-06-10 reconciliation below.) The plan below executes that decision.

**Problem-frame reconciliation (2026-06-10).** The paragraph above justified the custom backend partly on "don't move data off AWS (SaaS)" — and Track 3 then moved the *catalogue* to Neon, an off-AWS SaaS. These don't contradict, per the [2026-06-09 decision](../decisions/2026-06-09-catalogue-store-postgres-neon.md): the AWS-portfolio value `K` exists to create lives in the **Lambda + S3 + CloudFront + edge-auth + Pulumi/IaC plumbing** — exactly the pieces a headless CMS would have deleted wholesale — plus the **swappable-behind-K-3** framing and the **Aurora Serverless v2 / RDS + RDS Proxy** talking point (the AWS-managed equivalent, including the connection-pooling rationale). The custom backend still earns its keep; only the catalogue's *data store* moved — to a portable, $0, standard-Postgres store that swaps back to AWS behind one API. The DynamoDB leg is **prospective until M1** (per-user data: scores/settings/mappings/sync) — in the realistic interview window the deployed system contains zero DynamoDB, and the [2026-06-09 decision doc](../decisions/2026-06-09-catalogue-store-postgres-neon.md) is the interview artifact for the polyglot-persistence story until then. (`feature-freeze.md` still lists `H-3` at *Alpha* — reconciling that milestone is flagged in Open Questions.)

A second tension shaped the structure: building an admin CMS in a project that also has a player PWA, scoring engine, sync engine, and analytics pipeline coming (6+ adapter swaps over the milestone ladder) means the architectural pattern picked now compounds. **Hexagonal/Clean Architecture (Layout 4)** was locked after walking through 5 layout options — see Key Technical Decisions for full rationale.

---

## Requirements

- **R1.** Deliver `K-1` (lesson store): S3 (`catalogue/<id>/source.<ext>`) + **Neon Postgres catalogue** (`catalogue_item` + `exercise` + `pattern` + `item_pattern` per the locked spec) + magic-byte file validator on upload. Cover images: **out of K v1** (owner decision — RC-7): `cover_image_key` ships in the DDL but stays `NULL`; the library uses the icon fallback the spec already defines.
- **R2.** Deliver `K-3` (catalog API + delivery): Lambda Function URL behind CloudFront with `GET /v1/catalogue` (the **spec §9 list projection exactly**: `id, type, title, artist, genre, level, bpm, time_sig, instruments, has_audio, has_video, sort_order, cover_image_url, status, updated_at` — excluding `data`, `notation_key`, `notation_checksum`) and `GET /v1/catalogue/{id}` (full record + exercises + pattern links + short-lived signed URL for the file; song-breakdown slices resolved through a **single shared resolver** that refuses non-`published` source songs — spec §6 D2).
- **R3.** Deliver `K-2` (admin SPA + CRUD): React-Admin SPA on S3+CloudFront, gated by CloudFront Function Basic-Auth (KVS-backed credential), talking to a Lambda FURL CRUD API (catalogue items + exercises + the upload routes + an explicit `POST /api/catalogue/{id}/publish` enforcing the spec §5 publish gates). **Songs are created upload-first by the ingest pipeline** (round-2 review — the locked `ci_song_file` CHECK makes create-then-upload impossible for songs). Pattern-authoring/linking UI is **deferred to H-11** per spec §11; the tables + read path still ship.
- **R4.** All infra provisioned via Pulumi TypeScript (`@pulumi/aws` v7) — the `H-1` portfolio multiplier. **Exception (locked): Pulumi does NOT provision the database** — Neon is off-AWS SaaS; the connection string is a Pulumi secret injected into Lambda env (RC-6).
- **R5.** Stay inside AWS Always-Free tier — no Fargate, no EC2, no API Gateway, no Amplify, no Cognito. **Neon's $0 free tier is the one deliberate off-AWS exception** (justified in the decision doc).
- **R6.** Implement against **`docs/specs/2026-06-10-catalogue-schema.md` (LOCKED)** — admin and player read/write the same shape. The §4 DDL + §9 indexes ship **verbatim** as the `adapters/postgres` migrations; fields/constraints are not changed by this plan.
- **R7.** Repo follows Hexagonal/Clean Architecture (Layout 4) at the top level — `core/` + `adapters/` + `apps/` + `infra/`. Dependency direction enforced in CI via `dependency-cruiser` (+ Nx `enforce-module-boundaries` tags when Nx materializes, per the tooling DACI).
- **R8.** All license-clean (MIT/Apache/BSD/MPL-2.0) — React-Admin (MIT), `file-type` (MIT), Pulumi (Apache-2.0), `@neondatabase/serverless` (MIT), alphaTab (MPL-2.0), etc. The admin is internal-web only, never bundled into App Store binary.
- **R9.** Catalogue persistence is **raw parameterized SQL** (no ORM — portability is the point; every user-supplied value bound as a parameter, never interpolated). Adapter integration tests run against **local Docker `postgres:16`**, not LocalStack.

**Origin actors:** the source doc (`docs/cms-approach.md`) is an approach/decision doc, not a brainstorm with explicit A-IDs. Implicit single actor: the curator (you, internal admin user). No origin F/AE IDs to carry forward.

---

## Scope Boundaries

### Deferred for later

Carried from origin (`cms-approach.md` Open items + `feature-freeze.md` milestone allocations), updated for the locked schema:

- **Refine vs React-Admin re-evaluation** — React-Admin locked; revisit only if shadcn-native styling becomes desired.
- **alphaTex server-side parse validation** — alphaTex is **CMS-authored inline** on `exercise.notation_tex` (never an uploaded file — RC-5). v1 validates at authoring time **client-side in the admin form** (alphaTab parses in the browser); the server stores the text as-is. A server-side parse re-check is an M1 hardening item. The old `pending_validation` status + async-validator deferral is **dissolved** — the locked status vocab is `draft|published|archived`, and `draft` is the pre-publish state.
- **Automated MIDI → MusicXML/GP conversion** — M1 / user-upload concern (spec §10.4). v1: curators convert MIDI in Guitar Pro **before** upload (the existing workflow); the validator **rejects** `MThd` uploads with reason `midi-not-renderable-convert-first`.
- **Multi-credential / per-user admin auth** — single shared credential is sufficient (single curator). Multi-user is `M1+` if needed.
- **Prod stack (`prod` Pulumi stack)** — `dev` only until the app is shipping. The plan creates the multi-stack scaffolding but provisions only `dev`.
- **DynamoDB per-user data** (scores/settings/mappings/sync via `H-3`/`H-5`) — **M1, separate plan.** K v1 has zero DynamoDB resources (RC-3).
- **`pattern_pairing` (suggest-a-fill)** — deferred slot per spec §4 ⑤; designed, not created.
- **Spec §11 deferred slots** (`track`, `song_part`, `collection`, `course`, `most_practiced_count`, per-track media, multi-arrangement grouping, user-upload private space) — explicitly out of K v1; the spec designed the slots so they land without rework.

### Outside this product's identity

- **NOT a multi-tenant CMS.** Single curator, shared/global content. No org/team/role model. (User uploads = `H-10` @ M1 — different surface, different identity story.)
- **NOT a workflow/approval CMS.** Draft/publish status exists on the `CatalogueItem` record (`status` column) but no review queue, no approver routing, no notifications.
- **NOT a content-design tool.** Song files are authored externally (`.gp*`/`.xml` in Guitar Pro etc.) and uploaded as-is; exercise steps are short alphaTex snippets typed into the admin form. No in-browser composition beyond that text field.
- **NOT a public-facing admin.** Internal/utilitarian; React-Admin's MUI default is the v1 look. `/design-shotgun` does NOT cover this surface.

### Deferred to Follow-Up Work

Plan-local — work that will be done separately:

- **Track 2 plan revision** — ✅ **RESOLVED.** `docs/cicd-pipeline.md` lives in-repo; the U1 Layout-4 skeleton is **built and committed** (pnpm 11.5.2 workspaces, `.gitkeep` placeholder dirs, dependency-cruiser + ESLint guards, CI). Residual: **Nx materialization** (DACI L1/L2 — `nx init` + real Nx libs with `type:` tags, in flight on `chore/nx-init`). K packages are created pnpm-workspace-native; they pick up `project.json` tags when Nx lands — no rework expected (the DACI kept the hexagonal folder shape).
- **Track 3 schema lock** — ✅ **LANDED 2026-06-10** ([specs/2026-06-10-catalogue-schema.md](../specs/2026-06-10-catalogue-schema.md)). This revision is the response; the original "U4/U5 wait for Track 3" gate is satisfied and removed.
- **Player PWA implementation** — separate plan. This plan does NOT create an `apps/player-pwa/` stub (scope-guardian + product-lens flagged that as pre-committing player-app shape decisions outside this plan's scope). The player track consumes the public CDN URL + public API URL as Pulumi stack outputs exposed by U9.
- **DynamoDB per-user plan (M1)** — see "Deferred for later" above.
- **CI deploy workflow for the admin SPA** — covered in `U1` for the basic shape; full `deploy.yml` with OIDC-assume + `aws s3 sync` + CloudFront invalidation extension to admin SPA is a separate scope (overlaps with Track 2's existing deploy.yml plan).

---

## Context & Research

### Relevant Code and Patterns

The repo is **greenfield**. Two adjacent artifacts to align with:

- **`vigorous-goldwasser-73ccca/`** sibling worktree has an executed Wave 1 (React 19 + Vite 6 + Vitest + bun workspaces + path-filtered CI) — *this gets superseded by this plan's U1*. Reference for proven config patterns (Vite version, ESLint setup, CI workflow shape) but not for code copy.
- **`alphaTabWebsite` fork** (`~/Sites/alphaTabWebsite`, MPL-2.0): NOT consumed by `K` directly. Phase 0 rhythm-game patterns are for the player PWA, not the CMS. Mentioned only because `core/catalogue/FileRules.ts` magic-byte detection mirrors what `H-10` will eventually need for user uploads.

### Institutional Learnings

`docs/solutions/` does not exist yet in this repo. Per the learnings researcher: "Treat this CMS build as the **seeding event** for `docs/solutions/`." After landing each focus area, capture durable lessons via `/ce-compound`. Highest-value capture candidates:

- CloudFront Function KVS-backed Basic-Auth rotation pattern (security_issue + convention)
- Pulumi ComponentResource conventions for the Lambda+URL+CloudFront triad (architecture_pattern)
- Postgres hybrid typed-columns + JSONB catalogue with `pg_trgm`/`unaccent`/tsvector search (design_pattern)
- Neon serverless driver from Lambda + the Aurora/RDS-Proxy swap story (architecture_pattern)

### External References

- **Catalogue schema spec (LOCKED)** — [docs/specs/2026-06-10-catalogue-schema.md](../specs/2026-06-10-catalogue-schema.md) — the §4 DDL, §9 indexes/projection, §10 ingest pipeline, §5 publish gates. Validated against a live Postgres during review.
- **Catalogue-store decision** — [docs/decisions/2026-06-09-catalogue-store-postgres-neon.md](../decisions/2026-06-09-catalogue-store-postgres-neon.md) — Neon free-tier facts (verified 2026-06-09), Aurora/RDS-Proxy equivalence, DynamoDB per-user split.
- **`@neondatabase/serverless`** — [github.com/neondatabase/serverless](https://github.com/neondatabase/serverless) — MIT; HTTP/WebSocket Postgres driver for serverless runtimes; parameterized `sql.query(text, params)` interface; sidesteps the Lambda↔Postgres connection-pool problem.
- **`pg` (node-postgres)** — [node-postgres.com](https://node-postgres.com/) — MIT; used by tests (TCP to Docker Postgres) and by the migration runner (TCP to Neon — Neon speaks standard Postgres protocol too).
- **Postgres 16 Docker image** — [hub.docker.com/_/postgres](https://hub.docker.com/_/postgres) — `postgres:16` pinned in `adapters/postgres/docker-compose.test.yml`; ships `pg_trgm` + `unaccent` in `contrib` (no extra install).
- **React-Admin DataProvider docs** — [marmelab.com/react-admin/DataProviderWriting.html](https://marmelab.com/react-admin/DataProviderWriting.html) — interface signatures verified for v5.14.
- **React-Admin FileInput** — [marmelab.com/react-admin/FileInput.html](https://marmelab.com/react-admin/FileInput.html) — used for the lesson file upload field.
- **CloudFront Functions runtime** — [docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-functions.html](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-functions.html) — `cloudfront-js-2.0` runtime, 10KB limit, no I/O.
- **OAC for Lambda Function URL** — [aws.amazon.com/about-aws/whats-new/2024/04/amazon-cloudfront-oac-lambda-function-url-origins](https://aws.amazon.com/about-aws/whats-new/2024/04/amazon-cloudfront-oac-lambda-function-url-origins/) — GA Apr 2024, requires `AuthType: AWS_IAM`.
- **CloudFront KeyValueStore** — [docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/kvs-with-functions.html](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/kvs-with-functions.html) — encrypted at-rest credential store, async-readable from CF Functions.
- **Pulumi aws.cloudfront.Function** — [pulumi.com/registry/packages/aws/api-docs/cloudfront/function/](https://www.pulumi.com/registry/packages/aws/api-docs/cloudfront/function/).
- **Pulumi aws.lambda.FunctionUrl** — [pulumi.com/registry/packages/aws/api-docs/lambda/functionurl/](https://www.pulumi.com/registry/packages/aws/api-docs/lambda/functionurl/).
- **`file-type` package** — [npmjs.com/package/file-type](https://www.npmjs.com/package/file-type) — MIT, streaming magic-byte detection.
- **`dependency-cruiser` rules** — [github.com/sverweij/dependency-cruiser](https://github.com/sverweij/dependency-cruiser) — for CI enforcement of layer boundaries.
- **alphaTab Guitar Pro format docs** — [alphatab.net/docs/formats/](https://alphatab.net/docs/formats/) — magic-byte signatures for GP3/4/5/6/7/8.
- **AWS Lambda Node.js runtime** — [docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html](https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html) — `nodejs22.x` default.

---

## Key Technical Decisions

- **Layout 4 (Hexagonal / Clean Architecture) at the top level:** `core/` (pure domain, no I/O) + `adapters/` (DynamoDB, S3, React-Admin, Pulumi component classes) + `apps/` (composition roots per deploy target) + `infra/` (Pulumi root). Rationale: 6+ adapter swaps coming over the milestone ladder; paying ~20% upfront overhead now beats refactoring later. Alternatives 1 (apps + services + infra), 2 (DDF `domains/*`), 3 (apps with sub-services), 5 (hybrid `apps/*` + DDF inside) were considered; user explicitly chose strict Layout 4 over the JS-workspace-convention retrofit. (See `cms-approach.md` for the area-K decision rationale; layout decision walked through interactively during planning.)

### Premise audit: 6+ adapter swaps coming

Product-lens flagged the swap-count premise as unaudited. This table audits each named swap, the specific port interface that gets a second implementation, and the milestone at which that second implementation lands. If the audited count drops below 3 at Beta entry, revisit Layout 4 vs Layout 3/5.

| # | Swap | Port (in `core/`) | First impl | Second impl | Milestone |
|---|------|-------------------|------------|-------------|-----------|
| 1 | Notation renderer (`A-7` in feature-freeze.md) | `core/notation/ports/NotationRenderer` | `adapters/alphatab/AlphaTabRenderer` (Alpha) | `adapters/pixijs/PixiJSFriendlyRenderer` (Friendly milestone) | Friendly |
| 2 | MIDI input | `core/scoring/ports/MidiInput` | `adapters/webmidi/WebMidiInput` (Alpha PWA) | `adapters/swift-coremidi/CoreMidiInput` via Capacitor bridge (M1) | M1 |
| 3 | Persistence — user data (`F-3`, `D-2` per freeze) | `core/userdata/ports/UserDataStore` | `adapters/localstorage/UserDataLocalStorage` (Alpha/Beta) | `adapters/dynamodb/UserDataDynamoDB` (M1 cross-device sync `H-3`/`H-5`) | M1 |
| 4 | Auth | `core/auth/ports/Identity` | `adapters/cf-basic-auth/Identity` (K admin only — Alpha) | `adapters/cognito/Identity` for end users (`H-9`, M1) | M1 |
| 5 | Analytics event sink | `core/observability/ports/EventSink` | `adapters/sns/SnsEventSink` (this plan's SNS topic — Alpha) | `adapters/sqs-pipeline/PipelineEventSink` for `H-6` analytics (Beta) | Beta |
| 6 | Audio output (latency-sensitive) | `core/playback/ports/AudioOutput` | `adapters/alphasynth/AlphaSynthOutput` (Alpha) | `adapters/native-audio/CoreAudioOutput` for tight-latency (M1+) | M1 |

**Audit verdict at plan time:** 6 swaps with named ports across the Alpha → M1 trajectory. Layout 4 amortizes. Tracks 2 + 3 + this plan together lock the first impl for swaps 3-5; player track locks swap 1; future native bridges lock swaps 2 + 6. If the player and native-bridge work materially descopes (e.g., friendly view never ships), the count drops to 4 and Layout 4 still amortizes. Below 3, reopen.
- **`@pulumi/aws` v7** (`v7.28.0` Apr 2026) — v6.83.1 is the last v6. Plan starts greenfield, no migration cost.
- **Node.js 22 Lambda runtime** (`nodejs22.x`) with ESM handlers (`index.mjs`). esbuild bundling (`--platform=node --target=node22 --format=esm --minify --external:@aws-sdk/*`). `@aws-sdk/client-*` modular imports only.
- **CloudFront KeyValueStore (KVS) for Basic-Auth credential storage** (NOT baked credential). Rotation = update KVS key (single API call, takes ~10-30s to propagate across edges) vs full function redeploy. CF Function reads via `cf.kvs(<id>).get(<key>)` (async, only allowed I/O in `cloudfront-js-2.0`). **Storage shape:** KVS holds the raw `base64(user:pass)` value, NOT a hash (CF Functions can't bcrypt/argon2 at the edge). Security-lens flagged the original "stored hashed" framing as misleading. Plaintext-in-KVS risk is mitigated by (a) IAM-scoped deploy role: only Pulumi can write KVS keys; CF Function reads via the function association, NOT via IAM; (b) Pulumi state encryption required (see "Pulumi backend" decision below). **Verification:** `aws.cloudfront.KeyvaluestoreKey` Pulumi resource path needs confirmation at U3 build time — feasibility-lens flagged a possible drift between `@pulumi/aws` v7 surface and the AWS API. Fallback: a `command.local.Command` invoking `aws cloudfront-keyvaluestore put-key` for KVS key writes.
- **OAC + `AuthType: AWS_IAM` on Lambda Function URLs.** Without OAC, the FURL is publicly reachable bypassing CloudFront entirely (defeats the Basic-Auth gate). Required for OAC: (a) `aws.lambda.Permission` with `principal: cloudfront.amazonaws.com` AND `sourceArn: <distribution_arn>` (pins invocation to the specific distribution; without `sourceArn` ANY CloudFront distribution in ANY AWS account could invoke the FURL); (b) CF cache behavior uses managed origin request policy `AllViewerExceptHostHeader` (id `b689b0a8-53d0-40ab-baf2-68738e2966ac`) so POST/PUT bodies forward correctly for SigV4 signing. Admin file uploads bypass this by going **direct to S3 via presigned POST** (not through CloudFront).
- **Two separate CloudFront distributions:** `admin.notation-hero.com` (KVS-backed Basic-Auth gate, points at admin SPA bucket + admin CRUD FURL behind OAC) and `cdn.notation-hero.com` or `api.notation-hero.com` (no gate, points at public read FURL behind OAC). Mixing them via path-pattern is fragile and forces gate logic into the public path. The admin distribution has TWO cache behaviors — default → SPA bucket; `/api/*` → admin Lambda FURL — both gated by the same EdgeBasicAuth CF Function on viewer-request. **Cache policy for `/api/*` MUST be AWS-managed `CachingDisabled` (id `4135ea2d-6df8-44a3-9df3-4b5a84be39ad`)** to prevent CloudFront caching of authenticated responses and serving them across requests (adversarial flagged this as a P0 auth bypass risk if the default cache key — which omits `Authorization` — is in play).
- **Catalogue store = Neon Postgres + JSONB (LOCKED — RC-2/RC-6).** Typed columns for every searched/filtered/sorted facet; `data jsonb` for variable/nested (§12 known keys); `pg_trgm` + `unaccent` + GENERATED `search` tsvector for fuzzy/accent-insensitive/full-text search. The §4 DDL + §9 indexes ship verbatim as migrations. Neon is reached from Lambda via `@neondatabase/serverless` (HTTP driver — no connection pool to manage); the AWS-managed equivalent (Aurora Serverless v2 / RDS + RDS Proxy) is documented, not built.
- **Raw parameterized SQL, no ORM (R9).** The repository builds SQL strings with `$n` placeholders and binds every user-supplied value as a parameter — never string interpolation (spec §9 note). No Prisma/Drizzle/Kysely: portability and interview-tellability are the point, and the schema is 4 tables. The repository depends on a tiny **`SqlExecutor`** interface (`query(text, params) → rows` + `batch(queries) → atomic`), with two implementations: `neonExecutor` (runtime, HTTP driver; `batch` via the driver's non-interactive `transaction()`) and `pgExecutor` (tests + migration runner, TCP via `pg`; `batch` via `BEGIN…COMMIT`). One repository, two transports; an env-gated smoke test against a real Neon branch guards driver drift.
- **Migrations = numbered `.sql` files + a ~40-LOC hand-rolled runner** (`adapters/postgres/migrations/*.sql`, applied in order, recorded in a `schema_migrations` table). No migration framework — the runner is `pg`-based and runs locally/CI against Docker, and against Neon (TCP) at deploy time. `0001_catalogue_init.sql` is the spec §4 DDL + §9 indexes **verbatim**; `0002_source_write_once.sql` adds the spec-sanctioned write-once trigger on `catalogue_item.source` (defense-in-depth behind the API-level guarantee — spec §5 offers "API contract, or a DB trigger"; we do both).
- **Optimistic concurrency via `updated_at` (RC-12).** The locked schema has no `version` column. Admin `PUT`s carry `If-Match: <updatedAt token>`; the repository issues `UPDATE … SET …, updated_at = now() WHERE id = $1 AND updated_at = $2::timestamptz` and maps 0-rows-affected to `StaleUpdate` (HTTP 412) after a re-`SELECT` distinguishes not-found. **Token precision contract (review finding):** the token is the raw Postgres text form — `SELECT … updated_at::text` — treated as **opaque** by every client; rowMappers carry it verbatim and never round-trip it through a JS `Date` (millisecond truncation of the microsecond `now()` value would 412 every legitimate update). U4.5 includes the round-trip test: save → use returned token as `If-Match` → update succeeds.
- **`file-type` (sindresorhus, MIT)** for magic-byte detection. Streaming from S3 via `fileTypeStream(Readable.toWeb(s3Stream))` — only first ~4KB hits Lambda memory. Upload ceiling is the spec §8 **~20 MB limit**, enforced twice: the presigned-POST policy carries `content-length-range [0, 20_000_000]` at the storage layer, and the validator bounds decompression — the compressed object (≤20 MB by policy) is read once into a bounded buffer (`yauzl.fromBuffer`; yauzl needs random access — it reads the end-of-central-directory record, so a forward-only stream walk is not implementable), then entries are streamed via `openReadStream` with a running **decompressed** total that aborts at 20 MB (zip-bomb guard: never fully decompress before checking).
- **Quarantine = prefix in same bucket** (`uploads/quarantine/` → `catalogue/<id>/source.<ext>`, matching the spec §2 served-prefix layout). Failed validations → `uploads/rejected/<original-key>` with `x-amz-meta-reason` + 7-day lifecycle TTL. IAM scopes the ingest path to write `uploads/quarantine/` only; promotion to `catalogue/` is the validator's separate, narrowly-scoped permission (spec §2).
- **File delivery = CloudFront signed URLs (RC-13 — spec §2, locked).** The public distribution adds a `catalogue/*` cache behavior with the files bucket as an S3 origin (OAC) and a **trusted key group**; objects are reachable ONLY with a CloudFront signature (S3 stays fully private, no presigned GETs in the serving path). K-3 mints URLs via `@aws-sdk/cloudfront-signer` (MIT) with ~5 min TTL (spec §12); the RSA key pair is generated at setup, the public key registered as `aws.cloudfront.PublicKey` + `KeyGroup`. **The private key lives in SSM Parameter Store (SecureString), fetched once at Lambda INIT** (`ssm:GetParameter` + `kms:Decrypt` scoped to that one parameter ARN) — NOT a Lambda env var: an env-visible signing key lets any principal with `lambda:GetFunctionConfiguration` forge unexpiring URLs, and a leaked RSA key can't be invalidated without a KeyGroup change (review finding). **Rotation procedure (U9 runbook + drill):** add the new `PublicKey` to the KeyGroup → `pulumi up` → flip the SSM value → remove the old key; emergency variant removes the old key first (≤5 min of dead URLs). Anti-hotlink/anti-bulk-download is the point — a leaked URL dies in minutes and never exposes the bucket.
- **Cache/TTL contract for signed-URL-bearing responses (review finding — two reviewers).** K-3 detail responses embed ~5-min signatures (`source_url` + slice URLs; list rows carry `cover_image_url: null` in v1 — covers ditched), so the public distribution must not cache them longer: K-3 emits `Cache-Control: public, max-age=60` on list + detail, and the default behavior uses the managed **`UseOriginCacheControlHeaders-QueryStrings`** cache policy instead of `CachingOptimized` (whose 24 h default TTL would serve broken thumbnails/source URLs minutes after any cache fill — integration tests on fresh caches would never catch it). Corollary: archive/de-license propagation through the CDN is bounded by the same `max-age` (≤60 s), which also honestly scopes the U6 claim that archiving disappears items 'within one request'. The `catalogue/*` file behavior keeps long caching (objects are immutable per key).
- **Pulumi ComponentResource pattern** with naming convention `notation-hero:<module>:<ResourceType>` (e.g., `notation-hero:cms:AdminApi`). All children passed `{ parent: this }`; `registerOutputs()` called synchronously.
- **Pulumi: single project, multi-stack** — one project (`notation-hero-infra`), stacks `dev` (only one provisioned now), `prod` (config scaffolding only). No cross-stack references.
- **Pulumi: ACM cert provider pinned to `us-east-1`** — CloudFront alternate-domain certs MUST live there regardless of the rest of the stack's region. Instantiate a second `aws.Provider` for cert resources.
- **Manual constructor-wiring DI** (no `tsyringe`/`awilix`/`inversify`). Solo project + ~10 use cases; a `buildApp()` composition function in each `apps/*/handler.ts` is clearer and tree-shakes better.
- **`dependency-cruiser` for layer enforcement** — CI rule blocks any import from `core/` into `adapters/` or `apps/`. Lighter than ArchUnitTS; single CLI; integrates with the existing path-filtered CI.
- **pnpm 11.5.2 + Nx for monorepo tooling (RC-9 — per the 2026-06-09 tooling DACI; bun fully dropped), Vitest for tests, esbuild for Lambda bundling.** Neither pnpm nor Nx is the Lambda runtime (Node.js 22 is). All run-commands in this plan are pnpm; Nx targets/tags attach when the in-flight `nx init` lands (folder shape is already DACI-compliant, so no rework).
- **Per-Lambda IaC lives in the `infra` project, not beside the handler (RC-10 — DACI serverless layout).** Nx `enforce-module-boundaries` is project-level only — a colocated `apps/<fn>/infra.ts` would be invisible to the boundary rule and risks `@pulumi/*` silently shipping inside the Lambda bundle under the `FileArchive` pattern. Each Lambda gets `infra/cms/<fn>.ts`; infra references the handler's **build output** (`pulumi.asset.FileArchive("…/apps/<fn>/dist")`), never its source.
- **Test posture per layer:**
  - `core/` — pure unit tests (no mocks needed; no I/O)
  - `adapters/postgres/` — integration tests against **local Docker `postgres:16`** (`docker-compose.test.yml`); migrations applied before the suite; NOT LocalStack (Postgres isn't an AWS service)
  - `adapters/s3/`, `adapters/sns/` — integration tests against LocalStack (pinned `localstack/localstack:4.x` via `docker-compose.test.yml`) or a dev AWS sandbox
  - `apps/*/handler.ts` — unit tests with fake adapters (in-memory implementations of ports)
- **Pulumi ComponentResource scope:** only **`LambdaWithUrl`** (3 consumers: 3 Lambdas) and **`CloudFrontStaticSite`** (2 consumers: admin distro + public distro) earn the component-class abstraction. Originally specified 5 components; scope-guardian flagged that `DynamoSingleTable`, `EdgeBasicAuth`, and `S3FileBucket` each have exactly one consumer in this plan — premature generality. Inline those as plain Pulumi resource blocks directly in `infra/index.ts`. Extract to components when a 2nd consumer materializes. Plus **`LambdaWithUrl` carries an optional `createFunctionUrl: boolean` arg** (default `true`) so the validator Lambda (event-triggered, no FURL) can reuse the IAM-role + log-group boilerplate without a wrong-named abstraction (coherence + scope-guardian convergence — was "`LambdaWithUrl (no FURL — this is event-triggered)`" in the original draft).
- **Drop `adapters/http-client/` as a separate package; collapse into `adapters/react-admin/`.** The `CatalogApiClient` is ~50-100 LOC of `fetch` boilerplate with one consumer in this plan (`catalogueDataProvider`). Standalone-package overhead (workspace, package.json, version resolution hop) is unjustified. Extract when player PWA needs the same wrapper.
- **Change-feed indexing already covered by the spec.** The old "GSI2 (`updatedAt`) NOT built" scope-down is moot — the §9 `ci_updated` btree index on `updated_at` ships in the verbatim migration, and `archived` tombstones bump `updated_at`, so the future M1 change-feed reads it with no schema change.
- **SNS `lesson-events` topic + admin Lambda event emit IN SCOPE for K v1** (per F-DR2b — product-lens convergence; topic name kept per the revision KEEP-list). Topic provisioned by `infra/index.ts`. Admin Lambda CRUD use-cases (U6) publish typed events (`catalogue_item.created`, `catalogue_item.updated`, `catalogue_item.published`, `catalogue_item.archived`) via `core/observability/ports/EventSink` → `adapters/sns/SnsEventSink`; the validator (U7) publishes `catalogue_item.file.validated`. Event schema in `core/catalogue/CatalogueEvent.ts` (RC-11). NO subscribers in K — that's H-6's job. Locks the contract so H-6 can subscribe without coordinating breaking changes. SNS free tier: 1M req + 1k emails/mo.
- **`dependency-cruiser` rules:** (a) `core/` cannot import from `adapters/` or `apps/`; (b) `adapters/` cannot import from `apps/`; (c) no cyclic imports; (d) `apps/**` cannot import from `infra/**` or `@pulumi/*` (prevents Pulumi from being bundled into Lambda runtime — adversarial-flagged layer-boundary gap; simpler now that IaC lives wholly in `infra/` per RC-10); (e) `infra/**` cannot import from `apps/*/handler.ts`/`use-cases/`/`routes/` source (composition direction guard — infra consumes `dist/` build output only). **Dropped:** the original `no-orphans` rule — scope-guardian flagged it false-positives on Hexagonal port interfaces (which are intentionally not imported by their implementing adapters; adapters import from core but ports are type-only references at construction time).
- **`.dependency-cruiser.cjs` uses CommonJS `module.exports = { ... }` syntax** (NOT ESM `export default`) — root `package.json` is `"type": "module"`, so the `.cjs` extension is the explicit-CommonJS escape (feasibility footgun).
- **Pulumi backend MUST be Pulumi Cloud or S3+KMS** (NOT local filesystem). Pre-deploy check in `infra/README.md` and CI: `pulumi backend` MUST NOT report `file://`. Local backend = plaintext state.json on disk = credential leak vector (security-lens flagged the original "Use Pulumi Cloud OR self-managed" wording as documentation-not-enforcement).
- **CORS allow-origins MUST be an explicit list on both distributions; `*` is prohibited.** If domain isn't finalized at deploy time, use a dummy explicit list (e.g., `https://admin.notation-hero-dev.com`) as a placeholder. CloudFront Response Headers Policy carries the list; `Vary: Origin` always set to prevent cache poisoning. (Security-lens + adversarial convergence.)
- **CSP on admin SPA distribution Response Headers Policy.** `default-src 'self'`; `script-src 'self'`; `style-src 'self' 'unsafe-inline'` (MUI requires inline styles in v5); `img-src 'self' data:` (no cover images in v1 — tightened at the 2026-06-10 walkthrough); `connect-src 'self' https://*.s3.<region>.amazonaws.com` (presigned POST direct-to-S3). Prevents stored-XSS if React-Admin ever renders attacker-controlled content (security-lens deferred Q).
- **ACM cert two-pass deploy on first bring-up.** Pass 1: `pulumi up --target` for ACM certs + DNS validation CNAME records only; wait for `ISSUED` status (5-30 min). Pass 2: full `pulumi up` for everything else. Use `aws.acm.CertificateValidation` resource to gate dependent resources on cert validation. **CloudWatch alarm** on `AWS/CertificateManager DaysToExpiry < 30` per cert (free; ACM auto-renewal only works if validation CNAMEs persist in DNS — operational note in U9 README). Replaces the original Success Metric claim of "5-min deploy" (adversarial-flagged unrealistic for first deploy).
- **Admin gate rate-limiting deferred as explicit non-goal in K v1; add CloudWatch alarm only.** Originally not addressed; security-lens + adversarial flagged the brute-force cost-amplification risk. Decision: single-curator scope makes WAF overkill ($1/rule/mo + complexity); instead, add a CloudWatch alarm on `4xxErrorRate > 10/sec` on the admin distribution → email to operator. If alarm fires (suggests probing), add WAF with rate-based rule reactively. Document as explicit deferred-with-trigger in Risks. (NOT just silently omitted.)
- **Audit log for admin write operations** — structured CloudWatch log entries emitted by `createItem` / `updateItem` / `archiveItem` / `publishItem` / `mintUploadUrl` use-cases. Fields: operation, lessonId, timestamp, source IP (from CloudFront forwarded header), credential-version (KVS key timestamp at request time). ~3-5 LOC per use-case; no additional AWS services. Provides forensic capability without `H-7` SLO machinery. (Security-lens P2 finding.)

---

## Open Questions

### Resolved During Planning

- **Layout choice:** strict top-level Layout 4 (Hexagonal) — user explicitly chose Path 1 over Path 2 (retrofit under `packages/`) after seeing Wave 1 was already scaffolded with the `apps/web` shape. Premise audit added (see Key Technical Decisions) per doc-review.
- **Subdomain vs path for admin gate:** subdomain (`admin.notation-hero.com`) wins over path-prefix on a single distribution. Cleaner scope for the CF Function gate; no path-pattern coupling.
- **Two CloudFront distributions or one:** two. One for admin (gated), one for public read (ungated). Same cost on free tier; cleaner gate scoping. Admin distribution carries 2 cache behaviors (default → SPA bucket; `/api/*` → admin Lambda FURL via CachingDisabled policy).
- **Credential storage for Basic-Auth:** CloudFront KVS (not baked credential). KVS holds raw `base64(user:pass)` — NOT hashed (CF Functions can't hash at edge). Plaintext-in-KVS risk mitigated via IAM-scoped state encryption (Pulumi backend = Cloud or S3+KMS, enforced).
- **Lambda runtime:** `nodejs22.x`. `nodejs20.x` deprecated April 2026.
- **`@pulumi/aws` major version:** v7. v6 is on the deprecation track.
- **Magic-byte library:** `file-type` (MIT, streaming-capable) is the **stream-peeking plumbing only** — it has no Guitar Pro signatures (a GP7/8 file detects as generic `zip`; BCFZ/gp3-5 detect as nothing). `core/catalogue/FileRules.ts` is the format authority for ALL source formats (PK/BCFZ/`FICHIER GUITAR PRO`/`<?xml`/`MThd`). (Corrected in the 2026-06-10 round-2 review — the original rationale overstated file-type's role.)
- **Quarantine = same-bucket prefix** (not separate bucket). IAM scoping per-prefix gives the same security; separate-bucket multiplies resources for no gain. Quarantine prefix carries 24h lifecycle TTL (was referenced in System-Wide Impact but missing from S3 bucket config — added per doc-review convergence finding).
- ~~**DynamoDB billing mode:** `PAY_PER_REQUEST`. Catalog stays in free tier; no provisioned-capacity guessing.~~ *(superseded by RC-3 — no DynamoDB in K v1)*
- **DI strategy:** manual constructor wiring. No DI container.
- **Track 2 plan posture:** Prereq + escape hatch in U1 (user-confirmed during doc-review). Track 2 revision is the canonical path; U1 includes a fallback bootstrap if Track 2 hasn't landed.
- ~~**Cover image scope (R1):** narrowed to source-file upload only. `coverImageUrl` is a nullable string the curator pastes manually. Cover-image upload pipeline deferred (doc-review decision).~~ *(superseded twice: RC-7 first reinstated covers via the upload pipeline, then the 2026-06-10 walkthrough **ditched covers from K v1** — column stays NULL, icon fallback)*
- **Success metrics rewrite (per F-DR2a):** original metrics measured CI green; replaced with portfolio-outcome metrics (solution docs + whiteboard rehearsal + decision captures) per product-lens convergence + user confirmation.
- **SNS `lesson-events` topic in scope (per F-DR2b):** topic + admin Lambda event emit added to K's scope; H-6 subscribes later. User-confirmed during doc-review.
- ~~**DynamoDB-Toolbox:** dropped (over-spec for 1 entity); raw `@aws-sdk/lib-dynamodb` (doc-review convergence).~~ *(superseded by RC-2 — catalogue adapter is Postgres raw SQL)*
- **ComponentResource scope-down:** only `LambdaWithUrl` + `CloudFrontStaticSite` as components; `DynamoSingleTable`/`EdgeBasicAuth`/`S3FileBucket` inlined in `infra/index.ts` (doc-review).
- **`adapters/http-client/` package dropped:** `CatalogApiClient` collapses into `adapters/react-admin/` (doc-review).
- ~~**GSI2 (`updatedAt`) NOT built in K v1:** comment-only placeholder; add when `H-3` lands (doc-review).~~ *(moot — §9 `ci_updated` index ships in the verbatim migration)*
- **Admin gate rate-limiting:** explicit non-goal in v1 + CloudWatch alarm trigger (not WAF; not silently omitted). Doc-review judgment call.
- **CORS allow-origins:** explicit list mandatory; `*` prohibited (doc-review).
- **CSP on admin SPA:** specified explicitly (doc-review).
- **ACM cert two-pass deploy** on first bring-up + cert-expiry CloudWatch alarm (doc-review).

### Resolved in the 2026-06-10 revision

- **Catalogue store:** Neon Postgres + JSONB, LOCKED (decision doc 2026-06-09; spec 2026-06-10). Not re-litigated here.
- **SQL access:** raw parameterized SQL behind a `SqlExecutor` seam (`neonExecutor` runtime / `pgExecutor` tests + migrations). No ORM (R9).
- **Migrations:** numbered `.sql` + hand-rolled `pg` runner; `0001` = spec §4+§9 verbatim; `0002` = write-once `source` trigger (spec-sanctioned defense-in-depth).
- **Optimistic concurrency:** `updated_at` as the `If-Match` token (schema has no `version` column) — RC-12.
- **Status vocab:** `draft|published|archived` only; `pending_validation` machinery removed — alphaTex is CMS-authored inline and parse-validated client-side at authoring (RC-5).
- **MIDI:** rejected at upload with reason `midi-not-renderable-convert-first`; conversion is a curator pre-step (spec §2/§10 D1).
- ~~**Cover images:** v1 reuses the quarantine/presigned-POST pipeline (JPEG/PNG/WebP, 2 MB) → `cover_image_key` (RC-7).~~ *(overridden at the 2026-06-10 walkthrough: covers DITCHED from K v1 — see RC-7)*
- **Parse-once-at-upload:** the validator Lambda parses the uploaded file with alphaTab (MPL-2.0, runs in Node) to seed `bpm`/`time_sig`/`instruments[]`/`data.bars`/`data.sections[]` (spec §10.1) — async, event-triggered, so cold-start weight is acceptable.
- **Exercise table name:** kept `exercise` (spec §13.1 default). **Id strategy:** `text` PKs — slugs for curated items/patterns, uuid for exercises (spec §13.2).
- **Toolchain:** pnpm 11.5.2 + Nx per the tooling DACI; bun references in the original plan are superseded (RC-9). Per-Lambda IaC in `infra/cms/*.ts` (RC-10).

### Resolved in the 2026-06-10 round-2 doc-review

Seven reviewers (coherence, feasibility, security, scope, product, design, adversarial) ran on the revised plan; the substantive resolutions applied in place:

- **Upload-first song creation** — the locked `ci_song_file`/`ci_song_bpm` CHECKs make create-then-upload impossible for songs; the validator now creates the draft song row from the validated+parsed upload (`POST /api/uploads` + status polling). Lessons create directly.
- **Presigned POST, not PUT** — `content-length-range` exists only in POST policies; all upload minting moved to `createPresignedPost`.
- **If-Match token precision contract** — `updated_at` is carried as the opaque Postgres `::text` (microsecond) form; JS-Date round-trips would 412 every legitimate update.
- **Cache/TTL contract** — K-3 emits `Cache-Control: public, max-age=60`; the public default behavior honors origin headers instead of `CachingOptimized` (whose 24 h TTL would outlive the embedded 5-min signed URLs).
- **CF signing key in SSM SecureString** (not Lambda env) + rotation procedure/drill; Neon emergency rotation documented.
- **Atomic publish flip** (conditional UPDATE with the ≥1-exercise EXISTS guard) + `replaceExercises` bumps the item token and refuses to empty published lessons + new `song-breakdown-source-not-published` gate.
- **Patterns authoring/linking UI deferred to H-11** (spec §11's own deferral signal); tables + read path ship.
- **Validator pipeline corrections** — bounded-buffer `yauzl.fromBuffer` (no forward-only stream walk exists), sha256 from the validation read (not the server-side copy), COALESCE-in-statement NULL-only seeding, zip entry-name normalization, Lambda `timeoutSeconds` (10 s APIs / 60 s validator vs the 3 s AWS default).
- **Lowercase normalization in the shared Zod schemas** (curator writes were bypassing §10.3, silently unfindable rows).
- **buildListQuery sort allowlist** (ORDER BY can't be parameterized — typed error on unknown sort).
- **Curator UX gaps specified** — upload-status polling, archive-confirm slice count (`countSlicingLessons`), exercise source switcher (Tex|Slice), publish-gate toast copy, level star preview, 412 reload-discard.
- **Phase C0 thin-slice deploy** + schedule tripwire metric (job-hunt clock).

### Open (deferred from the 2026-06-10 round-2 review)

- ~~`neonDatabaseUrl` env vs SSM~~ — **resolved 2026-06-10 (walkthrough): stays a Lambda env var.** KMS-encrypted at rest; single-principal account; Neon password resets in seconds. Named upgrade triggers: a second IAM principal, or screen-sharing the AWS console in demos.
- ~~Schedule tripwire numbers~~ — **locked 2026-06-10: N=3 / M=6** (walkthrough).
- ~~`feature-freeze.md` `H-3` milestone~~ — **resolved 2026-06-10: re-milestoned Alpha → M1** in feature-freeze (walkthrough decision 🅰); the 2026-06-09 decision doc carries the NoSQL interview story until M1.
- ~~Cover thumbnails: signed vs public~~ / ~~EXIF stripping~~ — **both dissolved 2026-06-10**: covers are out of K v1 entirely (owner decision; `cover_image_key` stays NULL).
- ~~Initial content seeding~~ — **resolved 2026-06-10 (walkthrough): the owner seeds license-clean content through the CMS during U9 bring-up** (count/selection at owner's discretion — not plan-prescribed). H-11's fuller preload stays Beta.

### Deferred to Implementation

- ~~**Exact bun-workspace glob syntax**~~ *(resolved — `pnpm-workspace.yaml` with `core/*`, `adapters/*`, `apps/*`, `infra` is committed and green)*
- **CloudFront Function code size after writing** — 10KB compiled limit. Measure during U3 build via `aws cloudfront describe-function --stage DEVELOPMENT` — assert <8KB to leave 2KB headroom. Fallback if size blows: drop the KVS lookup and use a baked credential (compromises rotation story but stays inside the limit).
- **`constantTimeEquals` verification** on `cloudfront-js-2.0` runtime — XOR-accumulator may be optimized into early-exit by the JIT, defeating timing-resistance. Microbench at U3 build time. Fallback options: (a) reduce credential entropy to fit constant-time, (b) HMAC pattern (KVS stores HMAC key, function compares HMACs not creds).
- ~~**Exact list-projection field set** for `GET /lessons`~~ *(resolved — the spec §9 K-3 list projection is the locked contract; see R2)*. The `/v1/` path-versioning + CI contract test survive the revision: `/v1/catalogue` is the locked wire shape; a future reshape ships as `/v2/`.
- **Signed-URL TTL** for `GET /v1/catalogue/{id}` file URL — spec §12 says ~5 min; tune after measuring real player-load latency.
- **CloudWatch alarm strategy for K** — `H-7` SLOs are Beta-tier; K emits basic logs + 2 alarms only: (1) error-rate >10/sec on admin distribution (brute-force trigger), (2) ACM cert DaysToExpiry <30 per cert.
- **Exact CORS allow-origins values** — depends on final admin/player domain names. Plan locks the constraint (explicit list, `*` prohibited, `Vary: Origin`); fills in domains at deploy time via Pulumi config.
- **Whether bucket lifecycle TTL for orphaned upload+rejected is sufficient** — quarantine 24h, rejected 7d. Tune if curator UX shows real orphaned-upload patterns.
- ~~**alphaTex async hard-validation plan**~~ *(dissolved by RC-5 — alphaTex is CMS-authored inline + client-side parse-validated; server-side re-check is an M1 hardening item, no async pipeline needed)*
- **Pulumi resource path for `aws.cloudfront.KeyvaluestoreKey`** — verify at U3 build that the Pulumi `@pulumi/aws` v7 surface exposes this resource directly. If not, use a `command.local.Command` invoking the CLI for KVS key writes (feasibility-flagged conflict between research and v7 surface).

---

## Output Structure

The U1 skeleton (root configs, empty layer dirs) is **committed**. This plan creates the following tree on top of it (revised 2026-06-10 — `core/catalogue/`, `adapters/postgres/`, IaC consolidated under `infra/`):

```text
notation-hero/
├── core/                                  # Pure domain — NO AWS, NO React, NO HTTP imports
│   ├── catalogue/                         # Bounded context: the shared catalogue (area K + later H-11)
│   │   ├── CatalogueItem.ts               # Entity: song | lesson (typed facets per spec §4 ①) + Zod schema
│   │   ├── Exercise.ts                    # Entity: a lesson's ordered steps (spec §4 ②) + Zod schema
│   │   ├── Pattern.ts                     # Entity: beat/fill/rudiment vocabulary (spec §4 ③) + Zod schema
│   │   ├── ids.ts                         # Branded CatalogueItemId / ExerciseId / PatternId
│   │   ├── NotationFormat.ts              # 'gp'|'gpx'|'gp5'|'gp4'|'gp3'|'xml' (NO 'mid' — spec §2)
│   │   ├── FileRules.ts                   # Pure magic-byte → format decision tree + size ceilings
│   │   ├── CatalogueFilter.ts             # Query language (type, level, bpm-range, …, search) per spec §9
│   │   ├── CatalogueEvent.ts              # catalogue_item.{created,updated,published,archived} + file.validated
│   │   ├── publishGates.ts                # Pure §5 gate checks (≥1 exercise, license, curated-only)
│   │   ├── errors.ts                      # InvalidFileFormat, ItemNotFound, StaleUpdate, PublishGateFailed, …
│   │   ├── ports/
│   │   │   ├── CatalogueRepository.ts     # items + exercises + pattern-links interface
│   │   │   ├── PatternRepository.ts       # pattern CRUD interface
│   │   │   ├── CatalogueFileStore.ts      # mintUploadUrl/mintDeliveryUrl/promote interface
│   │   │   └── FileValidator.ts           # validateMagicBytes(stream): Format | error
│   │   └── __tests__/
│   ├── observability/
│   │   └── ports/EventSink.ts             # publish(event): Promise<Result<void, …>>
│   ├── shared/
│   │   └── kernel/                        # Result<T,E>, Brand<T>, etc.
│   └── package.json                       # name: "@notation-hero/core"
│
├── adapters/                              # Implementations of ports + Pulumi component classes
│   ├── aws/                               # Pulumi ComponentResources (only the reusable ones)
│   │   ├── LambdaWithUrl.ts               # Lambda + IAM role + log group + optional FURL (3 consumers)
│   │   ├── CloudFrontStaticSite.ts        # S3 + OAC + CF + ACM (2 consumers)
│   │   └── package.json                   # name: "@notation-hero/adapters-aws"
│   ├── postgres/                          # Runtime adapter — raw parameterized SQL (NO ORM)
│   │   ├── SqlExecutor.ts                 # query(text,params)→rows + batch(queries)→atomic seam
│   │   ├── neonExecutor.ts                # runtime impl: @neondatabase/serverless (HTTP)
│   │   ├── pgExecutor.ts                  # test/migration impl: pg (TCP)
│   │   ├── CatalogueRepositoryPostgres.ts # implements core/catalogue/ports/CatalogueRepository
│   │   ├── PatternRepositoryPostgres.ts   # implements core/catalogue/ports/PatternRepository
│   │   ├── sql/buildListQuery.ts          # CatalogueFilter → {text, params} WHERE/ORDER builder
│   │   ├── rowMappers.ts                  # snake_case row ↔ camelCase entity mapping
│   │   ├── migrations/
│   │   │   ├── 0001_catalogue_init.sql    # spec §4 DDL + §9 indexes VERBATIM
│   │   │   └── 0002_source_write_once.sql # trigger: UPDATE may not change source (spec §5)
│   │   ├── migrate.ts                     # ~40-LOC runner (pg, schema_migrations table)
│   │   ├── docker-compose.test.yml        # postgres:16 pinned (NOT LocalStack)
│   │   ├── __tests__/                     # integration tests vs Docker Postgres
│   │   └── package.json                   # name: "@notation-hero/adapters-postgres"
│   ├── s3/                                # Runtime adapters
│   │   ├── CatalogueFileStoreS3.ts        # implements core/catalogue/ports/CatalogueFileStore
│   │   ├── MagicByteValidator.ts          # implements core/catalogue/ports/FileValidator
│   │   ├── __tests__/
│   │   ├── docker-compose.test.yml        # localstack/localstack:4.x pinned
│   │   └── package.json                   # name: "@notation-hero/adapters-s3"
│   ├── sns/                               # Runtime adapter for event emit
│   │   ├── SnsEventSink.ts                # implements core/observability/ports/EventSink
│   │   ├── __tests__/
│   │   └── package.json                   # name: "@notation-hero/adapters-sns"
│   └── react-admin/                       # UI adapter for the admin SPA
│       ├── catalogueDataProvider.ts       # React-Admin DataProvider (items/exercises/patterns)
│       ├── catalogueResource.tsx          # Resource: catalogue items (List/Edit/Create/Show + publish action)
│       ├── exercisesResource.tsx          # Resource: a lesson's steps (nested via lesson_id filter)
│       ├── patternsResource.tsx           # Resource: patterns (kind-discriminated views)
│       ├── CatalogueFileInput.tsx         # Custom FileInput → presigned-POST upload (source files)
│       ├── AlphaTexInput.tsx              # alphaTex textarea + client-side alphaTab parse-validation
│       ├── CatalogApiClient.ts            # fetch wrapper (collapsed from http-client)
│       └── package.json                   # name: "@notation-hero/adapters-react-admin"
│
├── apps/                                  # Composition roots — one per deploy target (NO infra.ts here — RC-10)
│   ├── admin-spa/                         # K-2 frontend: React-Admin SPA
│   │   ├── src/
│   │   │   ├── main.tsx                   # Wires CatalogApiClient + catalogueDataProvider
│   │   │   └── App.tsx                    # React-Admin <Admin> root (3 resources)
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json                   # name: "@notation-hero/admin-spa"
│   ├── lambda-cms-crud-admin/             # K-2 backend: admin CRUD + publish + SNS emit
│   │   ├── handler.ts                     # buildApp() wires adapters → calls core
│   │   ├── routes.ts · use-cases/ · build.ts
│   │   ├── __tests__/handler.test.ts
│   │   └── package.json
│   ├── lambda-cms-crud-public/            # K-3: read API (status='published' only)
│   │   ├── handler.ts · routes.ts · use-cases/ · build.ts
│   │   └── package.json
│   └── lambda-cms-validate-upload/        # K-1: magic-byte validator + parse-once seeder (S3 event, no FURL)
│       ├── handler.ts                     # S3 event → validate → promote + UPDATE Postgres row + emit event
│       ├── use-cases/validateAndPromote.ts · build.ts
│       └── package.json
│
├── infra/                                 # Pulumi root — ALL IaC lives here (RC-10)
│   ├── index.ts                           # Composes infra/cms/*; inline S3 bucket (+CORS+lifecycle+notifications), KVS + key, SNS topic, ACM certs (us-east-1 provider). NO database resources (Neon is external — RC-6)
│   ├── cms/
│   │   ├── public-read-api.ts             # LambdaWithUrl + OAC + public distribution (was apps/lambda-cms-crud-public/infra.ts)
│   │   ├── admin-api.ts                   # LambdaWithUrl (AWS_IAM) + permissions + SNS publish IAM
│   │   ├── upload-validator.ts            # LambdaWithUrl(createFunctionUrl:false) + S3 event registration
│   │   └── admin-site.ts                  # CloudFrontStaticSite + 2 cache behaviors + KVS Basic-Auth gate
│   ├── Pulumi.yaml
│   ├── Pulumi.dev.yaml                    # dev stack config (basicAuthCredential + neonDatabaseUrl as secure)
│   ├── Pulumi.prod.yaml                   # prod stack config (scaffolded, not deployed v1)
│   ├── README.md                          # operator runbook (deploy, rotate, rollback, KVS propagation, migrations)
│   ├── tsconfig.json
│   └── package.json                       # name: "@notation-hero/infra"
│
├── .github/
│   └── workflows/
│       ├── ci.yml                         # Linux, pnpm, path-filtered: core/adapters/apps/infra; Postgres + LocalStack services
│       └── deploy.yml                     # On master merge: migrate → pulumi up → S3 sync → CF invalidate
│
├── package.json                           # pnpm scripts (lint/typecheck/test/build/depcheck) — committed (U1)
├── pnpm-workspace.yaml                    # core/*, adapters/*, apps/*, infra — committed (U1)
├── tsconfig.base.json                     # path aliases: @core/*, @adapters/*, @apps/* — committed (U1)
├── .dependency-cruiser.cjs                # Layer rules: core↛adapters, adapters↛apps, apps↛infra/@pulumi, no-circular
├── .eslintrc.cjs                          # Per-layer ESLint rules (no-restricted-imports blocking aws-sdk/react in core/)
├── LICENSE                                # Proprietary (all rights reserved) — committed (U1)
├── .gitignore
└── docs/                                  # Existing
    └── plans/2026-06-07-001-feat-cms-k-build-plan.md   # this file
```

**Note:** `apps/player-pwa/` is NOT created by this plan — the player track owns its own workspace shape (scope-guardian + product-lens convergence). The player consumes the public CDN URL + public API URL as Pulumi stack outputs exposed by U9.

The tree above is a **scope declaration**, not a constraint — the implementer may adjust naming or structure if implementation reveals a better layout. Per-unit `**Files:**` lists below are authoritative for what each unit creates or modifies.

---

## High-Level Technical Design

> *This illustrates the intended request shape and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```mermaid
flowchart TB
    subgraph "ADMIN PLANE (gated)"
        AdminBrowser[Curator browser]
        AdminCF[CloudFront: admin.notation-hero.com]
        AdminGate[CF Function viewer-request<br/>Basic-Auth check via KVS]
        AdminBucket[(S3: admin SPA bundle<br/>private + OAC)]
        AdminFURL[Lambda FURL: cms-crud-admin<br/>AuthType=AWS_IAM via OAC]
        AdminBrowser -->|HTTPS + Authorization: Basic| AdminCF
        AdminCF --> AdminGate
        AdminGate -->|valid| AdminBucket
        AdminGate -->|valid + /api/*| AdminFURL
        AdminGate -.->|invalid| AdminBrowser
    end

    subgraph "READ PLANE (public)"
        PlayerApp[Player app / web]
        PublicCF[CloudFront: cdn.notation-hero.com]
        PublicFURL[Lambda FURL: cms-crud-public<br/>AuthType=AWS_IAM via OAC]
        PlayerApp -->|GET /v1/catalogue| PublicCF
        PublicCF --> PublicFURL
    end

    subgraph "UPLOAD PIPELINE"
        S3Upload[(S3: uploads/quarantine/&lt;uuid&gt;)]
        Validator[Lambda: cms-validate-upload<br/>magic-byte sniff + parse-once seeding]
        S3Catalogue[(S3: catalogue/&lt;id&gt;/source.&lt;ext&gt;)]
        S3Rejected[(S3: uploads/rejected/&lt;key&gt;<br/>7-day TTL)]
        AdminFURL -->|presigned POST URL| AdminBrowser
        AdminBrowser -.->|direct multipart POST bypassing CF| S3Upload
        S3Upload -->|ObjectCreated event| Validator
        Validator -->|valid| S3Catalogue
        Validator -->|invalid incl. MIDI| S3Rejected
    end

    subgraph "STATE"
        PG[(Neon Postgres — EXTERNAL SaaS, not Pulumi-provisioned<br/>catalogue_item + exercise + pattern + item_pattern<br/>pg_trgm + unaccent + tsvector search)]
        AdminFURL <-->|@neondatabase/serverless, parameterized SQL| PG
        PublicFURL -->|SELECT §9 projection / full record| PG
        Validator -->|INSERT draft song (new-song mode) / partial UPDATE| PG
        S3Catalogue -.->|signed URL minted by| PublicFURL
    end

    style AdminGate fill:#fa3
    style Validator fill:#3af
    style PG fill:#9c6
```

Three request flows mapped to the architecture:

1. **Admin authoring (CRUD):** browser → CF (admin distribution) → CF Function viewer-request gate (KVS-backed Basic-Auth) → either S3 bucket (SPA static assets via OAC) or Lambda FURL (`AuthType=AWS_IAM` via OAC; CRUD writes go to **Neon Postgres** via parameterized SQL; publish runs the §5 gates).
2. **Admin file upload:** browser POSTs to `/api/uploads` (new song) or `/api/catalogue/{id}/file` (source replacement) via CF (gated path) → admin Lambda mints a **presigned S3 POST** (size-conditioned policy) → browser uploads **directly to the S3 quarantine prefix** (bypasses CloudFront entirely) → S3 ObjectCreated event triggers the validator Lambda → magic-byte sniff + §10 parse-once seeding → promote to `catalogue/<id>/…` + **INSERT the draft song row** (new-song mode) or partial-`UPDATE` the existing row, then write the `status/<uploadId>.json` object the SPA polls — OR move to rejected + status (MIDI is rejected with `midi-not-renderable-convert-first`).
3. **Public read:** player app → CF (public distribution, no gate) → Lambda FURL (`AuthType=AWS_IAM` via OAC) → Postgres query (**§9 list projection** for `GET /v1/catalogue`; full record + exercises + pattern links for `GET /v1/catalogue/{id}`) → also mint short-lived signed S3 URL for the source file; song-breakdown slices resolve through the **shared resolver** that refuses non-`published` source songs.

The Hexagonal layer split per request: the Lambda handler is the **primary adapter** (HTTP → use case); `core/catalogue/` use-cases call the **secondary adapters** (`CatalogueRepositoryPostgres`, `CatalogueFileStoreS3`, `MagicByteValidator`); composition root in `apps/lambda-*/handler.ts` wires them. Core never imports AWS SDK, the Neon driver, or React.

---

## Implementation Units

### U1. Repo bootstrap (Layout 4 monorepo skeleton + CI + dependency-cruiser) — ✅ DONE

> **Status (2026-06-10): built and committed** — on **pnpm 11.5.2** (not bun; RC-9): root `package.json` + `pnpm-workspace.yaml`, `tsconfig.base.json` path aliases, `.dependency-cruiser.cjs`, `.eslintrc.cjs`, CI, LICENSE, `.gitkeep` layer dirs. See `docs/cicd-pipeline.md` for what U1 froze. The bun-flavored text below is **kept for the historical record**; read every `bun` as `pnpm`. Residual U1-adjacent work (Nx materialization) is tracked by the tooling DACI, not this plan.

**Goal:** Replace Track 2's Wave 1 scaffold with a Layout 4 monorepo: root `package.json` with bun workspaces (`core/*`, `adapters/*`, `apps/*`, `infra`), `tsconfig.base.json` with path aliases, `.gitignore`, `LICENSE` (proprietary all-rights-reserved), `dependency-cruiser` config enforcing layer boundaries, baseline `ci.yml` GitHub Actions workflow. Every subsequent unit depends on this shape existing.

**Requirements:** R7 (Layout 4) · R8 (license-clean).

**Dependencies:** None (Track 2's Wave 1 in `vigorous-goldwasser-73ccca/` is discarded; this unit produces the new canonical Wave 1).

**Files:**
- Create: ~~`package.json` (bun workspaces, no app deps yet)~~ <!-- SUPERSEDED: Bun fully dropped; pnpm 11.5.2 + Nx workspaces per tooling DACI 2026-06-09 (U1 already DONE on pnpm) -->
- Create: `tsconfig.base.json` (path aliases `@core/*`, `@adapters/*`, `@apps/*`; strict mode; `module: "esnext"`; `moduleResolution: "bundler"`)
- Create: `.gitignore` (node_modules, dist, .pulumi, .env*, *.log)
- Create: `LICENSE` (proprietary, all rights reserved)
- Create: `.dependency-cruiser.cjs` (CommonJS `module.exports = {...}` syntax — root package is `type: module`, the `.cjs` extension is the explicit-CommonJS escape). Rules: (a) `core` cannot import from `adapters` or `apps`; (b) `adapters` cannot import from `apps`; (c) `apps/*/handler.ts|use-cases/*|routes/*` cannot import from `apps/*/infra.ts` or `@pulumi/*` (prevents Pulumi in Lambda runtime bundle); (d) `apps/*/infra.ts` cannot import from `handler.ts`/`use-cases/`/`routes/`; (e) no cyclic imports. **No `no-orphans` rule** — Hexagonal port interfaces are intentionally not imported by their implementing adapters and would false-positive.
- Create: `.eslintrc.cjs` (TS + per-layer overrides — `no-restricted-imports` blocking `aws-sdk`/`react` in `core/`)
- Create: `.github/workflows/ci.yml` (~~bun setup pinned to 1.3.11~~ <!-- SUPERSEDED: Bun dropped; pnpm + Nx per tooling DACI 2026-06-09 -->, path-filter via `dorny/paths-filter@v3` emitting outputs for `core` / `adapters` / `apps-*` / `infra`; jobs: `lint` + `typecheck` + `test` + `depcheck` + per-app `build`; single aggregation `CI Green` job marked as required)
- Create: `core/.gitkeep`, `adapters/.gitkeep`, `apps/.gitkeep`, `infra/.gitkeep` (so workspace dirs exist before first package.json drops in)
- Test: ~~`package.json` `scripts.test` runs `bun test` across workspaces; this unit's test is `bun install` + `bun run lint` + `bun run depcheck` running green on the empty skeleton.~~ <!-- SUPERSEDED: Bun dropped; live runner is `node --test` (Node 24), commands are pnpm, per tooling DACI 2026-06-09 -->

**Approach:**
- bun workspaces glob: `"workspaces": ["core/*", "adapters/*", "apps/*", "infra"]`. Confirm bun honors nested globs (it does as of 1.3+); fall back to enumerating if quirks emerge.
- `tsconfig.base.json` path aliases (`paths`) mirrored in each child `tsconfig.json` via `extends`.
- `dependency-cruiser` rule shape:
  ```js
  { name: 'no-adapter-into-core', from: { path: '^core/' }, to: { path: '^adapters/' }, severity: 'error' },
  { name: 'no-infra-in-runtime', from: { path: '^apps/.*/(handler|use-cases|routes)\\.ts$' }, to: { path: '^apps/.*/infra\\.ts$|^@pulumi/' }, severity: 'error' },
  { name: 'no-runtime-in-infra', from: { path: '^apps/.*/infra\\.ts$' }, to: { path: '^apps/.*/(handler|use-cases|routes)\\.ts$' }, severity: 'error' }
  ```
  Plus a cycle-detection rule (`no-circular`).
- CI `paths-filter` config: filter outputs are referenced by per-job `if: needs.changes.outputs.X == 'true'`. The aggregation job is `if: always()` + checks `needs.X.result != 'failure'` for each child job (skipped == OK).
- `LICENSE` text is the standard "All rights reserved" shape; no need for a custom legal template at v1.

**Execution note:** Build the CI workflow first against the empty skeleton — get it green before adding any code. Validates the bun + path-filter wiring without code noise to debug.

**Track 2 escape hatch.** If Track 2's plan revision hasn't landed when U1 starts (verify via `git log master -- apps/web infra packages` in the main repo): the existing Wave-1 scaffold in `vigorous-goldwasser-73ccca/` (`apps/web`, `infra/` stub, `ci.yml`, `bun.lock`, `tsconfig.base.json`, root `package.json`) is throwaway. Delete those paths in a single "breaking: replace Wave 1 scaffold with Layout 4" PR with explicit migration notes in the body. This plan's U1 then becomes the canonical Wave 1. If Track 2 HAS landed Layout 4 revisions, U1 just extends the existing skeleton (`core/`, `adapters/`, additional `apps/*` workspaces, and the rule additions to `.dependency-cruiser.cjs` and `ci.yml`). Either way, the U1 deliverable is the same — Layout 4 skeleton with green CI.

**Patterns to follow:**
- Workflow shape mirrors the existing `vigorous-goldwasser-73ccca/.github/workflows/ci.yml` (bun setup, concurrency-cancel, path-filtered jobs, single required check). Adapt path filters to Layout 4 shape.
- `dependency-cruiser` config based on the canonical example from [github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md).

**Test scenarios:**
- Happy path: `bun install` completes with no errors; `bun run lint` exits 0; `bun run depcheck` exits 0; `tsc --noEmit -p tsconfig.base.json` exits 0; CI green on a PR that touches a single file in `core/`.
- Edge case (CI path-filter sanity): PR touching only `docs/**` produces a green `CI Green` aggregation check (all child jobs skipped) and does NOT block merge — confirms the "skipped-required-check deadlock" footgun from `cicd-pipeline.md` is avoided.
- Edge case: PR touching `core/` AND `adapters/dynamodb/` triggers both child jobs; `CI Green` waits for both.
- Error path: PR adding `import { S3 } from '@aws-sdk/client-s3'` to a file in `core/` → `dependency-cruiser` fails the `depcheck` job → `CI Green` fails → PR blocked.

**Verification:** Empty repo with the Layout 4 skeleton lives on a feature branch; `bun install` works; `ci.yml` green for trivial PRs; layer-boundary rule enforced on a probe PR that intentionally violates it.

---

### U2. Core domain (pure, no I/O) — REVISED 2026-06-10

**Goal:** Implement `core/catalogue/` — entities (`CatalogueItem`, `Exercise`, `Pattern`), the filter query language, pure file rules (magic-byte → format), pure publish-gate checks, the event schema, and the port interfaces every adapter and Lambda depends on. Pure TypeScript, zero AWS/Neon/React/HTTP imports. The shapes mirror the **locked spec** (`docs/specs/2026-06-10-catalogue-schema.md`) field-for-field; Zod refinements mirror the §4 DB CHECK constraints so invalid records fail at the boundary *and* in the database.

**Requirements:** R6 (locked-spec fidelity) · R7 (Hexagonal layering).

**Dependencies:** U1 (✅ done).

**Files:**
- Create: `core/catalogue/CatalogueItem.ts` · `core/catalogue/Exercise.ts` · `core/catalogue/Pattern.ts` (entity types + Zod schemas)
- Create: `core/catalogue/ids.ts` (branded `CatalogueItemId` / `ExerciseId` / `PatternId`; ids are `text` — slugs for curated items/patterns, uuid for exercises)
- Create: `core/catalogue/NotationFormat.ts` (`'gp'|'gpx'|'gp5'|'gp4'|'gp3'|'xml'` — **no `'mid'`**, spec §2; plus `CoverFormat = 'jpg'|'png'|'webp'`)
- Create: `core/catalogue/FileRules.ts` (pure magic-byte decision tree + size ceiling: `SOURCE_MAX_BYTES = 20_000_000`)
- Create: `core/catalogue/CatalogueFilter.ts` (the spec §9 facet language)
- Create: `core/catalogue/CatalogueEvent.ts` (`catalogue_item.{created,updated,published,archived}` + `catalogue_item.file.validated`)
- Create: `core/catalogue/publishGates.ts` (pure §5 checks)
- Create: `core/catalogue/errors.ts` (`InvalidFileFormat`, `MidiNotSupported`, `ItemNotFound`, `ItemAlreadyExists`, `StaleUpdate`, `PublishGateFailed`, `SourceNotAvailable`, `ValidationError` — discriminated unions)
- Create: `core/catalogue/ports/CatalogueRepository.ts` · `ports/PatternRepository.ts` · `ports/CatalogueFileStore.ts` · `ports/FileValidator.ts`
- Create: `core/shared/kernel/Result.ts` (`Result<T,E>` + `ok()`/`err()`) · `core/shared/kernel/Brand.ts`
- Create: ~~`core/package.json` (name `@notation-hero/core`; deps: `zod` (the schemas are runtime exports — Lambda handlers validate with them); devDeps: `vitest`) · `core/tsconfig.json`~~ <!-- SUPERSEDED: Vitest is the deferred L5 lane; live runner is `node --test` (Node 24) per tooling DACI 2026-06-09 -->
- Test: ~~`core/catalogue/__tests__/{CatalogueItem,Exercise,FileRules,CatalogueFilter,publishGates}.test.ts`~~ <!-- SUPERSEDED: tests are CO-LOCATED next to source (Foo.ts + Foo.test.ts), NO __tests__/ folders, per tooling DACI 2026-06-09 §F-2 -->

**Entity shapes (the contract — column-for-column with spec §4, camelCase in TS, snake_case in SQL):**

```ts
// core/catalogue/CatalogueItem.ts
export type ItemType   = 'song' | 'lesson';
export type ItemStatus = 'draft' | 'published' | 'archived';          // ci_status — NO pending_validation (RC-5)
export type ItemSource = 'curated' | 'user-upload';                   // ci_source; write-once (spec §5)
export type License    = 'royalty-free' | 'cc' | 'owned' | 'public-domain';
export interface MediaLink { provider: string; url?: string; key?: string; label?: string }

export interface CatalogueItem {
  id: CatalogueItemId;
  type: ItemType;
  title: string;
  level: number | null;              // 1–10; null = ungraded (ci_level)
  artist: string | null;
  bpm: number | null;                // required for songs (ci_song_bpm)
  timeSig: string | null;
  genre: string | null;              // stored LOWERCASE (ingest normalizes)
  musicalKey: string | null;
  instruments: string[];
  skill: string[];
  tags: string[];
  lessonType: string | null;         // lessons only (ci_lesson_type_only); open vocab 'song-breakdown'|'beat'|'rudiment'
  sortOrder: number | null;
  source: ItemSource;
  license: License | null;           // required before publishing curated items (ci_pub_license)
  coverImageKey: string | null;       // column ships (locked DDL) but stays NULL in v1 — covers ditched; icon fallback
  notationKey: string | null;        // songs only (ci_song_file); lessons carry notation on steps
  notationFormat: NotationFormat | null;  // ci_song_fmt — no 'mid', no 'alphatex'
  notationChecksum: string | null;   // sha256
  notationBytes: number | null;
  hasAudio: boolean;
  hasVideo: boolean;
  audio: MediaLink[] | null;
  video: MediaLink[] | null;
  status: ItemStatus;
  data: Record<string, unknown> | null;  // §12 known keys: bars, sections[], album, year, defaultMappingPresetId, meta
  createdAt: string;                 // ISO timestamptz
  updatedAt: string;                 // ISO — doubles as the If-Match concurrency token (RC-12)
}
```

```ts
// core/catalogue/Exercise.ts — a lesson's ordered steps (spec §4 ②)
export interface Exercise {
  id: ExerciseId;
  lessonId: CatalogueItemId;
  stepNo: number;                    // UNIQUE (lesson_id, step_no)
  title: string;                     // "Hi-hat only", "+ Kick"
  sectionLabel: string | null;       // song-breakdown display label ("Chorus 1")
  startBpm: number | null;
  goalBpm: number | null;            // the start→goal practice ladder (ex_bpm_ladder)
  // EXACTLY ONE of the three (ex_one_source):
  notationTex: string | null;        // authored alphaTex inline — the common case
  notationKey: string | null;        // rare: standalone GP/MusicXML S3 file
  sourceItemId: CatalogueItemId | null;  // song-breakdown slice (ON DELETE RESTRICT)
  startBar: number | null;           // ex_slice_bars: startBar > 0 AND endBar >= startBar
  endBar: number | null;
  data: Record<string, unknown> | null;
}
```

```ts
// core/catalogue/Pattern.ts — beats / fills / rudiments (spec §4 ③)
export interface Pattern {
  id: PatternId;                     // slug: 'rock-8th', 'single-paradiddle'
  kind: string;                      // open vocab: 'beat'|'fill'|'rudiment' (later ostinato/scale/chord)
  name: string;
  family: string | null;             // kind-relative grouping (NOT genre): Rock/Funk · Roll/Diddle/Flam/Drag
  subdivision: string | null;        // '8th'|'16th'|'triplet'|'quarter'
  level: number | null;              // 1–10 (pat_level)
  aliases: string[];
  description: string | null;
  notationTex: string | null;        // canonical pattern as alphaTex
  data: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}
```

```ts
// core/catalogue/CatalogueFilter.ts — the §9 facet language (RC-1)
export interface CatalogueFilter {
  type?: ItemType;
  status?: ItemStatus;               // the public API hard-codes 'published'
  level?: { min?: number; max?: number };  // a BOUNDED level filter EXCLUDES ungraded NULLs by design (spec §9)
  bpm?: { min?: number; max?: number };
  timeSig?: string;
  genre?: string;                    // compared lowercase
  tags?: string[];                   // ALL-of (`@>` containment)
  skill?: string[];
  instruments?: string[];
  lessonType?: string;
  patternId?: string;                // JOIN item_pattern
  search?: string;                   // fuzzy (pg_trgm) + accent-insensitive (unaccent) + full-text (tsvector)
  sort?: 'relevance' | 'level' | 'bpm' | 'newest' | 'title' | 'curated';  // 'curated' = sort_order
  pagination: { limit: number; offset: number };  // limit clamped to ≤100
}
```

```ts
// core/catalogue/ports/CatalogueRepository.ts
export interface CatalogueListRow {   // the §9 K-3 list projection, EXACTLY (cover key still raw here;
  id: CatalogueItemId; type: ItemType; title: string; artist: string | null;        // K-3 resolves cover_image_url)
  genre: string | null; level: number | null; bpm: number | null; timeSig: string | null;
  instruments: string[]; hasAudio: boolean; hasVideo: boolean;
  sortOrder: number | null; coverImageKey: string | null; status: ItemStatus; updatedAt: string;
}

export interface CatalogueRepository {
  saveItem(item: CatalogueItem): Promise<Result<void, ItemAlreadyExists | RepositoryError>>;
  updateItem(item: CatalogueItem, ifUnmodifiedSince: string): Promise<Result<CatalogueItem, ItemNotFound | StaleUpdate | RepositoryError>>;
  findById(id: CatalogueItemId): Promise<Result<CatalogueItem, ItemNotFound | RepositoryError>>;
  list(filter: CatalogueFilter): Promise<Result<{ items: CatalogueListRow[]; total: number }, RepositoryError>>;
  archive(id: CatalogueItemId): Promise<Result<void, ItemNotFound | RepositoryError>>;   // status='archived' tombstone — NEVER hard-delete (spec §12)
  // exercises (a lesson's steps)
  listExercises(lessonId: CatalogueItemId): Promise<Result<Exercise[], RepositoryError>>;
  replaceExercises(lessonId: CatalogueItemId, steps: Exercise[]): Promise<Result<void, ItemNotFound | RepositoryError>>;  // atomic batch (reorder/upsert)
  countExercises(lessonId: CatalogueItemId): Promise<Result<number, RepositoryError>>;   // publish gate §5
  countSlicingLessons(songId: CatalogueItemId): Promise<Result<number, RepositoryError>>; // archive-confirm warning ("N lessons slice this song")
  // pattern links (m:n)
  linkPattern(itemId: CatalogueItemId, patternId: PatternId): Promise<Result<void, RepositoryError>>;
  unlinkPattern(itemId: CatalogueItemId, patternId: PatternId): Promise<Result<void, RepositoryError>>;
  listPatternsForItem(itemId: CatalogueItemId): Promise<Result<Pattern[], RepositoryError>>;
}
```

**Approach:**
- Zod schema beside each type: `CatalogueItemSchema` → `type CatalogueItem = z.infer<…>`. **Refinements mirror the §4 CHECKs** so a record that would violate the DB fails first at the boundary with a named error: `ci_song_bpm` (song ⇒ bpm), `ci_song_file` (song ⇒ notationKey), `ci_song_fmt` (format ∈ the no-mid vocab), `ci_lesson_type_only` (song ⇒ lessonType null), `ci_level` (1–10 or null), `ex_one_source` (exactly one of tex|key|slice), `ex_slice_bars`, `ex_bpm_ladder` (goal ≥ start), `ci_pub_license` + `ci_shared_curated` (encoded in `publishGates.ts`, see below).
- `publishGates.ts` is pure: `canPublish(item, gateFacts): Result<void, PublishGateFailed>` with `gateFacts = { exerciseCount, unpublishedSliceSourceCount }` — checks (a) lesson ⇒ `exerciseCount ≥ 1`, (b) curated ⇒ `license != null`, (c) `source === 'curated'` (the v1 shared catalogue is curated-only), (d) lesson ⇒ `unpublishedSliceSourceCount = 0` (gate `song-breakdown-source-not-published` — a lesson must not publish while any slice step points at a non-published source song; spec §6 D2 intent at write time, review finding). U6 supplies the facts; the DB CHECKs back up (b)/(c).
- **Controlled-vocab normalization lives in the Zod schemas** (review finding): `genre` and the array facets (`tags`, `skill`, `instruments`) get `.transform(lowercase)` so BOTH the curator write path (U6 create/update) and the ingest path store lowercase — spec §10.3's rule applied at the single shared boundary. Without it, a curator typing 'Rock' creates rows the `genre='rock'` filter silently never returns.
- `Exercise.notationTex` carries a Zod `.max(65_536)` length cap (server-side guard for the CMS-authored text — review finding).
- `FileRules.ts` holds the pure magic-byte decision tree the U4 adapter wraps with streaming I/O: `PK\x03\x04`→`gp` (GP7/8 zip) · `BCFZ`→`gpx` (GP6) · Pascal-string `FICHIER GUITAR PRO v3/v4/v5`→`gp3/gp4/gp5` · `<?xml`→`xml` · `MThd`→`err(MidiNotSupported)` (curator must convert first — RC-5) · `\xFF\xD8\xFF`→`jpg` · `\x89PNG`→`png` · `RIFF…WEBP`→`webp` · else `err(InvalidFileFormat)`.
- `Result<T, E>` over throwing — explicit error paths at call sites; ~20 LOC, no `neverthrow`/`effect`.
- snake_case↔camelCase mapping is the **adapter's** job (U4 `rowMappers.ts`); core types are camelCase only.

**TDD task list:**

- [ ] **2.1** ~~Add `vitest` to the **root** devDependencies (the committed U1 skeleton doesn't have it — every later `pnpm vitest run` command depends on this) → write `core/shared/kernel/__tests__/Result.test.ts` (ok/err narrowing) → run `pnpm vitest run core/shared --root .` → FAIL → implement `Result.ts` + `Brand.ts` → PASS → commit `feat(core): Result + Brand kernel`~~ <!-- SUPERSEDED: Vitest is the deferred L5 lane (live runner `node --test`, Node 24) AND tests are co-located (no __tests__/) per tooling DACI 2026-06-09 -->
- [ ] **2.2** Write `CatalogueItem.test.ts` table-driven Zod cases — valid song / valid lesson / song-missing-bpm (`ci_song_bpm`) / song-missing-file (`ci_song_file`) / `notationFormat:'mid'` rejected / song-with-lessonType rejected (`ci_lesson_type_only`) / `level: 0|11` rejected, `level: null` OK / `data` blob passthrough / mixed-case `genre:'Rock'` + `tags:['Ghost-Notes']` persist lowercase (transform) → FAIL → implement `ids.ts`, `NotationFormat.ts`, `CatalogueItem.ts` → PASS → commit
- [ ] **2.3** Write `Exercise.test.ts` — exactly-one-source matrix (tex only ✓ · key only ✓ · slice+bars ✓ · none ✗ · two ✗), `ex_slice_bars` (startBar 0 ✗, endBar < startBar ✗), `ex_bpm_ladder` (goal < start ✗, equal ✓, nulls ✓) → FAIL → implement → PASS → commit
- [ ] **2.4** Write `Pattern.test.ts` (level bounds; open `kind` vocab accepts `'scale'`) → implement → PASS → commit
- [ ] **2.5** Write `FileRules.test.ts` — fixture-byte table for all 6 source formats + `MThd`→`MidiNotSupported` + garbage→`InvalidFileFormat` + truncated-100-byte inputs → FAIL → implement decision tree → PASS → commit
- [ ] **2.6** Write `CatalogueFilter.test.ts` (limit clamp >100→100; negative limit → parse error) + `publishGates.test.ts` (lesson-no-exercises ✗ · curated-no-license ✗ · user-upload ✗ · curated+license+1-exercise ✓) → FAIL → implement → PASS → commit
- [ ] **2.7** Define the four ports + `CatalogueEvent.ts` + `errors.ts` (types only — compile check) → `pnpm typecheck` green → `pnpm depcheck` green (zero `core→adapters|apps` imports) → commit `feat(core): catalogue ports + events`

**Test scenarios:** (encoded in the TDD list above; the load-bearing ones)
- Zod refinements reject exactly what the §4 CHECKs reject — one named test per CHECK constraint.
- `FileRules` classifies every supported format from first-bytes fixtures; MIDI is a *distinct* error from garbage (the admin UI tells the curator to convert, not "invalid file").
- `publishGates` is exhaustive over the §5 matrix.
- No integration scenarios — pure domain, no I/O crossings.

**Verification:** ~~`pnpm vitest run core --root .`~~ <!-- SUPERSEDED: live runner is `node --test` (Node 24); Vitest deferred L5 per tooling DACI 2026-06-09 --> green with ≥95% line coverage on `core/catalogue/`; `pnpm depcheck` confirms zero imports from `adapters/` or `apps/` into `core/`; `pnpm typecheck` clean. Field-for-field spot-check of `CatalogueItem` against spec §4 ① at PR time.

---

### U3. Pulumi infra primitives (adapters/aws/ as ComponentResources)

> **Revision note (2026-06-10):** U3 is **unchanged by the Postgres swap** — both components are data-store-agnostic. Two deltas only: (a) the components' consumers are now the `infra/cms/*.ts` modules (RC-10), not `apps/*/infra.ts`; (b) commands are pnpm (RC-9).

**Goal:** Build the two reusable Pulumi ComponentResource classes that have ≥2 consumers in this plan: `LambdaWithUrl` (3 consumers — 3 Lambdas in U5/U6/U7) and `CloudFrontStaticSite` (2 consumers — admin distribution in U8 + public distribution in U5). The originally-planned `DynamoSingleTable`, `EdgeBasicAuth`, and `S3FileBucket` each have exactly one consumer and are inlined in `infra/index.ts` (U9) instead — scope-guardian-flagged premature generality. (`DynamoSingleTable` has since left K entirely — RC-3.)

**Requirements:** R4 (Pulumi IaC) · R5 (free-tier fit — components default to free-tier-safe configs).

**Dependencies:** U1.

**Files:**
- Create: `adapters/aws/LambdaWithUrl.ts` (ComponentResource: `aws.lambda.Function` with esbuild-bundled handler + `aws.iam.Role` (basic exec — `AWSLambdaBasicExecutionRole` for CloudWatch Logs) + `aws.iam.RolePolicy` (caller-injected statements) + `aws.cloudwatch.LogGroup` (configurable retention; default 7d dev / 30d prod) + **OPTIONAL** `aws.lambda.FunctionUrl` controlled by `createFunctionUrl?: boolean` arg (default `true`; set `false` for event-triggered Lambdas like U7's validator). When `createFunctionUrl=true`, supports `authType: "NONE" | "AWS_IAM"`).
- Create: `adapters/aws/CloudFrontStaticSite.ts` (ComponentResource: `aws.s3.Bucket` (private) + `aws.s3.BucketPolicy` (OAC-only access) + `aws.s3.BucketPublicAccessBlock` + `aws.cloudfront.OriginAccessControl` + `aws.cloudfront.ResponseHeadersPolicy` (caller-supplied CORS + CSP config) + `aws.cloudfront.Distribution` with default cache behavior. **Supports** `additionalOrigins?: { pathPattern: string; originUrl: pulumi.Input<string>; cachePolicy?: string; viewerRequestFunctionArn?: string }[]` so the admin distribution in U8 can add the `/api/*` behavior pointing at the admin Lambda FURL. **ACM cert** passed as args from the caller (caller instantiates via `us-east-1` Pulumi provider — components themselves don't touch the cert).
- Create: `adapters/aws/types.ts` (shared TS types: `LambdaWithUrlArgs`, `CloudFrontStaticSiteArgs`)
- Create: `adapters/aws/package.json` (name `@notation-hero/adapters-aws`, deps: `@pulumi/pulumi@^3`, `@pulumi/aws@^7`)
- Create: `adapters/aws/tsconfig.json`
- Create: `adapters/aws/README.md` (component catalog; args + outputs + intended use)
- Test: ~~`adapters/aws/__tests__/components.smoke.test.ts`~~ <!-- SUPERSEDED: co-located test (no __tests__/) per tooling DACI 2026-06-09 §F-2 --> — `pulumi preview` smoke test using `@pulumi/pulumi/automation` API against both components in a throwaway in-memory stack.

**Approach:**
- Naming convention: `notation-hero:aws:LambdaWithUrl`, `notation-hero:aws:CloudFrontStaticSite` (per Pulumi guidance — pick once, never rename).
- Every child resource takes `{ parent: this }`.
- `registerOutputs({...})` called synchronously at end of constructor with the public outputs (`fnUrl?`, `fnArn`, `distributionDomain`, `distributionArn`, etc.).
- **`LambdaWithUrl` args:** `{ handlerDir: string; runtime?: "nodejs22.x" | "nodejs24.x"; env?: Record<string,pulumi.Input<string>>; createFunctionUrl?: boolean; authType?: "NONE" | "AWS_IAM"; reservedConcurrency?: number; logRetentionDays?: number; timeoutSeconds?: number; rolePolicyStatements?: aws.iam.PolicyStatement[] }`. Defaults: `nodejs22.x`, `createFunctionUrl: true`, `authType: "AWS_IAM"`, no reserved concurrency cap, `timeoutSeconds: 10` (AWS's 3 s default would 504 the first post-idle Neon cold-resume query and kill the validator mid-pipeline — round-2 review; the validator module overrides to 60 s).
- **`CloudFrontStaticSite` args:** `{ bucketName: string; certArn: pulumi.Input<string>; aliases: string[]; defaultCachePolicyId?: string; responseHeadersPolicy?: aws.cloudfront.ResponseHeadersPolicyArgs; viewerRequestFunctionArn?: string; additionalOrigins?: { id: string; pathPattern: string; originDomain: pulumi.Input<string>; cachePolicyId?: string; originRequestPolicyId?: string; viewerRequestFunctionArn?: string }[] }`. Used by U8 (admin distribution with `additionalOrigins[0]` = `/api/*` → admin Lambda FURL + `viewerRequestFunctionArn` = the KVS-backed Basic-Auth function ARN) and U5 (public distribution with no additional origins, no viewer-request function).
- **Lambda code packaging — explicit orchestration:** root script `pnpm run build:lambdas` invokes `pnpm --filter './apps/lambda-*' build` BEFORE any `pulumi up`. Each `apps/lambda-*/build.ts` runs esbuild (`esbuild handler.ts --bundle --platform=node --target=node22 --format=esm --minify --external:@aws-sdk/* --outfile=dist/index.mjs`). The `LambdaWithUrl` component uses `pulumi.asset.FileAsset(path.join(handlerDir, 'dist/index.mjs'))` — eagerly resolved at synthesis time, errors loudly if `dist/index.mjs` is missing. CI `deploy.yml` runs `pnpm run build:lambdas` before `pulumi up`. (Addresses feasibility-flagged implicit ordering.)
- **`@aws-sdk/client-*` modular imports only;** runtime-provided SDK in `nodejs22.x` (no need to bundle). Pin SDK versions explicitly when using SDK features tied to a specific version.
- **CFF Basic-Auth + KVS** is NOT a component here — inlined in `infra/index.ts` (U9) since it's single-consumer. The function code (template literal in `infra/index.ts`) reads:
  ```js
  import cf from 'cloudfront';
  async function handler(event) {
    const kvs = cf.kvs('<kvs-id>');
    const expected = await kvs.get('admin-cred');  // base64(user:pass)
    const got = event.request.headers.authorization?.value;
    if (!got || !constantTimeEquals(got, 'Basic ' + expected)) {
      return { statusCode: 401, statusDescription: 'Unauthorized',
               headers: { 'www-authenticate': { value: 'Basic realm="admin"' },
                          'cache-control': { value: 'no-store' },
                          'pragma': { value: 'no-cache' },
                          'vary': { value: 'Authorization' } } };
    }
    return event.request;
  }
  ```
  `constantTimeEquals` is ~10 lines of XOR-accumulator. **U9 includes a microbench step** to verify the JIT doesn't optimize the XOR loop into early-exit (adversarial-flagged risk). **Compiled function size measured at U9** via `aws cloudfront describe-function --stage DEVELOPMENT` — assert <8KB to leave headroom (originally deferred to U6 build; moved earlier per feasibility).

**Patterns to follow:**
- Component template: [pulumi.com/docs/iac/guides/building-extending/components/build-a-component/](https://www.pulumi.com/docs/iac/guides/building-extending/components/build-a-component/).
- Lambda + esbuild bundling: `pulumi.asset.FileAsset("./dist/index.mjs")` after a `pnpm run build` step.
- KVS reference: [pulumi.com/registry/packages/aws/api-docs/cloudfront/keyvaluestore/](https://www.pulumi.com/registry/packages/aws/api-docs/cloudfront/keyvaluestore/).

**Test scenarios:**
- Happy path: instantiate each component in a Pulumi unit-test fixture (`@pulumi/pulumi/testing`); assert the expected child resources exist (e.g., `LambdaWithUrl` creates 4 children: Function, Role, RolePolicy, FunctionUrl).
- Happy path: `LambdaWithUrl` with `authType: "AWS_IAM"` emits a Function URL with that auth type; with `"NONE"` emits with NONE.
- Integration scenario: `pulumi preview` on a throwaway stack using the component runs to completion (no resource graph errors) — confirms shape is deployable. *(The original `DynamoSingleTable`/`EdgeBasicAuth` component scenarios are gone — those were inlined per doc-review, and DynamoDB left K's scope entirely per RC-3.)*
- Test expectation: no `pulumi up` in tests (no AWS account hits); only `preview` + Pulumi's mock testing API.

**Verification:** ~~`pnpm vitest run adapters/aws --root .`~~ <!-- SUPERSEDED: live runner is `node --test` (Node 24); Vitest deferred L5 per tooling DACI 2026-06-09 --> runs green. `dependency-cruiser` confirms `adapters/aws/` only imports from `@pulumi/*` and TS types from `core/` (no runtime core imports). Component naming convention applied uniformly.

---

### U4. Runtime adapters (Postgres + S3 + SNS) — REVISED 2026-06-10

**Goal:** Implement the secondary adapters that wire the core ports to real services: **`adapters/postgres/`** (NEW — `CatalogueRepositoryPostgres` + `PatternRepositoryPostgres` over raw parameterized SQL, plus the **migrations** that ARE the locked DDL), `adapters/s3/` (`CatalogueFileStoreS3` + `MagicByteValidator`), `adapters/sns/` (`SnsEventSink` for `CatalogueEvent`). The DynamoDB catalogue adapter from the original plan is **not built** (RC-3).

**Requirements:** R1 (lesson store) · R3 (admin CRUD backend) · R6 (DDL verbatim) · R7 (Hexagonal layer) · R9 (raw parameterized SQL; Docker Postgres tests).

**Dependencies:** U2 (port interfaces).

**Files:**
- Create: `adapters/postgres/migrations/0001_catalogue_init.sql` — the spec **§4 DDL + §9 indexes, copied verbatim** (extensions `pg_trgm` + `unaccent`; `immutable_unaccent` + `immutable_array_to_string` wrappers; `catalogue_item` / `exercise` / `pattern` / `item_pattern` with ALL CHECK constraints; GIN/btree/trgm indexes; the GENERATED `search` tsvector column + `ci_fts`). Source of truth is the spec — any edit here is a spec change and is out of this plan's authority.
- Create: `adapters/postgres/migrations/0002_source_write_once.sql` — spec-§5-sanctioned trigger:
  ```sql
  CREATE FUNCTION catalogue_item_source_write_once() RETURNS trigger
    LANGUAGE plpgsql AS $$
  BEGIN
    IF NEW.source IS DISTINCT FROM OLD.source THEN
      RAISE EXCEPTION 'catalogue_item.source is write-once (set by K-1 ingest)';
    END IF;
    RETURN NEW;
  END $$;
  CREATE TRIGGER trg_ci_source_write_once
    BEFORE UPDATE ON catalogue_item
    FOR EACH ROW EXECUTE FUNCTION catalogue_item_source_write_once();
  ```
- Create: `adapters/postgres/migrate.ts` — the ~40-LOC runner:
  ```ts
  import { Client } from 'pg';
  import { readdir, readFile } from 'node:fs/promises';
  import { join } from 'node:path';

  export async function migrate(databaseUrl: string, dir = join(import.meta.dirname, 'migrations')) {
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      await client.query(
        'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())'
      );
      const applied = new Set(
        (await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name)
      );
      for (const file of (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()) {
        if (applied.has(file)) continue;
        const sql = await readFile(join(dir, file), 'utf8');
        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
          await client.query('COMMIT');
          console.log(`applied ${file}`);
        } catch (e) {
          await client.query('ROLLBACK');
          throw e;
        }
      }
    } finally {
      await client.end();
    }
  }
  ```
  CLI entry: `adapters/postgres/cli-migrate.ts` (~5 lines: read `process.env.DATABASE_URL`, call `migrate()`), wired as `"migrate": "tsx cli-migrate.ts"` with `tsx` as a devDependency — so `pnpm --filter @notation-hero/adapters-postgres migrate` actually runs (review finding: the script/executor were unstated). Docker URL for tests; the Neon **TCP** `postgres://` URL at deploy time — Neon speaks standard protocol; the HTTP driver is a Lambda-runtime concern only. Tests pass the migrations dir explicitly (don't rely on `import.meta.dirname` under the vitest runner).
- Create: `adapters/postgres/SqlExecutor.ts`:
  ```ts
  export interface SqlQuery { text: string; params?: unknown[] }
  export interface SqlExecutor {
    query<Row = Record<string, unknown>>(text: string, params?: unknown[]): Promise<Row[]>;
    batch(queries: SqlQuery[]): Promise<void>;   // atomic — all or nothing
  }
  ```
- Create: `adapters/postgres/neonExecutor.ts` (runtime — `@neondatabase/serverless`: `query` via `neon(url).query(text, params)`; `batch` via the driver's non-interactive `transaction(queries)`; both HTTP, no pool to manage)
- Create: `adapters/postgres/pgExecutor.ts` (tests + migrations — `pg.Pool`: `query` via `pool.query(...).rows`; `batch` via `BEGIN`…`COMMIT` on one client)
- Create: `adapters/postgres/CatalogueRepositoryPostgres.ts` (implements `CatalogueRepository`; constructor `{ sql: SqlExecutor }`)
- Create: `adapters/postgres/PatternRepositoryPostgres.ts` (implements `PatternRepository`)
- Create: `adapters/postgres/sql/buildListQuery.ts` (pure `CatalogueFilter → { text, params }` builder — unit-testable without a database)
- Create: `adapters/postgres/rowMappers.ts` (snake_case row ↔ camelCase entity; `updated_at`/`created_at` selected as `::text` and carried as **opaque strings** — never JS-Date round-tripped; see the RC-12 token-precision contract)
- Create: `adapters/postgres/docker-compose.test.yml`:
  ```yaml
  services:
    postgres:
      image: postgres:16
      environment:
        POSTGRES_USER: notation
        POSTGRES_PASSWORD: notation
        POSTGRES_DB: catalogue_test
      ports: ["55432:5432"]
      healthcheck:
        test: ["CMD-SHELL", "pg_isready -U notation -d catalogue_test"]
        interval: 2s
        timeout: 2s
        retries: 15
  ```
- Create: ~~`adapters/postgres/__tests__/{migrations,CatalogueRepositoryPostgres,PatternRepositoryPostgres,buildListQuery}.test.ts`~~ <!-- SUPERSEDED: tests are co-located next to source (no __tests__/) per tooling DACI 2026-06-09 §F-2 -->
- Create: `adapters/postgres/cli-migrate.ts` (CLI wrapper for `migrate()`)
- Create: `adapters/postgres/package.json` (name `@notation-hero/adapters-postgres`; deps: `@neondatabase/serverless`; devDeps: `pg`, `@types/pg`, ~~`vitest`~~ <!-- SUPERSEDED: Vitest deferred L5; live runner `node --test` per tooling DACI 2026-06-09 -->, `tsx`; scripts: `migrate`; peer: `@notation-hero/core`) · `adapters/postgres/tsconfig.json`
- Create: `adapters/s3/CatalogueFileStoreS3.ts` (implements `CatalogueFileStore`: `mintUploadUrl` = S3 presigned POST; `mintDeliveryUrl` = **CloudFront signed URL** via `@aws-sdk/cloudfront-signer` (RC-13 — env: CDN domain, key-pair id, private key); `promote(quarantineKey, finalKey)` server-side copy+delete)
- Create: `adapters/s3/MagicByteValidator.ts` (wraps `core/catalogue/FileRules` with `file-type` streaming)
- Create: `adapters/s3/package.json` (deps: `@aws-sdk/client-s3`, `@aws-sdk/s3-presigned-post`, `@aws-sdk/cloudfront-signer`, `file-type@^21`) · `adapters/s3/docker-compose.test.yml` (LocalStack `SERVICES=s3`) · ~~`adapters/s3/__tests__/`~~ <!-- SUPERSEDED: co-located tests (no __tests__/) per tooling DACI 2026-06-09 §F-2 --> (CloudFront signing is pure crypto — unit-test signature shape/expiry against a fixture key; LocalStack can't emulate CF)
- Create: `adapters/sns/SnsEventSink.ts` (implements `EventSink` for `CatalogueEvent`; `@aws-sdk/client-sns` `PublishCommand` with typed `MessageAttributes`) · `adapters/sns/package.json` · ~~`adapters/sns/__tests__/`~~ <!-- SUPERSEDED: co-located tests (no __tests__/) per tooling DACI 2026-06-09 §F-2 --> (LocalStack SNS)

**Approach (Postgres adapter):**
- **The migrations ARE the contract.** `0001` is copied from spec §4+§9 byte-for-byte (minus the markdown fences). The migration test suite **probes the CHECKs**: each constraint gets one INSERT/UPDATE that must fail with that constraint name — this proves the applied DDL matches the spec, not an approximation of it.
- `list(filter)` goes through `buildListQuery(filter)`, which appends `WHERE` clauses per facet with `$n` placeholders:
  - equality facets → `type = $n`, `status = $n`, `time_sig = $n`, `genre = $n` (genre param lowercased), `lesson_type = $n`
  - ranges → `bpm >= $n` / `bpm <= $n`; `level >= $n` / `level <= $n` (a bounded level filter naturally excludes `NULL` — spec §9 semantics)
  - arrays → `instruments @> $n` / `skill @> $n` / `tags @> $n` (Postgres array containment, GIN-indexed)
  - pattern → `EXISTS (SELECT 1 FROM item_pattern ip WHERE ip.item_id = ci.id AND ip.pattern_id = $n)`
  - search → `(search @@ websearch_to_tsquery('simple', immutable_unaccent($n)) OR immutable_unaccent(lower(title)) % immutable_unaccent(lower($n)) OR immutable_unaccent(lower(coalesce(artist,''))) % immutable_unaccent(lower($n)))` — full-text first, trigram fallback for partials; accent + case-insensitive end-to-end
  - sort → an explicit **allowlist map** `SORT_MAP: Record<SortOption, string>` of static SQL fragments — `relevance` (ts_rank + similarity when `search` present, else `updated_at DESC`) · `level NULLS LAST` · `bpm` · `newest` (`created_at DESC`) · `title` · `curated` (`sort_order NULLS LAST, title`); an unrecognized sort value **throws a typed error, never interpolates** (ORDER BY can't be parameterized, so the allowlist is the injection guard — review finding)
  - projection — **exactly the §9 list columns**; `data`, `notation_key`, `notation_checksum` never selected in list mode; `total` comes from a **separate `SELECT count(*)` with the same WHERE** (a `count(*) OVER()` window rides on returned rows and yields nothing when `OFFSET` is past the end — review finding; two statements per list call is fine at this scale)
- `updateItem(item, ifUnmodifiedSince)` — single statement, RC-12: `UPDATE catalogue_item SET …, updated_at = now() WHERE id = $1 AND updated_at = $2 RETURNING *`; 0 rows → re-`SELECT` to distinguish `ItemNotFound` from `StaleUpdate`. **The SET list never includes `source`** (write-once; trigger backs it up) and never includes `created_at`.
- `archive(id)` → `UPDATE catalogue_item SET status='archived', updated_at=now() WHERE id=$1` — the tombstone path; no `DELETE` statement exists in the adapter (spec §12).
- `countSlicingLessons(songId)` → `SELECT count(DISTINCT lesson_id) FROM exercise WHERE source_item_id = $1` — feeds the U8 archive-confirm warning.
- `replaceExercises(lessonId, steps)` → one atomic `batch`: `DELETE FROM exercise WHERE lesson_id=$1` + one `INSERT` per step. Satisfies `UNIQUE (lesson_id, step_no)` reordering without intermediate-state violations.
- `saveItem` maps unique-violation (SQLSTATE `23505`) → `ItemAlreadyExists`; CHECK violation (`23514`) → `ValidationError` with the constraint name (belt-and-braces behind the U2 Zod boundary).
- Tests run against **Docker `postgres:16`** (`pnpm --filter @notation-hero/adapters-postgres test:integration` boots compose, runs `migrate()`, executes the suite, tears down). An **env-gated smoke test** (`NEON_SMOKE=1 DATABASE_URL=postgres://…neon…`) re-runs a 5-query subset through `neonExecutor` against a throwaway Neon branch to catch driver drift; CI skips it by default.

**Approach (S3/SNS deltas from the original):**
- `mintUploadUrl(ext, itemId?)` mints a **presigned POST** via `createPresignedPost` (a plain presigned PUT cannot express a size condition — review finding): policy `content-length-range [0, 20_000_000]` + octet-stream/xml content types. Policy fields carry `x-amz-meta-upload-id` (always) + `x-amz-meta-item-id` (source-replacement uploads). All target `uploads/quarantine/<uuid>.<ext>`. The browser submits multipart/form-data POST (U8); bucket CORS already allows POST. (No cover kind — covers are out of v1.)
- `promote(quarantineKey, finalKey)` does the server-side `CopyObject` → `catalogue/<id>/source.<ext>` + `DeleteObject` on quarantine — extracted into the port so U7's use-case stays pure.
- `SnsEventSink` publishes `CatalogueEvent` (RC-11); `MessageAttributes.eventType` carries the dotted name for H-6 subscription filters.

**TDD task list:**

- [ ] **4.1** Copy spec §4 DDL + §9 indexes → `migrations/0001_catalogue_init.sql`; write `migrations.test.ts` asserting `migrate()` applies cleanly on a fresh Docker Postgres and is idempotent on re-run → ~~`docker compose -f adapters/postgres/docker-compose.test.yml up -d --wait && pnpm vitest run adapters/postgres/__tests__/migrations.test.ts --root .`~~ <!-- SUPERSEDED: runner is `node --test` (Node 24), not Vitest; test is co-located (no __tests__/) per tooling DACI 2026-06-09 --> → FAIL (no runner) → implement `migrate.ts` + `pgExecutor.ts` → PASS → commit `feat(adapters-postgres): migrations runner + verbatim catalogue DDL`
- [ ] **4.2** Extend `migrations.test.ts` with **one failing INSERT/UPDATE per CHECK** (`ci_type`, `ci_status`, `ci_level`, `ci_song_bpm`, `ci_song_file`, `ci_song_fmt`, `ci_lesson_type_only`, `ci_shared_curated`, `ci_source`, `ci_pub_license`, `ex_one_source`, `ex_slice_bars`, `ex_bpm_ladder`, `pat_level`) asserting the named constraint in the error → PASS (DDL already enforces) → commit `test(adapters-postgres): CHECK-constraint fidelity probes`
- [ ] **4.3** Write `0002_source_write_once.sql` + test (UPDATE flipping `user-upload`→`curated` raises) → run → PASS → commit
- [ ] **4.4** Write `buildListQuery.test.ts` — pure unit table: each facet alone, combined facets, search-only, every sort, pagination clamp, **unrecognized sort value (`'; DROP TABLE catalogue_item; --'`) throws instead of interpolating**; assert generated `text` + `params` (no DB needed) → FAIL → implement `sql/buildListQuery.ts` (incl. `SORT_MAP` allowlist) → PASS → commit
- [ ] **4.5** Write `CatalogueRepositoryPostgres.test.ts` round-trips against Docker: save→findById equality (incl. `data jsonb`; `updatedAt` is the opaque `::text` token); **the If-Match round-trip: save → use the returned `updatedAt` verbatim as the token → `updateItem` succeeds, NOT 412** (this is the microsecond-precision contract test); duplicate save → `ItemAlreadyExists`; `updateItem` stale (`StaleUpdate`) + not-found; `archive` tombstone (status flips, `updated_at` bumps, row still SELECTable); `countSlicingLessons` counts distinct lessons → FAIL → implement repository + `rowMappers.ts` → PASS → commit
- [ ] **4.6** Extend with search/filter integration cases: seed "São Paulo Samba" + "Motörhead — Ace of Spades" + a beat lesson; assert `search:'sao'` and `'motorhead'` match (accent/case-insensitive); `tags @>`, bpm-range, `level` bound excludes ungraded NULL, `patternId` join, §9 projection excludes `data`/`notation_key` → PASS → commit
- [ ] **4.7** Write exercise + pattern-link tests: `replaceExercises` atomic reorder (step_no swap in one call); `countExercises`; slice-source `ON DELETE RESTRICT` (hard DELETE of sliced song fails at DB; `archive` succeeds); `linkPattern`/`unlinkPattern`/`listPatternsForItem` → implement remaining methods + `PatternRepositoryPostgres` → PASS → commit
- [ ] **4.8** Implement `neonExecutor.ts` + the env-gated Neon smoke test (skips without `NEON_SMOKE=1`) → `pnpm typecheck` green → commit
- [ ] **4.9** Update `adapters/s3/`: rename store to `CatalogueFileStoreS3`, add the presigned-POST mint, `mintDeliveryUrl` (CloudFront signing — unit-tested with a fixture RSA key: URL carries `Expires`/`Signature`/`Key-Pair-Id`, expiry honors TTL) + `promote()`; LocalStack tests for PUT-within-limits, content-type allowlist rejection, promote copy+delete → PASS → commit
- [ ] **4.10** Update `adapters/sns/SnsEventSink` to `CatalogueEvent` + LocalStack test → PASS → commit `feat(adapters): S3 catalogue file store + SNS catalogue events`

**Test scenarios:** (beyond the TDD list)
- Error path: Postgres down (compose stopped) → repository returns `err(RepositoryError)`, never throws raw driver errors across the port.
- Edge: `list` on empty DB → `ok({ items: [], total: 0 })`; offset past end → empty page with correct `total`.
- Edge: `replaceExercises` with an exercise violating `ex_one_source` → whole batch rolls back (count unchanged).
- Integration: presigned POST of a 25 MB file → S3 rejects via `content-length-range` (proves the §8 ceiling holds at the storage layer, before the validator even runs).

**Verification:** ~~`pnpm vitest run adapters/postgres --root .`~~ <!-- SUPERSEDED: live runner is `node --test` (Node 24); Vitest deferred L5 per tooling DACI 2026-06-09 --> green against Docker `postgres:16` (compose helper script boots/waits/tears down); ~~`pnpm vitest run adapters/s3 adapters/sns --root .`~~ <!-- SUPERSEDED: live runner is `node --test` (Node 24); Vitest deferred L5 per tooling DACI 2026-06-09 --> green against LocalStack. CI runs both as services (documented in `ci.yml`). `pnpm depcheck` green.

---

### U5. Public read API (K-3) — `apps/lambda-cms-crud-public` — REVISED 2026-06-10

**Goal:** Build the public catalog API Lambda — `GET /v1/catalogue` (the **spec §9 list projection exactly**) + `GET /v1/catalogue/{id}` (full record + exercises + pattern links + short-lived signed S3 URL; song-breakdown slices resolved through the **single shared resolver** with the spec §6 D2 published-source check). Behind CloudFront via OAC (`AuthType: AWS_IAM`). Composes core use-cases with the Postgres + S3 adapters.

**Requirements:** R2 (K-3 catalog API) · R7 (composition root) · R9 (parameterized SQL only).

**Dependencies:** U2 (core ports), U3 (`LambdaWithUrl` + `CloudFrontStaticSite` components), U4 (Postgres + S3 adapters).

**Files:**
- Create: `apps/lambda-cms-crud-public/handler.ts` (ESM Lambda handler; `buildApp()` constructs `CatalogueRepositoryPostgres(neonExecutor(DATABASE_URL))` + `CatalogueFileStoreS3` at INIT)
- Create: `apps/lambda-cms-crud-public/routes.ts` (`GET /v1/catalogue` → listCatalogue; `GET /v1/catalogue/:id` → getCatalogueItem; ~20-LOC matcher, no framework)
- Create: `apps/lambda-cms-crud-public/use-cases/listCatalogue.ts` (query-string → `CatalogueFilter` (status hard-coded `'published'`) → `repo.list`; `cover_image_url` serializes as `null` in v1 — the §9 projection key stays so the wire contract is future-proof)
- Create: `apps/lambda-cms-crud-public/use-cases/getCatalogueItem.ts` (findById — 404 unless `status='published'` — + `listExercises` + `listPatternsForItem` + CloudFront-signed source URL via `mintDeliveryUrl`, RC-13)
- Create: `apps/lambda-cms-crud-public/use-cases/resolveStepNotation.ts` (**the shared slice resolver** — spec §6 D2; exported for reuse by any future consumer so the status check can't be bypassed):
  ```ts
  export type ResolvedNotation =
    | { kind: 'tex'; tex: string }
    | { kind: 'file'; url: string }
    | { kind: 'slice'; url: string; startBar: number; endBar: number; sourceTitle: string };

  export async function resolveStepNotation(
    step: Exercise,
    deps: { repo: CatalogueRepository; files: CatalogueFileStore },
  ): Promise<Result<ResolvedNotation, SourceNotAvailable | RepositoryError>> {
    if (step.notationTex) return ok({ kind: 'tex', tex: step.notationTex });
    if (step.notationKey) return ok({ kind: 'file', url: await mustSign(deps.files, step.notationKey) });
    // slice: the source song must itself be published — archived/draft songs may NOT
    // keep serving through a song-breakdown back door (spec §6 D2)
    const source = await deps.repo.findById(step.sourceItemId!);
    if (!source.ok || source.value.status !== 'published' || !source.value.notationKey) {
      return err({ kind: 'SourceNotAvailable', stepId: step.id });
    }
    return ok({
      kind: 'slice',
      url: await mustSign(deps.files, source.value.notationKey),
      startBar: step.startBar!, endBar: step.endBar!, sourceTitle: source.value.title,
    });
  }
  ```
- Create: `apps/lambda-cms-crud-public/build.ts` (esbuild: `handler.ts --bundle --platform=node --target=node22 --format=esm --minify --external:@aws-sdk/* --outfile=dist/index.mjs`)
- Create: `apps/lambda-cms-crud-public/package.json` (deps: `@notation-hero/core`, `@notation-hero/adapters-postgres`, `@notation-hero/adapters-s3`; devDeps: `esbuild`, `@types/aws-lambda`, ~~`vitest`~~ <!-- SUPERSEDED: Vitest deferred L5; live runner `node --test` per tooling DACI 2026-06-09 -->)
- Create: ~~`apps/lambda-cms-crud-public/__tests__/handler.test.ts`~~ <!-- SUPERSEDED: co-located test (no __tests__/) per tooling DACI 2026-06-09 §F-2 --> (unit — in-memory `CatalogueRepository`/`CatalogueFileStore` fakes)
- Create: ~~`apps/lambda-cms-crud-public/__tests__/contract/catalogue-v1.schema.json` + `contract.test.ts`~~ <!-- SUPERSEDED: co-located test (no __tests__/) per tooling DACI 2026-06-09 §F-2 --> (JSON-Schema contract test on both wire shapes — guards deployed player clients)
- Create: ~~`apps/lambda-cms-crud-public/__tests__/integration.test.ts`~~ <!-- SUPERSEDED: co-located test (no __tests__/) per tooling DACI 2026-06-09 §F-2 --> (against deployed dev stack — gated `INTEGRATION_TESTS=1`)
- Create: `infra/cms/public-read-api.ts` (Pulumi module — RC-10, lives in the `infra` project: `LambdaWithUrl` (`AuthType: AWS_IAM`, env `DATABASE_URL` + `BUCKET_NAME` + `SIGNED_URL_TTL_SECONDS` + `CDN_DOMAIN` + `CF_KEY_PAIR_ID` + `CF_PRIVATE_KEY_PARAM` (SSM SecureString *name* — the key itself is fetched at INIT, never an env value; round-2 review) + `ssm:GetParameter`/`kms:Decrypt` scoped to that parameter + `aws.lambda.Permission` for `cloudfront.amazonaws.com` with `sourceArn` + OAC + public distribution with **two behaviors**: default → Lambda FURL origin; `catalogue/*` → files-bucket S3 origin (OAC) gated by the **trusted key group** (RC-13) + Response Headers Policy; references `../../apps/lambda-cms-crud-public/dist` as `FileArchive`)
- Create: `apps/lambda-cms-crud-public/tsconfig.json`

**Approach:**
- Build before K-2 (admin CRUD) — read-only; validates the catalog API shape + the Lambda→Neon path independently before write paths depend on it.
- **`buildApp()` runs at Lambda INIT** (outside the handler). Env: `DATABASE_URL` (Neon — injected as a secret, RC-6), `BUCKET_NAME`, `SIGNED_URL_TTL_SECONDS` (default 300 per spec §12). The Neon HTTP driver is stateless — no pool, no cleanup; warm invocations reuse the executor closure.
- **Path prefix `/v1/`** retained — `/v1/catalogue` is the locked wire contract; a future reshape ships as `/v2/` without breaking deployed players.
- **List response = the §9 projection verbatim:** `{ items: [{ id, type, title, artist, genre, level, bpm, time_sig, instruments, has_audio, has_video, sort_order, cover_image_url, status, updated_at }], total }` — snake_case on the wire (matches the spec contract text), camelCase internally; `data`, `notation_key`, `notation_checksum` are **never** serialized. `cover_image_url` is `null` in v1 (covers ditched; the projection key stays per §9 — icon fallback is the client's job).
- **Detail response:** the full published `CatalogueItem` (sans `notationChecksum`) + `{ source_url, signed_url_expires_at }` + `exercises: [{ …step, notation: ResolvedNotation }]` (each step through `resolveStepNotation` — steps whose source is unavailable serialize as `{ notation: { kind: 'unavailable' } }` rather than failing the whole item) + `patterns: [{ id, kind, name, family, level }]`.
- **Published-only is structural:** `listCatalogue` constructs the filter with `status: 'published'` (not overridable by query param); `getCatalogueItem` 404s on non-published. Drafts/archived are admin-plane data.
- **Level-filter semantics (spec §9):** no level params → unbounded (ungraded included); `level_max`/`level_min` present → bounded SQL range, which excludes `NULL` by design. No silent default bound, ever.
- Query params: `type, level_min, level_max, bpm_min, bpm_max, time_sig, genre, tags (csv), skill (csv), instruments (csv), lesson_type, pattern, q (search), sort, limit, offset`. `limit` clamps to 100 (log warning); malformed numerics → 400.
- CORS unchanged from the original (explicit-origin Response Headers Policy, `AllViewerExceptHostHeader` for SigV4, OAC `sourceArn` pinning). **Cache contract (round-2 review):** both endpoints emit `Cache-Control: public, max-age=60`; the default behavior uses the managed `UseOriginCacheControlHeaders-QueryStrings` cache policy (NOT `CachingOptimized` — its 24 h default would cache responses whose embedded 5-min signed URLs die long before the cache entry does); the `catalogue/*` file behavior keeps long caching.

**TDD task list:**

- [ ] **5.1** Write `handler.test.ts::list` cases with the in-memory fake — default published-only; every query param maps to its `CatalogueFilter` facet; limit clamp; malformed `bpm_min=abc` → 400; §9 projection keys (snapshot the serialized item: exactly 15 keys, snake_case) → FAIL → implement `routes.ts` + `listCatalogue.ts` + serializers → PASS → commit `feat(k-3): GET /v1/catalogue list + filter mapping`
- [ ] **5.2** Write `handler.test.ts::detail` cases — published item returns full record + signed URL + exercises + patterns; draft/archived/missing id → 404; invalid id shape → 400 → FAIL → implement `getCatalogueItem.ts` → PASS → commit
- [ ] **5.3** Write `resolveStepNotation.test.ts` — tex step; file step; slice over published source (url + bars); slice over **archived** source → `SourceNotAvailable`; slice over source missing `notationKey` → `SourceNotAvailable`; detail serialization degrades that one step to `{ kind: 'unavailable' }` → FAIL → implement resolver → PASS → commit `feat(k-3): shared slice resolver with published-source gate`
- [ ] **5.4** Write `contract.test.ts` validating both wire shapes against `catalogue-v1.schema.json` → FAIL → author the JSON Schema (list + detail) → PASS → commit `test(k-3): /v1 wire-contract fixtures`
- [ ] **5.5** Author `infra/cms/public-read-api.ts` + `build.ts`; `pnpm --filter @notation-hero/lambda-cms-crud-public build` produces `dist/index.mjs`; `pulumi preview` on the module shows Lambda + Role + Policy + FunctionUrl + Permission + OAC + Distribution → commit `feat(infra): public read API module (Neon env injection)`

**Test scenarios:** (beyond the TDD list)
- Edge: empty catalogue → `{ items: [], total: 0 }`.
- Edge: `q=sao` returns "São Paulo Samba" through the real adapter (covered in U4's integration suite; here via fake contract).
- Error path: repository `RepositoryError` → 503 + `Retry-After` (Neon scale-to-zero cold resume manifests as latency, not errors — see Risks).
- Integration: direct FURL hit → 403 (OAC seal); via CloudFront → 200. CORS preflight allowed-origin vs evil-origin. Signed URL fetches the file; expires after TTL.

**Verification:** ~~`pnpm vitest run apps/lambda-cms-crud-public --root .`~~ <!-- SUPERSEDED: live runner is `node --test` (Node 24); Vitest deferred L5 per tooling DACI 2026-06-09 --> green; contract test green; `pulumi preview` clean on the infra module; integration suite green against the dev stack once U9 deploys.

---

### U6. Admin CRUD API (K-2 backend) — `apps/lambda-cms-crud-admin` — REVISED 2026-06-10

**Goal:** Build the admin CRUD Lambda for catalogue items + exercises, plus presigned-POST minting (source files) and an explicit **publish** action enforcing the spec §5 gates. Behind the gated admin CloudFront distribution with KVS-backed Basic-Auth + OAC. Implements R3.

**Requirements:** R3 (admin SPA + CRUD) · R7 (composition root) · R9 (parameterized SQL only).

**Dependencies:** U2 (core ports), U3 (components), U4 (Postgres + S3 + SNS adapters), U5 (proves the Lambda+OAC+CloudFront+Neon pattern).

**Routes (all under the gated `/api/*` behavior):**

| Route | Use-case | Notes |
|---|---|---|
| `POST /api/catalogue` | `createItem` | **lessons only** — songs are created by the upload pipeline (see the upload-first bullet below); Zod-validated; `source` set server-side to `'curated'`; a `type:'song'` body → 422 `song-created-by-upload` |
| `PUT /api/catalogue/{id}` | `updateItem` | requires `If-Match: <updatedAt token>` (RC-12) → 412 on stale; `source`/`status`/`created_at`/`notation_*`/`cover_image_key` are not updatable (stripped + warned — validator-/workflow-owned) |
| `DELETE /api/catalogue/{id}` | `archiveItem` | tombstone (`status='archived'`) — the CMS **never hard-deletes** (spec §12) |
| `POST /api/catalogue/{id}/publish` | `publishItem` | §5 gates (+ the slice-source gate) then an **atomic conditional flip** — see Approach |
| `PUT /api/catalogue/{id}/exercises` | `replaceExercises` | atomic batch (ordered steps; reorder = same call); bumps the item's `updated_at` inside the batch; `[]` allowed on draft lessons, 422 `published-lesson-needs-exercise` on published ones |
| `POST /api/uploads` | `mintUploadUrl` | body `{ ext }` → presigned POST for a **new song's** source file (no item id — the validator creates the draft row; resolves the create-vs-`ci_song_file` deadlock, see below) |
| `GET /api/uploads/{uploadId}` | `getUploadStatus` | reads the validator-written status object: `pending` / `{ ok, itemId }` / `{ rejected, reason }` — the SPA polls this (U8) |
| `POST /api/catalogue/{id}/file` | `mintUploadUrl` | body `{ ext }` → presigned POST, item-scoped: source **replacement** for an existing song |
| `GET /api/catalogue` · `GET /api/catalogue/{id}` | `adminList` / `adminGet` | same query language as K-3 but **without** the published-only clamp (drafts/archived visible); admin detail adds `slicingLessonCount` for the archive-confirm warning |

> **Patterns CRUD + pattern-link routes: DEFERRED to H-11 (round-2 review, spec §11).** The spec defers the pattern-authoring/linking UI to when Beta content is seeded ("the CMS pattern-linking UI can arrive with that content"); building it in K v1 authors UI for content that cannot exist yet. The `pattern`/`item_pattern` tables still ship in the verbatim migration (R6) and `PatternRepositoryPostgres` still backs the K-3 read path (`listPatternsForItem` returns `[]` harmlessly).

**Files:**
- Create: `apps/lambda-cms-crud-admin/handler.ts` (`buildApp()` wires `CatalogueRepositoryPostgres` + `CatalogueFileStoreS3` + `SnsEventSink` at INIT — no PatternRepository here while patterns authoring is deferred)
- Create: `apps/lambda-cms-crud-admin/routes.ts` (matcher for the table above)
- Create: `apps/lambda-cms-crud-admin/use-cases/{createItem,updateItem,archiveItem,publishItem,replaceExercises,mintUploadUrl,getUploadStatus}.ts`
- Create: `apps/lambda-cms-crud-admin/build.ts` · `package.json` · `tsconfig.json`
- Create: ~~`apps/lambda-cms-crud-admin/__tests__/handler.test.ts` (unit, in-memory fakes) · `__tests__/integration.test.ts`~~ <!-- SUPERSEDED: co-located tests (no __tests__/) per tooling DACI 2026-06-09 §F-2 --> (deployed dev stack, Basic-Auth cred from env)
- Create: `infra/cms/admin-api.ts` (Pulumi module — RC-10: `LambdaWithUrl` (`AuthType: AWS_IAM`, env `DATABASE_URL` + `BUCKET_NAME` + `EVENTS_TOPIC_ARN`) + Lambda Permission with `sourceArn` + OAC; the admin distribution itself lives in `infra/cms/admin-site.ts` (U8) and consumes this module's exported FURL)

**Approach:**
- **Upload-first song creation (round-2 review — resolves a hard deadlock):** the locked `ci_song_file`/`ci_song_bpm` CHECKs forbid a song row without `notation_key` + `bpm`, but those values only exist after the validator runs — so create-then-upload cannot work for songs, and upload-before-create was previously treated as an error. Resolution: **songs are created BY the ingest pipeline.** `POST /api/uploads` mints a non-item-scoped presigned POST; the validator (U7) validates + parses and **INSERTs the draft song row** (uuid id; title seeded from filename; `bpm`/`time_sig`/`instruments`/`data.bars`/`data.sections` from the parse — a GP file always carries tempo, and an unparseable file is rejected anyway, so the `ci_song_bpm` CHECK is satisfiable at INSERT). The curator then edits the draft. This also makes spec §10.1's seeding real for songs instead of dead code. Lessons (no file at the item level) are created directly via `createItem`.
- `createItem` (lessons): Zod boundary (U2 schemas) → `repo.saveItem` → publish `catalogue_item.created` via `SnsEventSink` **before** returning 201 (publish failure → 500; row stays — audit log captures it for retry, matching the original event-emit semantics).
- `updateItem`: `If-Match` header required (400 if absent) → `repo.updateItem(item, ifMatch)` → 412 on `StaleUpdate`. The request body **cannot** set `source` (stripped + warned), `status` (use publish/archive routes), `created_at`, or `notation_*` fields (validator-owned — see U7 race note). Emits `catalogue_item.updated`.
- `publishItem`: loads item → gathers gate facts (`countExercises`, `unpublishedSliceSourceCount`) → `publishGates.canPublish` → on `ok`, the flip is a **single conditional statement** so the ≥1-exercise gate can't be raced by an interleaved `replaceExercises` (round-2 review): `UPDATE catalogue_item SET status='published', updated_at=now() WHERE id=$1 AND updated_at=$2::timestamptz AND (type<>'lesson' OR EXISTS (SELECT 1 FROM exercise WHERE lesson_id=$1))`. Gate failures → 422 with the named gate (`{ gate: 'lesson-needs-exercise' | 'license-required' | 'curated-only' | 'song-breakdown-source-not-published' }`) so the SPA shows actionable errors. The DB CHECKs (`ci_shared_curated`, `ci_pub_license`) are the backstop — a 23514 here is a bug, logged loudly. Emits `catalogue_item.published`.
- `archiveItem`: `repo.archive` → emits `catalogue_item.archived`. Archived song-breakdown sources stop serving slices via U5's resolver — surfaced in the SPA confirm dialog copy ("N lessons slice this song" via a count query).
- `replaceExercises`: validates each step (U2 Zod incl. `ex_one_source`); slices may only reference items with `type='song'` (app-level check; the FK can't express it); atomic via the U4 batch, which also **bumps the lesson row's `updated_at`** so exercise edits participate in the If-Match chain; an empty step list is allowed on draft lessons but **rejected (422) on published ones** — otherwise deleting the last step leaves a published, unplayable lesson the §5 D4 gate exists to prevent (round-2 review).
- `mintUploadUrl` (both routes): validates `ext` (gp/gpx/gp5/gp4/gp3/xml — **mid is rejected here with the convert-first message**, before any upload happens) → presigned POST with `x-amz-meta-upload-id` (+ item id when item-scoped). `getUploadStatus` reads the validator's status object (`status/<uploadId>.json` in the bucket — written on success AND failure) so the SPA's polling has something to land on (round-2 review: the 'validating…' state previously had no resolution path).
- Handler does NOT check Basic-Auth — the CloudFront edge gate does; OAC means only CloudFront can invoke (unchanged).
- **Audit log** (unchanged shape, wider scope): every write use-case emits `{ operation, itemId, timestamp, sourceIp, credentialVersion }` to CloudWatch.
- Per-function reserved concurrency 10 (cost cap, unchanged).

**TDD task list:**

- [ ] **6.1** Write `handler.test.ts::createItem` — valid song 201 + event emitted; Zod failure 400 with field list; client-supplied `source:'user-upload'` ignored (row is `curated`); duplicate id → 409 → FAIL → implement `createItem` + routes → PASS → commit `feat(k-2): create catalogue item + event emit`
- [ ] **6.2** Write `updateItem` cases — happy 200 (updatedAt advances); missing `If-Match` 400; stale 412; `source`/`status`/`notation_key` in body stripped; not-found 404 → FAIL → implement → PASS → commit
- [ ] **6.3** Write `publishItem` matrix — lesson w/ 0 exercises → 422 `lesson-needs-exercise`; curated w/o license → 422 `license-required`; **lesson with a draft-source slice step → 422 `song-breakdown-source-not-published`**; happy lesson (1 exercise + license) → 200 + `catalogue_item.published`; song happy path; stale `If-Match` → 412; **the conditional-flip guard: a concurrent exercise wipe between gate-check and flip leaves status unchanged** (fake repo simulates 0-rows-affected) → FAIL → implement → PASS → commit `feat(k-2): publish action with §5 gates (atomic flip)`
- [ ] **6.4** Write `archiveItem` + `replaceExercises` cases — archive emits event; replace validates one-source rule per step; slice referencing a `type='lesson'` item → 422; atomic reorder; `[]` on a draft lesson → 200, on a published lesson → 422; the item's `updated_at` bumps with the batch → FAIL → implement → PASS → commit
- [ ] **6.5** Write `mintUploadUrl` cases — non-item-scoped `{ext:'gp'}` → POST policy + quarantine key + upload-id metadata; item-scoped `{ext:'gp'}` (replacement); `ext:'mid'` → 400 `midi-not-renderable-convert-first`; unknown ext → 400; `createItem` with `type:'song'` → 422 `song-created-by-upload` → FAIL → implement → PASS → commit
- [ ] **6.6** Write `getUploadStatus` cases — pending (no status object) / success `{ok, itemId}` / rejected `{reason}`; unknown uploadId → 404 → implement → PASS → commit
- [ ] **6.7** Author `infra/cms/admin-api.ts` + `build.ts`; `pulumi preview` clean → commit `feat(infra): admin CRUD API module`

**Test scenarios:** (beyond the TDD list)
- Integration: direct FURL hit → 403; through CloudFront without/with-wrong/with-right `Authorization: Basic` → 401/401/200; KVS rotation honored (unchanged from original).
- Integration: full author loop — create lesson → add 2 exercises → publish → public API serves it; archive → the public API stops serving it within the CDN cache window (≤60 s — see the cache/TTL contract).
- Error path: Postgres CHECK violation surfacing as 500-with-constraint-name in logs (proves the belt-and-braces layering).

**Verification:** ~~`pnpm vitest run apps/lambda-cms-crud-admin --root .`~~ <!-- SUPERSEDED: live runner is `node --test` (Node 24); Vitest deferred L5 per tooling DACI 2026-06-09 --> green; integration green against dev stack; KVS rotation tested end-to-end; reserved concurrency visible in `pulumi preview`.

---

### U7. Upload validator + parse-once seeder (K-1) — `apps/lambda-cms-validate-upload` — REVISED 2026-06-10

**Goal:** Build the S3-event-triggered Lambda that validates uploaded files via magic bytes, enforces the §8 streaming size ceiling, **parses the file once at upload** to seed catalogue facets (spec §10.1), promotes valid files to `catalogue/<id>/source.<ext>`, **INSERTs or UPDATEs the Postgres row** with file metadata + seeded facets, and routes invalid files to `rejected/` with structured reasons. MIDI is rejected, not converted (RC-5).

**Requirements:** R1 (lesson store — validation + ingest half) · R6 (spec §10 pipeline) · R9.

**Dependencies:** U2 (core ports + `FileRules`), U3 (`LambdaWithUrl`), U4 (`MagicByteValidator` + `CatalogueFileStoreS3` + `CatalogueRepositoryPostgres`).

**Files:**
- Create: `apps/lambda-cms-validate-upload/handler.ts` (S3 event entry; per-record orchestration; idempotency via checksum — see Approach)
- Create: `apps/lambda-cms-validate-upload/use-cases/validateAndPromote.ts` (the pipeline below)
- Create: `apps/lambda-cms-validate-upload/use-cases/seedFromFile.ts` (alphaTab parse → `{ bpm, timeSig, instruments, bars, sections }`)
- Create: `apps/lambda-cms-validate-upload/use-cases/inspectZip.ts` (streaming central-directory walk: decompressed-size ceiling + embedded-audio detection)
- Create: `apps/lambda-cms-validate-upload/build.ts` · `package.json` (adds `@coderline/alphatab` (MPL-2.0) + `yauzl`) · `tsconfig.json`
- Create: ~~`apps/lambda-cms-validate-upload/__tests__/handler.test.ts` (unit, fixture files per format) · `__tests__/integration.test.ts`~~ <!-- SUPERSEDED: co-located tests (no __tests__/) per tooling DACI 2026-06-09 §F-2 --> (deployed dev stack)
- Create: `infra/cms/upload-validator.ts` (Pulumi module — RC-10: `LambdaWithUrl({ createFunctionUrl: false })`, env `DATABASE_URL` + `BUCKET_NAME` + `EVENTS_TOPIC_ARN`; S3 notification registered via U9's shared-bucket aggregator with **strict `filterPrefix: "uploads/quarantine/"`**; Lambda Permission for `s3.amazonaws.com` with bucket `sourceArn`)

**The pipeline (`validateAndPromote`), per S3 record:**
1. **Defensive event shape:** `!event.Records?.length` → return 200 (AWS retry artifact). `Body: undefined` → reject `empty-body`.
2. **Metadata:** read `x-amz-meta-upload-id` (always present) + optional `x-amz-meta-item-id`/`x-amz-meta-kind`. No upload-id → `rejected/no-metadata/<key>`. Validate ids' shape before using them in any key path (path-traversal guard). **Two modes:** item-scoped (item-id present: source replacement) vs **new-song** (no item-id — the upload-first flow from U6).
3. **Row pre-check (item-scoped only):** `SELECT` the catalogue row; missing → `rejected/orphaned/<key>` reason `item-record-missing`. New-song mode skips this — the row doesn't exist yet by design.
4. **Magic bytes:** `MagicByteValidator.validateMagicBytes(s3Stream)` (first ~4KB) → `core/FileRules` mapping. `MThd` → reject with reason **`midi-not-renderable-convert-first`** (distinct from `invalid-file-format` so the admin UI can say "convert in Guitar Pro first").
5. **Size ceiling (spec §8):** object size > 20 MB → reject `too-large` (belt — the presigned-POST policy already blocks this at upload). For zip containers (gp): read the (≤20 MB by policy) compressed object into a **bounded buffer** and open with `yauzl.fromBuffer` (yauzl requires random access — it starts from the end-of-central-directory record; a forward-only stream walk is not implementable — round-2 review); then stream each entry via `openReadStream`, keeping a **running decompressed-size total that aborts the moment it exceeds 20 MB** (zip-bomb guard — never fully decompress before checking). **Normalize each entry name** (`path.posix.normalize`; reject names starting `..`/`/` from matching) before any pattern check (round-2 review); `Content/Assets/*.mp3` → `hasAudio=true`.
6. **Parse-once seeding (spec §10.1–10.3, source files only):** `seedFromFile` loads the validated bytes through alphaTab (Node) → `bpm`, `time_sig`, `instruments[]` (GM program + **MIDI channel 9 = drums**), `data.bars`, `data.sections[]` (from GP `<Section>` markers — these later auto-seed song-breakdown steps). Controlled vocab normalizes to **lowercase** (shared Zod transforms, U2). Title/artist are NOT taken from file headers (often junk); the filename seeds the title. A magic-byte-valid file that alphaTab can't parse → reject `parse-failed` (it would be unplayable in the player, which uses the same parser).
7. **Promote + record:** server-side copy `uploads/quarantine/<uuid>.<ext>` → `catalogue/<id>/source.<detectedExt>` (detected format wins over declared ext; mismatch logged); delete quarantine object; then write the row:
   - **New-song mode:** `INSERT` the draft `catalogue_item` (uuid id, `type='song'`, `status='draft'`, `source='curated'`, filename-seeded title, parsed `bpm`/`time_sig`/`instruments`/`data`, `notation_*`, `has_audio`, `data.sourceUploadId=<uploadId>`). Emits `catalogue_item.created`.
   - **Item-scoped mode (source replacement):** **partial UPDATE** touching ONLY validator-owned columns — `notation_key, notation_format, notation_checksum (sha256), notation_bytes, has_audio` — plus `updated_at = now()`. **Seeded facets fill NULL-only INSIDE the statement** (`SET bpm = COALESCE(bpm, $n)`, jsonb concat for `data` keys) — never decided from the step-3 SELECT snapshot, so a curator edit landing during the multi-second validate/parse window survives (round-2 review). **No `If-Match`**: the column scoping keeps validator and curator edits non-clobbering. Accepted limitation (recorded in Risks): a curator who deliberately blanks a parsed facet gets it re-seeded on the next re-upload of that file.
   7b. **Status object:** write `status/<uploadId>.json` (`{ ok, itemId }` or `{ rejected, reason }`) on BOTH success and failure — the U6 `getUploadStatus` route + U8 polling depend on it; item-scoped rejections also set `data.lastUploadError = { reason, key, at }` so the item's Edit view can show what happened.
8. **Idempotency:** dedup key = sha256 of the full object, computed during the step-4/5/6 `GetObject` read (the promote is a server-side `CopyObject` — no bytes stream through the Lambda there; round-2 review fixed the contradiction). If the target row's `notation_checksum` already equals it, return early — replays cause no churn. (ETag still unreliable under multipart.)
9. **Event:** emit `catalogue_item.file.validated` (+ `catalogue_item.created` in new-song mode). Rejections are CloudWatch-logged with reason + key and land in the status object (step 7b).
10. **Failure path:** copy to `uploads/rejected/<original-key>` with `x-amz-meta-reason`; delete quarantine; 7-day lifecycle TTL (24h on quarantine) — unchanged from the original plan.

**IAM scope (security-lens, updated for Postgres):** `s3:GetObject`+`DeleteObject` on `uploads/quarantine/*` only; `s3:PutObject` on `catalogue/*` + `uploads/rejected/*` + `status/*` only; `sns:Publish` on the topic ARN. **No DynamoDB statements remain.** Postgres access = the `DATABASE_URL` secret env (Neon has no IAM; least-privilege = a Neon role with `SELECT/INSERT/UPDATE` on the four tables only — created in U9's runbook).

**TDD task list:**

- [ ] **7.1** Write `handler.test.ts` happy path per source format (gp/gpx/gp5/gp4/gp3/xml fixtures), both modes — **new-song: draft row INSERTed with parsed facets + status object `{ok, itemId}`**; item-scoped: partial UPDATE args (checksum/bytes/format) — event(s) emitted, quarantine deleted → FAIL → implement `handler.ts` + `validateAndPromote.ts` skeleton (fakes for repo/files/validator) → PASS → commit `feat(k-1): validator promote pipeline (upload-first songs)`
- [ ] **7.2** Write rejection matrix — MIDI fixture → `midi-not-renderable-convert-first`; garbage → `invalid-file-format`; no metadata → `no-metadata`; missing row → `item-record-missing`; 0-byte → `empty-body`; declared `.gp` w/ xml bytes → promoted as `.xml` + warn → FAIL → implement branches → PASS → commit
- [ ] **7.3** Write `inspectZip.test.ts` — synthetic zip fixtures: under-ceiling passes; crafted high-ratio zip aborts at the 20 MB **decompressed** running total (assert abort happens mid-entry-stream, before full decompression); entry named `../Content/Assets/evil.mp3` neither sets `hasAudio` nor throws unhandled; `.gp` with embedded mp3 → `hasAudio: true` → FAIL → implement with `yauzl.fromBuffer` + entry streams → PASS → commit `feat(k-1): bounded zip inspection + embedded-audio detection`
- [ ] **7.4** Write `seedFromFile.test.ts` against a real fixture (e.g. a `.gp` with sections) — bpm/timeSig/instruments/bars/sections extracted; lowercase normalization; unparseable-but-valid-magic file → `parse-failed`; plus a repository-level COALESCE test: **a curator value written between the validator's SELECT and its UPDATE survives** (the NULL-only fill is in-statement) → FAIL → implement with alphaTab → PASS → commit `feat(k-1): parse-once facet seeding`
- [ ] **7.5** Write source-replacement cases — item-scoped upload over an existing song updates `notation_*` only (facets untouched unless NULL); replacement of a published song keeps it published → implement → PASS → commit
- [ ] **7.6** Idempotency: same fixture twice → second run early-returns (no S3 copy, no UPDATE) → implement checksum short-circuit → PASS → commit
- [ ] **7.7** Author `infra/cms/upload-validator.ts` (strict prefix filter; no-FURL `LambdaWithUrl`); `pulumi preview` clean → commit `feat(infra): upload validator module`

**Test scenarios:** (beyond the TDD list)
- Edge: copy-self-trigger — promotion writes to `catalogue/` which the strict `uploads/quarantine/` filter ignores; integration test verifies no re-trigger (unchanged, critical).
- Error path: Postgres unavailable during UPDATE → object stays in quarantine; Lambda event-source retry handles; persistent failure logs for the 24h TTL to sweep.
- Integration: admin SPA upload of a real synced `.gp` (~4.6 MB) → 1–3 s later the public detail API returns `has_audio: true` + seeded bars/sections; signed URL fetches the original file.

**Verification:** ~~`pnpm vitest run apps/lambda-cms-validate-upload --root .`~~ <!-- SUPERSEDED: live runner is `node --test` (Node 24); Vitest deferred L5 per tooling DACI 2026-06-09 --> green; end-to-end (upload → validate → seed → public read) green against dev stack; lifecycle rules in `pulumi preview`; reserved concurrency 5.

---

### U8. Admin SPA (K-2 frontend) — `apps/admin-spa` — REVISED 2026-06-10

**Goal:** Build the React-Admin SPA over the catalogue resource (with the exercises editor nested in the lesson Edit view) — custom DataProvider, presigned-POST direct-to-S3 file inputs (new-song upload dialog + source-replacement input), client-side alphaTex validation for exercise steps, and an explicit Publish action surfacing the §5 gates. Pattern-authoring UI is deferred to H-11 (spec §11; round-2 review). Deploy as static bundle to S3+CloudFront with the EdgeBasicAuth gate (unchanged).

**Requirements:** R3 (K-2 admin SPA) · R7 (composition root for UI adapter).

**Dependencies:** U2 (core types), U3 (`CloudFrontStaticSite`), U6 (admin CRUD API — DataProvider needs the endpoint).

**Files:**
- Create: `apps/admin-spa/src/main.tsx` (wires `CatalogApiClient` + `catalogueDataProvider` + renders `<App />`)
- Create: `apps/admin-spa/src/App.tsx` (React-Admin `<Admin>` + `<Resource name="catalogue">`; exercises edited inside the lesson Edit view, not a top-level resource; no patterns resource in K v1)
- Create: `adapters/react-admin/CatalogApiClient.ts` (fetch wrapper; base URL from `import.meta.env.VITE_API_URL`; maps HTTP errors — 412 → `StaleUpdateError`, 422 → `PublishGateError(gate)`)
- Create: `adapters/react-admin/catalogueDataProvider.ts` (React-Admin v5.14 `DataProvider`: `getList` → `GET /api/catalogue?…` (admin list — drafts visible); `getOne`/`create` (lessons); `update` sends `If-Match: <updatedAt token>`; `delete` → archive. Custom methods: `publish(id, updatedAt)`, `replaceExercises(id, steps)`, `mintNewSongUpload(ext)`, `mintItemUpload(id, kind, ext)`, `getUploadStatus(uploadId)`)
- Create: `adapters/react-admin/catalogueResource.tsx` (List with the §9 facets as filters — type/level/bpm/genre/tags/search; level renders as the **§5 D6 star mapping** (1–2→1★ … 9–10→5★, NULL→"—"); **"New song" opens the upload dialog** — upload-first, there is no blank song Create form; lesson Create form; Edit forms per type; the level form field is a 1–10 nullable number input with the star preview adjacent ("5 → 3★") so the curator sees the player-facing form while authoring; status chip; **Publish** toolbar action with gate-failure toasts; archive confirm dialog reads `slicingLessonCount` from the admin detail and warns "N lessons slice this song — their slice steps will stop serving")
  - **Gate-failure toast copy (round-2 review — fixed strings, not implementer-invented):** `lesson-needs-exercise` → "Add at least one exercise step before publishing." · `license-required` → "A license is required before publishing curated content." · `curated-only` → "Only curated items can be published to the shared catalogue." · `song-breakdown-source-not-published` → "This lesson slices a song that isn't published — publish or relink the source first."
  - **412 handling (round-2 review):** on `StaleUpdateError` the form reloads the latest server record, **discarding in-progress edits**, and shows "This item was updated elsewhere — your unsaved changes were discarded." Single-curator tool: reload-and-discard is the accepted behavior, documented so nobody builds a merge UI.
- Create: `adapters/react-admin/exercisesResource.tsx` (ordered-steps editor inside lesson Edit: add/remove/reorder rows; start→goal BPM pair with goal≥start client check). **Notation-source switcher (round-2 review — the one-of-three model was unspecified):** a per-row segmented control with two modes in v1 — **Tex** (the `AlphaTexInput` textarea) and **Slice** (source-song autocomplete over the admin list filtered `type=song`, plus start/end bar number inputs; when the chosen song has parsed `data.sections[]`, the picker lists its sections as one-click bar-range presets, manual entry as fallback). Switching modes shows a confirm when the current mode has content, then **clears the other mode's fields** — the form state can never hold two sources (mirrors `ex_one_source`). The third schema shape (`notation_key` file-backed steps — "rare" per spec §6) gets **no authoring UI in v1**; the column stays a schema slot.
- ~~`adapters/react-admin/patternsResource.tsx`~~ **deferred to H-11** (spec §11: "the CMS pattern-linking UI can arrive with that content" — round-2 review; authoring UI for content that can't exist yet is burn without payoff)
- Create: `adapters/react-admin/CatalogueFileInput.tsx` (custom FileInput: client-side size check (20 MB) → mint → **multipart/form-data POST** to the presigned-POST URL → "validating…". **The validating state resolves (round-2 review — it previously had no resolution path):** new-song dialog polls `getUploadStatus(uploadId)` every 3 s up to 60 s → success navigates to the created draft item's Edit view, failure shows the rejection reason ("MIDI can't be rendered — convert to Guitar Pro and upload the .gp" for `midi-not-renderable-convert-first`); the source-replacement input re-fetches the item until `notation_key` updates or `data.lastUploadError` appears; timeout shows "still validating — refresh in a moment". **A `.mid` selection is also blocked client-side** with the same convert-first copy)
- Create: `adapters/react-admin/AlphaTexInput.tsx` (textarea + on-blur alphaTab parse in the browser; parse errors render inline — RC-5's client-side validation)
- Create: `infra/cms/admin-site.ts` (Pulumi module — RC-10: `CloudFrontStaticSite` with TWO cache behaviors (default → SPA bucket / `/api/*` → U6's FURL via OAC + `CachingDisabled`), both gated by the KVS Basic-Auth CF Function; CSP/CORS Response Headers Policy; ACM cert from us-east-1 — all unchanged from the original `apps/admin-spa/infra.ts` content, relocated)
- Create: `apps/admin-spa/vite.config.ts` · `index.html` · `package.json` · `tsconfig.json` · ~~`__tests__/{App,CatalogueFileInput,AlphaTexInput}.test.tsx`~~ <!-- SUPERSEDED: co-located tests (no __tests__/) per tooling DACI 2026-06-09 §F-2 -->

**Approach (deltas from the original — everything not listed is unchanged):**
- React-Admin v5.14.7 + React 19 + pinned MUI/Emotion transitive versions; no `authProvider`; Vite bundle to S3; CSP including `connect-src` S3 — all as originally specified.
- `update` flows carry `updatedAt` as the `If-Match` token (RC-12); 412 → React-Admin conflict UI ("This item was updated elsewhere — refresh").
- The lesson Edit view composes two panels: facets form · exercises editor (`replaceExercises` on save — atomic). (The pattern-links panel is deferred with the patterns UI — H-11.)
- alphaTab runs **in the SPA** for `AlphaTexInput` (it's a browser library; MPL-2.0 already license-cleared) — this is RC-5's authoring-time validation. The player remains the rendering authority; a server-side re-check is M1 hardening.
- The list view shows the type icon for every row (covers are out of v1 — `cover_image_url` is null; the icon fallback is the spec-defined behavior).

**TDD task list:**

- [ ] **8.1** Write `catalogueDataProvider` unit tests — `getList` filter→query-param mapping (incl. level/bpm ranges + csv arrays); `update` sends `If-Match`; 412 → `StaleUpdateError`; `publish` posts with token → FAIL → implement provider + `CatalogApiClient` → PASS → commit `feat(k-2): catalogue DataProvider`
- [ ] **8.2** Write `CatalogueFileInput` tests — happy multipart-POST flow stores key + enters polling; 25 MB file blocked client-side; `.mid` blocked with convert-first copy; POST network failure → inline retry; poll lands on success/rejection states → FAIL → implement → PASS → commit
- [ ] **8.3** Write `AlphaTexInput` test — valid tex passes; broken tex shows alphaTab error inline → FAIL → implement → PASS → commit
- [ ] **8.4** Build the catalogue resource + exercises editor + App; smoke test renders list with mocked provider; star-mapping unit test (1→1★, 4→2★, 10→5★, null→"—"); **new-song upload dialog test: mint → POST → poll → navigate-on-success / reason-on-rejection**; switcher test: Tex→Slice switch clears tex after confirm → PASS → commit `feat(k-2): admin resources (catalogue + exercises)`
- [ ] **8.5** Author `infra/cms/admin-site.ts` (relocated distribution config); `pnpm --filter @notation-hero/admin-spa build` produces the bundle; `pulumi preview` clean → commit

**Test scenarios:** (beyond the TDD list; manual/integration unchanged from the original — create/edit/archive/upload end-to-end, Basic-Auth gate, CORS preflight)
- Integration (manual): author a **beat lesson** end-to-end — create lesson → 3 alphaTex steps with BPM ladder → Publish (fails until a step exists — gate toast) → appears in public API. And the **upload-first song path**: New song → upload `.gp` → poll lands on the draft Edit view with seeded bpm/sections → set license → Publish.
- Integration (manual): replace a song's source file via the item-scoped input; the detail response serves the new checksum within one refresh.

**Verification:** ~~`pnpm vitest run apps/admin-spa adapters/react-admin --root .`~~ <!-- SUPERSEDED: live runner is `node --test` (Node 24); Vitest deferred L5 per tooling DACI 2026-06-09 --> green; production bundle builds; manual smoke against deployed dev stack covers the full author loop.

---

### U9. Pulumi composition root (`infra/index.ts`) + cross-cutting resources — REVISED 2026-06-10

**Goal:** Build the Pulumi root that composes the `infra/cms/*` modules (RC-10), defines cross-cutting AWS resources (shared S3 bucket, KVS + key, SNS topic, ACM certs, alarms), injects the **Neon connection string as a secret** into the three Lambdas, and provides stack-config indirection. **No database resources are provisioned** — Neon is external SaaS (RC-6); the runbook covers Neon project setup + migrations instead.

**Requirements:** R4 (Pulumi IaC composition; DB-provisioning exception) · R5 (free-tier-safe defaults).

**Dependencies:** U3 (components), U5/U6/U7/U8 (the `infra/cms/*.ts` modules exist).

**Files:**
- Create: `infra/index.ts` (entry — cross-cutting resources + module composition)
- Create: `infra/Pulumi.yaml` · `infra/Pulumi.dev.yaml` (config incl. `basicAuthCredential` + **`neonDatabaseUrl`** as `secure:`) · `infra/Pulumi.prod.yaml` (scaffold, not deployed)
- Create: `infra/package.json` (deps: `@pulumi/pulumi@^3`, `@pulumi/aws@^7`, `@notation-hero/adapters-aws`) · `infra/tsconfig.json`
- Create: `infra/README.md` (operator runbook — now including the **Neon section**: create project/branch, create the least-privilege app role, run migrations, rotate the connection string)
- Test: ~~`infra/__tests__/preview.test.ts`~~ <!-- SUPERSEDED: co-located test (no __tests__/) per tooling DACI 2026-06-09 §F-2 --> (Pulumi automation-API `preview` smoke on the dev stack)

**Approach:**

**Pre-deploy guards** (CI `deploy.yml` AND `infra/README.md` — extended):
1. `pulumi backend` MUST NOT report `file://` (unchanged — state holds the Neon URL + Basic-Auth secrets).
2. `aws sts get-caller-identity` returns valid identity.
3. **Migrations are current:** `DATABASE_URL=$(pulumi config get neonDatabaseUrl --show-secrets) pnpm --filter @notation-hero/adapters-postgres migrate` — idempotent; run BEFORE `pulumi up` so new Lambda code never meets an old schema.

**`infra/index.ts` structure:**
```ts
// 1. Config
const config = new pulumi.Config()
const domain = config.require('domain')
const basicAuthCred = config.requireSecret('basicAuthCredential')   // base64(user:pass)
const neonDatabaseUrl = config.requireSecret('neonDatabaseUrl')     // postgres://… (Neon; RC-6 — NOT provisioned here)
const cfSigningKey = config.requireSecret('cfSigningPrivateKey')    // RSA private key for CloudFront signed URLs (RC-13)
const cfPublicKeyPem = config.require('cfSigningPublicKey')         // public half → aws.cloudfront.PublicKey + KeyGroup
// round-2 review: the private key is materialized as an SSM SecureString parameter, NOT a Lambda env value —
// an env-visible signing key would let any lambda:GetFunctionConfiguration caller forge unexpiring URLs
const cfKeyParam = new aws.ssm.Parameter('cf-signing-key', { type: 'SecureString', value: cfSigningKey })
const corsOrigins = config.requireObject<string[]>('corsOrigins')   // explicit; no '*'

// 2. Cross-cutting AWS resources (inline; no component class) — NOTE: no database, no DynamoDB (RC-3/RC-6)
const filesBucket = new aws.s3.Bucket('catalogue-files', { /* private, AES256, versioning off, forceDestroy:false */ })
new aws.s3.BucketPublicAccessBlock('catalogue-files-pab', { bucket: filesBucket.id, ...allBlocked })
new aws.s3.BucketCorsConfigurationV2('catalogue-files-cors', { bucket: filesBucket.id, /* PUT/POST from adminDomain only */ })
new aws.s3.BucketLifecycleConfigurationV2('catalogue-files-lifecycle', {
  bucket: filesBucket.id,
  rules: [
    { id: 'expire-quarantine', filter: { prefix: 'uploads/quarantine/' }, expiration: { days: 1 } },
    { id: 'expire-rejected',   filter: { prefix: 'uploads/rejected/' },   expiration: { days: 7 } },
  ],
})
const bucketNotifications = createBucketNotificationsAggregator(filesBucket)  // single BucketNotification resource
const eventsTopic = new aws.sns.Topic('lesson-events', {})                    // topic name kept (RC-11)
const adminKvs = new aws.cloudfront.KeyValueStore('admin-cred-store', {})
const adminKvsKey = /* KVS key write — verify @pulumi/aws v7 resource at U3 build; CLI fallback unchanged */
const usEast1 = new aws.Provider('us-east-1', { region: 'us-east-1' })
const adminCert = new aws.acm.Certificate('admin', { domainName: `admin.${domain}`, validationMethod: 'DNS' }, { provider: usEast1 })
const cdnCert   = new aws.acm.Certificate('cdn',   { domainName: `cdn.${domain}`,   validationMethod: 'DNS' }, { provider: usEast1 })

// 3. Inline CF Function for KVS-backed Basic-Auth (+ U9 microbench step) — unchanged from original

// 4. Module composition (infra/cms/* — RC-10)
const publicApi  = publicReadApi({ neonDatabaseUrl, filesBucket, cdnCert, corsOrigins })
const validator  = uploadValidator({ neonDatabaseUrl, filesBucket, eventsTopic, bucketNotifications })
const adminApi   = adminCrudApi({ neonDatabaseUrl, filesBucket, eventsTopic })
const adminSite  = adminSpaSite({ adminLambdaArn: adminApi.fnArn, adminLambdaUrl: adminApi.fnUrl,
                                  adminCert, basicAuthFnArn: basicAuthFn.arn, corsOrigins })

// 5. Outputs (player track + ce-work consume these)
export const adminUrl = adminSite.distributionDomain
export const publicCdnUrl = publicApi.distributionDomain
export const publicApiUrl = publicApi.distributionDomain
```

- **`DATABASE_URL` injection:** each `infra/cms/*` module passes `env: { DATABASE_URL: neonDatabaseUrl, … }` to `LambdaWithUrl`. Pulumi secrets stay encrypted in state and surface only as Lambda env (the standard pattern; SSM SecureString is the documented alternative if env-var exposure in the console becomes a concern — runbook note).
- **Neon least-privilege (runbook, not IaC):** create role `app_cms` with `SELECT/INSERT/UPDATE` on the four catalogue tables + `SELECT` on `schema_migrations` (no DDL, no DELETE — the adapter never deletes); migrations run as the owning role. Document `psql` snippets in `infra/README.md`.
- **AWS-managed equivalent (the interview talking point — document in `infra/README.md` under "Why Neon / what the AWS answer looks like"):** Aurora Serverless v2 (or RDS Postgres) + **RDS Proxy** — Lambda's connection-per-invocation pattern exhausts vanilla Postgres connection slots, so AWS's answer is a pooling proxy; Neon's serverless HTTP driver solves the same problem at the protocol layer. The store is swappable behind K-3 — honestly scoped (round-2 review): the **code** swap is the `SqlExecutor` seam (the `pgExecutor` TCP path already exists for tests/migrations); the **infra** swap is provision Aurora Serverless v2/RDS + RDS Proxy, VPC-attach the three Lambdas, re-point `DATABASE_URL`, re-run migrations. The connection-pooling rationale stays the centerpiece of the talking point — don't compress it to "re-point a config value" in an interview, the probe-resistant version is the stronger story.
- **KVS rotation, ACM two-pass first deploy, CloudWatch alarms** (admin 4xx rate, 2× cert expiry): all **unchanged** from the original plan — plus one new alarm (round-2 review): `notation-hero-cms:public-5xx` on the public Lambda's error rate (`Errors > 5/min`), since Neon cold-resume or schema drift surfaces there first and the admin-side alarm wouldn't see it.
- `Pulumi.dev.yaml` adds one line to the original: `notation-hero-infra:neonDatabaseUrl: { secure: <encrypted> }`.

**TDD task list:**

- [ ] **9.1** Write ~~`infra/__tests__/preview.test.ts`~~ <!-- SUPERSEDED: co-located test (no __tests__/) per tooling DACI 2026-06-09 §F-2 --> (automation-API preview, throwaway stack, fake config values) → FAIL → implement `infra/index.ts` skeleton (config + bucket + topic + KVS + certs) → preview passes → commit `feat(infra): composition root (no DB resources — Neon external)`
- [ ] **9.2** Wire the four `infra/cms/*` modules with `DATABASE_URL` env injection → preview shows the full graph (~30–40 resources; **no DynamoDB table, no RDS**) → commit
- [ ] **9.3** Write `infra/README.md` — deploy (two-pass certs), **Neon setup + `app_cms` role + migrate step**, rotate Basic-Auth (normal + emergency), rotate `neonDatabaseUrl` (normal + **emergency: reset the role password in the Neon console first** — takes effect in seconds — then config-set + `pulumi up`), **CloudFront signing-key rotation** (add new PublicKey to KeyGroup → `pulumi up` → flip the SSM value → remove old key; emergency variant removes the old key first, ≤5 min dead URLs), rollback hygiene, KVS propagation, microbench procedure → commit `docs(infra): operator runbook incl. Neon section`
- [ ] **9.4** First real deploy: Neon project created → `pulumi config set --secret neonDatabaseUrl …` → migrate → two-pass `pulumi up` → smoke: admin Basic-Auth prompt; `GET /v1/catalogue` returns `{ items: [], total: 0 }` → commit any drift fixes
- [ ] **9.5** Idempotency + rotation drills: second `pulumi up` shows zero diff; KVS credential rotation <30 s; `neonDatabaseUrl` rotation = config set + `pulumi up` (Lambda env update only); **CF signing-key rotation drill** (old+new keys coexist in the KeyGroup during cutover — no outage) → record results in README → commit

**Test scenarios:**
- Happy path: full bring-up on a fresh AWS account + fresh Neon project — resources in dependency order; curator signs in within the first-deploy window (15–25 min, certs dominating — unchanged).
- Edge: `pulumi config set --secret neonDatabaseUrl <new> && pulumi up` updates only the three Lambdas' env (no distribution churn).
- Error path: missing `neonDatabaseUrl` config → `config.requireSecret` fails preview with a clear message.
- Error path: migrations not run before deploy → K-3 returns 503s with `relation "catalogue_item" does not exist` in logs — the pre-deploy guard #3 exists precisely for this; documented in the runbook troubleshooting table.

**Verification:** `pulumi preview --stack dev` clean; `pulumi up --stack dev` succeeds; zero-diff on re-run; KVS + Neon-URL rotation drills pass; `GET /v1/catalogue` 200 against the deployed stack; operator README covers Neon + migrations + all original procedures.

---

## System-Wide Impact

- **Interaction graph:** admin curator browser ⇌ CF Function gate ⇌ admin SPA assets / admin Lambda; admin Lambda → presigned URL → browser → S3 quarantine → S3 event → validator Lambda → **Neon Postgres** (parameterized SQL) + S3 canonical key; player app → public CF → public Lambda → **Neon Postgres** + S3 signed URL. Every cross-boundary call is HTTPS (the Neon HTTP driver included); every Lambda invocation logs to CloudWatch. The database sits **outside AWS** — the only cross-cloud hop, carried by one env-injected secret (RC-6).
- **Error propagation:** core use-cases return `Result<T, E>`; adapters map driver/SDK errors to domain errors (`RepositoryError`, `FileStoreError`) — raw SQLSTATE/driver errors never cross the port; Lambda handlers map domain errors to HTTP (4xx client / 412 stale / 422 gate / 5xx adapter with retry guidance). React-Admin DataProvider maps HTTP errors to its error UI conventions.
- **State lifecycle risks:** (a) orphaned quarantine objects — 24h lifecycle TTL (unchanged); (b) a catalogue row whose `notation_key` upload never validated — admin UI shows "file pending"; the row simply can't publish a playable song until the validator lands the key; (c) duplicate S3 event firing — idempotency via the **sha256 checksum short-circuit** (U7.6); (d) validator copy-self-trigger — strict `uploads/quarantine/` filter (unchanged, integration-verified); (e) **two-store consistency** (Postgres row vs S3 object): the validator promotes the object **before** the row UPDATE, so a mid-flight crash leaves a harmless orphan object + un-updated row (retried by the event source), never a row pointing at a missing object.
- **API surface parity:** the public `GET /v1/catalogue` projection is the contract the player builds against — **locked in spec §9**, guarded by the CI contract test. Admin CRUD payloads use the same core entities — writer/reader stay in sync by construction.
- **Integration coverage:** the upload pipeline (admin → presigned POST → S3 event → validator → Postgres row + canonical key → public read with signed URL) is the true cross-layer flow unit tests can't prove; U7 + U8 integration scenarios cover it (unchanged), now including parse-once seeding assertions.
- **Unchanged invariants:** no `apps/player-pwa/` stub; player consumes Pulumi stack outputs by name. The catalogue store is swappable behind K-3 (spec §12) — nothing outside `adapters/postgres/` + the `DATABASE_URL` secret knows Neon exists.

---

## Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Migrations drift from the locked spec §4 (hand-copy error, "helpful" edits) | Low | High | `0001` is **verbatim**; the U4.2 **CHECK-fidelity probe suite** asserts every named constraint exists and fires; any migration edit is flagged as a spec change in review |
| Driver drift: `pg` (tests) vs `@neondatabase/serverless` (runtime) behave differently (type parsing, transactions) | Low | Med | the `SqlExecutor` seam keeps SQL identical; env-gated **Neon smoke test** (U4.8) runs the suite subset through the real driver against a throwaway Neon branch |
| Neon free-tier limits (0.5 GB / 100 compute-hrs/project; scale-to-zero @5 min) bite | Low | Med | catalogue is tiny (~MBs for thousands of rows); player reads are CloudFront-cached; **cold-resume latency** (~0.5–1 s on first query after idle) is acceptable for K and invisible behind cache — monitor in month 1; Aurora/RDS swap documented behind K-3 |
| Neon connection string leaks (Pulumi state, Lambda env console visibility) | Low | High | Pulumi backend guard (no `file://`, unchanged); `requireSecret`; **least-privilege `app_cms` role** (no DDL/DELETE); rotation drill in U9.5; SSM SecureString documented as the alternative injection path |
| Invalid alphaTex stored via direct API call (bypassing the SPA's client-side parse) breaks a step in the player | Low | Med | single-curator surface (the SPA *is* the authoring path); player degrades per-step (`kind:'unavailable'` pattern); server-side re-parse is a named M1 hardening item (RC-5) |
| alphaTab-in-Node parse (U7 seeding) inflates validator bundle/cold start | Med | Low | async event path — no user-facing latency; reserved concurrency 5; measure bundle at U7 build; fallback = drop seeding to filename-only and keep validation (seeding is additive) |
| AWS account not configured locally → can't `pulumi up` | Low | High | account exists (IAM Identity Center + zero-spend budget, 2026-06); `infra/README.md` covers profile setup; U9 fails fast |
| Pulumi state file leaks secrets if backend is misconfigured | Low | High | **Pre-deploy guard: `pulumi backend` MUST NOT report `file://`** (unchanged); Pulumi Cloud or S3+KMS; secrets via `config.requireSecret` |
| CloudFront Function 10KB code limit exceeded with KVS lookup + constant-time compare | Low | Med | **Measured at U9** via `describe-function`; assert <8KB; fallback HMAC pattern (unchanged) |
| `constantTimeEquals` JIT-optimized into early-exit on cloudfront-js-2.0 | Low | Med | **Microbench step in U9** (unchanged); fallback HMAC pattern |
| OAC for Lambda FURL: CORS gotchas + `x-amz-content-sha256` on POST/PUT | Low | Med | `sourceArn`-pinned Permission + `AllViewerExceptHostHeader` policy (unchanged); uploads bypass CF via presigned POST |
| `aws.cloudfront.KeyvaluestoreKey` Pulumi resource may not exist in v7 | Med | Low | **Verify at U3 build**; fallback `command.local.Command` (unchanged) |
| Magic-byte detection misclassifies an edge-case Guitar Pro file | Low | Med | `file-type` actively maintained; fixtures for all GP versions (U2.5/U7.1); misclassified files land in `rejected/` with reason for forensics (unchanged) |
| Two CloudFront distributions = doubled ACM renewals + DNS-validation persistence | Low | Low | $0 cost; CNAME persistence documented; `DaysToExpiry < 30` alarms (unchanged) |
| Lambda cold start noticeable on admin first action | Med | Low | acceptable internal; ARM64/LLRT post-v1 (unchanged); Neon HTTP driver adds no pool warm-up |
| `dependency-cruiser` config drift | Low | Med | CI `depcheck` gate; visible in review (unchanged); Nx boundary tags add a second axis when materialized |
| KVS credential rotation eventual-consistency lag (10–30 s) | Low | Low | emergency-rotation procedure in runbook (unchanged) |
| Admin gate brute-force amplifies cost | Low | Med | CloudWatch `4xxErrorRate > 10/sec` alarm → reactive WAF (unchanged — explicit deferred-with-trigger) |
| Mid-stack rollback strands uploads in quarantine | Low | Med | runbook "Rollback hygiene": drain prefixes; `forceDestroy:false`; 24h TTL sweep (unchanged) |
| Validator UPDATE races admin metadata edit | Low | Low | **column-scoped partial UPDATE** with NULL-only fills expressed **inside the statement** (`COALESCE`) — a curator edit landing mid-validation survives; admin API strips `notation_*`/`cover_image_key` from PUT bodies. **Accepted limitation:** a curator who deliberately blanks a parsed facet gets it re-seeded on the next re-upload of that file |
| S3 event arrives before the catalogue row exists (upload-before-create) | Med | Low | validator row pre-check → `rejected/orphaned/` reason `item-record-missing` (unchanged logic, Postgres SELECT) |
| `dorny/paths-filter` failure skips CI silently | Low | Med | `changes` job required independently + loud sanity assert (unchanged) |
| Admin SPA stored-XSS via rendered content | Low | Med | CSP on admin distribution; React DOM-escaping; upload Content-Type allowlist now *narrower* (no `text/plain` — alphaTex is not an upload format anymore, RC-5) |

**Prerequisites (external):**

- ✅ **Track 2 / toolchain** — landed (pnpm skeleton committed; DACI approved). Residual `nx init` in flight, non-blocking.
- ✅ **Track 3 schema lock** — landed 2026-06-10 (the spec this revision implements).
- ✅ **GitHub repo** — exists (`leocaseiro/notation-hero`, PRs flowing).
- ✅ **AWS account access** — set up 2026-06 (paid account, IAM Identity Center daily-driver, zero-spend budget). Confirm the CLI profile before U9.
- **Neon account + project** — create the free-tier project, a `dev` branch, and the `app_cms` role; capture the connection string into `pulumi config set --secret neonDatabaseUrl` (U9 runbook step). **Not yet done.**
- **Pulumi backend confirmed** — Pulumi Cloud login (or S3+KMS) before first U9 deploy.
- **Domain** — `notation-hero.com` (or similar) acquired; ACM validation needs DNS access. **Not yet done.**

---

## Documentation / Operational Notes

- **`infra/README.md`** (created in U9): how to deploy (`pulumi up --stack dev`), how to rotate the admin credential (`pulumi config set --secret basicAuthCredential <newBase64> && pulumi up`), how to roll back (`pulumi stack history` + `pulumi cancel` patterns), how to add a new lesson manually via admin SPA, how to forcibly clean orphaned quarantine objects.
- **Per-component README in `adapters/aws/`** — short doc explaining each ComponentResource's args, outputs, and intended use. Helps future-you / contributors not need to read the implementation.
- **Top-level `README.md` updated** in U1 with: Layout 4 architecture diagram, dependency direction rules, contribution flow (run `pnpm lint` + `pnpm depcheck` + `pnpm test` locally before PR).
- **Decision-capture**: after each unit lands, capture institutional learnings via `/ce-compound` per the learnings researcher's recommendation. Highest-value: KVS Basic-Auth rotation pattern (U6/U9), `LambdaWithUrl` + OAC pattern (U3/U5/U6), Postgres hybrid-JSONB catalogue + CHECK-probe migrations (U4), magic-byte streaming validation + parse-once seeding (U4/U7).
- **CloudWatch dashboard** (optional, deferred): single dashboard per Lambda with invocations + errors + duration. Worth adding in U9 as a `aws.cloudwatch.Dashboard` resource if time permits. `H-7` (Beta) does the real SLO + burn-rate work.
- **Operational ad-hoc**: monthly check on Always-Free tier consumption — `aws ce get-cost-and-usage` or AWS Cost Explorer for free-tier dashboards. K should sit at $0; flag any drift.

---

## Sources & References

- **Origin document:** `docs/cms-approach.md` (decision doc, locked 2026-06-05) — **not in this repo**; it lives in worktree `affectionate-dewdney-42c19c/`. Its area-K decision stands; the parts it grounded on data-locality are superseded by the in-repo [decisions/2026-06-09-catalogue-store-postgres-neon.md](../decisions/2026-06-09-catalogue-store-postgres-neon.md) + [specs/2026-06-10-catalogue-schema.md](../specs/2026-06-10-catalogue-schema.md).
- **Companion docs** (all currently in worktree `pensive-boyd-6d17e3/docs/`):
  - `feature-freeze.md` (area `K` rows, AWS portfolio ranking, sync model)
  - `song-schema.md` (historical — superseded by `specs/2026-06-10-catalogue-schema.md`)
  - `design-stack.md` (full AWS stack, license gate, AWS rejection rationale for Amplify/API Gateway/Cognito-in-K)
  - `aws-learning-map.md` (service → vehicle mapping)
  - `handoff.md` (project identity, decisions log)
  - `handoff-prompts.md` (Track 1-4 parallel handoff specs)
- **Related Track plans:**
  - Track 2: `vigorous-goldwasser-73ccca/docs/cicd-pipeline.md` (requires revision per Deferred to Follow-Up Work)
  - Track 3: ✅ landed — [specs/2026-06-10-catalogue-schema.md](../specs/2026-06-10-catalogue-schema.md) (this revision implements it)
- **External docs** (cited inline above): React-Admin v5.14, AWS Lambda Node.js runtime, CloudFront Functions runtime + KVS, Pulumi `@pulumi/aws` v7, `file-type` package, `dependency-cruiser`, alphaTab Guitar Pro format docs.
- **Repo state at plan time:** greenfield in worktree `charming-curran-f72274` (this plan's home); Wave 1 scaffold exists in `vigorous-goldwasser-73ccca/` and will be superseded.

---

## Alternative Approaches Considered

Distinct from the **product-level** alternatives in `cms-approach.md` (custom AWS vs headless self-host vs SaaS vs git-flat-file vs hybrid — all resolved). At plan time, **structural** alternatives considered:

- **Layout 1 (apps + services + infra):** rejected. Tech-layered, no DDF discipline; weakest interview pitch.
- **Layout 2 (pure DDF `domains/cms/{web,api,infra}`):** rejected. Strong DDD pitch but fights JS-ecosystem conventions; would need refactor of Track 2's Wave 1.
- **Layout 3 (apps with sub-services):** rejected. Forces awkward ownership decisions (where does K-3 catalog API live — admin or web?); shared DynamoDB still needs cross-cutting `infra/`.
- **Layout 4 (Hexagonal / Clean Architecture top-level):** **selected** — strongest fit given 6+ adapter swaps coming over the milestone ladder; user explicitly chose strict top-level over the `packages/` retrofit.
- **Layout 5 (hybrid: `apps/*` + `packages/shared-*` + DDF inside each app):** rejected after user weighed both. Identical Hexagonal benefits but at a different naming level; user preferred top-level clarity.

Pulumi composition alternatives:

- **One project, one stack, modules** — selected. Single state file, atomic deploys, simplest mental model.
- **Multiple projects under `infra/`** (per-area Pulumi projects) — rejected. Adds deploy ordering complexity; useful only with multi-team ownership boundaries (not the case for solo).
- **Cross-stack references** — rejected. Stale-output bugs + ordering complexity for zero gain at solo scale.

ComponentResource external libraries:

- **`@pulumi/aws-misc`, `@pulumi-orchestra/components`** — rejected. Inconsistent maintenance per best-practices research; hand-rolled stays simpler at this scale.
- **`@pulumi/awsx`** (official) — not used. Overkill for serverless; designed primarily for VPC/ECS work.
- **AWS CDK Solutions Constructs (via `@pulumi/cdk` adapter)** — evaluated and rejected. Hand-rolling `LambdaWithUrl` + `CloudFrontStaticSite` IS the portfolio value (R4) — using pre-built constructs would skip exactly the IaC depth `H-1` exists to showcase.
- **SST.dev patterns** — evaluated and rejected for the same reason as CDK Solutions Constructs. SST adds its own runtime + opinions; the portfolio story is "I wrote raw Pulumi for AWS primitives", not "I used a framework that hides Pulumi". Adversarial-flagged the omission of these alternatives in the original draft — surfaced explicitly here for completeness.

Data-store alternatives (2026-06-10 revision): **resolved upstream, not re-litigated here** — DynamoDB-only, DynamoDB+OpenSearch, MongoDB Atlas, Supabase, Prisma Postgres, and Aurora/RDS were all weighed in [decisions/2026-06-09-catalogue-store-postgres-neon.md](../decisions/2026-06-09-catalogue-store-postgres-neon.md); Neon Postgres + JSONB won for the catalogue, DynamoDB keeps per-user data at M1.

---

## Success Metrics

**Ship-mechanics (must hold):**
- **`pulumi up --stack dev` completes successfully** with all ~30–45 AWS resources provisioned (no database resources — Neon is external). **First-deploy timing: 15–25 minutes** (CloudFront ~15 min cold create; ACM validation 5–30 min — two-pass `--target` for certs first). **Subsequent no-change `pulumi up`: <30 seconds.** **Migrations precede deploy:** `pnpm --filter @notation-hero/adapters-postgres migrate` is idempotent and green against Neon.
- **Admin curator can create a song with `.gp` file upload** end-to-end in under 60 seconds (sign in → form → upload → save → in list, validator + seeding < 3 s), **and author a beat lesson** (3 alphaTex steps with a BPM ladder + pattern link + publish) without leaving the SPA.
- **Public `GET /v1/catalogue` returns the curated catalog** in <500 ms (warm) / <2 s (cold) from CloudFront; `?q=sao` matches "São" titles (accent-insensitive search verified in prod, not just tests).
- **Public `GET /v1/catalogue/{id}` returns a working signed URL** within TTL; a song-breakdown lesson resolves slices only while the source song is published.
- **KVS credential rotation <30 s**; **`neonDatabaseUrl` rotation** = config-set + `pulumi up` (Lambda env-only diff).
- **CI green** for all PRs; `dependency-cruiser` blocks layer violations; the `/v1` contract test guards the §9 wire shape; the **CHECK-fidelity probes** guard DDL-vs-spec.
- **Total monthly cost: $0 AWS** (Cost Explorer) **+ $0 Neon** (free-tier dashboard) at end of first month.

**Schedule tripwire (round-2 review — the calendar is the constraint that decays):**
- **A live public catalogue URL exists within 3 weeks of U2 start, and the whole plan lands within 6 weeks** (locked at the 2026-06-10 walkthrough). When a phase overruns its share, the named descope levers fire in order: drop parse-once seeding to filename-only (U7 fallback) → defer source-replacement uploads (new-song only) → defer the exercises editor polish. Hitting every quality metric three months late fails the actual goal.

**Portfolio-outcome metrics (the actual job-hunt purpose K serves — per F-DR2a):**
- **≥5 captured solution docs in `docs/solutions/`** tied to the named patterns:
  - `docs/solutions/kvs-basic-auth-rotation.md` — CF Function + KVS edge-auth with rotation procedure
  - `docs/solutions/lambda-furl-oac-pattern.md` — Lambda FURL behind CloudFront with OAC (`sourceArn` pinning, `AllViewerExceptHostHeader`)
  - `docs/solutions/postgres-catalogue-jsonb-search.md` — hybrid typed-columns + JSONB catalogue; `pg_trgm`/`unaccent`/tsvector search; the CHECK-fidelity-probe migration pattern
  - `docs/solutions/neon-serverless-lambda.md` — serverless HTTP driver vs the Aurora/RDS-Proxy pooling story (the swap-behind-K-3 narrative)
  - `docs/solutions/magic-byte-streaming-validation.md` — S3-event validation + streaming zip ceiling + parse-once seeding
  - `docs/solutions/pulumi-component-lambda-with-url.md` — `LambdaWithUrl` ComponentResource design
- **1 narrated whiteboard-rehearsal artifact per pattern** (paired `.md` walkthroughs — problem, alternatives, design, trade-offs). Goal: prove the pattern is internalized, not just shipped.
- **1 architectural-decision capture per high-value pattern** — ADR-lite `docs/decisions/NNN-*.md` for: Hexagonal Layout 4 (+ the 6-swap Premise Audit), CF Function + KVS over Lambda@Edge + Cognito, bare FURL + OAC over API Gateway, **catalogue = Postgres+JSONB over DynamoDB/Mongo (already captured: `decisions/2026-06-09-catalogue-store-postgres-neon.md` — link it, don't rewrite it)**, presigned-POST direct-to-S3 over pass-through-Lambda.

Capture these via `/ce-compound` after each unit lands (this build remains the seeding event for `docs/solutions/`).

---

## Phased Delivery

The 9 units sequence into 4 phases. Phase boundaries are PR-merge points. **U1 is already done** — Phase A is half-complete at revision time.

### Phase A — Foundation (U1 ✅, U2)
U1 (pnpm Layout-4 skeleton + CI + dependency-cruiser) is committed. U2 builds the catalogue core domain. Phase exit gate: CI green, `core/catalogue` tests pass with the Zod↔CHECK mirror suite.

### Phase B — Infra primitives + adapters (U3, U4)
Pulumi ComponentResources + the Postgres/S3/SNS adapters. Phase exit gate: **Docker-Postgres integration suite green including the CHECK-fidelity probes**; LocalStack suites green; `pulumi preview` clean per component. Still no deployed infra, no Neon dependency (everything local).

### Phase C — Lambdas (U5, U6, U7)
Three Lambda composition roots, built public-read → admin-CRUD → validator (same rationale as the original). Phase exit gates: all unit tests green; **the `/v1` contract test matches the locked spec §9 projection** (the old "wait for Track 3" gate is satisfied by construction — the schema is locked); `infra/cms/*` modules preview cleanly.

**Phase C0 — thin-slice first deploy (recommended; round-2 review, job-hunt clock).** Immediately after U5: a minimal `infra/index.ts` composing only the files bucket + the public-read module + the Neon secret + migrations, on the default CloudFront domain (defer KVS/admin distro/ACM aliases). Exit artifact: **a live public `GET /v1/catalogue` URL** — the first interview-visible deployed system (FURL+OAC, Lambda→Neon, signed URLs, Pulumi) lands here instead of after all 9 units, and U9 becomes incremental composition rather than big-bang bring-up. If the calendar bites mid-Phase C, there is already something deployed to show.

### Phase D — Admin SPA + Pulumi composition + deploy (U8, U9)
React-Admin frontend + the infra root + first deploy. New pre-deploy steps: Neon project + `app_cms` role created; `neonDatabaseUrl` secret set; **migrations run against Neon**; then the two-pass `pulumi up`. Phase exit gate: integration tests green against the dev stack; curator validates the full author loop (song + beat lesson) manually.

---

## Documentation Plan

- **`infra/README.md`** (U9) — operator runbook: deploy (migrate → two-pass certs → full up), Neon setup (project, `app_cms` role, connection-string capture/rotation), rotate Basic-Auth credential (normal + emergency), rollback (with hygiene checklist), KVS propagation timing, ACM cert renewal monitoring, Pulumi backend pre-deploy check, CFF microbench procedure.
- **`adapters/aws/README.md`** (U3) — Component catalog: `LambdaWithUrl` + `CloudFrontStaticSite` args/outputs/usage.
- **Top-level `README.md`** (U1) — architecture overview, Layout 4 diagram, `dependency-cruiser` rule rationale, contribution flow.
- **`docs/solutions/`** (created post-landing via `/ce-compound`) — seed with 5+ entries per Success Metrics list (kvs-basic-auth-rotation, lambda-furl-oac-pattern, postgres-catalogue-jsonb-search, neon-serverless-lambda, magic-byte-streaming-validation, pulumi-component-lambda-with-url). Plus paired whiteboard-rehearsal docs.
- **`docs/decisions/`** (created per Success Metrics) — ADR-lite captures: Hexagonal Layout 4 (+ Premise Audit), CFF+KVS vs Lambda@Edge+Cognito, bare FURL+OAC vs API Gateway, catalogue Postgres+JSONB (already exists — `2026-06-09-catalogue-store-postgres-neon.md`), presigned-POST direct-to-S3.
- **`adapters/postgres/README.md`** (U4) — query-pattern table for the catalogue: list-with-facets (`buildListQuery`), search (trgm/unaccent/tsvector + which index serves which query), update-with-`updated_at`-check, archive tombstone, exercise batch replace; plus the migration-runner contract (verbatim-DDL rule + CHECK probes).
- **`apps/admin-spa/README.md`** (U8) — local dev (`pnpm --filter @notation-hero/admin-spa dev`); env vars; how to add a new Resource; CSP rationale; React-Admin 5.14 + React 19 setup.
- **Plan revision history** (this file) — bump at end of plan execution with "STATUS: completed" and any deviations from the planned units. Track adversarial-flagged risks resolved at implementation time.

---

## Operational / Rollout Notes

- **Initial bring-up sequence**: U1 ✅ → U2 → U3 → U4 (each merged to master with green CI before next starts); then U5+U6+U7 in parallel (different `apps/lambda-*` dirs, file-ownership-safe); then U8+U9 (U8 needs U6's exported FURL for the admin distribution's `/api/*` origin; U9 needs all `infra/cms/*.ts` modules in place). The old Track-3 gate is satisfied — the schema is locked.
- **First deploy is manual** — from local: create the Neon project + role → `pulumi config set --secret neonDatabaseUrl …` → `pnpm --filter @notation-hero/adapters-postgres migrate` → `pulumi up --stack dev`. CI-driven deploys (`deploy.yml` via OIDC, migrate step included) come later. **First-deploy is two-pass: certs first (`--target` for ACM certs), wait for validation, then full deploy.**
- **Rollback strategy**: `pulumi stack history --stack dev` → identify a known-good revision → `pulumi stack export --version <N> > prev.json && pulumi stack import prev.json && pulumi up`.
- **Rollback hygiene (adversarial-flagged):** before destroying the shared S3 bucket OR running a rollback that removes admin Lambda + presigned-POST capability, drain `uploads/quarantine/` (curators may have uploads in flight) and `uploads/rejected/` (forensic data only — safe to delete). `forceDestroy: false` on the bucket prevents accidental destroy with content. For partial-state rollbacks (e.g., U6 destroyed but U7 validator still subscribed), temporarily disable admin distribution by setting the KVS credential to a junk value (`pulumi config set --secret basicAuthCredential <junk> && pulumi up`) so no new uploads land in the now-unprocessed quarantine.
- **Monitoring**: CloudWatch Logs on each Lambda (7-day retention dev / 30-day prod). Three alarms in U9: `4xxErrorRate > 10/sec` on admin distribution (brute-force trigger), `DaysToExpiry < 30` per ACM cert (renewal-fail trigger).
- **DR posture**: Neon free tier includes point-in-time restore (limited history) + instant branches — a pre-risky-change branch is the cheap backup (runbook snippet). S3 versioning OFF for the `catalogue/` prefix (deterministic keys). Formal backups out of scope for v1.
- **Cost monitoring**: monthly check via AWS Cost Explorer + the Neon usage dashboard (storage/compute-hours vs the free ceiling). AWS Budgets alert (free) at 80% of any always-free ceiling per service (Lambda, S3, CloudFront, CloudFront Functions, SNS, KVS, CloudWatch).
- **Credential rotation procedure** (in `infra/README.md`): standard rotation `pulumi config set --secret basicAuthCredential <newBase64> && pulumi up` (KVS-only diff, ~30s). **Emergency rotation if leak suspected:** take admin distribution offline (update to 503 custom error page) for 60s → rotate credential → re-enable distribution. Documented because the 10-30s KVS propagation lag means the old credential is briefly still valid at some edges during normal rotation.
