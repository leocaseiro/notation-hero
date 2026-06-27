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
- **Strict invariant:** `NEON_MIGRATION_URL` (owner) never lands in any Lambda environment. A leaked Lambda env can read/write catalog rows but cannot drop tables, alter schema, create roles, or tamper with the migration journal (`__drizzle_migrations` is owner-only — see the grants below).
- Only **one new role** to create (`nh_app`); the migrator is Neon's built-in owner role.

`nh_app` grants (run as owner, in **two phases** — Phase 1 (role + `USAGE`) at setup; Phase 2 (the **table** grants) only **after** the first migrate creates the 8 tables):

```sql
-- Phase 1 — at setup, BEFORE any tables exist: create the role + schema usage.
CREATE ROLE nh_app WITH LOGIN PASSWORD '<from Neon console>';
GRANT USAGE ON SCHEMA public TO nh_app;

-- Phase 2 — AFTER the first migrate creates the 8 tables: grant DML on those
-- tables ONLY — never `ON ALL TABLES` / `ALTER DEFAULT PRIVILEGES`, so the
-- migration journal (`__drizzle_migrations`, owner-only state) stays unreachable.
GRANT SELECT, INSERT, UPDATE, DELETE ON
  playable, notation, step, playable_link, track, media, tonal_profile, drum_profile
  TO nh_app;
```

> Why explicit tables, not `ON ALL TABLES`: `ALTER DEFAULT PRIVILEGES … ON TABLES` auto-grants every _future_ table — including `__drizzle_migrations` — which would let a leaked `nh_app` url rewrite migration history (insert a fake applied row → a real migration silently skips; delete a row → an applied one re-runs). The 8-table schema is locked, so the explicit list is low-maintenance; a new table (rare) gets an explicit grant.

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

> **Caution — migrate uses the owner role:** `drizzle.config.ts` reads `process.env.DATABASE_URL`; in CI it is **always** fed from `NEON_MIGRATION_URL` (owner, DDL-capable). Never point it at `NEON_DATABASE_URL` — `nh_app` has no DDL, so migrations fail with an opaque `permission denied` on `CREATE`/`ALTER`. Keep the migrate step inside the same `up` job that carries `environment: production`, so the secret stays in scope.

## 6. Q4 — the Drizzle migration runner (DDL-first)

The raw 8-table DDL is the **source of truth** (matches `ARCH-ORM-1`; `drizzle-kit pull` cannot faithfully reproduce the `DEFERRABLE` FKs (12) or `CHECK` constraints (25) the schema relies on — see the 2026-06-27 scaffolding spike findings in §11). _(The draft DDL has no `CREATE EXTENSION` or `GENERATED` column today; if full-text search needs a `tsvector` column later, that is NH-123 work, not a present reason.)_

**Mechanics:**

1. `drizzle-kit generate --custom --name playable_init` → creates an empty `0000_playable_init.sql` + updates the journal.
2. Copy the DDL's `CREATE TABLE` / `CREATE INDEX` statements (tables + CHECKs + indexes) into it — **omit the draft's leading `DROP TABLE … CASCADE`**, so `0000_playable_init.sql` is purely additive (matches the §5 expand-contract safety claim; a `DROP CASCADE` init would wipe data if it ever re-ran).
3. `drizzle-kit migrate` applies pending migrations over TCP, tracked in `__drizzle_migrations`.

**File layout:**

```text
server/
  drizzle.config.ts                          # dialect: postgresql, reads process.env.DATABASE_URL
  src/adapters/neon-postgres/
    catalog.schema.ts                         # Drizzle table defs — hand-written, for typed queries
    migrations/                               # 0000_playable_init.sql + meta/_journal.json (.sql/.json only — passes the layout guard)
    seed.util.ts                              # TS-4 seed script (idempotent — every INSERT uses ON CONFLICT DO NOTHING)
```

