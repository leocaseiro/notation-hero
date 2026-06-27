# Neon + Pulumi Connection Keys — Design

- **Date:** 2026-06-27
- **Status:** ✅ decided (brainstorm-approved by leocaseiro) · ⏳ enforcement pending implementation (NH-79)
- **Tickets:** NH-79 (Neon adapter) → NH-123 (read API). Sibling: NH-247 (CloudFront edge-cache, deferred). Epic: NH-177 (Catalog/CMS & Infra).
- **Supersedes (mechanism only):** the RC-6 / 2026-06-10 "connection string = a Pulumi config secret" mechanism — see §4 and §12.

## 1. Scope

This designs the **connection-key plumbing** that the catalog read slice sits on: how the Neon connection strings are stored, secured, injected into the Lambda, how migrations and the seed run, the operator runbook, and rotation.

**In scope (the 5 questions):** key model · local-dev source · CI migrate-before-deploy · the Drizzle migration runner + runbook · rotation.

**Out of scope (own tickets):**

- The full catalog **read API** (oRPC contract + query layer) — **NH-123**.
- The **CloudFront edge-cache** for `GET /api/*` — **NH-247**.
- The admin **CRUD CMS** — **NH-207**.

The **thin read** built here is only a _validation target_ — it proves the Lambda → Neon path works end-to-end; it is not the real read API.

### Locked stack (not re-litigated)

NestJS (hexagon folders) on Lambda · Drizzle ORM over `@neondatabase/serverless` (HTTP) at runtime, TCP for migrations · Neon Postgres (off-AWS, free plan) · Pulumi (TS) deploy via push-to-master + GitHub OIDC · 8-table Playable schema (draft DDL `docs/wireframe/2026-06-21-per-track-profiles-and-seed-draft.sql`).

## 2. Decisions at a glance

| #          | Decision         | Choice                                                                                                                       |
| ---------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Scope      | What this covers | All 5 questions; thin read = validation; read API = NH-123                                                                   |
| Role split | One key or two   | **Two** — owner (DDL) + least-privilege app (DML)                                                                            |
| Q1         | Key model        | `nh_app` → Lambda (HTTP); Neon owner role → migrate runner only (TCP); same DB/host, differ by role                          |
| Q2         | Local-dev source | **Hybrid** — committed `.env.example` + git-ignored `.env` (holds a **dev-branch** url)                                      |
| Q3         | CI migrate       | **Auto + first** deploy step, before build/AWS; idempotent; failure aborts before `pulumi up`                                |
| Q3c        | Secret storage   | **Both urls = GitHub Actions secrets** (refines RC-6 mechanism — see §12)                                                    |
| Q4         | Migration runner | **DDL-first** — raw DDL is source of truth; `drizzle-kit generate --custom` + `migrate`; `schema.ts` hand-written for typing |
| Q4         | Seed             | **Runbook-only** via a one-click `workflow_dispatch` CI workflow (no local run)                                              |
| Cache      | Cold-start       | Accept; thin read sends a `Cache-Control` header (forward-compat); edge cache = NH-247                                       |
| Guard      | Compute budget   | **Minimal** — `Cache-Control` + `robots.txt` disallow `/api/*` + a dev Neon branch                                           |
| Q5         | Rotation         | **Simple** (reset + redeploy) as default; dual-role flip documented as the zero-downtime upgrade                             |

## 3. Q1 — the two keys

| Secret (GitHub Actions) | Neon role                            | Can do                                             | Reaches                                                 | Driver                         |
| ----------------------- | ------------------------------------ | -------------------------------------------------- | ------------------------------------------------------- | ------------------------------ |
| `NEON_DATABASE_URL`     | **`nh_app`** (new, least-privilege)  | `SELECT/INSERT/UPDATE/DELETE` on the 8 tables only | the **Lambda** (`DATABASE_URL` env)                     | HTTP (`drizzle-orm/neon-http`) |
| `NEON_MIGRATION_URL`    | **Neon owner role** (already exists) | DDL + `CREATE EXTENSION`                           | the **migrate + seed CI steps** only — never the Lambda | TCP (`drizzle-kit`)            |

