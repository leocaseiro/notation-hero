# Architecture brainstorm — kickoff prompt (2026-06-17)

> ⛔ **Brainstorm INPUT — decisions LOCKED.** Every open question framed below was decided the same day in `../decisions/2026-06-17-architecture-decisions.md` (pnpm kept, **Nx dropped**, bun stays dropped, oRPC, Drizzle, Cognito+Google). Read that for the answers.

> Paste everything below the divider into a fresh Claude Code session to start the
> architecture brainstorm. Distilled from the 2026-06-16/17 framework exploration
> (Fastify vs NestJS → **NestJS single-backend + hexagon inside**).

---

Brainstorm the architecture for **Notation Hero** — a music-notation / rhythm-game app.
I'm a senior frontend engineer pivoting to backend/cloud/AWS, building solo as a learning + portfolio piece on the AWS perpetual free tier ($0). After a long
exploration I've locked the shape below; I want to brainstorm the **OPEN QUESTIONS** and produce an architecture decision doc.

## NORTH-STAR (locked — don't re-litigate)

- **One backend service = a single NestJS app** (modular monolith) with **hexagonal / DDD inside**: framework-free domain core, ports (interfaces), adapters (I/O), Nest as the delivery "door".
- Deployed as **one AWS Lambda** (HTTP API) behind a **Function URL** (→ CloudFront).
  Async work = **extra Lambdas built from the SAME Nest codebase** (more entry points,
  NOT more apps) — see open question 5.
- **One React SPA** client, separate from the backend, over HTTPS; **Capacitor** for mobile.

## FORWARD-COMPATIBILITY (cheap seams to bake into v1)

- The catalog starts **admin-curated** but MUST allow **user-generated content (UGC)**
  later. This does NOT change the stack (Postgres is great for UGC) — but bake in these
  near-free seams now so UGC is additive, not a rewrite:
  - **Ownership/provenance from day one** — `created_by` (Cognito `sub`) + `source` +
    `status` on the catalog item (schema already has `source`/`status`; confirm
    `created_by` exists). v1 admin items vs later UGC differ only by column values.
  - **Authorization as a domain policy port** — `can(user, item, action)` — NOT
    hardcoded "admin-only". v1 implements the admin rule; UGC just extends the policy.
  - **Cognito modelled for END-USERS + roles** (admin vs user), not admin-only.
  - **Upload pipeline assumes an UNTRUSTED uploader** from the start (presigned S3 →
    quarantine → magic-byte validate).
- **DEFER** (note as future specs, don't build now): moderation UI/queue, per-user
  quotas + rate-limits, content reporting/abuse, public-scale search tuning.

## LOCKED STACK

- **Infra:** Pulumi (TS), single IaC (no Amplify/CDK). Deploy via GitHub Actions +
  **OIDC keyless** (this is the _deploy_ OIDC). pnpm (can be something else if help us, IIRC we went with pnpm because of nx issues, but if bun helps us and no blockers, we pivot to bun).
- **Backend:** NestJS 11 · Node 24 (`nodejs24.x` — GA on Lambda since Nov 2025, incl.
  `ap-southeast-2`) · **SWC** bundler (Nest's blessed compiler; avoids the
  esbuild-decorator hack) · Lambda + Function URL · arm64.
- **Data:** **Neon Postgres + Drizzle** → catalog/content (admin-curated v1 →
  UGC-ready). **DynamoDB** single-table → per-user (scores · sync · settings).
- **Auth:** **Cognito** (in Pulumi) + `aws-jwt-verify`; classic admin UI CRUD;
  end-user-ready. (Cognito login = OAuth2/PKCE — the _user_ OIDC.) Secrets: **SSM
  SecureString + KMS**. Preferable to use Google-GMAIL sign-in to Cognito as v1.
- **Async / analytics / email:** SQS / SNS / EventBridge → worker Lambdas; **S3
  (Parquet) → Athena**; **SES** email.
- **Mobile:** Capacitor over the SPA; offline-first (RxDB / Legend-State).

## OPEN QUESTIONS (the point of this session)

1. **Monorepo tooling — keep Nx or go plain pnpm workspaces?** Nx earns its keep with
   _separate hexagon packages + shared libs_; one Nest app + one React app might only
   need pnpm workspaces (or bun). Weigh the cost of leaving Nx (the repo has set it up today, but not really using it). Preferable to remove.
2. **Repo layout:** `client/ + server/ + infra/` vs the current Nx `apps/ + core/ +
adapters/ + infra/`.
3. **Hexagon physical form:** separate packages (strict, guard-enforced) vs folders
   inside the one Nest app (simpler).
4. **React starter:** a friendly SPA starter for a client/server split + Capacitor +
   offline-first (RxDB/Legend-State). Nice, but not required, if we could use same NestJS code style in React app. (Either if NestJS style or not, we are enforcing best practices and standards with very hard to skip lintings, tests and CI/CD)
   probably not Next SSR. Recommend one.
5. **One Nest app → ONE Lambda or MANY (NOT many apps):** the HTTP API is one Lambda
   (`NestFactory.create` + serverless-express); async workers are EXTRA Lambdas built
   from the SAME codebase via `NestFactory.createApplicationContext` (DI, no HTTP
   server), reusing the same services/domain. Start with just the API Lambda; add worker
   entry files when async features land. Keep each entry's module lean (bundle + cold
   start).