- `catalog.schema.ts` is hand-written for query typing; it does **not** drive migrations (the DDL does). `drizzle-zod` derives Zod schemas from it for NH-123, with `CHECK`-enum columns overridden to real `z.enum(...)`.
- `migrations/` holds `.sql` + a JSON journal only — no `.ts`, so the role-suffix layout guard is unaffected; `migrations/` is not a banned folder name.
- **Guard compliance:** `seed.util.ts` carries the approved `util` suffix (the layout guard rejects a bare `seed.ts`). It is a standalone `tsx` entry point that nothing imports, so it needs a `no-orphans` `pathNot` exemption in `.dependency-cruiser.cjs` (the same treatment `main.ts` gets). `catalog.schema.ts` needs **no** exemption — the thin read imports it for the typed query (§11), which keeps it reachable.

**Scripts** (`server/package.json`): `db:generate` (`drizzle-kit generate --custom`), `db:migrate` (`drizzle-kit migrate`), `db:seed` (`tsx src/adapters/neon-postgres/seed.util.ts`). Root convenience: `pnpm db:migrate`. New devDeps: `drizzle-kit`, `tsx`; deps: `drizzle-orm`, `@neondatabase/serverless`; migration/seed TCP transport: `postgres` (or `pg`).

## 7. Q4 — the seed (runbook-only, run from CI)

The TS-4 seed (19 playables) is **data, not schema** — kept out of the migration journal so re-seeding/editing stays clean.

- `db:seed` runs `seed.util.ts`. **Idempotency is a hard requirement:** every `INSERT` uses `ON CONFLICT (<that table's primary key>) DO NOTHING`, so re-running is a safe no-op. Conflict targets differ per table — `playable`/`notation`/`track`/`media` → `(id)`; `step` → `(parent_id, sort_order)`; `playable_link` → `(from_id, to_id, relation)`; `tonal_profile`/`drum_profile` → `(track_id)` (4 of the 8 tables have no `id` column, so a blanket `ON CONFLICT (id)` would error on the first run). _(The cited 2026-06-21 draft uses bare `INSERT`s and must be adapted.)_ It is **not** part of the auto deploy migrate.
- **Acceptance check (NH-79):** running `seed-catalog` twice in a row is a clean no-op — zero rows changed on the second run.
- Bootstrap prod via a one-click **`workflow_dispatch`** workflow `.github/workflows/seed-catalog.yml` (or `gh workflow run seed-catalog.yml`), run **once** after the first deploy — no local run. It declares **`environment: production`** (master-only deployment-branch rule, per the L11 env-secret convention — matches `deploy.yml`) and uses `DATABASE_URL: ${{ secrets.NEON_MIGRATION_URL }}`.
- Locally, `pnpm db:seed` runs against a dev branch (the `.env` url).
- **Re-seeding & replacing the catalog (pre-CMS).** Three distinct operations until the admin CMS (NH-207) owns content: (1) **top-up** — the default `ON CONFLICT (<pk>) DO NOTHING` adds any missing rows; (2) **push edits** — `ON CONFLICT (<pk>) DO UPDATE SET …` updates changed rows to match the seed; (3) **full reset** — a deliberate, owner-role, runbook-gated step that `TRUNCATE … CASCADE`s the catalog tables inside a transaction, then re-seeds. A catalog reset is a _seed-level_ operation — never a schema `DROP` (the migration stays additive, §6). Keep the reset path **out of** `seed-catalog.yml` (a separate, approval-gated workflow) so an accidental seed re-run can never wipe data.
- After v1, catalog content is managed through the admin CMS (NH-207), not re-seeding.

## 8. Cache-Control & compute-budget guard

- **Cache-Control header (forward-compat):** the thin read sends `Cache-Control: public, max-age=…` on cacheable `GET` responses, so switching on the CloudFront edge cache (NH-247) later needs zero code change.
- **Compute guard (minimal):** **edit** the existing `client/public/robots.txt` (currently allow-all — empty `Disallow:`) to add `Disallow: /api/` (the one realistic compute burner is bots), plus using a **dev Neon branch** for local work so prod compute-hours are never spent in development.
- **Cold-start accepted:** Neon sleeps after 5 min idle (~300–800 ms wake on the first request after a quiet spell). The page shell is served instantly by CloudFront; only the data call waits. The shared edge cache (NH-247) and a loading skeleton (NH-123 UI) are the real fixes; **keep-warm is rejected** — staying awake 24/7 would exceed the 100 compute-hours free limit.