- Both point at the **same Neon database**, same **direct (unpooled) host** — they differ only by **role/credentials**. The HTTP driver does not need the pooler, so there is no third "pooled" url.
- **Strict invariant:** `NEON_MIGRATION_URL` (owner) never lands in any Lambda environment. A leaked Lambda env can read/write rows but cannot drop tables, alter schema, or create roles.
- Only **one new role** to create (`nh_app`); the migrator is Neon's built-in owner role.

`nh_app` grants (run once as owner, in the runbook):

```sql
CREATE ROLE nh_app WITH LOGIN PASSWORD '<from Neon console>';
GRANT USAGE ON SCHEMA public TO nh_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nh_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO nh_app;
```

## 4. Secret storage & how each url reaches its consumer (Q3c, Q3, Q2)

Both connection strings are **GitHub Actions secrets** — auto-masked in logs (safe for a public repo) and settable/rotatable via `gh secret set` or the GitHub UI (zero local runs, nothing secret committed). This **refines** the RC-6 / 2026-06-10 decision: the _intent_ (an env var at rest, not SSM, $0) is preserved; the _mechanism_ changes from a Pulumi config secret to a GitHub secret (§12).

**App url → Lambda (runtime).** The deploy job passes `NEON_DATABASE_URL` to the `pulumi up` step; `infra/index.ts` reads it from `process.env`, wraps it with `pulumi.secret(...)`, and injects it as the Lambda's `DATABASE_URL` env via a new `environment` arg on the `LambdaWithUrl` component:

```ts
// infra/index.ts
const databaseUrl = pulumi.secret(requireEnv('NEON_DATABASE_URL'));
const api = new LambdaWithUrl('api', {
  /* …existing… */
  environment: { DATABASE_URL: databaseUrl },
});
```

```ts
// infra/lambda-with-url.stack.ts — add to args + the Function
environment?: pulumi.Input<Record<string, pulumi.Input<string>>>;
// on aws.lambda.Function:
environment: args.environment ? { variables: args.environment } : undefined,
```

**Owner url → migrate + seed (CI).** Read directly as `${{ secrets.NEON_MIGRATION_URL }}` in the migrate step and the seed workflow. No Pulumi, no AWS, never printed.

**Local dev (Hybrid).** A committed `server/.env.example` documents the shape; a git-ignored `server/.env` holds a **dev-branch** url (obtained from the Neon console). Prod urls live **only** in GitHub secrets and never touch a laptop. `.env` is covered by `.gitignore` + gitleaks.

> Reconciliation: Q2 chose Hybrid when the prod url was assumed to be in Pulumi config. With Q3c (GitHub secrets), the local `.env` is filled from a **dev-branch** url rather than from `pulumi config get`. Same Hybrid shape; prod secrets stay out of the repo and off the laptop.

## 5. Q3 — CI: migrations run before deploy

`deploy.yml` (the existing `workflow_run`-gated `up` job) gains a migrate step as the **first** step — it needs only Node + the GitHub secret, so it runs before build and before any AWS credential is assumed:

```text
checkout → setup-js → [migrate Neon] → build Lambda+SPA → assume AWS role → pulumi up
```

```yaml
- name: Migrate Neon (before deploy)
  run: pnpm --filter @notation-hero/server run db:migrate
  env:
    DATABASE_URL: ${{ secrets.NEON_MIGRATION_URL }}
```

- **Confirmed:** the deploy job already injects `PULUMI_CONFIG_PASSPHRASE`; `pulumi up` decrypts its own config as before. The DB urls no longer rely on that path — they are GitHub secrets.
- **Idempotent:** `drizzle-kit migrate` records applied migrations in `__drizzle_migrations`; re-running every deploy is a no-op.
- **Safe ordering:** if migrate fails, the job stops **before** build and `pulumi up` — new Lambda code never meets an old schema. The accepted trade-off is the safe direction (a new schema may briefly meet old code; additive/expand-contract migrations make that harmless).
- `NEON_DATABASE_URL` is also passed to the `pulumi up` step (so `infra/index.ts` can inject it).

## 6. Q4 — the Drizzle migration runner (DDL-first)

