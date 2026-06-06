---
title: "feat: Area K — Admin/CMS build plan (custom AWS backend + React-Admin SPA)"
type: feat
status: active
date: 2026-06-07
origin: docs/cms-approach.md
deepened: 2026-06-07
---

# feat: Area K — Admin/CMS build plan (custom AWS backend + React-Admin SPA)

## Summary

Implement the locked Track 4 approach (custom serverless AWS backend, mounting React-Admin as the admin front-end) by delivering K-1 (lesson store), K-3 (public catalog API), and K-2 (admin SPA + CRUD) as a Hexagonal/Clean Architecture (Layout 4) TypeScript monorepo. Build 9 implementation units in dependency order: bootstrap → core domain → Pulumi infra primitives → runtime adapters → three Lambda composition roots → admin SPA → infra composition root. All inside the AWS Always-Free tier (~$0/mo), using `@pulumi/aws` v7, Node.js 22 Lambda runtime, React-Admin 5.14, CloudFront KeyValueStore (KVS) for Basic-Auth credential rotation, and OAC-gated Lambda Function URLs.

---

## Problem Frame

Area `K` was placed in Alpha specifically as the **#3-ranked AWS-portfolio piece** (per `feature-freeze.md` AWS-portfolio candidates table). The build must intentionally exercise S3, DynamoDB single-table, Lambda Function URL, CloudFront, CloudFront Functions (edge auth), Pulumi IaC, and IAM least-privilege — because *those* are the interview-tellable assets. The admin UX itself is single-user-internal and gets a default React-Admin Material-UI shell (no `/design-shotgun` pass).

The core tension was resolved in `docs/cms-approach.md` (locked 2026-06-05): every headless-CMS alternative either breaks the AWS-Always-Free constraint (self-hosted needs an always-on container) or moves data off AWS (SaaS), both of which delete the portfolio value `K` exists to create. The plan below executes that decision.

A second tension shaped the structure: building an admin CMS in a project that also has a player PWA, scoring engine, sync engine, and analytics pipeline coming (6+ adapter swaps over the milestone ladder) means the architectural pattern picked now compounds. **Hexagonal/Clean Architecture (Layout 4)** was locked after walking through 5 layout options — see Key Technical Decisions for full rationale.

---

## Requirements

- **R1.** Deliver `K-1` (lesson store): S3 (`lessons/<id>/source.<ext>`) + DynamoDB single-table (`PK=LESSON#<id>` `SK=METADATA`) + magic-byte file validator on upload. *Cover images are out of scope for K v1 — the Lesson `coverImageUrl` field stays nullable and curators paste a public URL in the admin form; cover-image upload pipeline is deferred to a follow-up.*
- **R2.** Deliver `K-3` (catalog API + delivery): Lambda Function URL behind CloudFront with `GET /lessons?category=&difficulty=&tag=` (list projection) and `GET /lessons/{id}` (full record + short-lived signed URL for file).
- **R3.** Deliver `K-2` (admin SPA + CRUD): React-Admin SPA on S3+CloudFront, gated by CloudFront Function Basic-Auth (KVS-backed credential), talking to a Lambda FURL CRUD API (`POST/PUT/DELETE /lessons` + `POST /lessons/{id}/file` → presigned S3 PUT).
- **R4.** All infra provisioned via Pulumi TypeScript (`@pulumi/aws` v7) — the `H-1` portfolio multiplier.
- **R5.** Stay inside AWS Always-Free tier — no Fargate, no EC2, no API Gateway, no Amplify, no Cognito.
- **R6.** Implement against `song-schema.md`'s current Lesson interface (status: DRAFT — Track 3 finalizes) — admin and player must read/write the same shape. If Track 3 lands changes, update `core/lesson/Lesson.ts` and type-check all consumers.
- **R7.** Repo follows Hexagonal/Clean Architecture (Layout 4) at the top level — `core/` + `adapters/` + `apps/` + `infra/`. Dependency direction enforced in CI via `dependency-cruiser`.
- **R8.** All license-clean (MIT/Apache/BSD/MPL-2.0) — React-Admin (MIT), `file-type` (MIT), Pulumi (Apache-2.0), etc. The admin is internal-web only, never bundled into App Store binary.

**Origin actors:** the source doc (`docs/cms-approach.md`) is an approach/decision doc, not a brainstorm with explicit A-IDs. Implicit single actor: the curator (you, internal admin user). No origin F/AE IDs to carry forward.

---

## Scope Boundaries

### Deferred for later

Carried from origin (`cms-approach.md` Open items + `feature-freeze.md` milestone allocations):

- **Refine vs React-Admin re-evaluation** — React-Admin locked; revisit only if shadcn-native styling becomes desired.
- **alphaTex hard parser validation on upload** — defer to async background validation (the parser is too heavy for a cold-started Lambda; magic-byte sniff for binary formats + UTF-8 sniff for alphaTex is the upload-time gate, with `status="pending_validation"` until async confirm). **The public read API enforces `status="published"` filtering, so `pending_validation` lessons are NOT served to the player — they remain admin-visible only until hard validation lands.**
- **Multi-credential / per-user admin auth** — single shared credential is sufficient (single curator). Multi-user is `M1+` if needed.
- **Prod stack (`prod` Pulumi stack)** — `dev` only until the app is shipping. The plan creates the multi-stack scaffolding but provisions only `dev`.
- **Cover image upload pipeline** — R1 narrowed to source-file upload only. `coverImageUrl` in the Lesson schema is a nullable string the curator pastes manually in the admin form (a public CDN URL, a GitHub raw URL, etc.). Cover-image presigned-PUT + image magic-byte validation (JPEG/PNG/WebP) is a follow-up plan if curation friction demands it.

### Outside this product's identity

- **NOT a multi-tenant CMS.** Single curator, shared/global content. No org/team/role model. (User uploads = `H-10` @ M1 — different surface, different identity story.)
- **NOT a workflow/approval CMS.** Draft/publish status exists on the Lesson record but no review queue, no approver routing, no notifications.
- **NOT a content-design tool.** Lessons are authored externally (`.gp` files in Guitar Pro, `.mid` files in any DAW, `.alphatex` files in a text editor) and uploaded as-is. No in-browser composition.
- **NOT a public-facing admin.** Internal/utilitarian; React-Admin's MUI default is the v1 look. `/design-shotgun` does NOT cover this surface.

### Deferred to Follow-Up Work

Plan-local — work that will be done separately:

