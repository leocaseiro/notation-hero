# Notation Hero — infra runbook

Pulumi (TypeScript) deploys the ARCH-EDGE-1 slice (CloudFront -> S3 SPA + NestJS Lambda). This
runbook covers the **Neon connection keys** (NH-79). See
`docs/superpowers/specs/2026-06-27-neon-pulumi-connection-keys-design.md` for the full design.

## Neon connection keys (NH-79)

Two least-privilege roles, both as **GitHub Actions secrets** (auto-masked in this public repo):

| Secret               | Neon role                  | Can do                                        | Reaches                                    |
| -------------------- | -------------------------- | --------------------------------------------- | ------------------------------------------ |
| `NEON_DATABASE_URL`  | `nh_app` (least-privilege) | `SELECT/INSERT/UPDATE/DELETE` on the 8 tables | the Lambda (`DATABASE_URL` env), over HTTP |
| `NEON_MIGRATION_URL` | Neon owner                 | DDL + migrations                              | the CI migrate + seed steps only, over TCP |

### One-time setup

1. **Create the Neon project + a `dev` branch** (free; keeps local dev off prod compute).
2. **Create the `nh_app` role + Phase-1 grant** (run as owner, BEFORE any tables exist):

   ```sql
   CREATE ROLE nh_app WITH LOGIN PASSWORD '<from Neon console>';
   GRANT USAGE ON SCHEMA public TO nh_app;
   ```

3. **Set the two GitHub secrets** (repo Settings -> Secrets, or `gh secret set NEON_DATABASE_URL` /
   `gh secret set NEON_MIGRATION_URL`).
4. **Run migrations** — automatic on the next deploy (the `Migrate Neon` step), or locally:
   `DATABASE_URL=<dev-branch owner url> pnpm db:migrate`.
5. **Run the Phase-2 table grants** (owner) now that the 8 tables exist — `nh_app` cannot read until
   this runs:

   ```sql
   GRANT SELECT, INSERT, UPDATE, DELETE ON
     playable, notation, step, playable_link, track, media, tonal_profile, drum_profile
     TO nh_app;
   ```

   > ⚠️ On the **first** auto-deploy this is easy to miss: migrate and `pulumi up` run in one
   > workflow, so the Lambda goes live before Phase 2 and the thin read returns **403 until you run
   > this** (the seed still succeeds — it uses the owner url — which masks the gap). Never use
   > `GRANT … ON ALL TABLES` / `ALTER DEFAULT PRIVILEGES` (it would expose `__drizzle_migrations`).

6. **Seed once** — trigger the **Seed catalog** workflow (Actions tab -> Run workflow), or
   `gh workflow run seed-catalog.yml`. Locally: `pnpm db:seed` against a dev branch. Re-running only
   **INSERTs missing rows** (`ON CONFLICT DO NOTHING`) — it never **UPDATEs** an existing row; to
   correct a row already in the DB, use the approval-gated full reset (TRUNCATE + re-seed), not this
   workflow.

### Authorization — `workflow_dispatch` + the `production` environment (prerequisite)

Both `deploy.yml` (the rotation trigger) and `seed-catalog.yml` are `workflow_dispatch` with
`environment: production`. The environment gates the AWS OIDC secret, but **who** may trigger a
dispatch — and from **which branch** — is GitHub repo config, not the workflow file. Confirm before
relying on it:

- The **`production` environment's deployment-branch rule = `master` only** (Settings → Environments →
  production → Deployment branches). The `branches: [master]` filter on `deploy.yml` only covers the
  automatic `workflow_run` path — a `workflow_dispatch` can be launched from any branch, so the
  environment rule is what keeps a prod deploy/seed on master.
- `workflow_dispatch` is restricted to collaborators with **write** access; consider a **required
  reviewer** on the `production` environment so a second person approves a prod seed/deploy.

### Local `pulumi preview` / `up`

`infra/index.ts` reads `NEON_DATABASE_URL` at load. Before a local preview/up, export it:

```bash
export NEON_DATABASE_URL='postgres://nh_app:...@ep-x.neon.tech/neondb?sslmode=require'
pnpm run pulumi:preview
```

### Rotation (all remote — §9)

- **Owner url:** reset the owner password in Neon -> `gh secret set NEON_MIGRATION_URL`. No runtime
  impact (CI migrate/seed only).
- **App url (simple):** reset `nh_app` password -> `gh secret set NEON_DATABASE_URL` -> run the
  **Deploy** workflow via `workflow_dispatch`. Warm Lambdas error briefly until they cycle.
- **App url (zero-downtime):** create `nh_app_b` + run the Phase-2 grants for it -> point
  `NEON_DATABASE_URL` at it -> run Deploy -> verify -> retire `nh_app`.