The raw 8-table DDL is the **source of truth** (matches `ARCH-ORM-1`; `drizzle-kit pull` cannot faithfully reproduce the extensions, `GENERATED` tsvector column, `DEFERRABLE` FKs, or `CHECK` constraints — see the 2026-06-27 scaffolding spike findings in §11).

**Mechanics:**

1. `drizzle-kit generate --custom --name playable_init` → creates an empty `0000_playable_init.sql` + updates the journal.
2. Paste the 8-table DDL (extensions + tables + CHECKs + indexes + GENERATED column) into it.
3. `drizzle-kit migrate` applies pending migrations over TCP, tracked in `__drizzle_migrations`.

**File layout:**

```text
server/
  drizzle.config.ts                          # dialect: postgresql, reads process.env.DATABASE_URL
  src/adapters/neon-postgres/
    catalog.schema.ts                         # Drizzle table defs — hand-written, for typed queries
    migrations/                               # 0000_playable_init.sql + meta/_journal.json (.sql/.json only — passes the layout guard)
    seed.ts                                   # TS-4 seed (idempotent: ON CONFLICT DO NOTHING)
```

- `catalog.schema.ts` is hand-written for query typing; it does **not** drive migrations (the DDL does). `drizzle-zod` derives Zod schemas from it for NH-123, with `CHECK`-enum columns overridden to real `z.enum(...)`.
- `migrations/` holds `.sql` + a JSON journal only — no `.ts`, so the role-suffix layout guard is unaffected; `migrations/` is not a banned folder name.

**Scripts** (`server/package.json`): `db:generate` (`drizzle-kit generate --custom`), `db:migrate` (`drizzle-kit migrate`), `db:seed` (`tsx src/adapters/neon-postgres/seed.ts`). Root convenience: `pnpm db:migrate`. New devDeps: `drizzle-kit`, `tsx`; deps: `drizzle-orm`, `@neondatabase/serverless`; migration/seed TCP transport: `postgres` (or `pg`).

## 7. Q4 — the seed (runbook-only, run from CI)

The TS-4 seed (19 playables) is **data, not schema** — kept out of the migration journal so re-seeding/editing stays clean.

- `db:seed` runs `seed.ts` (idempotent). It is **not** part of the auto deploy migrate.
- Bootstrap prod via a one-click **`workflow_dispatch`** workflow `.github/workflows/seed-catalog.yml` (or `gh workflow run seed-catalog.yml`), run **once** after the first deploy — no local run. It uses `DATABASE_URL: ${{ secrets.NEON_MIGRATION_URL }}`.
- Locally, `pnpm db:seed` runs against a dev branch (the `.env` url).
- After v1, catalog content is managed through the admin CMS (NH-207), not re-seeding.

## 8. Cache-Control & compute-budget guard

- **Cache-Control header (forward-compat):** the thin read sends `Cache-Control: public, max-age=…` on cacheable `GET` responses, so switching on the CloudFront edge cache (NH-247) later needs zero code change.
- **Compute guard (minimal):** a `client/public/robots.txt` disallowing `/api/` (the one realistic compute burner is bots), plus using a **dev Neon branch** for local work so prod compute-hours are never spent in development.
- **Cold-start accepted:** Neon sleeps after 5 min idle (~300–800 ms wake on the first request after a quiet spell). The page shell is served instantly by CloudFront; only the data call waits. The shared edge cache (NH-247) and a loading skeleton (NH-123 UI) are the real fixes; **keep-warm is rejected** — staying awake 24/7 would exceed the 100 compute-hours free limit.

## 9. Q5 — rotation (all remote)

Because both urls are GitHub secrets, every rotation is `gh secret set` + trigger a deploy — **no local runs, no commits.**

- **Owner url:** reset the owner password in Neon → update `NEON_MIGRATION_URL`. **No runtime impact** (only CI migrate/seed use it).
- **App url — Simple (default):** reset the `nh_app` password → update `NEON_DATABASE_URL` → trigger a deploy. Warm Lambda instances holding the old url error briefly (→ 503 / Retry-After) until they cycle; new instances pick up the new url immediately. Downtime: seconds, warm instances only.
- **App url — Zero-downtime (documented upgrade):** create `nh_app_b` in Neon → point `NEON_DATABASE_URL` at it → deploy → verify → retire `nh_app`. Both roles valid during the flip, so no request fails.