## 9. Q5 — rotation (all remote)

Because both urls are GitHub secrets, every rotation is `gh secret set` + **run the Deploy workflow via `workflow_dispatch`** — **no local runs, no commits.** _(This needs a `workflow_dispatch` trigger added to `deploy.yml` — see §13 — since today it only fires on `workflow_run` after CI on master, which would otherwise force a commit to redeploy.)_

- **Owner url:** reset the owner password in Neon → update `NEON_MIGRATION_URL`. **No runtime impact** (only CI migrate/seed use it).
- **App url — Simple (default):** reset the `nh_app` password → update `NEON_DATABASE_URL` → run the Deploy workflow (`workflow_dispatch`). Warm Lambda instances holding the old url error briefly (→ 503 / Retry-After) until they cycle; new instances pick up the new url immediately. Downtime: roughly the deploy duration (warm instances only) — for zero user-visible impact use the dual-role flip below.
- **App url — Zero-downtime (documented upgrade):** create `nh_app_b` in Neon **and run the §3 table grants for it** (substitute `nh_app_b` for `nh_app` — without grants the new role can read nothing and every query 403s) → point `NEON_DATABASE_URL` at it → run the Deploy workflow → verify → retire `nh_app`. Both roles valid during the flip, so no request fails.

## 10. `infra/README.md` operator runbook (outline)

1. **Create the Neon project + a `dev` branch** (free; keeps local dev off prod compute).
2. **Create the `nh_app` role + Phase-1 grant (`GRANT USAGE`)** as owner — the §3 Phase-1 block (the migrator is the existing owner role).
3. **Set the two GitHub secrets** — `NEON_DATABASE_URL` (nh_app) and `NEON_MIGRATION_URL` (owner) — via `gh secret set` or the GitHub UI.
4. **Run migrations** — automatic on deploy; or `pnpm db:migrate` against a dev branch.
5. **Run the §3 Phase-2 table grants** (owner) now that the 8 tables exist — `nh_app` cannot read until this runs. ⚠️ On the **first** auto-deploy this is easy to miss: migrate and `pulumi up` run in one workflow, so the Lambda goes live before Phase 2 and the thin read returns **403 until you run it** (the seed still succeeds — it uses the owner url — which masks the gap).
6. **Seed once** — trigger the `seed-catalog` workflow (prod) or `pnpm db:seed` (dev branch).
7. **Rotate** — the §9 procedures.

## 11. The thin read (validation target)

Proves the Lambda → Neon path is live: the existing `GET /api/catalog` placeholder is repointed at Neon via the `neon-http` Drizzle adapter, returning a few real seeded rows with a `Cache-Control` header. It deliberately stays minimal — the typed oRPC contract, filters, pagination, and the full query layer are **NH-123**.

- **Boundary (keeps it a validation target, not NH-123):** inline a **typed** Drizzle `select` from `playable` directly in the existing `CatalogController` — no new NestJS providers or repository abstraction (those are NH-123). The typed query imports `catalog.schema.ts`, which keeps that file reachable (§6). **Preserve the existing `CatalogResponse` envelope** `{ items: [{ id, title, kind, difficulty }], count }` — `playable` has **no `difficulty` column**, so derive it from `playable.level` via the N-14 band map (Debut 0 · Beginner 1–3 · …; a lookup, still no join). Filter `WHERE listable AND status = 'published'` + a small `LIMIT`, so internal rows (e.g. the masked single-voice leaves) never reach the public page. `list()` becomes `async`/DB-backed: update the server specs `catalog.controller.spec.ts` (mock the adapter — no live DB) and `http.handler.spec.ts`; the contract above must stay compatible with the live client `client/src/components/About.tsx` (renders `difficulty` + `count`).
- **CORS:** the thin read sets a CORS policy locked to the site origin. Note: CORS only restricts other **websites' browser** calls — not `curl`/bots; true origin-locking (force `/api/*` through CloudFront, block the raw Lambda url, + WAF/rate-limit) is tracked separately (§14).