- **Track 2 plan revision** — the existing `docs/cicd-pipeline.md` (in worktree `vigorous-goldwasser-73ccca/`) assumes a `apps/web` + `infra` + `packages/*` workspace shape. **Owner: leocaseiro. Verification step before starting U1: run `git log master -- apps/web infra packages` in the main repo; if any commits exist, the Layout-4 re-do is destructive (delete + recreate) and must be a clearly-labeled breaking PR.** Track 2 revision: replace workspace shape with Layout 4 (`core/*` + `adapters/*` + `apps/*` + `infra`); update CI path filters; re-key file-ownership table (Track 1 owns `apps/player-pwa/src/**`, NOT `apps/web/src/**`). **U1 of this plan includes an escape-hatch section** — if Track 2 hasn't landed, U1's own bootstrap supersedes the existing scaffold.
- **Track 3 schema lock** — `song-schema.md` is DRAFT. Track 3 is finalizing it. This plan imports the Lesson interface from `song-schema.md` as authoritative; if Track 3 lands changes, `core/lesson/Lesson.ts` updates accordingly. **U1 and U2 are safe to start against the draft; U4 and U5 SHOULD wait for Track 3 lock to avoid wire-contract churn — see U5 Phase C exit gate.**
- **Player PWA implementation** — separate plan. This plan does NOT create an `apps/player-pwa/` stub (scope-guardian + product-lens flagged that as pre-committing player-app shape decisions outside this plan's scope). The player track consumes the public CDN URL + public API URL as Pulumi stack outputs exposed by U9.
- **Cover image upload pipeline** — see "Deferred for later" above.
- **alphaTex hard parser validation** — see "Deferred for later" above. Async-job pattern recommended (SQS-triggered Lambda with 15-min timeout) when scheduled.
- **CI deploy workflow for the admin SPA** — covered in `U1` for the basic shape; full `deploy.yml` with OIDC-assume + `aws s3 sync` + CloudFront invalidation extension to admin SPA is a separate scope (overlaps with Track 2's existing deploy.yml plan).

---

## Context & Research

### Relevant Code and Patterns

The repo is **greenfield**. Two adjacent artifacts to align with:

- **`vigorous-goldwasser-73ccca/`** sibling worktree has an executed Wave 1 (React 19 + Vite 6 + Vitest + bun workspaces + path-filtered CI) — *this gets superseded by this plan's U1*. Reference for proven config patterns (Vite version, ESLint setup, CI workflow shape) but not for code copy.
- **`alphaTabWebsite` fork** (`~/Sites/alphaTabWebsite`, MPL-2.0): NOT consumed by `K` directly. Phase 0 rhythm-game patterns are for the player PWA, not the CMS. Mentioned only because `core/lesson/LessonValidator.ts` magic-byte detection mirrors what `H-10` will eventually need for user uploads.

### Institutional Learnings

`docs/solutions/` does not exist yet in this repo. Per the learnings researcher: "Treat this CMS build as the **seeding event** for `docs/solutions/`." After landing each focus area, capture durable lessons via `/ce-compound`. Highest-value capture candidates:

- CloudFront Function KVS-backed Basic-Auth rotation pattern (security_issue + convention)
- Pulumi ComponentResource conventions for the Lambda+URL+CloudFront triad (architecture_pattern)
- DynamoDB single-table access-pattern table for the Lesson catalog (design_pattern)

### External References

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
- **OAC + `AuthType: AWS_IAM` on Lambda Function URLs.** Without OAC, the FURL is publicly reachable bypassing CloudFront entirely (defeats the Basic-Auth gate). Required for OAC: (a) `aws.lambda.Permission` with `principal: cloudfront.amazonaws.com` AND `sourceArn: <distribution_arn>` (pins invocation to the specific distribution; without `sourceArn` ANY CloudFront distribution in ANY AWS account could invoke the FURL); (b) CF cache behavior uses managed origin request policy `AllViewerExceptHostHeader` (id `b689b0a8-53d0-40ab-baf2-68738e2966ac`) so POST/PUT bodies forward correctly for SigV4 signing. Admin file uploads bypass this by going **direct to S3 via presigned PUT** (not through CloudFront).
- **Two separate CloudFront distributions:** `admin.notation-hero.com` (KVS-backed Basic-Auth gate, points at admin SPA bucket + admin CRUD FURL behind OAC) and `cdn.notation-hero.com` or `api.notation-hero.com` (no gate, points at public read FURL behind OAC). Mixing them via path-pattern is fragile and forces gate logic into the public path. The admin distribution has TWO cache behaviors — default → SPA bucket; `/api/*` → admin Lambda FURL — both gated by the same EdgeBasicAuth CF Function on viewer-request. **Cache policy for `/api/*` MUST be AWS-managed `CachingDisabled` (id `4135ea2d-6df8-44a3-9df3-4b5a84be39ad`)** to prevent CloudFront caching of authenticated responses and serving them across requests (adversarial flagged this as a P0 auth bypass risk if the default cache key — which omits `Authorization` — is in play).
- **DynamoDB single-table** as documented in `song-schema.md`: `PK=LESSON#<id>` `SK=METADATA`; GSI1 `(category, order)` for catalog listing; GSI2 `(updatedAt)` for future change-feed (`H-3` @ M1). `PAY_PER_REQUEST` billing — small catalog stays in free tier without provisioned-capacity bookkeeping.
- **Raw `@aws-sdk/lib-dynamodb` (no DynamoDB-Toolbox wrapper)** for the single Lesson entity. Originally specified Toolbox v2.8; product-lens + scope-guardian both flagged it as over-specified for a 1-entity catalog (saves ~20 LOC of PK/SK composition while adding a dependency with documented v2.x breaking-syntax history). Zod schema in `core/lesson/Lesson.ts` handles runtime validation; `@aws-sdk/lib-dynamodb` `DocumentClient` handles marshaling. Re-evaluate Toolbox if a 2nd entity lands.
- **`file-type` (sindresorhus, MIT)** for magic-byte detection. Streaming from S3 via `fileTypeStream(Readable.toWeb(s3Stream))` — only first ~4KB hits Lambda memory (matters for the 50MB Guitar Pro cap that mirrors `H-10`).
- **Quarantine = prefix in same bucket** (`uploads/quarantine/` → `lessons/<id>/`). Failed validations → `uploads/rejected/<original-key>` with `x-amz-meta-reason` + 7-day lifecycle TTL.
- **Pulumi ComponentResource pattern** with naming convention `notation-hero:<module>:<ResourceType>` (e.g., `notation-hero:cms:AdminApi`). All children passed `{ parent: this }`; `registerOutputs()` called synchronously.
- **Pulumi: single project, multi-stack** — one project (`notation-hero-infra`), stacks `dev` (only one provisioned now), `prod` (config scaffolding only). No cross-stack references.
- **Pulumi: ACM cert provider pinned to `us-east-1`** — CloudFront alternate-domain certs MUST live there regardless of the rest of the stack's region. Instantiate a second `aws.Provider` for cert resources.
- **Manual constructor-wiring DI** (no `tsyringe`/`awilix`/`inversify`). Solo project + ~10 use cases; a `buildApp()` composition function in each `apps/*/handler.ts` is clearer and tree-shakes better.
- **`dependency-cruiser` for layer enforcement** — CI rule blocks any import from `core/` into `adapters/` or `apps/`. Lighter than ArchUnitTS; single CLI; integrates with the existing path-filtered CI.
- **Bun for monorepo tooling + Vitest for tests + esbuild for Lambda bundling.** Bun is not the Lambda runtime (Node.js 22 is).
- **Test posture per layer:**
  - `core/` — pure unit tests (no mocks needed; no I/O)
  - `adapters/` — integration tests against LocalStack (pinned version `localstack/localstack:4.x` via `docker-compose.test.yml`) or a dev AWS sandbox
  - `apps/*/handler.ts` — unit tests with fake adapters (in-memory implementations of ports)
- **Pulumi ComponentResource scope:** only **`LambdaWithUrl`** (3 consumers: 3 Lambdas) and **`CloudFrontStaticSite`** (2 consumers: admin distro + public distro) earn the component-class abstraction. Originally specified 5 components; scope-guardian flagged that `DynamoSingleTable`, `EdgeBasicAuth`, and `S3FileBucket` each have exactly one consumer in this plan — premature generality. Inline those as plain Pulumi resource blocks directly in `infra/index.ts`. Extract to components when a 2nd consumer materializes. Plus **`LambdaWithUrl` carries an optional `createFunctionUrl: boolean` arg** (default `true`) so the validator Lambda (event-triggered, no FURL) can reuse the IAM-role + log-group boilerplate without a wrong-named abstraction (coherence + scope-guardian convergence — was "`LambdaWithUrl (no FURL — this is event-triggered)`" in the original draft).
- **Drop `adapters/http-client/` as a separate package; collapse into `adapters/react-admin/`.** The `CatalogApiClient` is ~50-100 LOC of `fetch` boilerplate with one consumer in this plan (`lessonsDataProvider`). Standalone-package overhead (workspace, package.json, version resolution hop) is unjustified. Extract when player PWA needs the same wrapper.
- **GSI2 (`updatedAt` change-feed) NOT built in K v1.** Originally specified for the future `H-3`/`H-5` change-feed at M1. Scope-guardian flagged it as scope creep into M1's surface. Comment in the DynamoDB inline-resource block: `// GSI2 (updatedAt change-feed) — add when H-3 lands; PAY_PER_REQUEST allows zero-downtime addition.`
- **SNS `lesson-events` topic + admin Lambda event emit IN SCOPE for K v1** (per F-DR2b — product-lens convergence). Topic provisioned by `infra/index.ts`. Admin Lambda CRUD use-cases (`createLesson`, `updateLesson`, `deleteLesson` in U6) publish typed events (`lesson.published`, `lesson.updated`, `lesson.deleted`) via `core/observability/ports/EventSink` → `adapters/sns/SnsEventSink`. Event schema in `core/lesson/LessonEvent.ts`. NO subscribers in K — that's H-6's job. Locks the contract so H-6 can subscribe without coordinating breaking changes. SNS free tier: 1M req + 1k emails/mo.
- **`dependency-cruiser` rules:** (a) `core/` cannot import from `adapters/` or `apps/`; (b) `adapters/` cannot import from `apps/`; (c) no cyclic imports; (d) `apps/*/handler.ts` (and `use-cases/`, `routes/`) cannot import from `apps/*/infra.ts` or `@pulumi/*` (prevents Pulumi from being bundled into Lambda runtime — adversarial-flagged layer-boundary gap); (e) `apps/*/infra.ts` cannot import from `handler.ts`/`use-cases/`/`routes/` (composition direction guard). **Dropped:** the original `no-orphans` rule — scope-guardian flagged it false-positives on Hexagonal port interfaces (which are intentionally not imported by their implementing adapters; adapters import from core but ports are type-only references at construction time).
- **`.dependency-cruiser.cjs` uses CommonJS `module.exports = { ... }` syntax** (NOT ESM `export default`) — root `package.json` is `"type": "module"`, so the `.cjs` extension is the explicit-CommonJS escape (feasibility footgun).
- **Pulumi backend MUST be Pulumi Cloud or S3+KMS** (NOT local filesystem). Pre-deploy check in `infra/README.md` and CI: `pulumi backend` MUST NOT report `file://`. Local backend = plaintext state.json on disk = credential leak vector (security-lens flagged the original "Use Pulumi Cloud OR self-managed" wording as documentation-not-enforcement).
- **CORS allow-origins MUST be an explicit list on both distributions; `*` is prohibited.** If domain isn't finalized at deploy time, use a dummy explicit list (e.g., `https://admin.notation-hero-dev.com`) as a placeholder. CloudFront Response Headers Policy carries the list; `Vary: Origin` always set to prevent cache poisoning. (Security-lens + adversarial convergence.)
- **CSP on admin SPA distribution Response Headers Policy.** `default-src 'self'`; `script-src 'self'`; `style-src 'self' 'unsafe-inline'` (MUI requires inline styles in v5); `img-src 'self' data: https:` (cover images may be on arbitrary CDNs); `connect-src 'self' https://*.s3.<region>.amazonaws.com` (presigned PUT direct-to-S3). Prevents stored-XSS if React-Admin ever renders attacker-controlled content (security-lens deferred Q).
- **ACM cert two-pass deploy on first bring-up.** Pass 1: `pulumi up --target` for ACM certs + DNS validation CNAME records only; wait for `ISSUED` status (5-30 min). Pass 2: full `pulumi up` for everything else. Use `aws.acm.CertificateValidation` resource to gate dependent resources on cert validation. **CloudWatch alarm** on `AWS/CertificateManager DaysToExpiry < 30` per cert (free; ACM auto-renewal only works if validation CNAMEs persist in DNS — operational note in U9 README). Replaces the original Success Metric claim of "5-min deploy" (adversarial-flagged unrealistic for first deploy).
- **Admin gate rate-limiting deferred as explicit non-goal in K v1; add CloudWatch alarm only.** Originally not addressed; security-lens + adversarial flagged the brute-force cost-amplification risk. Decision: single-curator scope makes WAF overkill ($1/rule/mo + complexity); instead, add a CloudWatch alarm on `4xxErrorRate > 10/sec` on the admin distribution → email to operator. If alarm fires (suggests probing), add WAF with rate-based rule reactively. Document as explicit deferred-with-trigger in Risks. (NOT just silently omitted.)
- **Audit log for admin write operations** — structured CloudWatch log entries emitted by `createLesson` / `updateLesson` / `deleteLesson` / `mintFileUploadUrl` use-cases. Fields: operation, lessonId, timestamp, source IP (from CloudFront forwarded header), credential-version (KVS key timestamp at request time). ~3-5 LOC per use-case; no additional AWS services. Provides forensic capability without `H-7` SLO machinery. (Security-lens P2 finding.)

---

## Open Questions

### Resolved During Planning

- **Layout choice:** strict top-level Layout 4 (Hexagonal) — user explicitly chose Path 1 over Path 2 (retrofit under `packages/`) after seeing Wave 1 was already scaffolded with the `apps/web` shape. Premise audit added (see Key Technical Decisions) per doc-review.
- **Subdomain vs path for admin gate:** subdomain (`admin.notation-hero.com`) wins over path-prefix on a single distribution. Cleaner scope for the CF Function gate; no path-pattern coupling.
- **Two CloudFront distributions or one:** two. One for admin (gated), one for public read (ungated). Same cost on free tier; cleaner gate scoping. Admin distribution carries 2 cache behaviors (default → SPA bucket; `/api/*` → admin Lambda FURL via CachingDisabled policy).
- **Credential storage for Basic-Auth:** CloudFront KVS (not baked credential). KVS holds raw `base64(user:pass)` — NOT hashed (CF Functions can't hash at edge). Plaintext-in-KVS risk mitigated via IAM-scoped state encryption (Pulumi backend = Cloud or S3+KMS, enforced).
- **Lambda runtime:** `nodejs22.x`. `nodejs20.x` deprecated April 2026.
- **`@pulumi/aws` major version:** v7. v6 is on the deprecation track.
- **Magic-byte library:** `file-type` (MIT, streaming-capable). Rolling our own would skip the Guitar Pro 6 `BCFZ` and GP7/8 ZIP-container edge cases.
- **Quarantine = same-bucket prefix** (not separate bucket). IAM scoping per-prefix gives the same security; separate-bucket multiplies resources for no gain. Quarantine prefix carries 24h lifecycle TTL (was referenced in System-Wide Impact but missing from S3 bucket config — added per doc-review convergence finding).
- **DynamoDB billing mode:** `PAY_PER_REQUEST`. Catalog stays in free tier; no provisioned-capacity guessing.
- **DI strategy:** manual constructor wiring. No DI container.
- **Track 2 plan posture:** Prereq + escape hatch in U1 (user-confirmed during doc-review). Track 2 revision is the canonical path; U1 includes a fallback bootstrap if Track 2 hasn't landed.
- **Cover image scope (R1):** narrowed to source-file upload only. `coverImageUrl` is a nullable string the curator pastes manually. Cover-image upload pipeline deferred (doc-review decision).
- **Success metrics rewrite (per F-DR2a):** original metrics measured CI green; replaced with portfolio-outcome metrics (solution docs + whiteboard rehearsal + decision captures) per product-lens convergence + user confirmation.
- **SNS `lesson-events` topic in scope (per F-DR2b):** topic + admin Lambda event emit added to K's scope; H-6 subscribes later. User-confirmed during doc-review.
- **DynamoDB-Toolbox:** dropped (over-spec for 1 entity); raw `@aws-sdk/lib-dynamodb` (doc-review convergence).
- **ComponentResource scope-down:** only `LambdaWithUrl` + `CloudFrontStaticSite` as components; `DynamoSingleTable`/`EdgeBasicAuth`/`S3FileBucket` inlined in `infra/index.ts` (doc-review).
- **`adapters/http-client/` package dropped:** `CatalogApiClient` collapses into `adapters/react-admin/` (doc-review).
- **GSI2 (`updatedAt`) NOT built in K v1:** comment-only placeholder; add when `H-3` lands (doc-review).
- **Admin gate rate-limiting:** explicit non-goal in v1 + CloudWatch alarm trigger (not WAF; not silently omitted). Doc-review judgment call.
- **CORS allow-origins:** explicit list mandatory; `*` prohibited (doc-review).
- **CSP on admin SPA:** specified explicitly (doc-review).
- **ACM cert two-pass deploy** on first bring-up + cert-expiry CloudWatch alarm (doc-review).

### Deferred to Implementation

- **Exact bun-workspace glob syntax** for the Layout 4 tree (`["core/*", "adapters/*", "apps/*", "infra"]` is the proposed shape — confirm bun accepts nested globs without quirks during U1; fallback is per-tree script enumeration).
- **CloudFront Function code size after writing** — 10KB compiled limit. Measure during U3 build via `aws cloudfront describe-function --stage DEVELOPMENT` — assert <8KB to leave 2KB headroom. Fallback if size blows: drop the KVS lookup and use a baked credential (compromises rotation story but stays inside the limit).
- **`constantTimeEquals` verification** on `cloudfront-js-2.0` runtime — XOR-accumulator may be optimized into early-exit by the JIT, defeating timing-resistance. Microbench at U3 build time. Fallback options: (a) reduce credential entropy to fit constant-time, (b) HMAC pattern (KVS stores HMAC key, function compares HMACs not creds).
- **Exact list-projection field set** for `GET /lessons` — depends on Track 3's final Lesson interface. Plan implements `song-schema.md`'s currently-documented projection (`[{lessonId, title, artist, difficulty, tags, bpm, durationBars, category, order, coverImageUrl}]`). U5 also emits `/v1/lessons` path versioning so a Track 3 reshape can ship as `/v2/lessons` without breaking deployed player clients. Contract test in CI guards the wire shape.
- **Signed-URL TTL** for `GET /lessons/{id}` file URL — likely 5min, but tune after measuring real player-load latency.
- **CloudWatch alarm strategy for K** — `H-7` SLOs are Beta-tier; K emits basic logs + 2 alarms only: (1) error-rate >10/sec on admin distribution (brute-force trigger), (2) ACM cert DaysToExpiry <30 per cert.
- **Exact CORS allow-origins values** — depends on final admin/player domain names. Plan locks the constraint (explicit list, `*` prohibited, `Vary: Origin`); fills in domains at deploy time via Pulumi config.
- **Whether bucket lifecycle TTL for orphaned upload+rejected is sufficient** — quarantine 24h, rejected 7d. Tune if curator UX shows real orphaned-upload patterns.
- **alphaTex async hard-validation plan** — separate follow-up plan; recommended pattern is SQS-triggered Lambda with 15-min timeout. Target milestone TBD; meantime `pending_validation` lessons are gated out of the public read API (so curator can see them in admin, player never serves them).
- **Pulumi resource path for `aws.cloudfront.KeyvaluestoreKey`** — verify at U3 build that the Pulumi `@pulumi/aws` v7 surface exposes this resource directly. If not, use a `command.local.Command` invoking the CLI for KVS key writes (feasibility-flagged conflict between research and v7 surface).

---

## Output Structure

Greenfield. This plan creates the following directory tree, replacing Track 2's Wave 1 scaffold:

```text
notation-hero/
├── core/                                  # Pure domain — NO AWS, NO React, NO HTTP imports
│   ├── lesson/                            # Bounded context: lessons (area K + later H-11)
│   │   ├── Lesson.ts                      # Entity (the schema type — mirrors song-schema.md)
│   │   ├── LessonId.ts                    # Value object (branded type)
│   │   ├── LessonValidator.ts             # Domain rule: magic-byte → format mapping
│   │   ├── LessonFilter.ts                # Query language (category, difficulty, tag, status)
│   │   ├── LessonEvent.ts                 # Event schema: lesson.{published,updated,deleted}
│   │   ├── errors.ts                      # InvalidFileFormat, LessonNotFound, …
│   │   ├── ports/
│   │   │   ├── LessonRepository.ts        # save/load/list/delete interface
│   │   │   ├── LessonFileStore.ts         # putFile/getSignedUrl interface
│   │   │   └── FileValidator.ts           # validateMagicBytes(stream): Format | error
│   │   └── __tests__/
│   │       └── LessonValidator.test.ts
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
│   ├── dynamodb/                          # Runtime adapter — raw @aws-sdk/lib-dynamodb (no toolbox)
│   │   ├── LessonRepositoryDynamoDB.ts    # implements core/lesson/ports/LessonRepository
│   │   ├── __tests__/                     # integration tests (LocalStack)
│   │   ├── docker-compose.test.yml        # localstack/localstack:4.x pinned
│   │   └── package.json                   # name: "@notation-hero/adapters-dynamodb"
│   ├── s3/                                # Runtime adapters
│   │   ├── LessonFileStoreS3.ts           # implements core/lesson/ports/LessonFileStore
│   │   ├── MagicByteValidator.ts          # implements core/lesson/ports/FileValidator
│   │   ├── __tests__/
│   │   ├── docker-compose.test.yml
│   │   └── package.json                   # name: "@notation-hero/adapters-s3"
│   ├── sns/                               # Runtime adapter for event emit
│   │   ├── SnsEventSink.ts                # implements core/observability/ports/EventSink
│   │   ├── __tests__/
│   │   └── package.json                   # name: "@notation-hero/adapters-sns"
│   └── react-admin/                       # UI adapter for the admin SPA
│       ├── lessonsDataProvider.ts         # React-Admin DataProvider
│       ├── lessonsResource.tsx            # Resource config (List/Edit/Create/Show)
│       ├── LessonFileInput.tsx            # Custom FileInput → presigned-PUT upload
│       ├── CatalogApiClient.ts            # fetch wrapper for /lessons (collapsed from http-client)
│       └── package.json                   # name: "@notation-hero/adapters-react-admin"
│
├── apps/                                  # Composition roots — one per deploy target
│   ├── admin-spa/                         # K-2 frontend: React-Admin SPA
│   │   ├── src/
│   │   │   ├── main.tsx                   # Wires CatalogApiClient + lessonsDataProvider
│   │   │   └── App.tsx                    # React-Admin <Admin> root
│   │   ├── infra.ts                       # Pulumi: CloudFrontStaticSite + 2 cache behaviors + KVS Basic-Auth gate
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json                   # name: "@notation-hero/admin-spa"
│   ├── lambda-cms-crud-admin/             # K-2 backend: admin CRUD + SNS emit
│   │   ├── handler.ts                     # buildApp() wires adapters → calls core
│   │   ├── infra.ts                       # Pulumi: LambdaWithUrl (AWS_IAM) + permissions + SNS publish IAM
│   │   ├── __tests__/handler.test.ts
│   │   └── package.json
│   ├── lambda-cms-crud-public/            # K-3: read API (filters status="published")
│   │   ├── handler.ts
│   │   ├── infra.ts                       # Pulumi: LambdaWithUrl + CloudFront + Response Headers Policy
│   │   └── package.json
│   └── lambda-cms-validate-upload/        # K-1: magic-byte validator (S3 event, no FURL)
│       ├── handler.ts                     # S3 event → validate → move + write DDB + emit event
│       ├── infra.ts                       # Pulumi: LambdaWithUrl(createFunctionUrl:false) + S3 event registered via shared bucket helper
│       └── package.json
│
├── infra/                                 # Pulumi root — composes apps/*/infra.ts + cross-cutting inline resources
│   ├── index.ts                           # Inline DynamoDB table, S3 bucket (+ CORS + lifecycle TTLs + notifications), KVS + KVS key, SNS topic, ACM certs (us-east-1 provider)
│   ├── Pulumi.yaml
│   ├── Pulumi.dev.yaml                    # dev stack config (basicAuthCredential as secure)
│   ├── Pulumi.prod.yaml                   # prod stack config (scaffolded, not deployed v1)
│   ├── README.md                          # operator runbook (deploy, rotate, rollback, KVS propagation)
│   ├── tsconfig.json
│   └── package.json                       # name: "@notation-hero/infra"
│
├── .github/
│   └── workflows/
│       ├── ci.yml                         # Linux, bun, path-filtered: core/adapters/apps/infra; LocalStack service
│       └── deploy.yml                     # On master merge: pulumi up (LOCAL for v1) → S3 sync → CF invalidate
│
├── package.json                           # bun workspaces: ["core/*", "adapters/*", "apps/*", "infra"]
├── tsconfig.base.json                     # path aliases: @core/*, @adapters/*, @apps/*
├── .dependency-cruiser.cjs                # Layer rules: core↛adapters, adapters↛apps, handler↛infra (no Pulumi in runtime), no-circular
├── .eslintrc.cjs                          # Per-layer ESLint rules (no-restricted-imports blocking aws-sdk/react in core/)
├── LICENSE                                # Proprietary (all rights reserved)
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
        PlayerApp -->|GET /lessons| PublicCF
        PublicCF --> PublicFURL
    end

    subgraph "UPLOAD PIPELINE"
        S3Upload[(S3: uploads/quarantine/&lt;uuid&gt;)]
        Validator[Lambda: cms-validate-upload<br/>magic-byte sniff via file-type]
        S3Lessons[(S3: lessons/&lt;id&gt;/source.&lt;ext&gt;)]
        S3Rejected[(S3: uploads/rejected/&lt;key&gt;<br/>7-day TTL)]
        AdminFURL -->|presigned PUT URL| AdminBrowser
        AdminBrowser -.->|direct PUT bypassing CF| S3Upload
        S3Upload -->|ObjectCreated event| Validator
        Validator -->|valid| S3Lessons
        Validator -->|invalid| S3Rejected
    end

    subgraph "STATE"
        DDB[(DynamoDB single-table<br/>PK=LESSON#&lt;id&gt; SK=METADATA<br/>GSI1 (category, order)<br/>GSI2 (updatedAt))]
        AdminFURL <--> DDB
        PublicFURL --> DDB
        Validator -->|write Lesson record on success| DDB
        S3Lessons -.->|signed URL minted by| PublicFURL
    end

    style AdminGate fill:#fa3
    style Validator fill:#3af
```

Three request flows mapped to the architecture:

1. **Admin authoring (CRUD):** browser → CF (admin distribution) → CF Function viewer-request gate (KVS-backed Basic-Auth) → either S3 bucket (SPA static assets via OAC) or Lambda FURL (`AuthType=AWS_IAM` via OAC; CRUD operations write to DynamoDB).
2. **Admin file upload:** browser POSTs to `/lessons/{id}/file` via CF (gated path) → admin Lambda mints a presigned S3 PUT URL → browser uploads file **directly to S3 quarantine prefix** (bypasses CloudFront entirely) → S3 ObjectCreated event triggers validator Lambda → magic-byte sniff → move to canonical key + write Lesson file metadata, OR move to rejected + log.
3. **Public read:** player app → CF (public distribution, no gate) → Lambda FURL (`AuthType=AWS_IAM` via OAC) → DynamoDB query (list projection via GSI1, full record via PK lookup) → for `GET /lessons/{id}`, also mint short-lived signed S3 URL for the source file.

The Hexagonal layer split per request: the Lambda handler is the **primary adapter** (HTTP → use case); `core/lesson/` use-cases call the **secondary adapters** (`LessonRepositoryDynamoDB`, `LessonFileStoreS3`, `MagicByteValidator`); composition root in `apps/lambda-*/handler.ts` wires them. Core never imports AWS SDK or React.

---

## Implementation Units

### U1. Repo bootstrap (Layout 4 monorepo skeleton + CI + dependency-cruiser)

**Goal:** Replace Track 2's Wave 1 scaffold with a Layout 4 monorepo: root `package.json` with bun workspaces (`core/*`, `adapters/*`, `apps/*`, `infra`), `tsconfig.base.json` with path aliases, `.gitignore`, `LICENSE` (proprietary all-rights-reserved), `dependency-cruiser` config enforcing layer boundaries, baseline `ci.yml` GitHub Actions workflow. Every subsequent unit depends on this shape existing.

**Requirements:** R7 (Layout 4) · R8 (license-clean).

**Dependencies:** None (Track 2's Wave 1 in `vigorous-goldwasser-73ccca/` is discarded; this unit produces the new canonical Wave 1).

**Files:**
- Create: `package.json` (bun workspaces, no app deps yet)
- Create: `tsconfig.base.json` (path aliases `@core/*`, `@adapters/*`, `@apps/*`; strict mode; `module: "esnext"`; `moduleResolution: "bundler"`)
- Create: `.gitignore` (node_modules, dist, .pulumi, .env*, *.log)
- Create: `LICENSE` (proprietary, all rights reserved)
- Create: `.dependency-cruiser.cjs` (CommonJS `module.exports = {...}` syntax — root package is `type: module`, the `.cjs` extension is the explicit-CommonJS escape). Rules: (a) `core` cannot import from `adapters` or `apps`; (b) `adapters` cannot import from `apps`; (c) `apps/*/handler.ts|use-cases/*|routes/*` cannot import from `apps/*/infra.ts` or `@pulumi/*` (prevents Pulumi in Lambda runtime bundle); (d) `apps/*/infra.ts` cannot import from `handler.ts`/`use-cases/`/`routes/`; (e) no cyclic imports. **No `no-orphans` rule** — Hexagonal port interfaces are intentionally not imported by their implementing adapters and would false-positive.
- Create: `.eslintrc.cjs` (TS + per-layer overrides — `no-restricted-imports` blocking `aws-sdk`/`react` in `core/`)
- Create: `.github/workflows/ci.yml` (bun setup pinned to 1.3.11, path-filter via `dorny/paths-filter@v3` emitting outputs for `core` / `adapters` / `apps-*` / `infra`; jobs: `lint` + `typecheck` + `test` + `depcheck` + per-app `build`; single aggregation `CI Green` job marked as required)
- Create: `core/.gitkeep`, `adapters/.gitkeep`, `apps/.gitkeep`, `infra/.gitkeep` (so workspace dirs exist before first package.json drops in)
- Test: `package.json` `scripts.test` runs `bun test` across workspaces; this unit's test is `bun install` + `bun run lint` + `bun run depcheck` running green on the empty skeleton.

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

### U2. Core domain (pure, no I/O)

**Goal:** Implement `core/lesson/` — entities (Lesson, LessonId), domain rules (magic-byte → Format mapping), port interfaces (LessonRepository, LessonFileStore, FileValidator), errors. Pure TypeScript, zero AWS/React/HTTP imports. Every adapter and Lambda handler in later units depends on these types and interfaces.

**Requirements:** R6 (song-schema.md fidelity) · R7 (Hexagonal layering).

**Dependencies:** U1.

**Files:**
- Create: `core/lesson/Lesson.ts` (TypeScript interface mirroring `song-schema.md`'s Lesson; Zod schema for runtime validation; branded `LessonId` type)
- Create: `core/lesson/LessonId.ts` (`type LessonId = string & { __brand: "LessonId" }`; constructor `LessonId.fromString(s: string): LessonId | InvalidLessonId`)
- Create: `core/lesson/LessonFormat.ts` (union type `Format = "gp" | "gpx" | "gp5" | "mid" | "alphatex"`; `formatFromExtension(ext: string): Format | UnknownExtension`)
- Create: `core/lesson/LessonValidator.ts` (pure functions: `validateLesson(input: unknown): Result<Lesson, ValidationError[]>`, `validateMagicBytes(bytes: Uint8Array): Result<Format, InvalidFileFormat>` — calls the magic-byte detection logic that adapter `MagicByteValidator` wraps with the `file-type` streaming API)
- Create: `core/lesson/LessonFilter.ts` (interface `{ category?: string; difficulty?: 1|2|3|4|5; tag?: string; pagination: { limit: number; cursor?: string } }`)
- Create: `core/lesson/errors.ts` (`InvalidFileFormat`, `LessonNotFound`, `LessonAlreadyExists`, `ValidationError` — discriminated-union types)
- Create: `core/lesson/ports/LessonRepository.ts` (interface with `save(lesson: Lesson): Promise<Result<void, RepositoryError>>`, `findById(id: LessonId): Promise<Result<Lesson, LessonNotFound>>`, `list(filter: LessonFilter): Promise<Result<{ items: Lesson[]; nextCursor?: string }, RepositoryError>>`, `softDelete(id: LessonId): Promise<Result<void, LessonNotFound>>`)
- Create: `core/lesson/ports/LessonFileStore.ts` (interface with `mintPresignedPut(id: LessonId, ext: string): Promise<Result<{ url: string; key: string }, FileStoreError>>`, `mintSignedGet(key: string, ttlSeconds: number): Promise<Result<string, FileStoreError>>`)
- Create: `core/lesson/ports/FileValidator.ts` (interface with `validateMagicBytes(stream: ReadableStream<Uint8Array>): Promise<Result<Format, InvalidFileFormat>>`)
- Create: `core/shared/kernel/Result.ts` (discriminated-union `Result<T, E> = { ok: true; value: T } | { ok: false; error: E }` + helper `ok()` / `err()`)
- Create: `core/shared/kernel/Brand.ts` (`type Brand<T, B> = T & { __brand: B }`)
- Create: `core/package.json` (name `@notation-hero/core`, no runtime deps; devDep on `vitest` + `zod`)
- Create: `core/tsconfig.json` (extends base; references `composite: true` for project refs later)
- Test: `core/lesson/__tests__/LessonValidator.test.ts`, `core/lesson/__tests__/LessonId.test.ts`, `core/lesson/__tests__/LessonFormat.test.ts`

**Approach:**
- The `Lesson` interface in `core/lesson/Lesson.ts` is the **single source of truth** for the schema. Adapter code (DynamoDB, React-Admin) imports it. If Track 3 lands changes to `song-schema.md`, update this file and downstream code surfaces type errors.
- Zod schema lives alongside the type: `LessonSchema` (Zod) → `type Lesson = z.infer<typeof LessonSchema>`. Single declaration, used both at compile-time (types) and runtime (validation in the Lambda handler).
- Branded `LessonId` prevents passing raw strings into ports (compile-time error). Construction via `LessonId.fromString(s)` validates UUID shape.
- `validateMagicBytes` in `LessonValidator.ts` contains the pure decision tree (ZIP → MIDI → BCFZ → Pascal-string GP3-5 → UTF-8 sniff). The `MagicByteValidator` adapter (U4) wraps it with the streaming I/O from `file-type`.
- `Result<T, E>` over throwing — keeps error-paths explicit at call sites and works well with Hexagonal layering.

**Patterns to follow:**
- Zod schema definitions: standard Zod 3.x patterns (no Zod-specific magic; well documented).
- Result type: tiny inline implementation (not pulling in `neverthrow` or `effect`); ~20 LOC.
- Test style: Vitest `describe/it/expect`; no mocks (no I/O to mock); table-driven for the magic-byte decision tree.

**Test scenarios:**
- Happy path: `validateLesson(validInput)` returns `ok(lesson)` with all required fields parsed; `formatFromExtension(".gp")` returns `ok("gp")`.
- Edge case: `validateMagicBytes` correctly classifies (a) GP3 (Pascal-string `\x18FICHIER GUITAR PRO v3.00`), (b) GP5 (`\x1eFICHIER GUITAR PRO v5.00`), (c) GP6 (`BCFZ` at offset 0), (d) GP7/8 (ZIP `PK\x03\x04` at offset 0), (e) MIDI (`MThd` at offset 0), (f) alphaTex (no magic bytes; UTF-8 sniff passes), (g) garbage bytes (returns `err(InvalidFileFormat)`).
- Edge case: `LessonId.fromString("not-a-uuid")` returns `err(InvalidLessonId)`; valid UUIDs return `ok(LessonId)`.
- Edge case: `validateLesson` with missing required fields returns `err([…])` listing each missing field; with `meta` blob containing arbitrary nested data returns `ok(...)` (extensibility).
- Edge case: `LessonFilter` with negative `pagination.limit` returns parse error; with `pagination.limit > 100` clamps to 100 (or errors — decide during impl).
- Error path: `validateLesson` with malformed `file.checksum` (not sha256 shape) returns specific error.
- No integration scenarios for this unit — pure domain, no I/O crossings.

**Verification:** `bun test core/` runs green with ≥95% line coverage on `core/lesson/`. `dependency-cruiser` confirms zero imports from `adapters/` or `apps/` into `core/`. `tsc --noEmit` clean. The `Lesson` type matches `song-schema.md`'s documented shape — manual spot-check at PR time.

---

### U3. Pulumi infra primitives (adapters/aws/ as ComponentResources)

**Goal:** Build the two reusable Pulumi ComponentResource classes that have ≥2 consumers in this plan: `LambdaWithUrl` (3 consumers — 3 Lambdas in U5/U6/U7) and `CloudFrontStaticSite` (2 consumers — admin distribution in U8 + public distribution in U5). The originally-planned `DynamoSingleTable`, `EdgeBasicAuth`, and `S3FileBucket` each have exactly one consumer and are inlined in `infra/index.ts` (U9) instead — scope-guardian-flagged premature generality.

**Requirements:** R4 (Pulumi IaC) · R5 (free-tier fit — components default to free-tier-safe configs).

**Dependencies:** U1.

**Files:**
- Create: `adapters/aws/LambdaWithUrl.ts` (ComponentResource: `aws.lambda.Function` with esbuild-bundled handler + `aws.iam.Role` (basic exec — `AWSLambdaBasicExecutionRole` for CloudWatch Logs) + `aws.iam.RolePolicy` (caller-injected statements) + `aws.cloudwatch.LogGroup` (configurable retention; default 7d dev / 30d prod) + **OPTIONAL** `aws.lambda.FunctionUrl` controlled by `createFunctionUrl?: boolean` arg (default `true`; set `false` for event-triggered Lambdas like U7's validator). When `createFunctionUrl=true`, supports `authType: "NONE" | "AWS_IAM"`).
- Create: `adapters/aws/CloudFrontStaticSite.ts` (ComponentResource: `aws.s3.Bucket` (private) + `aws.s3.BucketPolicy` (OAC-only access) + `aws.s3.BucketPublicAccessBlock` + `aws.cloudfront.OriginAccessControl` + `aws.cloudfront.ResponseHeadersPolicy` (caller-supplied CORS + CSP config) + `aws.cloudfront.Distribution` with default cache behavior. **Supports** `additionalOrigins?: { pathPattern: string; originUrl: pulumi.Input<string>; cachePolicy?: string; viewerRequestFunctionArn?: string }[]` so the admin distribution in U8 can add the `/api/*` behavior pointing at the admin Lambda FURL. **ACM cert** passed as args from the caller (caller instantiates via `us-east-1` Pulumi provider — components themselves don't touch the cert).
- Create: `adapters/aws/types.ts` (shared TS types: `LambdaWithUrlArgs`, `CloudFrontStaticSiteArgs`)
- Create: `adapters/aws/package.json` (name `@notation-hero/adapters-aws`, deps: `@pulumi/pulumi@^3`, `@pulumi/aws@^7`)
- Create: `adapters/aws/tsconfig.json`
- Create: `adapters/aws/README.md` (component catalog; args + outputs + intended use)
- Test: `adapters/aws/__tests__/components.smoke.test.ts` — `pulumi preview` smoke test using `@pulumi/pulumi/automation` API against both components in a throwaway in-memory stack.

**Approach:**
- Naming convention: `notation-hero:aws:LambdaWithUrl`, `notation-hero:aws:CloudFrontStaticSite` (per Pulumi guidance — pick once, never rename).
- Every child resource takes `{ parent: this }`.
- `registerOutputs({...})` called synchronously at end of constructor with the public outputs (`fnUrl?`, `fnArn`, `distributionDomain`, `distributionArn`, etc.).
- **`LambdaWithUrl` args:** `{ handlerDir: string; runtime?: "nodejs22.x" | "nodejs24.x"; env?: Record<string,pulumi.Input<string>>; createFunctionUrl?: boolean; authType?: "NONE" | "AWS_IAM"; reservedConcurrency?: number; logRetentionDays?: number; rolePolicyStatements?: aws.iam.PolicyStatement[] }`. Defaults: `nodejs22.x`, `createFunctionUrl: true`, `authType: "AWS_IAM"`, no reserved concurrency cap.
- **`CloudFrontStaticSite` args:** `{ bucketName: string; certArn: pulumi.Input<string>; aliases: string[]; defaultCachePolicyId?: string; responseHeadersPolicy?: aws.cloudfront.ResponseHeadersPolicyArgs; viewerRequestFunctionArn?: string; additionalOrigins?: { id: string; pathPattern: string; originDomain: pulumi.Input<string>; cachePolicyId?: string; originRequestPolicyId?: string; viewerRequestFunctionArn?: string }[] }`. Used by U8 (admin distribution with `additionalOrigins[0]` = `/api/*` → admin Lambda FURL + `viewerRequestFunctionArn` = the KVS-backed Basic-Auth function ARN) and U5 (public distribution with no additional origins, no viewer-request function).
- **Lambda code packaging — explicit orchestration:** root script `bun run build:lambdas` invokes `bun run --filter='./apps/lambda-*' build` BEFORE any `pulumi up`. Each `apps/lambda-*/build.ts` runs esbuild (`esbuild handler.ts --bundle --platform=node --target=node22 --format=esm --minify --external:@aws-sdk/* --outfile=dist/index.mjs`). The `LambdaWithUrl` component uses `pulumi.asset.FileAsset(path.join(handlerDir, 'dist/index.mjs'))` — eagerly resolved at synthesis time, errors loudly if `dist/index.mjs` is missing. CI `deploy.yml` runs `bun run build:lambdas` before `pulumi up`. (Addresses feasibility-flagged implicit ordering.)
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
- Lambda + esbuild bundling: `pulumi.asset.FileAsset("./dist/index.mjs")` after a `bun run build` step.
- KVS reference: [pulumi.com/registry/packages/aws/api-docs/cloudfront/keyvaluestore/](https://www.pulumi.com/registry/packages/aws/api-docs/cloudfront/keyvaluestore/).

**Test scenarios:**
- Happy path: instantiate each component in a Pulumi unit-test fixture (`@pulumi/pulumi/testing`); assert the expected child resources exist (e.g., `LambdaWithUrl` creates 4 children: Function, Role, RolePolicy, FunctionUrl).
- Happy path: `LambdaWithUrl` with `authType: "AWS_IAM"` emits a Function URL with that auth type; with `"NONE"` emits with NONE.
- Edge case: `DynamoSingleTable` with empty GSI list emits a table with PK/SK only and no GSIs (no extra ARNs in policy).
- Edge case: `EdgeBasicAuth` component synthesizes a CF Function with inlined KVS handle reference matching the KVS resource's ID.
- Integration scenario: `pulumi preview` on a throwaway stack using the component runs to completion (no resource graph errors) — confirms shape is deployable.
- Test expectation: no `pulumi up` in tests (no AWS account hits); only `preview` + Pulumi's mock testing API.

**Verification:** `bun test adapters/aws/` runs green. `dependency-cruiser` confirms `adapters/aws/` only imports from `@pulumi/*` and TS types from `core/` (no runtime core imports). Component naming convention applied uniformly.

---

### U4. Runtime adapters (DynamoDB + S3 + magic-byte)

**Goal:** Implement the secondary-adapter classes that wire the core ports to real AWS services: `LessonRepositoryDynamoDB` (implements `LessonRepository`), `LessonFileStoreS3` (implements `LessonFileStore`), `MagicByteValidator` (implements `FileValidator`). These are imported by the Lambda composition roots in U5/U6/U7.

**Requirements:** R1 (lesson store) · R3 (admin CRUD backend) · R7 (Hexagonal layer).

**Dependencies:** U2 (port interfaces).

**Files:**
- Create: `adapters/dynamodb/LessonRepositoryDynamoDB.ts` (constructor `{ tableName: string; client?: DynamoDBDocumentClient }`; implements `LessonRepository`; uses raw `@aws-sdk/lib-dynamodb` `DocumentClient` for marshaling — NO DynamoDB-Toolbox, per doc-review convergence on YAGNI for a single entity).
- Create: `adapters/dynamodb/schema.ts` (Zod schema re-export from `@notation-hero/core/lesson/Lesson` + DynamoDB key composition helpers: `pk(id) → "LESSON#${id}"`, `sk() → "METADATA"`, `gsi1PkSk(category, order, id) → { GSI1PK: category, GSI1SK: \`${order}#${id}\` }`)
- Create: `adapters/dynamodb/package.json` (deps: `@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`, `zod` peer; no DynamoDB-Toolbox)
- Create: `adapters/dynamodb/__tests__/LessonRepositoryDynamoDB.test.ts` (integration tests via LocalStack — pinned `localstack/localstack:4.x` in `docker-compose.test.yml`)
- Create: `adapters/dynamodb/docker-compose.test.yml` (LocalStack pinned with `SERVICES=dynamodb`, health-check)
- Create: `adapters/s3/LessonFileStoreS3.ts` (constructor `{ bucketName: string; client?: S3Client; signedUrlTtlSeconds?: number }`; implements `LessonFileStore`; uses `@aws-sdk/s3-request-presigner`).
- Create: `adapters/s3/MagicByteValidator.ts` (constructor `{ client?: S3Client }`; implements `FileValidator`; uses `file-type` package's `fileTypeStream` for streaming validation).
- Create: `adapters/s3/package.json` (deps: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `file-type@^21`)
- Create: `adapters/s3/__tests__/{LessonFileStoreS3,MagicByteValidator}.test.ts`
- Create: `adapters/s3/docker-compose.test.yml` (LocalStack pinned with `SERVICES=s3`)
- Create: `adapters/sns/SnsEventSink.ts` (constructor `{ topicArn: string; client?: SNSClient }`; implements `core/observability/ports/EventSink`; uses `@aws-sdk/client-sns` `PublishCommand` with `MessageAttributes` typed to the `LessonEvent` shape — admin Lambda's `createLesson`/`updateLesson`/`deleteLesson` use-cases publish via this).
- Create: `adapters/sns/package.json` (deps: `@aws-sdk/client-sns`)
- Create: `adapters/sns/__tests__/SnsEventSink.test.ts` (integration via LocalStack SNS)
- Create: `adapters/dynamodb/tsconfig.json`, `adapters/s3/tsconfig.json`, `adapters/sns/tsconfig.json`

**Approach:**
- `LessonRepositoryDynamoDB` uses `@aws-sdk/lib-dynamodb`'s `DocumentClient.send(new GetCommand|PutCommand|UpdateCommand|QueryCommand|...)`. Zod schema from `core/lesson/Lesson.ts` handles validation; DocumentClient handles attribute marshaling.
- PK/SK composition (via `schema.ts` helpers): `{ PK: "LESSON#${id}", SK: "METADATA" }`. GSI1 keys: `{ GSI1PK: category, GSI1SK: \`${String(order).padStart(6, '0')}#${id}\` }` (compound SK for stable sort within category; left-padded `order` for lexicographic correctness). **GSI2 (`updatedAt` change-feed) NOT built in K v1** — comment-only placeholder per doc-review scope-down.
- `list(filter)` translates `LessonFilter` to:
  - With `category` → Query on GSI1 with `KeyConditionExpression: "GSI1PK = :cat"` + `FilterExpression` for `difficulty` / `tag` / `status` (default `status="published"`).
  - Without `category` → Scan with FilterExpression (acceptable for hundreds of items; revisit at thousand-scale).
  - Pagination via `LastEvaluatedKey` opaque cursor — **MUST validate cursor shape on decode** (base64 → JSON → assert keys are non-empty strings before forwarding to `ExclusiveStartKey`); reject malformed cursor with `400 Bad Cursor` to prevent forged-cursor attacks (security-flagged in coherence-residual).
- `softDelete(id)` does NOT delete the item — sets `status = "draft"`, increments `version`, updates `updatedAt`. True deletion is a manual admin task (out of scope).
- `LessonFileStoreS3.mintPresignedPut(id, ext)` returns a URL with `Conditions: [["content-length-range", 0, 50_000_000], ["in", "$Content-Type", "application/octet-stream", "audio/midi", "audio/x-midi", "text/plain"]]` — **explicit Content-Type allowlist** (Guitar Pro = `application/octet-stream`, MIDI = `audio/midi`/`audio/x-midi`, alphaTex = `text/plain`). Prevents HTML/JS/SVG uploads at the S3 storage layer (security-flagged stored-XSS vector). Targeting key `uploads/quarantine/${uuidv4()}.${ext}` (NOT the final key — validator moves it on success). **`PutObject` SignedHeaders include `x-amz-meta-lesson-id`** so the validator (U7) can read the lesson-id metadata.
- `LessonFileStoreS3.mintSignedGet(key, ttl)` uses `@aws-sdk/s3-request-presigner` `getSignedUrl` with 5-min default TTL.
- `MagicByteValidator.validateMagicBytes(stream)` does NOT load the whole object — uses `fileTypeStream(Readable.toWeb(s3Body))` from `file-type` package; only the first ~4KB hits Lambda memory. Reads detected MIME, maps to our `Format` union via `core/lesson/LessonValidator`'s pure decision tree.
- **`adapters/http-client/` package is NOT built** as a standalone (per doc-review scope-down). The `CatalogApiClient` lives directly in `adapters/react-admin/CatalogApiClient.ts` (single consumer).

**Patterns to follow:**
- DynamoDB-Toolbox v2 patterns: [dynamodbtoolbox.com](https://www.dynamodbtoolbox.com/).
- `file-type` streaming usage:
  ```ts
  import { fileTypeStream } from 'file-type';
  const stream = await fileTypeStream(Readable.toWeb(s3Body));
  stream.fileType  // { mime, ext }
  ```
- S3 presigner: `@aws-sdk/s3-request-presigner@^3.x` (modular import).

**Test scenarios:**
- Happy path (DDB): `save(lesson)` then `findById(id)` returns equal record (round-trip).
- Happy path (DDB): `list({ category: "Rock", pagination: { limit: 10 } })` returns at most 10 items, all with `category="Rock"`, sorted by `order` then `id`.
- Happy path (DDB): `softDelete(id)` flips `status` to `"draft"`; `findById` still returns the record; `list` with no status filter still includes it (filtering is consumer responsibility).
- Happy path (S3): `mintPresignedPut(id, "gp")` returns a URL; client PUT of a small file to that URL succeeds; object lands at `uploads/quarantine/<uuid>.gp`.
- Happy path (S3): `mintSignedGet(key, 60)` returns a URL that fetches the object within 60s and returns 403 after expiry.
- Happy path (Validator): each format fixture (GP3/4/5/6/7/8 + MIDI + alphaTex sample) classified correctly via streaming validation.
- Edge case (DDB): `save` with duplicate ID returns `err(LessonAlreadyExists)` — confirms conditional write.
- Edge case (DDB): `list` with no items returns `ok({ items: [], nextCursor: undefined })`.
- Edge case (DDB): pagination — `list({ pagination: { limit: 5 } })` followed by `list({ pagination: { limit: 5, cursor: prevCursor } })` returns disjoint pages.
- Edge case (S3): `mintPresignedPut` with file format `"unknown"` returns `err(InvalidFileFormat)`.
- Edge case (Validator): garbage bytes return `err(InvalidFileFormat)`; partial file (truncated to 100 bytes) for a format where signature is shorter than 100 bytes still detects correctly.
- Error path: DDB throttling (simulated 429) returns `err(RepositoryError)`; LocalStack S3 outage (container stopped) returns `err(FileStoreError)`.
- Integration scenario: full upload pipeline simulation — `mintPresignedPut` → client PUT → `MagicByteValidator.validateMagicBytes` reads from S3 → returns format → caller can move object to canonical key. Confirms the contract that U7 will consume.

**Verification:** `bun test adapters/dynamodb/ adapters/s3/` runs green against LocalStack. CI runs the LocalStack-backed integration tests in a docker-compose service (acceptable on Linux ubuntu-latest; documented in `ci.yml`).

---

### U5. Public read API (K-3) — `apps/lambda-cms-crud-public`

**Goal:** Build the public catalog API Lambda — `GET /lessons?category=&difficulty=&tag=` (list projection) + `GET /lessons/{id}` (full record + short-lived signed S3 URL for the source file). Behind CloudFront via OAC (`AuthType: AWS_IAM`). Composes core use-cases with DynamoDB + S3 adapters.

**Requirements:** R2 (K-3 catalog API) · R7 (composition root).

**Dependencies:** U2 (core ports), U3 (LambdaWithUrl + CloudFrontStaticSite components), U4 (DynamoDB + S3 adapters).

**Files:**
- Create: `apps/lambda-cms-crud-public/handler.ts` (ESM Lambda handler; `buildApp()` composition function that constructs `LessonRepositoryDynamoDB` + `LessonFileStoreS3` and returns route table)
- Create: `apps/lambda-cms-crud-public/routes.ts` (route matchers: `GET /lessons` → listLessons use-case; `GET /lessons/:id` → getLesson use-case)
- Create: `apps/lambda-cms-crud-public/use-cases/listLessons.ts` (orchestrates `LessonRepository.list` + projection mapping to list-projection shape)
- Create: `apps/lambda-cms-crud-public/use-cases/getLesson.ts` (orchestrates `LessonRepository.findById` + `LessonFileStore.mintSignedGet` for the file URL)
- Create: `apps/lambda-cms-crud-public/infra.ts` (Pulumi `notation-hero:cms:PublicReadApi` ComponentResource: uses `LambdaWithUrl` (`AuthType: AWS_IAM`) + `aws.lambda.Permission` for `cloudfront.amazonaws.com` + `aws.cloudfront.OriginAccessControl` (origin type lambda) + `aws.cloudfront.Distribution` (public, no gate) + ACM cert from us-east-1)
- Create: `apps/lambda-cms-crud-public/build.ts` (esbuild script: bundles handler.ts → dist/index.mjs)
- Create: `apps/lambda-cms-crud-public/package.json` (deps: `@notation-hero/core`, `@notation-hero/adapters-dynamodb`, `@notation-hero/adapters-s3`, `@notation-hero/adapters-aws`, `@aws-sdk/client-*` as runtime; devDeps: `esbuild`, `@types/aws-lambda`, `vitest`)
- Create: `apps/lambda-cms-crud-public/__tests__/handler.test.ts` (unit tests with in-memory `LessonRepository` + `LessonFileStore` fakes)
- Create: `apps/lambda-cms-crud-public/__tests__/integration.test.ts` (against deployed dev stack — gated to run only when `INTEGRATION_TESTS=1`)
- Create: `apps/lambda-cms-crud-public/tsconfig.json`

**Approach:**
- Build before K-2 (admin CRUD) — simpler (read-only), validates the catalog API shape independently before admin write paths depend on it.
- Handler imports from `core/lesson/` and `adapters/*` only — never directly from `@aws-sdk` (that's the adapter's job). The handler is a thin wire.
- **`buildApp()` runs at Lambda INIT phase** (outside the handler function). Reads env vars (`TABLE_NAME`, `BUCKET_NAME`, `SIGNED_URL_TTL_SECONDS`), constructs adapters, returns route table. Subsequent invocations reuse the adapters (DynamoDB client connection-pooled per Lambda execution environment).
- **Path prefix `/v1/lessons` (NOT bare `/lessons`)** — locks the public API contract version so a Track-3 schema reshape can ship as `/v2/lessons` without breaking deployed player clients. Adversarial-flagged Track-3-drift risk.
- Route matching: minimal in-house matcher (~20 LOC). No framework — keeps cold start fast. Routes: `GET /v1/lessons?…`, `GET /v1/lessons/{id}`.
- **List filtering defaults to `status="published"`** — `pending_validation` and `draft` lessons are NEVER served from the public API (security + coherence convergent finding). `GET /v1/lessons/{id}` returns 404 for `status!="published"` records. Implementer override via `?includeStatus=…` query param is NOT exposed in v1.
- Response shape: list projection per `song-schema.md` (`[{lessonId, title, artist, difficulty, tags, bpm, durationBars, category, order, coverImageUrl}]`); full record for `GET /v1/lessons/{id}` is the complete published Lesson + `{ sourceUrl: string, signedUrlExpiresAt: number }`.
- **Pagination clamps** — `?limit` clamps to max 100 (silently — log warning); `?cursor` validated for shape, returns 400 on malformed.
- CORS: configured on CloudFront `ResponseHeadersPolicy` (NOT on the Function URL — CloudFront strips/replaces). `AllowOrigins` = **explicit list** from Pulumi config (e.g., `["https://app.notation-hero.com"]`); `*` is prohibited (security-lens P2 + adversarial residual). `Vary: Origin` set to prevent cache poisoning. Preflight: `Access-Control-Max-Age: 3600`.
- Distribution: public CloudFront (no gate). Custom domain `cdn.notation-hero.com` (or whatever the user finalizes). ACM cert provisioned via second Pulumi provider pinned to `us-east-1`. **Cache policy** for default behavior = AWS-managed `CachingOptimized` (id `658327ea-f89d-4fab-a63d-7e88639e58f6`) — public data is safe to cache 1 day; player rarely re-fetches.
- **OAC wiring (per Key Technical Decision):** `aws.lambda.Permission` includes `principal: cloudfront.amazonaws.com` AND **`sourceArn: distribution.arn`** (pins invocation to this specific distribution). Cache behavior uses **`AllViewerExceptHostHeader` origin request policy** (`b689b0a8-53d0-40ab-baf2-68738e2966ac`) so request headers + bodies forward for SigV4 signing.
- **Contract test in CI:** the response shape of `GET /v1/lessons` and `GET /v1/lessons/{id}` is validated against a checked-in JSON Schema fixture (`__tests__/contract/lessons-v1.schema.json`). Any drift fails CI loudly — protects deployed player clients from accidental wire-shape changes.

**Patterns to follow:**
- ESM Lambda handler with `index.mjs`: see Node.js 22 runtime docs.
- esbuild bundling: `esbuild handler.ts --bundle --platform=node --target=node22 --format=esm --minify --external:@aws-sdk/* --outfile=dist/index.mjs`.
- Composition root pattern: `buildApp()` returns plain object of route → use-case mappings.

**Test scenarios:**
- Happy path: `GET /lessons` with no filters returns list projection of all lessons (admin populated test data).
- Happy path: `GET /lessons?category=Rock` returns only Rock lessons.
- Happy path: `GET /lessons?difficulty=3&tag=ghost-notes` returns lessons matching both.
- Happy path: `GET /lessons/<uuid>` returns full Lesson + `sourceUrl` that fetches the file successfully within TTL.
- Edge case: `GET /lessons?pagination.limit=200` clamps to 100 (or returns 400 — decide during impl).
- Edge case: `GET /lessons?pagination.cursor=<invalid-base64>` returns 400 with error message.
- Edge case: `GET /lessons/<nonexistent-uuid>` returns 404 with `LessonNotFound` error.
- Edge case: `GET /lessons` when DynamoDB is empty returns `{ items: [], total: 0 }`.
- Error path: DynamoDB throttling (mocked) → handler returns 503 with `Retry-After` header.
- Error path: invalid UUID in path → returns 400 (caught by `LessonId.fromString` validation).
- Integration scenario: deployed Lambda behind CloudFront with OAC — direct hit to `lambda-url.<region>.on.aws` returns 403 (Lambda Function URL rejects unsigned requests when `AuthType=AWS_IAM`); hit via CloudFront returns 200 — confirms OAC seal.
- Integration scenario: CORS preflight from `https://admin.notation-hero.com` returns expected `Access-Control-Allow-Origin` header; preflight from `https://evil.example.com` returns no allow-origin (browser blocks).
- Integration scenario: signed URL minted by `getLesson` actually fetches the S3 file from the player's browser without auth (confirms S3 OAC config + presigning works end-to-end).

**Verification:** `bun test apps/lambda-cms-crud-public/` runs green for unit tests; integration tests pass against the deployed dev stack (manual trigger or scheduled). `pulumi preview` for the U5 module shows expected resource diff (Lambda + Role + Policy + FunctionUrl + Permission + OAC + Distribution + cert).

---

### U6. Admin CRUD API (K-2 backend) — `apps/lambda-cms-crud-admin`

**Goal:** Build the admin CRUD Lambda — `POST/PUT/DELETE /lessons`, `POST /lessons/{id}/file` (presigned PUT mint). Behind the gated admin CloudFront distribution with KVS-backed Basic-Auth + OAC. Implements R3.

**Requirements:** R3 (admin SPA + CRUD) · R7 (composition root).

**Dependencies:** U2 (core ports), U3 (LambdaWithUrl + EdgeBasicAuth components), U4 (DynamoDB + S3 adapters), U5 (proves the Lambda+OAC+CloudFront pattern).

**Files:**
- Create: `apps/lambda-cms-crud-admin/handler.ts` (ESM Lambda handler; `buildApp()` constructs `LessonRepositoryDynamoDB` + `LessonFileStoreS3`)
- Create: `apps/lambda-cms-crud-admin/routes.ts` (route matchers for POST/PUT/DELETE/POST-file)
- Create: `apps/lambda-cms-crud-admin/use-cases/createLesson.ts` (validates input via `core/lesson/LessonValidator`, persists, returns created Lesson)
- Create: `apps/lambda-cms-crud-admin/use-cases/updateLesson.ts` (loads existing, applies patch, validates merged result, persists)
- Create: `apps/lambda-cms-crud-admin/use-cases/deleteLesson.ts` (soft-delete via `LessonRepository.softDelete`)
- Create: `apps/lambda-cms-crud-admin/use-cases/mintFileUploadUrl.ts` (calls `LessonFileStore.mintPresignedPut`)
- Create: `apps/lambda-cms-crud-admin/infra.ts` (Pulumi `notation-hero:cms:AdminApi` ComponentResource: `LambdaWithUrl` (`AuthType: AWS_IAM`) + `aws.lambda.Permission` for CloudFront + `OriginAccessControl` (origin type lambda) — distribution is created in the admin SPA's infra.ts since SPA + API share the same CloudFront distribution with two cache behaviors)
- Create: `apps/lambda-cms-crud-admin/build.ts` (esbuild script)
- Create: `apps/lambda-cms-crud-admin/package.json`
- Create: `apps/lambda-cms-crud-admin/__tests__/handler.test.ts` (unit with in-memory fakes)
- Create: `apps/lambda-cms-crud-admin/__tests__/integration.test.ts` (against deployed dev stack with Basic-Auth credential from env)
- Create: `apps/lambda-cms-crud-admin/tsconfig.json`

**Approach:**
- `POST /api/lessons` body validated by `LessonValidator` (Zod). If validation fails, returns 400 with structured error list. **On success, publishes `lesson.published` event via `SnsEventSink` BEFORE returning 201** (event emission is part of the write — if SNS publish fails, the response is 500; DynamoDB record is left in place since the lesson is technically created, but the audit log captures the publish failure for retry).
- `PUT /api/lessons/{id}` requires `If-Match` header (DynamoDB version) for optimistic concurrency. **On success, publishes `lesson.updated` event.**
- `DELETE /api/lessons/{id}` flips status to `"draft"` (soft-delete). **On success, publishes `lesson.deleted` event** (with the soft-delete shape).
- `POST /api/lessons/{id}/file` returns `{ uploadUrl, key, contentLengthMax: 50000000, allowedContentTypes: [...] }`. Client uploads file DIRECT TO S3 (bypassing CloudFront entirely — presigned URLs hit S3 directly). The presigned PUT carries the metadata header `x-amz-meta-lesson-id` set by the admin Lambda; U7 validator reads it to find the Lesson record.
- Handler does NOT check Basic-Auth — that happens at the CloudFront edge before the request reaches Lambda. Handler trusts requests it receives (defense-in-depth via OAC means only CloudFront can invoke).
- **Distribution ownership:** the admin CloudFront distribution is created in U8 (`apps/admin-spa/infra.ts`) with two cache behaviors. U6's `infra.ts` ONLY creates the admin Lambda + IAM role + Function URL + Lambda Permission for CloudFront with `sourceArn` pinned. U6 exports the FURL output for U8's distribution `additionalOrigins[0]` consumption.
- Per-function reserved concurrency: set to 10 (cost-protection cap, NOT rate limiting — see Key Technical Decision on rate-limit deferral).
- **Audit log:** each write use-case emits a structured CloudWatch log entry: `{ operation, lessonId, timestamp, sourceIp (from x-amz-cf-id + CloudFront-Forwarded-For), credentialVersion (KVS key updatedAt at request time, fetched lazily once per cold start) }`. Provides forensic capability without `H-7` SLO machinery.
- **Validator-vs-admin write race (adversarial-flagged):** the admin Lambda updates the whole Lesson record (all attributes); U7's validator updates only `file.*` attributes after upload. To prevent admin's edit being clobbered by validator: U7 uses a partial `UpdateExpression` like `SET file = :file, version = version + :inc` with a `ConditionExpression` that does NOT lock on a specific version — it only validates the record exists. This keeps validator updates idempotent without forcing admin edits to retry.

**Patterns to follow:**
- Reuse the `buildApp()` + route-matcher pattern from U5.
- Optimistic concurrency: standard DynamoDB conditional-write on `version` attribute.

**Test scenarios:**
- Happy path: `POST /lessons` with valid body returns 201 with the created Lesson; subsequent `GET /lessons/{id}` (via public API) returns it.
- Happy path: `PUT /lessons/{id}` with valid patch updates the record; `version` increments.
- Happy path: `DELETE /lessons/{id}` flips `status` to `"draft"` (soft-delete, not hard-delete).
- Happy path: `POST /lessons/{id}/file` returns presigned URL; client PUTs a real `.gp` file to that URL; S3 ObjectCreated event fires (verified in U7 tests).
- Edge case: `POST /lessons` with missing required fields returns 400 with structured error listing each missing field.
- Edge case: `POST /lessons` with extra fields outside the schema (and not in `meta`) — decide policy: strip silently OR reject. Recommended: strip (Zod default).
- Edge case: `PUT /lessons/{id}` with stale `If-Match` returns 412 Precondition Failed.
- Edge case: `POST /lessons/{id}/file` with `ext` not in our Format union returns 400.
- Edge case: `DELETE /lessons/{nonexistent}` returns 404.
- Error path: DynamoDB write throttling → 503 with `Retry-After`.
- Error path: presigner errors (rare) → 500 with generic error message (no leaking adapter internals).
- Integration scenario: direct hit to admin Lambda FURL (bypassing CloudFront) returns 403 (AWS_IAM rejects unsigned).
- Integration scenario: hit through CloudFront WITHOUT `Authorization: Basic` header returns 401 with `WWW-Authenticate: Basic realm="admin"` header (CF Function gate enforces).
- Integration scenario: hit through CloudFront with wrong credential returns 401; with correct credential returns 200 (CF Function correctly reads KVS).
- Integration scenario: rotate KVS credential (single API call); old credential immediately rejected; new credential accepted — confirms instant rotation.

**Verification:** `bun test apps/lambda-cms-crud-admin/` green. Integration tests green against dev stack. KVS rotation tested end-to-end. Reserved concurrency cap verified via `pulumi preview`.

---

### U7. Magic-byte validator (K-1) — `apps/lambda-cms-validate-upload`

**Goal:** Build the S3-event-triggered Lambda that validates uploaded files via magic bytes, moves valid files to canonical keys, writes file metadata to the Lesson record, and routes invalid files to `rejected/` with structured rejection metadata.

**Requirements:** R1 (lesson store — file validation half).

**Dependencies:** U2 (core ports), U3 (LambdaWithUrl + S3FileBucket components — event source wiring), U4 (MagicByteValidator + LessonFileStoreS3 + LessonRepositoryDynamoDB adapters).

**Files:**
- Create: `apps/lambda-cms-validate-upload/handler.ts` (ESM handler; entry takes S3 event, processes each record, idempotent via DynamoDB conditional write on `processedKeys` audit table OR the Lesson record's `file.checksum`)
- Create: `apps/lambda-cms-validate-upload/use-cases/validateAndMove.ts` (orchestrates: fetch quarantine object stream → MagicByteValidator → if valid, copy to `lessons/<id>/source.<ext>` + delete quarantine + update Lesson record with file metadata; if invalid, copy to `rejected/<original-key>` with metadata + delete quarantine)
- Create: `apps/lambda-cms-validate-upload/infra.ts` (Pulumi `notation-hero:cms:UploadValidator` ComponentResource: `LambdaWithUrl` (no FURL — this is event-triggered) + `aws.lambda.Permission` for `s3.amazonaws.com` + `aws.s3.BucketNotification` filtering `uploads/quarantine/` prefix → invokes this Lambda)
- Create: `apps/lambda-cms-validate-upload/build.ts`
- Create: `apps/lambda-cms-validate-upload/package.json`
- Create: `apps/lambda-cms-validate-upload/__tests__/handler.test.ts` (unit with in-memory fakes — feed test fixtures for each format)
- Create: `apps/lambda-cms-validate-upload/__tests__/integration.test.ts` (against deployed dev stack — upload real file → wait → verify it landed correctly)
- Create: `apps/lambda-cms-validate-upload/tsconfig.json`

**Approach:**
- **`infra.ts` uses `LambdaWithUrl({ createFunctionUrl: false, … })`** — event-triggered, no Function URL needed. Coherence + scope-guardian convergent finding (originally `LambdaWithUrl (no FURL — this is event-triggered)` — wrong abstraction).
- **S3 BucketNotification is single-config-per-bucket** (AWS constraint). U7's `infra.ts` does NOT create a standalone `aws.s3.BucketNotification` — instead it registers its notification via a helper exposed by U9's inlined shared S3 bucket: `sharedBucket.addLambdaNotification({ lambdaArn, events: ["s3:ObjectCreated:*"], filterPrefix: "uploads/quarantine/" })`. The helper aggregates all notifications into one `BucketNotification` resource. Plus the matching `aws.lambda.Permission` for `s3.amazonaws.com` with `sourceArn` of the bucket.
- Quarantine key shape: `uploads/quarantine/<uuid>.<ext>` (the `<uuid>` is generated by the admin Lambda when minting the presigned URL; `<ext>` from the user-declared extension — NOT trusted for content-type, only for routing/logging).
- Validator reads object metadata first to extract `lessonId` (admin Lambda sets `x-amz-meta-lesson-id` on the presigned URL). **Pre-existence check (adversarial S3-race finding):** validator does a DynamoDB `GetItem` for the `lessonId` FIRST. If the Lesson record doesn't exist (curator uploaded before calling create, OR a presigned URL was reused after lesson deletion), move to `uploads/rejected/orphaned/<key>` with reason `lesson-record-missing` — log + skip Lesson update. Without `x-amz-meta-lesson-id` at all → `uploads/rejected/no-metadata/<key>`.
- Magic-byte validation via `MagicByteValidator.validateMagicBytes(s3Stream)` — only first ~4KB hits Lambda memory.
- On success: server-side `CopyObject` to `lessons/<lessonId>/source.<ext>` (where `<ext>` derives from the **detected** Format, NOT the user-declared `<ext>` — if mismatch, log warning and use detected); delete the quarantine object; update Lesson record's `file` field with partial UpdateExpression `SET file = :file, version = version + :inc` (matches admin-race mitigation in U6 — only `file.*` attributes touched, admin's category/title/etc. edits preserved); emit `lesson.file.validated` event via SNS.
- On failure: server-side `CopyObject` to `uploads/rejected/<original-key>` with object metadata `x-amz-meta-reason=<error-class>`; delete the quarantine object. Lifecycle rule on `uploads/rejected/` (defined in `infra/index.ts` S3 bucket inline) expires objects after 7 days. **Lifecycle rule on `uploads/quarantine/`** (added per doc-review convergence — was referenced in System-Wide Impact but missing from S3 bucket config) expires orphans after 24h.
- **Idempotency via computed sha256 dedup key (NOT ETag).** ETag breaks under multipart upload (>5MB Guitar Pro files SDK auto-multiparts). Validator computes `sha256(bucket + quarantineKey + first-4KB-content)` as dedup key, written to DynamoDB conditional UpdateExpression on a `processedUploads` set attribute on the Lesson record. Replays return early without DDB/S3 churn.
- **Bucket-notification filter must STRICTLY scope to `uploads/quarantine/` prefix** (adversarial-flagged copy-self-trigger risk). The `CopyObject` to `lessons/<id>/source.<ext>` would fire another ObjectCreated event if the filter were loose; the strict filter prevents infinite loop. **Test scenario** explicitly verifies validator does NOT re-trigger after the copy.
- alphaTex files: `file-type` won't detect (no magic bytes). Validator falls back to UTF-8 sniff (no `0x00` bytes in first 1KB, valid UTF-8 sequences). Sets Lesson `status = "pending_validation"` so the admin can see it's not yet hard-validated. **Per security-lens + coherence convergent finding: the public read API (U5) filters status="published" by default, so pending_validation lessons are NEVER served to the player** — they remain admin-visible only until the async hard validator lands.
- **Validator IAM scope (security-lens):** `s3:GetObject` on `${bucketArn}/uploads/quarantine/*` only; `s3:CopyObject`+`s3:PutObject` on `${bucketArn}/lessons/*` and `${bucketArn}/uploads/rejected/*` only; `s3:DeleteObject` on `${bucketArn}/uploads/quarantine/*` only; `dynamodb:GetItem`+`UpdateItem` on the specific table ARN; `sns:Publish` on the lesson-events topic ARN. NO wildcard prefixes — defends against path-traversal via crafted `x-amz-meta-lesson-id`. Additionally, **validate `lessonId` against `LessonId.fromString()`** before constructing destination key (UUID-shape check).
- **Defensive event-shape handling (adversarial nil-paths):** `if (!event.Records?.length) return { statusCode: 200 }` (AWS internal retry artifact). For each record: try GetObject; if `Body: undefined` (rare 0-byte race) → move to rejected with reason `empty-body`.
- Reserved concurrency: 5 (low — admin uploads are sparse).

**Patterns to follow:**
- S3 event source wiring: `aws.s3.BucketNotification` with `lambdaFunctions: [{ lambdaFunctionArn, events: ["s3:ObjectCreated:*"], filterPrefix: "uploads/quarantine/" }]` + matching `aws.lambda.Permission`.
- `file-type` streaming: `fileTypeStream(Readable.toWeb(s3Body))` — never `getObject` then check.

**Test scenarios:**
- Happy path: upload valid `.gp` file → validator detects GP7/8 (ZIP container) → copies to `lessons/<id>/source.gp` → Lesson record updated with `{ format: "gp", sizeBytes, checksum }` → quarantine object deleted.
- Happy path: upload valid `.mid` file → detects MIDI (`MThd`) → copies to `lessons/<id>/source.mid` → updates record.
- Happy path: upload valid `.alphatex` file → UTF-8 sniff passes → copies to `lessons/<id>/source.alphatex` → updates record with `status = "pending_validation"`.
- Edge case: upload file with declared `.gp` ext but actual MIDI bytes → detected as MIDI → stored with `.mid` ext, Lesson record updated to reflect actual format, log warning about ext mismatch.
- Edge case: upload object missing `x-amz-meta-lesson-id` → moves to `uploads/rejected/orphaned/<original-key>` with reason `missing-metadata`; no Lesson record touched.
- Edge case: upload same file twice (same ETag) → second invocation detects already-processed via conditional write, returns early; no duplicate move/update.
- Edge case: upload 50MB file → streaming validation only reads ~4KB; full file copied to canonical key via S3 server-side copy (no Lambda memory blow-up).
- Edge case: upload empty file (0 bytes) → magic-byte detection fails → move to rejected with reason `empty-file`.
- Edge case: alphaTex with binary garbage (some `0x00` bytes) → UTF-8 sniff fails → reject with `invalid-utf8`.
- Error path: DynamoDB unavailable during Lesson record update → leaves object in quarantine, retries via Lambda's built-in event-source retry → on persistent failure, DLQ (if configured; v1 may skip DLQ — log error and let next retry handle).
- Error path: S3 copy fails mid-flight (e.g., destination key already exists with same content) → idempotent retry handles; if persistent, move to `uploads/rejected/copy-failed/`.
- Integration scenario: admin SPA uploads real `.gp` file via React-Admin's FileInput → presigned PUT → S3 quarantine → validator triggered → 1-3 seconds later, list API returns the lesson with `file.key` populated; `GET /lessons/{id}` returns signed URL that fetches the original file successfully.
- Integration scenario: lifecycle rule on `uploads/rejected/` confirmed (objects expire after 7 days — verified via S3 lifecycle config in Pulumi state).

**Verification:** `bun test apps/lambda-cms-validate-upload/` green. End-to-end integration test (admin upload → validator → public read) passes against dev stack. Lifecycle rules verified in `pulumi preview`.

---

### U8. Admin SPA (K-2 frontend) — `apps/admin-spa`

**Goal:** Build the React-Admin SPA that talks to the admin CRUD API via a custom DataProvider, with a custom FileInput that uses presigned-PUT direct-to-S3 (NOT base64 inline upload). Deploy as static bundle to S3+CloudFront with the EdgeBasicAuth gate.

**Requirements:** R3 (K-2 admin SPA) · R7 (composition root for UI adapter).

**Dependencies:** U2 (core types via http-client adapter), U3 (CloudFrontStaticSite + EdgeBasicAuth components), U6 (admin CRUD API must exist — DataProvider needs an endpoint).

**Files:**
- Create: `apps/admin-spa/src/main.tsx` (React entry — wires `CatalogApiClient` + `lessonsDataProvider` + renders `<App />`)
- Create: `apps/admin-spa/src/App.tsx` (React-Admin `<Admin>` + `<Resource name="lessons" />` registration; imports `lessonsResource.tsx` from adapter)
- Create: `adapters/http-client/CatalogApiClient.ts` (fetch wrapper for the admin CRUD API URL; reads base URL from import.meta.env; throws structured errors mapped from HTTP status codes)
- Create: `adapters/http-client/package.json`
- Create: `adapters/react-admin/lessonsDataProvider.ts` (implements React-Admin v5.14 `DataProvider` interface: `getList`, `getOne`, `getMany`, `create`, `update`, `delete`, others delegating; uses `CatalogApiClient` for the wire)
- Create: `adapters/react-admin/lessonsResource.tsx` (React-Admin Resource config: `<List>` with filterable fields, `<Edit>` with form, `<Create>` with form, `<Show>` for read-only view)
- Create: `adapters/react-admin/LessonFileInput.tsx` (custom FileInput component: intercepts File object → calls `CatalogApiClient.mintFileUploadUrl(lessonId, ext)` → PUTs File to returned URL → on success, stores `key` in form state)
- Create: `adapters/react-admin/package.json` (deps: `react-admin@^5.14`, `ra-core@^5.14`, `react@^19`, `react-dom@^19`, `@notation-hero/adapters-http-client`, `@notation-hero/core` for types)
- Create: `apps/admin-spa/infra.ts` (Pulumi `notation-hero:cms:AdminSite` ComponentResource: composes `CloudFrontStaticSite` for SPA bucket + `EdgeBasicAuth` gate on viewer-request + cross-references U6's admin Lambda FURL as a second cache behavior at path `/api/*` + ACM cert from us-east-1)
- Create: `apps/admin-spa/vite.config.ts` (Vite 6+; React plugin; `define: { 'import.meta.env.VITE_API_URL': … }`)
- Create: `apps/admin-spa/index.html`
- Create: `apps/admin-spa/package.json` (deps: `@notation-hero/adapters-react-admin`, `react@^19`, `react-dom@^19`; devDeps: `vite@^6`, `@vitejs/plugin-react@^5`, `typescript@^5.7`, `vitest@^3`)
- Create: `apps/admin-spa/tsconfig.json`
- Create: `apps/admin-spa/__tests__/{App,LessonFileInput}.test.tsx` (smoke tests with Vitest + React Testing Library)

**Approach:**
- React-Admin v5.14.7 (current). MUI v5 baseline fine (no compat caveats). React 19 supported. **Pin transitive MUI/Emotion versions** in `apps/admin-spa/package.json`: `@mui/material@^5.16`, `@mui/icons-material@^5.16`, `@emotion/react@^11.13`, `@emotion/styled@^11.13` (feasibility-flagged React-19 strict-mode compat).
- No `authProvider` — the CF Function gate handles auth before the SPA loads. React-Admin runs auth-less by default.
- `lessonsDataProvider`:
  - `getList`: translates `{ pagination: { page, perPage }, sort, filter }` → `GET /v1/lessons?limit=N&cursor=...&sortField=...&sortOrder=...&category=...&difficulty=...&tag=...`. Response shape `{ data: Lesson[], total: number }` (or pageInfo with `hasNextPage` if cursor-based).
  - `getOne`: `GET /v1/lessons/{id}` → `{ data: Lesson }`.
  - `create`: `POST /api/lessons` with body. If body contains a `file` field with a `rawFile` (File object), first call mintFileUploadUrl + direct PUT, replace `file` with `{ key, format }` (the validator fills in sizeBytes/checksum async).
  - `update`: `PUT /api/lessons/{id}` with `If-Match` header carrying current version.
  - `delete`: `DELETE /api/lessons/{id}` (soft-delete).
  - `getMany`, `getManyReference`, `updateMany`, `deleteMany`: minimal implementations (likely not needed for v1; can throw "not supported" for non-essential ones).
- `LessonFileInput`: extends React-Admin's `<FileInput>` with `format`/`parse` props overridden to intercept the File object. On change: client-side size check (≤50MB); calls `mintFileUploadUrl` for presigned URL; PUTs File directly to S3 quarantine; on success stores opaque `key` in form state for the dataProvider to submit. Shows "upload pending validation" UI for alphaTex while the validator finishes async.
- Bundle target: Vite production build → ~180KB gzipped. Deployed to S3 bucket; CloudFront caches default 1 day, with `index.html` no-cache for instant updates.
- **U8 OWNS the admin CloudFront distribution.** `apps/admin-spa/infra.ts` instantiates `CloudFrontStaticSite` with TWO cache behaviors:
  - Default behavior → admin SPA S3 bucket via OAC. Uses managed `CachingOptimized` cache policy. ResponseHeadersPolicy includes CORS (explicit list from Pulumi config) + **CSP** (`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.s3.<region>.amazonaws.com`).
  - `/api/*` behavior → admin Lambda FURL (U6 exports the FURL) via OAC. **`CachingDisabled` cache policy** (id `4135ea2d-6df8-44a3-9df3-4b5a84be39ad`) — prevents the P0 auth-bypass risk from cached authenticated responses. Origin request policy = `AllViewerExceptHostHeader` for SigV4 body forwarding.
  - Both cache behaviors attach the inline KVS-backed Basic-Auth CF Function on viewer-request (function ARN passed in from `infra/index.ts` U9).
  - ACM cert for `admin.notation-hero.com` from us-east-1 (passed in by U9).
- **S3 BucketCorsConfigurationV2 on the shared S3 bucket** (defined inline in U9's `infra/index.ts` — adversarial-flagged P1): `allowedMethods: ["PUT", "POST"]`, `allowedOrigins: [adminDomain]`, `allowedHeaders: ["*"]`, `exposeHeaders: ["ETag"]`, `maxAgeSeconds: 3600`. Without this, browser preflight blocks the direct-to-S3 PUT and curator sees "upload failed" with no diagnostic. Verified in U8 integration test (CORS preflight returns 200 from admin origin; no allow-origin from evil origin).

**Patterns to follow:**
- React-Admin DataProvider template: based on `ra-data-json-server` (study source, write custom).
- Vite + React 19 + TypeScript: standard `create-vite` template adapted.

**Test scenarios:**
- Happy path: `<App />` renders without throwing; visiting `/` shows the lessons list (mocked DataProvider).
- Happy path: `lessonsDataProvider.getList` translates filters correctly into URL params; the http-client mock confirms the URL shape.
- Happy path: `LessonFileInput` selecting a real File → calls mintFileUploadUrl mock → calls PUT to returned URL → stores key in form state on success.
- Edge case: `getList` with no filters returns full list (URL has no `?` params).
- Edge case: `LessonFileInput` selecting a 60MB file → rejects before PUT (client-side size check matches server-side limit).
- Edge case: `update` with stale version → API returns 412 → DataProvider throws specific error → React-Admin shows conflict UI ("This lesson was updated elsewhere — refresh to see changes").
- Error path: API returns 500 → DataProvider error toast surfaces in React-Admin's default error handling.
- Error path: presigned PUT to S3 fails (network) → FileInput shows error inline; user can retry without resubmitting form.
- Integration scenario (manual): deployed admin SPA, log in via Basic-Auth, create a Lesson with `.gp` file upload, verify it appears in public `GET /lessons` after validator processes (1-3s).
- Integration scenario: edit existing Lesson, change category, save — verify list re-fetches and shows new category.
- Integration scenario: soft-delete a Lesson — confirms it no longer appears in list (default filter shows only `status="published"`).

**Verification:** `bun test apps/admin-spa/` smoke tests green. `bun run --filter apps/admin-spa build` produces a working bundle. Manual smoke against deployed dev stack: create + edit + delete + upload all work end-to-end.

---

### U9. Pulumi composition root (`infra/index.ts`) + cross-cutting resources

**Goal:** Build the Pulumi root entry point that composes all per-app `infra.ts` modules, defines cross-cutting resources (shared DynamoDB table, shared S3 bucket, KVS for credential), wires shared resources into the per-app modules, and provides stack-config indirection (`dev` / `prod` config files).

**Requirements:** R4 (Pulumi IaC composition) · R5 (free-tier-safe config defaults).

**Dependencies:** U3 (component classes exist), U5/U6/U7/U8 (per-app infra.ts files exist to compose).

**Files:**
- Create: `infra/index.ts` (Pulumi entry — instantiates cross-cutting resources, imports each app's `infra.ts` factory, wires them with shared ARNs/names)
- Create: `infra/Pulumi.yaml` (project metadata: `name: notation-hero-infra`, `runtime: nodejs`, `description: …`)
- Create: `infra/Pulumi.dev.yaml` (dev stack config: domain, region, log retention, etc.)
- Create: `infra/Pulumi.prod.yaml` (prod stack config scaffolding — NOT deployed v1)
- Create: `infra/package.json` (name `@notation-hero/infra`; deps: `@pulumi/pulumi@^3`, `@pulumi/aws@^7`, all `@notation-hero/adapters-aws` + each app workspace for infra.ts imports)
- Create: `infra/tsconfig.json`
- Create: `infra/README.md` (operator docs: how to set Basic-Auth credential via `pulumi config set --secret`, how to rotate, how to roll back, deploy steps)
- Test: `infra/__tests__/preview.test.ts` (Pulumi automation API smoke — `pulumi preview` on the dev stack runs without errors)

**Approach:**

**Pre-deploy guards** (run BEFORE `pulumi up` in CI deploy.yml AND documented in `infra/README.md`):
1. `pulumi backend` MUST NOT report `file://` (local backend = plaintext state on disk = credential leak). Pulumi Cloud or S3+KMS only.
2. `aws sts get-caller-identity` returns valid identity (AWS creds configured).

**`infra/index.ts` structure** (the 3 components from U3 are *not* used for inline resources — DynamoDB, S3 bucket, KVS, SNS topic, ACM certs, CF Function go directly as Pulumi resource calls):
```ts
// 1. Read config + setup
const config = new pulumi.Config()
const domain = config.require('domain')
const basicAuthCred = config.requireSecret('basicAuthCredential')  // base64(user:pass)
const corsOrigins = config.requireObject<string[]>('corsOrigins')   // explicit; no '*'

// 2. Cross-cutting resources (inline; no component class)
const lessonsTable = new aws.dynamodb.Table('lessons', {
  billingMode: 'PAY_PER_REQUEST', hashKey: 'PK', rangeKey: 'SK',
  attributes: [/* PK, SK, GSI1PK, GSI1SK */],
  globalSecondaryIndexes: [{ name: 'GSI1', hashKey: 'GSI1PK', rangeKey: 'GSI1SK', projectionType: 'ALL' }],
  pointInTimeRecovery: { enabled: true },
})
const lessonsBucket = new aws.s3.Bucket('lessons-storage', { /* private, AES256, versioning off */ })
new aws.s3.BucketPublicAccessBlock('lessons-storage-pab', { bucket: lessonsBucket.id, ...allBlocked })
new aws.s3.BucketCorsConfigurationV2('lessons-storage-cors', { bucket: lessonsBucket.id, /* PUT/POST from adminDomain only */ })
new aws.s3.BucketLifecycleConfigurationV2('lessons-storage-lifecycle', {
  bucket: lessonsBucket.id,
  rules: [
    { id: 'expire-quarantine', filter: { prefix: 'uploads/quarantine/' }, expiration: { days: 1 } },
    { id: 'expire-rejected', filter: { prefix: 'uploads/rejected/' }, expiration: { days: 7 } },
  ],
})
// addLambdaNotification helper aggregates all BucketNotification configs into one resource
const bucketNotifications = createBucketNotificationsAggregator(lessonsBucket)
const eventsTopic = new aws.sns.Topic('lesson-events', {})
const adminKvs = new aws.cloudfront.KeyValueStore('admin-cred-store', {})
// VERIFY at U3 build whether @pulumi/aws v7 exposes aws.cloudfront.KeyvaluestoreKey directly;
// if not, use command.local.Command invoking `aws cloudfront-keyvaluestore put-key`
const adminKvsKey = new aws.cloudfront.KeyvaluestoreKey('admin-cred', {
  keyValueStoreArn: adminKvs.arn, key: 'admin-cred', value: basicAuthCred,
})
const usEast1 = new aws.Provider('us-east-1', { region: 'us-east-1' })
const adminCert = new aws.acm.Certificate('admin', { domainName: `admin.${domain}`, validationMethod: 'DNS' }, { provider: usEast1 })
const cdnCert = new aws.acm.Certificate('cdn', { domainName: `cdn.${domain}`, validationMethod: 'DNS' }, { provider: usEast1 })
// adminCertValidation, cdnCertValidation — wait for ISSUED before downstream

// 3. Inline CF Function for KVS-backed Basic-Auth + microbench step
const basicAuthFn = new aws.cloudfront.Function('admin-basic-auth', {
  runtime: 'cloudfront-js-2.0',
  keyValueStoreAssociations: [adminKvs.arn],
  code: pulumi.interpolate`<inline JS template literal from U3 Approach>`,
})

// 4. Per-app composition
const publicApi = publicReadApi({ lessonsTable, lessonsBucket, cdnCert, corsOrigins, bucketNotifications })
const validator = uploadValidator({ lessonsTable, lessonsBucket, eventsTopic, bucketNotifications })
const adminApi = adminCrudApi({ lessonsTable, lessonsBucket, eventsTopic })
const adminSite = adminSpa({ adminLambdaArn: adminApi.fnArn, adminLambdaUrl: adminApi.fnUrl,
                              adminCert, basicAuthFnArn: basicAuthFn.arn, corsOrigins })

// 5. Outputs (player track + ce-work consume these)
export const adminUrl = adminSite.distributionDomain
export const publicCdnUrl = publicApi.distributionDomain
export const publicApiUrl = publicApi.distributionDomain  // same — public distro fronts the public Lambda
```

- Each per-app `infra.ts` exports a factory function (e.g., `publicReadApi(args): { fnUrl; fnArn; distributionDomain; ... }`). `infra/index.ts` calls them with shared resource references.
- **KVS rotation:** `pulumi config set --secret basicAuthCredential <newBase64>` then `pulumi up`. Updates only the KVS key resource (one-resource diff). **Propagation lag is 10-30s across edge locations** (operator README documents this — emergency rotation procedure: take admin distribution offline by updating the distribution to a 503 custom error page for 60s, then restore).
- **CloudWatch alarms** in U9:
  - `notation-hero-cms:admin-error-rate` — `aws.cloudwatch.MetricAlarm` on CloudFront `4xxErrorRate > 10/sec` on the admin distribution (brute-force trigger; email to operator)
  - `notation-hero-cms:cert-admin-expiry` — `AWS/CertificateManager DaysToExpiry < 30` on admin cert
  - `notation-hero-cms:cert-cdn-expiry` — same for cdn cert
- **ACM cert two-pass deploy on first bring-up:**
  - Pass 1: `pulumi up --target cert.admin --target cert.cdn` — wait for `ISSUED` (5-30 min depending on DNS propagation)
  - Pass 2: full `pulumi up` for everything else
  - `aws.acm.CertificateValidation` resource gates dependent resources on validation; subsequent runs only re-validate if certs change
- `Pulumi.dev.yaml`:
  ```yaml
  config:
    aws:region: us-east-1
    notation-hero-infra:domain: notation-hero-dev.com
    notation-hero-infra:logRetentionDays: 7
    notation-hero-infra:corsOrigins:
      - https://admin.notation-hero-dev.com
      - https://app.notation-hero-dev.com
    notation-hero-infra:basicAuthCredential:
      secure: <pulumi-encrypted-value>
  ```
- `Pulumi.prod.yaml` scaffolded but not provisioned in v1 (`logRetentionDays: 30`; prod domain; commented "DO NOT DEPLOY v1 — promote when app ships").
- **CFF microbench step in `infra/README.md`:** after `pulumi up` lands the CF Function, run `aws cloudfront describe-function --name admin-basic-auth --stage DEVELOPMENT` to verify (a) compiled function size <8KB; (b) `constantTimeEquals` execution time is constant across same-length/different-length comparisons (deploy a microbench function alongside; compare timing percentiles).

**Patterns to follow:**
- Pulumi `Config` patterns: `config.require(...)` for required string, `config.requireSecret(...)` for encrypted.
- Cross-provider resources (us-east-1 cert): instantiate a second provider, pass via `{ provider: useast1 }` opts.

**Test scenarios:**
- Happy path: `pulumi preview --stack dev` produces a complete resource diff with no errors (~30-40 resources expected: 1 DDB table + 1 S3 bucket + 1 KVS + 1 KVS key + 1 CF Function + 3 Lambdas + 3 IAM roles + 3 IAM policies + 3 FunctionUrls + 3 Lambda permissions + 2 OACs (admin + public) + 2 Distributions + 2 ACM certs + DNS records).
- Happy path: `pulumi up --stack dev` deploys to a real AWS account; admin and public URLs resolve; admin Basic-Auth prompt appears in browser; public API returns 200 on `GET /lessons`.
- Edge case: `pulumi config set --secret basicAuthCredential <newval> && pulumi up` updates only the KVS key (single resource diff); functionality continues without function redeploy.
- Edge case: changing `domain` config requires re-issuing ACM certs (Pulumi diff shows cert replacement) — verify and document the manual cert validation step.
- Error path: deploying to an AWS account without `lambda:CreateFunctionUrlConfig` permission → Pulumi clear error pointing at IAM gap.
- Error path: deploying when `aws:region` is `us-east-1` but admin distribution config tries to reference cert in `us-east-2` → Pulumi config error caught at preview.
- Integration scenario: full bring-up against fresh AWS account: `pulumi up` from zero → all resources created in dependency order (table + bucket first, then Lambdas + roles, then CF distributions, then DNS records) → admin curator can sign in within 5 minutes total.

**Verification:** `pulumi preview --stack dev` clean. `pulumi up --stack dev` succeeds in a real account. `pulumi up --stack dev` again with no changes shows zero diff (idempotency). KVS rotation tested. Operator README covers all common operations.

---

## System-Wide Impact

- **Interaction graph:** admin curator browser ⇌ CF Function gate ⇌ admin SPA assets / admin Lambda; admin Lambda → presigned URL → browser → S3 quarantine → S3 event → validator Lambda → DynamoDB + S3 canonical key; player app → public CF → public Lambda → DynamoDB + S3 signed URL. Every cross-boundary call is HTTPS; every Lambda invocation logs to CloudWatch.
- **Error propagation:** core use-cases return `Result<T, E>`; adapters map AWS SDK errors to domain errors (`RepositoryError`, `FileStoreError`); Lambda handlers map domain errors to HTTP status codes (4xx for client errors, 5xx for adapter errors with retry guidance). React-Admin DataProvider maps HTTP errors to its error UI conventions.
- **State lifecycle risks:** (a) orphaned quarantine objects if admin uploads but never calls `create` — mitigated by **provisioned** lifecycle rule on `uploads/quarantine/` (TTL 24h) defined inline in `infra/index.ts` S3 bucket config; (b) Lesson record references a `file.key` that doesn't exist if validator failed mid-flight — admin UI shows "file pending" status; manual cleanup if persistent; (c) duplicate S3 event firing on validator — idempotency check via **computed sha256 dedup key** (NOT ETag, which breaks under multipart); (d) validator copy-then-delete pattern with strict `filterPrefix: "uploads/quarantine/"` so the destination CopyObject doesn't re-trigger the validator (verified in U7 integration test).
- **API surface parity:** public `GET /lessons` projection is the contract the player app must implement against — locked in `song-schema.md`. Admin CRUD payload shape is internal but uses the same Lesson type — keeps writer/reader in sync.
- **Integration coverage:** the upload pipeline (admin → presigned PUT → S3 event → validator → DynamoDB + canonical key → public read with signed URL) is a true end-to-end cross-layer flow that unit tests don't prove. The integration test in U7 + U8 must cover this.
- **Unchanged invariants:** this plan does NOT create an `apps/player-pwa/` stub. The player track owns its own workspace shape. The plan exposes the public CDN URL + public API URL as Pulumi stack outputs (via `infra/index.ts`) that the player track consumes by name, decoupling the two plans.

---

## Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Track 2's `cicd-pipeline.md` doesn't get revised before this plan starts → conflict on master | Med | High | **Track 2 owner = leocaseiro; verification step in Prerequisites (run `git log master -- apps/web infra packages` to detect already-merged state).** U1 includes Track 2 escape-hatch section — if Track 2 hasn't landed, U1's bootstrap supersedes the existing scaffold via a clearly-labeled breaking PR. |
| Track 3 schema lock changes the Lesson interface mid-build | Med | Med | `core/lesson/Lesson.ts` is the single source of truth; type errors cascade to all consumers. **U1 and U2 safe to start against draft schema; U4 and U5 SHOULD wait for Track 3 lock (Phase C exit gate).** Contract test on U5's `/v1/lessons` shape guards deployed players from breaking changes. `/v1/` path prefix locks the wire-version contract. |
| AWS account not configured locally → can't `pulumi up` | Med | High | Documented as Prereq. U9's deploy step fails fast with clear error; `infra/README.md` covers setup. |
| Pulumi state file leaks the Basic-Auth credential if backend is misconfigured | Low | High | **Pre-deploy guard in `infra/README.md` + CI: `pulumi backend` MUST NOT report `file://`.** Use Pulumi Cloud or S3+KMS. Credential stored as `config.requireSecret` (encrypted at rest). |
| CloudFront Function 10KB code limit exceeded with KVS lookup + constant-time compare | Low | Med | **Measured at U9 build time** via `aws cloudfront describe-function --stage DEVELOPMENT` (NOT deferred to U6). Assert <8KB. Fallback: HMAC pattern (KVS stores HMAC key) — preserves rotation but cuts credential entropy in the function code. |
| `constantTimeEquals` JIT-optimized into early-exit on cloudfront-js-2.0 — defeats timing-resistance | Low | Med | **Microbench step in U9** measures execution time across same-length/different-length cred comparisons. If JIT optimizes: switch to HMAC pattern. |
| OAC for Lambda FURL: CORS gotchas + `x-amz-content-sha256` on POST/PUT | Low | Med | Required `sourceArn` on Lambda Permission + `AllViewerExceptHostHeader` origin request policy for body forwarding documented in Key Technical Decisions. Admin file uploads bypass via direct S3 presigned PUT (no CloudFront body-forwarding concern). |
| `aws.cloudfront.KeyvaluestoreKey` Pulumi resource may not exist in v7 | Med | Low | **Verify at U3 build.** Fallback: `command.local.Command` invoking `aws cloudfront-keyvaluestore put-key`. Either path delivers the same outcome; just code shape differs. |
| Magic-byte detection misclassifies an edge-case Guitar Pro file | Low | Med | `file-type` is actively maintained (Apr 2026 release); fixtures for all 5 GP versions in U2 tests; misclassified files route to `rejected/` with `x-amz-meta-reason` for curator forensics. |
| Two CloudFront distributions = doubled ACM cert renewals + DNS-validation persistence required | Low | Low | Cost is $0. **DNS validation CNAME records MUST persist** (auto-renew requirement) — documented in `infra/README.md`. CloudWatch alarms (`DaysToExpiry < 30`) catch silent renewal failures. |
| Lambda cold start (~200-400ms) noticeable on admin first action of the day | Med | Low | Acceptable for internal admin. ARM64 Graviton + LLRT a post-v1 optimization if painful. |
| `dependency-cruiser` config drift — someone disables a rule mid-PR | Low | Med | CI gates on `depcheck`; disabling visible in code review. Rules documented inline. |
| KVS credential rotation eventual-consistency lag (10-30s across edges) | Low | Low | Documented operator-README emergency rotation procedure: if rotation is in response to suspected compromise, take admin distribution offline (503 custom error page) for 60s before rotating, then restore. |
| AlphaTex async hard validation never gets built → curator uploads bad alphaTex that breaks player | Low | Med | **Public read API filters `status="published"` so pending_validation lessons NEVER reach the player.** Curator sees them in admin only. Async validator is a follow-up plan (SQS-triggered Lambda with 15-min timeout recommended). |
| Admin gate brute-force amplifies cost (CloudFront requests + CFF invocations) | Low | Med | **CloudWatch alarm on `4xxErrorRate > 10/sec` on admin distribution** (operator email). If alarm fires repeatedly, add WAF rate-based rule (free tier 10M req/mo on first ACL). Documented as explicit deferred-with-trigger, not silently omitted. |
| Mid-stack partial deploy/rollback strands uploads in `uploads/quarantine/` | Low | Med | Operator README "Rollback hygiene" subsection: drain `uploads/quarantine/` and `uploads/rejected/` before destroying the bucket; 24h TTL eventually clears orphans if not drained. `forceDestroy: false` on bucket prevents accidental destroy with content. |
| Validator update races admin metadata edit | Low | Low | Partial `UpdateExpression` on `file.*` attributes only; no version lock; admin's category/title edits preserved. |
| S3 event race: validator runs before Lesson record exists (curator uploads before calling create) | Med | Low | Validator does DDB `GetItem` for lessonId FIRST; missing → `rejected/orphaned/<key>` with reason `lesson-record-missing`. Curator sees "upload failed" but no data corruption. |
| `dorny/paths-filter` step fails → all CI child jobs skip silently → PR merges green with no checks | Low | Med | `changes` job marked as required check INDEPENDENTLY (not just downstream). Sanity-check step asserts "PR has commits but filter found no changes" fails loudly. |
| Admin SPA renders attacker-controlled lesson content + has stored XSS risk | Low | Med | **CSP on admin distribution Response Headers Policy** (documented in Key Technical Decisions). React-Admin renders DOM-escaped strings by default. Presigned PUT Content-Type allowlist prevents HTML uploads at S3 layer. |

**Prerequisites (external):**

- **Track 2 plan revision lands** — see Deferred to Follow-Up Work. Without it, Track 2 may execute the old `apps/web` shape and conflict with this plan's U1.
- **Track 3 schema lock lands** — `song-schema.md` flipped DRAFT → LOCKED. This plan can begin against the draft, but U2's `core/lesson/Lesson.ts` may need updating if Track 3 changes fields.
- **GitHub repo created** (`leocaseiro/notation-hero`, public, proprietary LICENSE). Not yet done.
- **AWS account access** — IAM user + access keys + `aws configure`. Wave 3 blocker per `cicd-pipeline.md`. Required before U9 `pulumi up`.
- **Pulumi backend confirmed** — user is logged in (likely Pulumi Cloud); confirm before first U9 deploy.
- **Domain** — `notation-hero.com` (or similar) acquired; ACM cert validation requires DNS access.

---

## Documentation / Operational Notes

- **`infra/README.md`** (created in U9): how to deploy (`pulumi up --stack dev`), how to rotate the admin credential (`pulumi config set --secret basicAuthCredential <newBase64> && pulumi up`), how to roll back (`pulumi stack history` + `pulumi cancel` patterns), how to add a new lesson manually via admin SPA, how to forcibly clean orphaned quarantine objects.
- **Per-component README in `adapters/aws/`** — short doc explaining each ComponentResource's args, outputs, and intended use. Helps future-you / contributors not need to read the implementation.
- **Top-level `README.md` updated** in U1 with: Layout 4 architecture diagram, dependency direction rules, contribution flow (run `bun run lint` + `bun run depcheck` + `bun test` locally before PR).
- **Decision-capture**: after each unit lands, capture institutional learnings via `/ce-compound` per the learnings researcher's recommendation. Highest-value: KVS Basic-Auth rotation pattern (U6/U9), `LambdaWithUrl` + OAC pattern (U3/U5/U6), magic-byte streaming validation pattern (U4/U7).
- **CloudWatch dashboard** (optional, deferred): single dashboard per Lambda with invocations + errors + duration. Worth adding in U9 as a `aws.cloudwatch.Dashboard` resource if time permits. `H-7` (Beta) does the real SLO + burn-rate work.
- **Operational ad-hoc**: monthly check on Always-Free tier consumption — `aws ce get-cost-and-usage` or AWS Cost Explorer for free-tier dashboards. K should sit at $0; flag any drift.

---

## Sources & References

- **Origin document:** [docs/cms-approach.md](../cms-approach.md) (decision doc, locked 2026-06-05, in worktree `affectionate-dewdney-42c19c/`)
- **Companion docs** (all currently in worktree `pensive-boyd-6d17e3/docs/`):
  - `feature-freeze.md` (area `K` rows, AWS portfolio ranking, sync model)
  - `song-schema.md` (Lesson interface, catalog API contract, S3 layout)
  - `design-stack.md` (full AWS stack, license gate, AWS rejection rationale for Amplify/API Gateway/Cognito-in-K)
  - `aws-learning-map.md` (service → vehicle mapping)
  - `handoff.md` (project identity, decisions log)
  - `handoff-prompts.md` (Track 1-4 parallel handoff specs)
- **Related Track plans:**
  - Track 2: `vigorous-goldwasser-73ccca/docs/cicd-pipeline.md` (requires revision per Deferred to Follow-Up Work)
  - Track 3: pending (`song-schema.md` finalize)
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

---

## Success Metrics

**Ship-mechanics (must hold):**
- **`pulumi up --stack dev` completes successfully** with all ~50-65 resources provisioned. **First-deploy timing: 15-25 minutes** (CloudFront distributions take ~15min each on cold create; ACM cert validation 5-30min depending on DNS propagation — gated via two-pass `pulumi up --target` for certs first). **Subsequent `pulumi up` with no changes: <30 seconds** (idempotency check).
- **Admin curator can create a Lesson with `.gp` file upload** end-to-end in under 60 seconds (sign in → fill form → upload → save → see it in list, with validator processing < 3s).
- **Public `GET /v1/lessons` returns the curated catalog** in <500ms (warm) / <2s (cold) from CloudFront.
- **Public `GET /v1/lessons/{id}` returns a working signed URL** that fetches the file successfully within the URL TTL.
- **KVS credential rotation completes in <30 seconds** (`pulumi config set --secret … && pulumi up`) without function redeploy; rotation propagation to all edges complete within 30s.
- **CI pipeline green** for all PRs; `dependency-cruiser` blocks layer violations; contract test on `/v1/lessons` shape guards wire compat.
- **Total monthly AWS cost on legacy free-tier account: $0** (verified via AWS Cost Explorer at end of first month).

**Portfolio-outcome metrics (the actual job-hunt purpose K serves — per F-DR2a):**
- **≥5 captured solution docs in `docs/solutions/`** tied to the named patterns (file paths approximate):
  - `docs/solutions/kvs-basic-auth-rotation.md` — CF Function + KVS edge-auth pattern with rotation procedure
  - `docs/solutions/lambda-furl-oac-pattern.md` — Lambda Function URL behind CloudFront with OAC (including `sourceArn` pinning and `AllViewerExceptHostHeader` policy)
  - `docs/solutions/dynamodb-single-table-lessons.md` — DynamoDB single-table access patterns for a content catalog (PK/SK + GSI1 + LessonFilter translation)
  - `docs/solutions/magic-byte-streaming-validation.md` — S3-event Lambda + streaming `file-type` magic-byte validation pipeline
  - `docs/solutions/pulumi-component-lambda-with-url.md` — `LambdaWithUrl` ComponentResource design (esbuild + IAM + log group + optional FURL)
- **1 narrated whiteboard-rehearsal artifact per pattern** (a `.md` walkthrough doc paired with each solution doc above, simulating the interview explanation — what problem, what alternatives, why this design, what trade-offs). Goal: prove the pattern is internalized, not just shipped.
- **1 architectural-decision capture per high-value pattern** — short `docs/decisions/NNN-*.md` files (ADR-lite) for: choice of Hexagonal Layout 4 (with the 6-swap Premise Audit attached), choice of CF Function + KVS over Lambda@Edge + Cognito, choice of bare FURL + OAC over API Gateway, choice of single-table over multi-table, choice of presigned-PUT direct-to-S3 over pass-through-Lambda.

Capture these via `/ce-compound` after each unit lands (per learnings-researcher recommendation — this build is the seeding event for `docs/solutions/`).

---

## Phased Delivery

The 9 units sequence into 4 phases. Phase boundaries are PR-merge points.

### Phase A — Foundation (U1, U2)
Bootstrap monorepo + core domain. After this, the project compiles and lints; no AWS yet; no functional code. Phase exit gate: CI green, `dependency-cruiser` working, core/lesson tests pass.

### Phase B — Infra primitives + adapters (U3, U4)
Pulumi ComponentResources + DynamoDB/S3/Validator adapters. After this, adapter integration tests pass against LocalStack; Pulumi preview runs cleanly on each component. Still no deployed infra. Phase exit gate: all adapter tests green; `pulumi preview` clean.

### Phase C — Lambdas (U5, U6, U7)
Three Lambda composition roots. Built in this order: public read first (simplest, validates the FURL+OAC pattern), then admin CRUD (adds the gate complexity), then validator (event-source pattern, depends on the others' patterns). Unit tests with fake adapters pass at each step. **Phase exit gates:** all unit tests green; **Track 3 schema lock has landed** (U5's contract test fixture matches the LOCKED Lesson shape); ready to deploy.

### Phase D — Admin SPA + Pulumi composition + deploy (U8, U9)
React-Admin frontend + Pulumi root that wires everything + first `pulumi up`. After this: deployed dev stack, admin curator can sign in and exercise the full flow end-to-end. Phase exit gate: integration tests green against dev stack; admin curator validates UX manually.

---

## Documentation Plan

- **`infra/README.md`** (U9) — operator runbook: deploy (two-pass for first run + certs), rotate credential (normal + emergency), rollback (with hygiene checklist), KVS propagation timing, ACM cert renewal monitoring, Pulumi backend pre-deploy check, CFF microbench procedure.
- **`adapters/aws/README.md`** (U3) — Component catalog: `LambdaWithUrl` + `CloudFrontStaticSite` args/outputs/usage.
- **Top-level `README.md`** (U1) — architecture overview, Layout 4 diagram, `dependency-cruiser` rule rationale, contribution flow.
- **`docs/solutions/`** (created post-landing via `/ce-compound`) — seed with 5+ entries per Success Metrics list (kvs-basic-auth-rotation, lambda-furl-oac-pattern, dynamodb-single-table-lessons, magic-byte-streaming-validation, pulumi-component-lambda-with-url). Plus paired whiteboard-rehearsal docs.
- **`docs/decisions/`** (created per Success Metrics) — ADR-lite captures: Hexagonal Layout 4 (+ Premise Audit), CFF+KVS vs Lambda@Edge+Cognito, bare FURL+OAC vs API Gateway, single-table vs multi-table, presigned-PUT direct-to-S3.
- **`adapters/dynamodb/README.md`** (U4) — access-pattern table for the Lesson catalog: list-by-category (GSI1), get-by-id (PK), update-with-version-check, soft-delete.
- **`apps/admin-spa/README.md`** (U8) — local dev (`bun run dev`); env vars; how to add a new Resource; CSP rationale; React-Admin 5.14 + React 19 setup.
- **Plan revision history** (this file) — bump at end of plan execution with "STATUS: completed" and any deviations from the planned units. Track adversarial-flagged risks resolved at implementation time.

---

## Operational / Rollout Notes

- **Initial bring-up sequence**: U1 → U2 → U3 → U4 (each merged to master with green CI before next starts); then U5+U6+U7 in parallel (different `apps/lambda-*` dirs, file-ownership-safe); then U8+U9 (U8 needs U6's exported FURL for the admin distribution's `/api/*` origin; U9 needs all `apps/*/infra.ts` factory functions in place). **U5 deployment to dev is gated on Track 3 schema lock** (Phase C exit gate).
- **First deploy is manual** — `pulumi up --stack dev` from local. CI-driven deploys (`deploy.yml` for SPA bundles via OIDC) come later. **First-deploy is two-pass: certs first (`--target` for ACM certs), wait for validation, then full deploy.**
- **Rollback strategy**: `pulumi stack history --stack dev` → identify a known-good revision → `pulumi stack export --version <N> > prev.json && pulumi stack import prev.json && pulumi up`.
- **Rollback hygiene (adversarial-flagged):** before destroying the shared S3 bucket OR running a rollback that removes admin Lambda + presigned-PUT capability, drain `uploads/quarantine/` (curators may have uploads in flight) and `uploads/rejected/` (forensic data only — safe to delete). `forceDestroy: false` on the bucket prevents accidental destroy with content. For partial-state rollbacks (e.g., U6 destroyed but U7 validator still subscribed), temporarily disable admin distribution by setting the KVS credential to a junk value (`pulumi config set --secret basicAuthCredential <junk> && pulumi up`) so no new uploads land in the now-unprocessed quarantine.
- **Monitoring**: CloudWatch Logs on each Lambda (7-day retention dev / 30-day prod). Three alarms in U9: `4xxErrorRate > 10/sec` on admin distribution (brute-force trigger), `DaysToExpiry < 30` per ACM cert (renewal-fail trigger).
- **DR posture**: DynamoDB point-in-time recovery enabled on the shared table; S3 versioning OFF for the `lessons/` prefix (deterministic keys; PITR not needed). Backups out of scope for v1.
- **Cost monitoring**: monthly check via AWS Cost Explorer. AWS Budgets alert (free) at 80% of any always-free ceiling per service (Lambda, DynamoDB, S3, CloudFront, CloudFront Functions, SNS, KVS, CloudWatch).
- **Credential rotation procedure** (in `infra/README.md`): standard rotation `pulumi config set --secret basicAuthCredential <newBase64> && pulumi up` (KVS-only diff, ~30s). **Emergency rotation if leak suspected:** take admin distribution offline (update to 503 custom error page) for 60s → rotate credential → re-enable distribution. Documented because the 10-30s KVS propagation lag means the old credential is briefly still valid at some edges during normal rotation.