## 10. `infra/README.md` operator runbook (outline)

1. **Create the Neon project + a `dev` branch** (free; keeps local dev off prod compute).
2. **Create the `nh_app` least-privilege role** + run the §3 grants as owner (the migrator is the existing owner role).
3. **Set the two GitHub secrets** — `NEON_DATABASE_URL` (nh_app) and `NEON_MIGRATION_URL` (owner) — via `gh secret set` or the GitHub UI.
4. **Run migrations** — automatic on deploy; or `pnpm db:migrate` against a dev branch.
5. **Seed once** — trigger the `seed-catalog` workflow (prod) or `pnpm db:seed` (dev branch).
6. **Rotate** — the §9 procedures.

## 11. The thin read (validation target)

Proves the Lambda → Neon path is live: the existing `GET /api/catalog` placeholder is repointed at Neon via the `neon-http` Drizzle adapter, returning a few real seeded rows with a `Cache-Control` header. It deliberately stays minimal — the typed oRPC contract, filters, pagination, and the full query layer are **NH-123**.

Grounding (2026-06-27 spikes): free-tier posture verified $0/month current; no one-shot "Drizzle → oRPC + NestJS" generator exists — the maintained path is `drizzle-kit` (DDL-first) → `drizzle-zod` → a hand-authored oRPC contract. `@orpc/nest` requires every contract to declare a `path`; oRPC is ESM-only (`module: NodeNext`).

## 12. Decision-registry delta (governance)

This brainstorm **revises a locked decision** and adds new ones. To land in `docs/decisions/decision-registry.md` (Change log) — timing per §14 review:

- **RC-6 mechanism refined:** the Neon connection string moves from a **Pulumi config secret** to **GitHub Actions secrets** (`NEON_DATABASE_URL`, `NEON_MIGRATION_URL`). Intent unchanged (env var at rest, not SSM, $0); reasons: GitHub auto-masks secrets in a **public** repo, and it enables **100% CI/CD** with zero recurring local runs (leocaseiro, 2026-06-27 brainstorm, Q3b/Q3c).
- **New:** two-Neon-role split (owner = DDL/migrations; `nh_app` = least-privilege DML/runtime); migrate-before-`up` CI step; seed via `workflow_dispatch`; DDL-first Drizzle runner; minimal compute guard (`robots.txt` + dev branch + `Cache-Control`).
- **Status:** ✅ decided · ⏳ enforcement pending (flips to 🤖 when NH-79 lands).

## 13. Implementation outline (for NH-79 → writing-plans, not code yet)

1. Add deps to `server/`: `drizzle-orm`, `@neondatabase/serverless`; devDeps `drizzle-kit`, `tsx`, `postgres`.
2. `server/drizzle.config.ts` + `server/src/adapters/neon-postgres/{catalog.schema.ts, migrations/, seed.ts}`; `db:generate/migrate/seed` scripts (+ root `pnpm db:migrate`).
3. `0000_playable_init.sql` = the 8-table DDL verbatim; `catalog.schema.ts` hand-written to match.
4. Extend `LambdaWithUrl` with an `environment` arg; inject `DATABASE_URL` from `process.env.NEON_DATABASE_URL` in `infra/index.ts`.
5. `deploy.yml`: add the migrate step (first) + pass `NEON_DATABASE_URL` to the `up` step.
6. `.github/workflows/seed-catalog.yml` (`workflow_dispatch`).
7. `infra/README.md` runbook (§10); `client/public/robots.txt`.
8. Repoint the thin `GET /api/catalog` at Neon + add the `Cache-Control` header.
9. Registry Change-log entry (§12).

## 14. Open follow-ups

- **NH-247** — CloudFront edge-cache for `GET /api/*` (the real compute-budget protection at scale).
- **NH-123** — the full read API (oRPC contract, filters, loading skeleton).
- A `db:env:dev` helper that creates/points a Neon dev branch into `server/.env` (nice-to-have).
- Confirm the seed transport (`postgres` vs `pg`) and whether the seed is a `.sql` file executed by `seed.ts` or inline.