Grounding (2026-06-27 spikes): free-tier posture verified $0/month current; no one-shot "Drizzle → oRPC + NestJS" generator exists — the maintained path is `drizzle-kit` (DDL-first) → `drizzle-zod` → a hand-authored oRPC contract. `@orpc/nest` requires every contract to declare a `path`; oRPC is ESM-only (`module: NodeNext`).

## 12. Decision-registry delta (governance)

This brainstorm **revises a locked decision** and adds new ones. The decision entry **is already recorded** in `docs/decisions/decision-registry.md` (Change log, 2026-06-27 — status ✅ decided · ⏳ enforcement pending); what remains is enforcement, which flips to 🤖 when NH-79 lands:

- **RC-6 mechanism refined:** the Neon connection string moves from a **Pulumi config secret** to **GitHub Actions secrets** (`NEON_DATABASE_URL`, `NEON_MIGRATION_URL`). Intent unchanged (env var at rest, not SSM, $0); reasons: GitHub auto-masks secrets in a **public** repo, and it enables **100% CI/CD** with zero recurring local runs (leocaseiro, 2026-06-27 brainstorm, Q3b/Q3c).
- **New:** two-Neon-role split (owner = DDL/migrations; `nh_app` = least-privilege DML/runtime); migrate-before-`up` CI step; seed via `workflow_dispatch`; DDL-first Drizzle runner; minimal compute guard (`robots.txt` + dev branch + `Cache-Control`).
- **Status:** ✅ decided · ⏳ enforcement pending (flips to 🤖 when NH-79 lands).

## 13. Implementation outline (for NH-79 → writing-plans, not code yet)

1. Add deps to `server/`: `drizzle-orm`, `@neondatabase/serverless`; devDeps `drizzle-kit`, `tsx`, `postgres`.
2. `server/drizzle.config.ts` + `server/src/adapters/neon-postgres/{catalog.schema.ts, migrations/, seed.util.ts}`; `db:generate/migrate/seed` scripts (+ root `pnpm db:migrate`); add a `no-orphans` `pathNot` exemption for `seed.util.ts` in `.dependency-cruiser.cjs`.
3. `0000_playable_init.sql` = the 8-table DDL's `CREATE` statements only (omit the draft's leading `DROP TABLE … CASCADE` so it stays additive); `catalog.schema.ts` hand-written to match.
4. Extend `LambdaWithUrl` with an `environment` arg; inject `DATABASE_URL` from `process.env.NEON_DATABASE_URL` in `infra/index.ts`.
5. `deploy.yml`: add the migrate step (first) + pass `NEON_DATABASE_URL` to the `up` step + add a `workflow_dispatch` trigger (for rotation deploys, §9).
6. `.github/workflows/seed-catalog.yml` (`workflow_dispatch`, `environment: production`).
7. `infra/README.md` runbook (§10); **edit** `client/public/robots.txt` (add `Disallow: /api/`).
8. Repoint the thin `GET /api/catalog` at Neon (inline a typed Drizzle `select` in the existing controller, **preserving the `{items:[{id,title,kind,difficulty}],count}` contract** — derive `difficulty` from `level`; filter `WHERE listable AND status='published'`; `list()` async; update `catalog.controller.spec.ts` + `http.handler.spec.ts`; keep `About.tsx`/`About.test.tsx` compatible) + add the `Cache-Control` header and a site-origin CORS policy.
9. Registry Change-log entry (§12).

## 14. Open follow-ups

- **NH-247** — CloudFront edge-cache for `GET /api/*` (the real compute-budget protection at scale).
- **NH-248** — lock `/api/*` to CloudFront-only access + WAF/rate-limit (true API origin-hardening; the §11 CORS policy only covers browsers, not `curl`/bots). Overlaps NH-247.
- **NH-123** — the full read API (oRPC contract, filters, loading skeleton).
- A `db:env:dev` helper that creates/points a Neon dev branch into `server/.env` (nice-to-have).
- Confirm the seed transport (`postgres` vs `pg`) and whether the seed is a `.sql` file executed by `seed.util.ts` or inline.