6. **Where the async/event side** (SQS workers, analytics pipeline) plugs into the one
   Nest app (which modules each worker entry imports).
7. **SWC + NestJS-on-Lambda build** config (decorator metadata, externals, CJS output,
   per-entry bundling).
8. **Authz + ownership model:** how far to design the `can(user, item, action)` policy
   and the `created_by` / `status` / visibility model in v1 so UGC is additive, not a
   rewrite? (Check `docs/specs/2026-06-10-catalog-schema.md` for `source` / `status` /
   `created_by`.)

## CONSTRAINT

Nx, the hexagon-boundary guards, and the file-level-structure ADR are currently
**LOCKED via DACI**. Open questions 1–3 would _reopen_ that foundation — treat any
change as deliberate, weigh the migration cost, and update the decision-registry / ADR
in the same change if we change it. (we are very likely to change it, and we 'll than replace all documentation if this approach suit us better).

## READ FOR CONTEXT (full paths)

- Repo: `/Users/leocaseiro/Sites/notation-hero` — esp. `AGENTS.md`,
  `docs/feature-freeze.md`, `docs/aws-learning-map.md`, `docs/decisions/`
  (decision-registry, the Neon catalog-store decision, the file-structure ADR),
  `docs/specs/2026-06-10-catalog-schema.md`, `apps/handler-hello`, `infra/`.
- The two framework spikes (the "door" comparison that led to NestJS) — **worktree paths
  as of 2026-06-17; may already be merged into the main repo's `docs/` by the time you
  read this**:
  - NestJS plan: `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/charming-varahamihira-afff7f/docs/plans/2026-06-16-001-feat-catalog-crud-nestjs-plan.md`
  - Fastify plan: `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/competent-torvalds-c13c5c/docs/plans/2026-06-16-001-feat-catalog-crud-fastify-plan.md`
  - Cognito spike: `/Users/leocaseiro/Sites/notation-hero/.claude/worktrees/charming-varahamihira-afff7f/docs/spikes/2026-06-16-cognito-auth-spike.md`

## HOW TO RUN

Run the brainstorming skill, go **section by section**, and end with an **architecture
decision doc** + a **decision-registry entry**. My collaboration prefs (low cognitive load,
`AskUserQuestion` pickers, chunked reviews) are in `CLAUDE.md`.

## CRITICAL NOTES

I appreciate if you can figure out some decisions based on either our documentation in master, or PRs, or even from other worktrees. However, if any of these decisions might conflict with default nestjs, and setup that we want to use (aka genarators, and so on), please ask me first before making those decisions.
