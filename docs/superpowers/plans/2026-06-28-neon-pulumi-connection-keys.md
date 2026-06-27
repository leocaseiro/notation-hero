# Neon + Pulumi Connection Keys — Implementation Plan (NH-79)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Neon connection-key plumbing — two least-privilege roles, GitHub-secret connection strings, a DDL-first Drizzle migration runner, a CI migrate-before-deploy step, an idempotent seed, and a thin DB-backed read — so the catalog read slice (NH-123) has a working Lambda → Neon path.

**Architecture:** The 8-table Playable schema lives in Neon Postgres (off-AWS, free plan). Migrations run over **TCP** with the Neon **owner** role (`NEON_MIGRATION_URL`, CI-only, DDL); the Lambda reads rows over **HTTP** (`@neondatabase/serverless`) with a least-privilege **`nh_app`** role (`NEON_DATABASE_URL`, DML only). Both connection strings are **GitHub Actions secrets** (auto-masked in this public repo). Drizzle is **DDL-first**: the raw SQL is the migration source of truth; `catalog.schema.ts` is hand-written only for typed queries. The thin read repoints the existing `GET /api/catalog` placeholder at Neon to prove the path end-to-end — it is a **validation target**, not the real read API (NH-123).

**Tech Stack:** NestJS 11 (hexagon folders) on AWS Lambda · Drizzle ORM (`drizzle-orm` + `drizzle-kit`) · `@neondatabase/serverless` (HTTP runtime) + `postgres` (TCP migrate/seed) · Neon Postgres · Pulumi (TypeScript) · GitHub Actions (OIDC deploy) · pnpm 11.5 workspaces · Vitest.

**Source design:** [`docs/superpowers/specs/2026-06-27-neon-pulumi-connection-keys-design.md`](../specs/2026-06-27-neon-pulumi-connection-keys-design.md) — section refs below (e.g. §3, §6) point there. §13 is the outline this plan expands.

## Decisions applied (2026-06-28 plan review, leocaseiro)

1. **CORS deferred → [NH-250](https://leocaseiro.atlassian.net/browse/NH-250)** (same sprint as the backend, "4b · Catalog + infra"). NH-79 ships only the `Cache-Control` header on the thin read. Reason: the "site origin" is the CloudFront URL — a Pulumi _deploy output_ created **after** the Lambda — so injecting it as a Lambda env makes a circular dependency, and the app is same-origin behind CloudFront today. Task 8 amends the design spec to record the deferral.
2. **Seed shape = committed `seed.sql` + a thin `seed.util.ts` runner** (not inline TypeScript). Faithful to the psql-validated draft, low transcription risk.
3. **Masked single-voice leaves get `listable = false`** in the seed (the 3 `pat_voice_*` rows) so §11's `WHERE listable` actually hides them.

## Global Constraints

Every task's requirements implicitly include these (exact values from the spec + repo conventions):

- **Owner url never reaches the Lambda.** Only `NEON_DATABASE_URL` (`nh_app`, DML) is injected into the Lambda. `NEON_MIGRATION_URL` (owner, DDL) is used **only** by the CI migrate + seed steps (§3).
- **`drizzle.config.ts` reads `process.env.DATABASE_URL`; in CI it is ALWAYS fed `NEON_MIGRATION_URL`** (owner). Pointing it at `nh_app` fails migrations with an opaque `permission denied` on `CREATE`/`ALTER` (§5 caution).
- **Migrations are additive only.** `0000_playable_init.sql` omits the draft's leading `DROP TABLE … CASCADE` so it is purely additive (expand-contract safety, §6).
- **Idempotency is a hard requirement** for the seed: every `INSERT` uses `ON CONFLICT (<that table's pk>) DO NOTHING`. Running the seed twice changes zero rows on the second run (§7 acceptance).
- **Layout guard** (`tooling/check-layout.sh`): every `*.ts` under `server/src/` ends in an approved role suffix (`util`, `schema`, `controller`, `module`, `adapter`, … — `*.config.ts` is exempt). Co-locate tests; no `__tests__/` dirs.
- **`depcheck` no-orphans**: every non-test module must be reachable. `seed.util.ts` is a standalone `tsx` entry point nothing imports → it needs a `pathNot` exemption (like `main.ts`).
- **Node ≥ 24**, pnpm 11.5.2 workspaces. Server TS `module`/`moduleResolution` = `nodenext`; **match existing extensionless relative imports** in non-test source (e.g. `catalog.module.ts` imports `'./catalog.controller'`).
- **Style:** semicolons, Prettier `printWidth: 100`, USA spelling **`catalog`**. Conventional Commits; **never** `--no-verify`; baby commits at every green step.
- **Green = `pnpm run check:all`** at the repo root (format + lint + layout + depcheck + typecheck + tests + tooling). Per-package fast loops noted inside each task.

## File Structure

**Created:**

- `server/drizzle.config.ts` — Drizzle Kit config (dialect, schema path, migrations out-dir, `DATABASE_URL`).
- `server/src/adapters/neon-postgres/catalog.schema.ts` — hand-written Drizzle def of the `playable` table (typed query surface for the thin read). The migration — not this file — is the DDL source of truth.
- `server/src/adapters/neon-postgres/catalog.schema.spec.ts` — asserts the typed surface (also keeps the schema reachable for no-orphans until the controller imports it).
- `server/src/adapters/neon-postgres/migrations/0000_playable_init.sql` + `migrations/meta/_journal.json` — the initial migration (generated `--custom`, DDL pasted in).
- `server/src/adapters/neon-postgres/seed.sql` — the TS-4 seed data (validated draft, adapted: `ON CONFLICT`, no `DROP`, masked voices `listable=false`).
- `server/src/adapters/neon-postgres/seed.util.ts` — thin transactional seed runner (unimported `tsx` entry point; verified by the DB idempotency check, not a unit test).
- `server/.env.example` — documents the local `DATABASE_URL` (a Neon **dev-branch** url).
- `.github/workflows/seed-catalog.yml` — one-click `workflow_dispatch` seed workflow (`environment: production`).
- `infra/README.md` — the operator runbook (§10).

**Modified:**

- `server/package.json` — add deps + `db:generate` / `db:migrate` / `db:seed` scripts.
- `package.json` (root) — add the `db:migrate` convenience script.
- `infra/lambda-with-url.stack.ts` — add an `environment` arg → `aws.lambda.Function.environment.variables`.
- `infra/lambda-with-url.stack.test.ts` — assert the env wiring.
- `infra/index.ts` — inject `DATABASE_URL` (from `process.env.NEON_DATABASE_URL`, wrapped `pulumi.secret`) into the `api` Lambda.
- `infra/index.test.ts` — source-level assertion of the injection.
- `.github/workflows/deploy.yml` — migrate step (first) + pass `NEON_DATABASE_URL` to `up` + `workflow_dispatch` trigger.
- `server/src/modules/catalog/catalog.controller.ts` — repoint `list()` at Neon (typed select, difficulty from `level`, `Cache-Control` header).
- `server/src/modules/catalog/catalog.controller.spec.ts` — DB mock.
- `server/src/entry/http.handler.spec.ts` — DB mock for the existing `/api/catalog` route test.
- `.dependency-cruiser.cjs` — `no-orphans` exemption for `seed.util.ts`.
- `client/public/robots.txt` — `Disallow: /api/`.
- `docs/decisions/decision-registry.md` — Change-log entry: NH-79 lands (status → 🤖) + CORS → NH-250.
- `docs/superpowers/specs/2026-06-27-neon-pulumi-connection-keys-design.md` — note CORS deferral to NH-250.

> **Not in scope (own tickets):** the full oRPC read API + query layer (NH-123) · CloudFront edge-cache (NH-247) · CloudFront-only + WAF origin-hardening (NH-248) · the app-level site-origin CORS policy (NH-250) · admin CRUD CMS (NH-207). The `nh_app` role creation + Phase-2 table grants + the two GitHub secrets are **operator runbook steps** (Task 7), not code.

---

### Task 1: Server DB dependencies, Drizzle config, scripts, and the typed `playable` schema

**Files:**

- Modify: `server/package.json` (deps + scripts)
- Modify: `package.json` (root convenience script)
- Create: `server/drizzle.config.ts`
- Create: `server/src/adapters/neon-postgres/catalog.schema.ts`
- Test: `server/src/adapters/neon-postgres/catalog.schema.spec.ts`

**Interfaces:**

- Produces: `playable` (Drizzle pg table object) from `catalog.schema.ts` — columns `id: text`, `kind: text` (typed `'song'|'part'|'lesson'|'pattern'`), `title: text`, `listable: boolean`, `level: smallint` (nullable), `status: text`. Task 6's controller imports it.
- Produces scripts: `db:generate`, `db:migrate`, `db:seed` (server) + `db:migrate` (root).

- [ ] **Step 1: Add the dependencies** (let pnpm resolve current versions — these are the spec's locked stack, already vetted)

```bash
pnpm --filter @notation-hero/server add drizzle-orm @neondatabase/serverless
pnpm --filter @notation-hero/server add -D drizzle-kit tsx postgres
```

- [ ] **Step 2: Add the scripts** to `server/package.json` (`scripts` block, alphabetical to satisfy `sort-package-json`)

```json
"db:generate": "drizzle-kit generate --custom",
"db:migrate": "drizzle-kit migrate",
"db:seed": "tsx src/adapters/neon-postgres/seed.util.ts",
```

And add to the **root** `package.json` `scripts` (convenience pass-through):

```json
"db:migrate": "pnpm --filter @notation-hero/server run db:migrate",
```

- [ ] **Step 3: Create `server/drizzle.config.ts`**

```ts
import { defineConfig } from 'drizzle-kit';

// DDL-first (ARCH-ORM-1): the raw 8-table SQL under migrations/ is the migration source of truth,
// so we use `drizzle-kit generate --custom` (empty migrations we paste DDL into) — drizzle-kit does
// NOT diff catalog.schema.ts here. `migrate` applies pending SQL over TCP, tracked in
// __drizzle_migrations. DATABASE_URL is ALWAYS the OWNER url (NEON_MIGRATION_URL) in CI — never the
// nh_app url, which has no DDL rights.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/adapters/neon-postgres/catalog.schema.ts',
  out: './src/adapters/neon-postgres/migrations',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
});
```

- [ ] **Step 4: Write the failing schema test** `server/src/adapters/neon-postgres/catalog.schema.spec.ts`

```ts
import { getTableColumns, getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { playable } from './catalog.schema';

describe('catalog.schema — playable (typed query surface for the thin read)', () => {
  it('exposes the columns the thin read selects and filters on', () => {
    const cols = getTableColumns(playable);
    for (const name of ['id', 'kind', 'title', 'listable', 'level', 'status']) {
      expect(cols, `missing column: ${name}`).toHaveProperty(name);
    }
  });

  it('maps to the real Postgres table name', () => {
    expect(getTableName(playable)).toBe('playable');
  });
});
```

- [ ] **Step 5: Run it to verify it fails**

Run: `pnpm --filter @notation-hero/server exec vitest run src/adapters/neon-postgres/catalog.schema.spec.ts`
Expected: FAIL — `Cannot find module './catalog.schema'`.

- [ ] **Step 6: Create `server/src/adapters/neon-postgres/catalog.schema.ts`**

```ts
import { boolean, pgTable, smallint, text } from 'drizzle-orm/pg-core';

// Hand-written Drizzle definition of the SUBSET of `playable` columns the NH-79 thin read needs
// (a typed query surface). The full 8-table typed schema + drizzle-zod derivation is NH-123. The
// migration (migrations/0000_playable_init.sql) — NOT this file — is the DDL source of truth.
export const playable = pgTable('playable', {
  id: text('id').primaryKey(),
  // CHECK-enforced in the DDL; typed here so the thin read maps cleanly to the response union.
  kind: text('kind').$type<'song' | 'part' | 'lesson' | 'pattern'>().notNull(),
  title: text('title').notNull(),
  listable: boolean('listable').notNull().default(true),
  // Nullable 0–10 grade (N-14 bands); null = ungraded.
  level: smallint('level'),
  status: text('status').$type<'draft' | 'published' | 'archived'>().notNull().default('draft'),
});
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `pnpm --filter @notation-hero/server exec vitest run src/adapters/neon-postgres/catalog.schema.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 8: Verify typecheck + layout + lockfile are green**

Run: `pnpm --filter @notation-hero/server run typecheck && pnpm run check:layout && pnpm run lint:sort-pkg`
Expected: all pass (`catalog.schema.ts` carries the approved `schema` suffix; `drizzle.config.ts` is exempt; lockfile + package.json sorted).

- [ ] **Step 9: Commit**

```bash
git add server/package.json package.json pnpm-lock.yaml server/drizzle.config.ts \
  server/src/adapters/neon-postgres/catalog.schema.ts \
  server/src/adapters/neon-postgres/catalog.schema.spec.ts
git commit -m "feat(server): add Drizzle deps, config + typed playable schema (NH-79)"
```

---

### Task 2: The initial migration (`0000_playable_init.sql`, DDL-first)

**Files:**

- Create: `server/src/adapters/neon-postgres/migrations/0000_playable_init.sql`
- Create: `server/src/adapters/neon-postgres/migrations/meta/_journal.json` (generated)
- Source (read-only): `docs/wireframe/2026-06-21-per-track-profiles-and-seed-draft.sql`

**Interfaces:**

- Consumes: `drizzle.config.ts` + `db:generate` / `db:migrate` scripts (Task 1).
- Produces: the 8 tables (`notation`, `playable`, `track`, `step`, `playable_link`, `media`, `tonal_profile`, `drum_profile`) + their indexes in Neon, tracked in `__drizzle_migrations`. Tasks 5 + 6 depend on these tables existing.

- [ ] **Step 1: Generate the empty custom migration**

Run: `pnpm --filter @notation-hero/server run db:generate -- --name playable_init`
Expected: creates `server/src/adapters/neon-postgres/migrations/0000_playable_init.sql` (empty) and `migrations/meta/_journal.json` with one entry.

- [ ] **Step 2: Paste the DDL into `0000_playable_init.sql`**

Copy **lines 34–271** of `docs/wireframe/2026-06-21-per-track-profiles-and-seed-draft.sql` (the section-comment headers + every `CREATE TABLE` and `CREATE INDEX`) into `0000_playable_init.sql`. **Omit line 32** (`DROP TABLE IF EXISTS … CASCADE;`) so the migration is purely additive — a `DROP CASCADE` init would wipe data if it ever re-ran. Do **not** alter the DDL otherwise; the `DEFERRABLE` FKs and `CHECK` constraints are load-bearing.

The file must start with the `CREATE TABLE notation (` block and end with the last index (`CREATE INDEX idx_drum_kit_pieces ON drum_profile …;`). It must contain **no** `DROP`, `INSERT`, or `CREATE EXTENSION`.

- [ ] **Step 3: Bring up a throwaway Postgres to verify** (local Docker — or use a Neon **dev branch** url instead)

```bash
docker run --rm -d --name nh-pg -e POSTGRES_PASSWORD=pw -p 5432:5432 postgres:16
export DATABASE_URL='postgres://postgres:pw@localhost:5432/postgres'
```

- [ ] **Step 4: Run the migration — expect it to apply**

Run: `pnpm --filter @notation-hero/server run db:migrate`
Expected: applies `0000_playable_init`; no errors. Verify the tables exist:

```bash
docker exec nh-pg psql -U postgres -c "\dt" | grep -E 'playable|notation|track|step|media|tonal_profile|drum_profile'
```

Expected: all 8 tables listed.

- [ ] **Step 5: Run the migration again — expect a no-op (idempotent journal)**

Run: `pnpm --filter @notation-hero/server run db:migrate`
Expected: "No migrations to apply" (the `__drizzle_migrations` journal records `0000` as applied). This proves the §5 idempotency claim — re-running on every deploy is safe.

- [ ] **Step 6: Tear down the throwaway DB**

Run: `docker rm -f nh-pg && unset DATABASE_URL`

- [ ] **Step 7: Commit**

```bash
git add server/src/adapters/neon-postgres/migrations
git commit -m "feat(server): DDL-first initial migration for the 8-table Playable schema (NH-79)"
```

---

### Task 3: Inject the Neon app url into the Lambda (`infra`)

**Files:**

- Modify: `infra/lambda-with-url.stack.ts`
- Test: `infra/lambda-with-url.stack.test.ts`
- Modify: `infra/index.ts`
- Test: `infra/index.test.ts`

**Interfaces:**

- Produces: `LambdaWithUrlArgs.environment?: pulumi.Input<Record<string, pulumi.Input<string>>>` → set as `aws.lambda.Function.environment.variables`.
- Consumes: `process.env.NEON_DATABASE_URL` in `infra/index.ts` (passed by the deploy job, Task 4).

- [ ] **Step 1: Add the failing env test** to `infra/lambda-with-url.stack.test.ts`

First extend the `makeComponent` args type (add `environment?: Record<string, string>` to the inline `Partial<{…}>`), then add:

```ts
test('injects environment variables into the Lambda Function when provided', async () => {
  created.length = 0;
  const component = makeComponent('nh-env', {
    environment: { DATABASE_URL: 'postgres://nh_app:secret@ep-x.neon.tech/neondb?sslmode=require' },
  });
  await resolveOutput(component.url);

  // The nh_app url must land as the Lambda's DATABASE_URL env var (the runtime read path, §4).
  assert.deepEqual(inputsOf(':Function').environment, {
    variables: { DATABASE_URL: 'postgres://nh_app:secret@ep-x.neon.tech/neondb?sslmode=require' },
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @notation-hero/infra exec vitest run lambda-with-url.stack.test.ts -t "injects environment"`
Expected: FAIL — `environment` is `undefined` (arg not wired yet).

- [ ] **Step 3: Wire the `environment` arg** in `infra/lambda-with-url.stack.ts`

Add to the `LambdaWithUrlArgs` interface (after `permissionsBoundaryArn`):

```ts
  /**
   * Environment variables for the Lambda (e.g. the Neon `DATABASE_URL`). Wrap secret values with
   * `pulumi.secret(...)` at the call site so they are masked in state + the `pulumi up` log.
   */
  environment?: pulumi.Input<Record<string, pulumi.Input<string>>>;
```

And on the `aws.lambda.Function` (`${name}-fn`), add one property (alongside `loggingConfig`):

```ts
        environment: args.environment ? { variables: args.environment } : undefined,
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @notation-hero/infra exec vitest run lambda-with-url.stack.test.ts`
Expected: PASS (all existing tests + the new one).

- [ ] **Step 5: Add the failing source-level test** to `infra/index.test.ts` (mirrors the existing AWS_IAM source guard — `index.ts` reads `../client/dist` at load so it can't be imported)

```ts
test('composition root injects the Neon app url as the api Lambda DATABASE_URL env (NH-79)', () => {
  assert.match(
    indexSrc,
    /environment:\s*\{\s*DATABASE_URL:/,
    'infra/index.ts must inject DATABASE_URL into the api Lambda environment (the runtime Neon read path).',
  );
  assert.match(
    indexSrc,
    /pulumi\.secret\(\s*requireEnv\(\s*['"]NEON_DATABASE_URL['"]/,
    'the Neon url must come from NEON_DATABASE_URL wrapped in pulumi.secret() so it is masked in state.',
  );
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `pnpm --filter @notation-hero/infra exec vitest run index.test.ts`
Expected: FAIL — no `environment:` / `pulumi.secret(requireEnv(...))` in `index.ts` yet.

- [ ] **Step 7: Inject the url** in `infra/index.ts`

Add a small `requireEnv` helper near the top (after the imports, before `ciRoleBoundaryArn`):

```ts
/** Read a required env var or throw with a remediation hint (passed by deploy.yml / local export). */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is required. In CI it is passed from a GitHub Actions secret to the \`pulumi up\` ` +
        `step (deploy.yml); for a local \`pulumi preview\`/\`up\`, export it first (see infra/README.md).`,
    );
  }
  return value;
}

// The Neon nh_app (DML, least-privilege) url — the ONLY connection string the Lambda receives.
// Wrapped as a secret so it never appears in plaintext in stack state or the deploy log.
const databaseUrl = pulumi.secret(requireEnv('NEON_DATABASE_URL'));
```

Then add `environment` to the existing `new LambdaWithUrl('api', { … })` (after `permissionsBoundaryArn`):

```ts
  // Runtime DB access (NH-79): inject the nh_app url as DATABASE_URL. The owner url
  // (NEON_MIGRATION_URL) is NEVER injected here — it is CI-migrate-only (§3 strict invariant).
  environment: { DATABASE_URL: databaseUrl },
```

- [ ] **Step 8: Run the infra tests to verify they pass**

Run: `pnpm --filter @notation-hero/infra run test`
Expected: PASS (the source guard + the env wiring + all existing tests).

- [ ] **Step 9: Commit**

```bash
git add infra/lambda-with-url.stack.ts infra/lambda-with-url.stack.test.ts infra/index.ts infra/index.test.ts
git commit -m "feat(infra): inject the Neon nh_app url as the Lambda DATABASE_URL env (NH-79)"
```

---

### Task 4: CI — migrate before deploy + pass the app url + `workflow_dispatch`

**Files:**

- Modify: `.github/workflows/deploy.yml`

**Interfaces:**

- Consumes: the `db:migrate` script (Task 1) + `process.env.NEON_DATABASE_URL` injection (Task 3).
- Consumes (operator-provided, Task 7): GitHub secrets `NEON_MIGRATION_URL` (owner) + `NEON_DATABASE_URL` (nh_app).

- [ ] **Step 1: Add the `workflow_dispatch` trigger** (for rotation redeploys, §9). Under `on:`, alongside `workflow_run:`:

```yaml
# Manual redeploy (no commit) — used for secret rotation (§9) and recovery.
workflow_dispatch:
```

- [ ] **Step 2: Add the migrate step as the FIRST job step** (after `setup-js`, before the build). In `jobs.up.steps`, insert immediately after `- uses: ./.github/actions/setup-js`:

```yaml
# Migrate Neon BEFORE building/deploying (§5). Needs only Node + the GitHub secret (no AWS),
# so it runs before any credential is assumed; a failure aborts before `pulumi up`. Idempotent
# (drizzle-kit records applied migrations). DATABASE_URL here is the OWNER url (DDL-capable) —
# never the nh_app url, which has no DDL rights.
- name: Migrate Neon (before deploy)
  run: pnpm --filter @notation-hero/server run db:migrate
  env:
    DATABASE_URL: ${{ secrets.NEON_MIGRATION_URL }}
```

- [ ] **Step 3: Pass the app url to the `pulumi up` step.** In the `pulumi/actions` step's `env:` block (which already carries `PULUMI_CONFIG_PASSPHRASE`), add:

```yaml
# The nh_app url infra/index.ts reads (process.env.NEON_DATABASE_URL) and injects as the
# Lambda DATABASE_URL. Owner url stays out of this step entirely.
NEON_DATABASE_URL: ${{ secrets.NEON_DATABASE_URL }}
```

- [ ] **Step 4: Verify the workflow lints clean**

Run: `pnpm run lint:actions && pnpm run lint:yaml`
Expected: actionlint + yamllint pass. (The migrate step uses only `pnpm` + a secret env, and `workflow_dispatch` adds no untrusted input — no `pull_request_target`/code-checkout SAST trip.)

- [ ] **Step 5: Sanity-check the step order** (migrate must precede build + the AWS credential step)

Run: `grep -n -E 'setup-js|Migrate Neon|Build Lambda|configure-aws-credentials|command: up' .github/workflows/deploy.yml`
Expected order top-to-bottom: `setup-js` → `Migrate Neon` → `Build Lambda` → `configure-aws-credentials` → `command: up`.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci(deploy): migrate Neon before pulumi up + pass nh_app url + workflow_dispatch (NH-79)"
```

---

### Task 5: The seed — `seed.sql` (TS-4) + thin runner + one-click workflow

**Files:**

- Create: `server/src/adapters/neon-postgres/seed.sql`
- Create: `server/src/adapters/neon-postgres/seed.util.ts`
- Modify: `.dependency-cruiser.cjs` (no-orphans exemption)
- Create: `.github/workflows/seed-catalog.yml`
- Source (read-only): `docs/wireframe/2026-06-21-per-track-profiles-and-seed-draft.sql`

**Interfaces:**

- Consumes: the 8 tables (Task 2) + the `postgres` dep + `db:seed` script (Task 1).
- Produces: idempotent TS-4 catalog rows (19 playables + tracks/steps/profiles/notation/media), 3 masked voice leaves `listable=false`.

> **Why no unit test for `seed.util.ts`:** it is a thin, unimported `tsx` entry point (hence the no-orphans exemption — a spec that imported it would cancel the exemption). Its real acceptance is the **DB-backed idempotency check** (Step 5): seed twice → zero rows change on the second run (§7).

- [ ] **Step 1: Build `seed.sql` from the validated draft.** Copy the `INSERT` blocks of `docs/wireframe/2026-06-21-per-track-profiles-and-seed-draft.sql` (everything from the first `INSERT INTO playable …` at line 292 to end of file, line 496). Then adapt — three mechanical edits:

  **(a) Add `ON CONFLICT (<pk>) DO NOTHING` to every INSERT**, using each table's real primary key (verified against the DDL):

  | Table(s)                                 | Conflict target              |
  | ---------------------------------------- | ---------------------------- |
  | `playable`, `notation`, `track`, `media` | `(id)`                       |
  | `step`                                   | `(parent_id, sort_order)`    |
  | `playable_link`                          | `(from_id, to_id, relation)` |
  | `tonal_profile`, `drum_profile`          | `(track_id)`                 |

  Example — the leveled-rudiments INSERT becomes:

```sql
INSERT INTO playable (id, kind, title, description, level, pattern_kind, family, instruments, tags, origin, visibility, status, created_by, data) VALUES
 ('pat_ssr_debut','pattern','Single Stroke Roll (Debut)', /* … unchanged … */ )
 -- … the other rows unchanged …
ON CONFLICT (id) DO NOTHING;
```

**(b) Mark the 3 masked voice leaves `listable = false`.** In the composite-beat INSERT (draft lines 309–313, which inserts `pat_voice_hh`, `pat_voice_sn`, `pat_voice_kick`, `pat_rock_composite`), add `listable` to the column list and set it per row — `false` for the three `pat_voice_*` leaves, `true` for `pat_rock_composite` (the real, shown pattern). This is what makes §11's `WHERE listable` hide the internal leaves:

```sql
INSERT INTO playable (id, kind, title, description, level, bpm, time_signature_numerator, time_signature_denominator, pattern_kind, family, instruments, tags, origin, visibility, status, listable, created_by, data) VALUES
 ('pat_voice_hh',  /* … */ ,'published', false, 'seed', /* … */ ),
 ('pat_voice_sn',  /* … */ ,'published', false, 'seed', /* … */ ),
 ('pat_voice_kick',/* … */ ,'published', false, 'seed', /* … */ ),
 ('pat_rock_composite', /* … */ ,'published', true, 'seed', /* … */ )
ON CONFLICT (id) DO NOTHING;
```

**(c) Do not include any `DROP` or `CREATE`** — `seed.sql` is data only. (A `TRUNCATE`-based full reset is a separate, approval-gated workflow per §7 — out of scope here.)

- [ ] **Step 2: Write `server/src/adapters/neon-postgres/seed.util.ts`**

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import postgres from 'postgres';

// Thin, idempotent seed runner: executes the committed seed.sql (every INSERT is ON CONFLICT DO
// NOTHING) over a single TCP connection, inside one transaction. A standalone `tsx` entry point —
// nothing imports it (it has a no-orphans exemption in .dependency-cruiser.cjs). Run from CI via
// the seed-catalog workflow (owner url) or locally against a Neon dev branch.
async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set — seed with the OWNER url (NEON_MIGRATION_URL).');
  }
  const seedPath = fileURLToPath(new URL('./seed.sql', import.meta.url));
  const seedSql = readFileSync(seedPath, 'utf8');
  const sql = postgres(url, { max: 1 });
  try {
    await sql.begin((tx) => tx.unsafe(seedSql));
    console.log('[seed] seed.sql applied (idempotent — re-runs change nothing).');
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error('[seed] failed:', error);
  process.exitCode = 1;
});
```

- [ ] **Step 3: Add the no-orphans exemption** in `.dependency-cruiser.cjs`. In the `no-orphans` rule's `from.pathNot` array, add the seed runner (it is an unimported entry point, like `main.ts`):

```js
        pathNot: [
          '\\.(test|spec)\\.(ts|tsx)$',
          '\\.stories\\.(ts|tsx)$',
          '^server/src/main\\.ts$',
          '^server/src/adapters/neon-postgres/seed\\.util\\.ts$',
        ],
```

- [ ] **Step 4: Verify depcheck + typecheck are green**

Run: `pnpm run depcheck && pnpm --filter @notation-hero/server run typecheck`
Expected: `depcheck` reports **no orphan** for `seed.util.ts` (the exemption covers it); the runner passes typecheck.

- [ ] **Step 5: Verify idempotency against a real DB** (migrate first, then seed twice — the §7 acceptance)

```bash
docker run --rm -d --name nh-pg -e POSTGRES_PASSWORD=pw -p 5432:5432 postgres:16
export DATABASE_URL='postgres://postgres:pw@localhost:5432/postgres'
pnpm --filter @notation-hero/server run db:migrate
pnpm --filter @notation-hero/server run db:seed   # first run: inserts rows
docker exec nh-pg psql -U postgres -t -c "select count(*) from playable;"   # expect 19
pnpm --filter @notation-hero/server run db:seed   # second run: ON CONFLICT no-op
docker exec nh-pg psql -U postgres -t -c "select count(*) from playable;"   # STILL 19
# And the masked leaves are hidden from the listable view:
docker exec nh-pg psql -U postgres -t -c "select count(*) from playable where listable and status='published';"  # excludes the 3 voices
docker rm -f nh-pg && unset DATABASE_URL
```

Expected: `playable` count is **19 after both runs** (§7 acceptance — second run changes zero rows); the listable+published count excludes the 3 `pat_voice_*` leaves.

- [ ] **Step 6: Create `.github/workflows/seed-catalog.yml`** (one-click bootstrap, §7). Pin `actions/checkout` to the same SHA `deploy.yml` uses.

```yaml
name: Seed catalog

# One-click catalog bootstrap (NH-79 §7). Run ONCE after the first deploy, then only to top up.
# Idempotent (seed.sql is ON CONFLICT DO NOTHING). Uses the OWNER url; declares the master-only
# `production` environment (same gate as deploy.yml).
on:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  seed:
    name: Seed Neon catalog (TS-4)
    environment: production
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0
      - uses: ./.github/actions/setup-js
      - name: Seed catalog (idempotent)
        run: pnpm --filter @notation-hero/server run db:seed
        env:
          DATABASE_URL: ${{ secrets.NEON_MIGRATION_URL }}
```

- [ ] **Step 7: Lint the workflow**

Run: `pnpm run lint:actions && pnpm run lint:yaml`
Expected: pass.

- [ ] **Step 8: Commit**

```bash
git add server/src/adapters/neon-postgres/seed.sql server/src/adapters/neon-postgres/seed.util.ts \
  .dependency-cruiser.cjs .github/workflows/seed-catalog.yml
git commit -m "feat(server): idempotent TS-4 seed (seed.sql + runner) + one-click seed workflow (NH-79)"
```

---

### Task 6: Thin read — repoint `GET /api/catalog` at Neon

**Files:**

- Modify: `server/src/modules/catalog/catalog.controller.ts`
- Test: `server/src/modules/catalog/catalog.controller.spec.ts`
- Test: `server/src/entry/http.handler.spec.ts`

**Interfaces:**

- Consumes: `playable` from `catalog.schema.ts` (Task 1); `process.env.DATABASE_URL` at runtime (the nh_app url injected by Task 3).
- Produces: the unchanged response envelope `{ items: [{ id, title, kind, difficulty }], count }` — so `client/src/components/About.tsx` and its test stay compatible with **no client change**.
- Produces (exported, pure): `toDifficulty(level: number | null): string` — the N-14 band map.

> **Boundary (keeps this a validation target, not NH-123):** inline the typed Drizzle select directly in the controller — **no** new NestJS provider, repository, or adapter class. `difficulty` is derived from `playable.level` (a lookup, no join). Filter `WHERE listable AND status = 'published'` + a small `LIMIT` so internal rows never reach the public page.

- [ ] **Step 1: Write the failing band-map test** in `server/src/modules/catalog/catalog.controller.spec.ts` (replace the file's contents — the old placeholder tests assumed a sync `list()`)

```ts
import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogController, toDifficulty } from './catalog.controller';

// The thin read builds a neon-http client at call time; mock both driver modules so no live DB is
// needed. `vi.hoisted` makes fakeRows available to the (hoisted) vi.mock factory AND the assertions
// below — referencing a plain top-level const inside vi.mock would throw (it is hoisted above it).
const { fakeRows } = vi.hoisted(() => ({
  fakeRows: [
    { id: 'pat_ssr_debut', title: 'Single Stroke Roll (Debut)', kind: 'pattern', level: 0 },
    { id: 'song_demo', title: 'Demo Song', kind: 'song', level: 4 },
    { id: 'lesson_x', title: 'Ungraded Lesson', kind: 'lesson', level: null },
  ],
}));

vi.mock('@neondatabase/serverless', () => ({ neon: () => ({}) }));
vi.mock('drizzle-orm/neon-http', () => ({
  drizzle: () => ({
    select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve(fakeRows) }) }) }),
  }),
}));

describe('toDifficulty (N-14 bands: Debut 0 · Beginner 1-3 · Intermediate 4-6 · Advanced 7-8 · Expert 9-10)', () => {
  it.each([
    [0, 'Debut'],
    [1, 'Beginner 1'],
    [3, 'Beginner 3'],
    [4, 'Intermediate 4'],
    [6, 'Intermediate 6'],
    [7, 'Advanced 7'],
    [8, 'Advanced 8'],
    [9, 'Expert 9'],
    [10, 'Expert 10'],
    [null, 'Ungraded'],
  ])('level %s -> %s', (level, expected) => {
    expect(toDifficulty(level)).toBe(expected);
  });
});

describe('CatalogController (DB-backed thin read)', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://test';
  });

  async function makeController(): Promise<CatalogController> {
    const moduleRef = await Test.createTestingModule({
      controllers: [CatalogController],
    }).compile();
    return moduleRef.get(CatalogController);
  }

  it('maps rows to the catalog envelope, deriving difficulty from level', async () => {
    const controller = await makeController();
    const res = await controller.list();
    expect(res.count).toBe(3);
    expect(res.items[0]).toEqual({
      id: 'pat_ssr_debut',
      title: 'Single Stroke Roll (Debut)',
      kind: 'pattern',
      difficulty: 'Debut',
    });
    expect(res.items[1].difficulty).toBe('Intermediate 4');
    expect(res.items[2].difficulty).toBe('Ungraded');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `pnpm --filter @notation-hero/server exec vitest run src/modules/catalog/catalog.controller.spec.ts`
Expected: FAIL — `toDifficulty` is not exported / `list()` is not DB-backed.

- [ ] **Step 3: Rewrite `server/src/modules/catalog/catalog.controller.ts`**

```ts
import { Controller, Get, Header } from '@nestjs/common';
import { neon } from '@neondatabase/serverless';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';

import { playable } from '../../adapters/neon-postgres/catalog.schema';

export interface CatalogPlayable {
  id: string;
  title: string;
  kind: 'song' | 'pattern' | 'lesson';
  /** Difficulty band label (Debut / Beginner 1-3 / Intermediate 4-6 / ...). */
  difficulty: string;
}

export interface CatalogResponse {
  items: CatalogPlayable[];
  count: number;
}

/**
 * N-14 band map (display-only): level 0 = Debut, 1-3 Beginner, 4-6 Intermediate, 7-8 Advanced,
 * 9-10 Expert; null = Ungraded. A lookup over playable.level — no join.
 */
export function toDifficulty(level: number | null): string {
  if (level === null) return 'Ungraded';
  if (level === 0) return 'Debut';
  if (level <= 3) return `Beginner ${level}`;
  if (level <= 6) return `Intermediate ${level}`;
  if (level <= 8) return `Advanced ${level}`;
  return `Expert ${level}`;
}

// Lazily build + memoize the neon-http client (the nh_app url). Lazy so module import never
// connects (keeps unit tests + cold-start import side-effect-free); HTTP is per-query, no pool.
let db: ReturnType<typeof drizzle> | undefined;
function getDb(): ReturnType<typeof drizzle> {
  if (!db) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set (the nh_app connection string).');
    db = drizzle(neon(url));
  }
  return db;
}

@Controller('catalog')
export class CatalogController {
  // Validation target (NH-79): a typed Drizzle select against Neon — proves the Lambda -> Neon
  // path. The real read API (oRPC contract, filters, pagination) is NH-123. Cache-Control is
  // forward-compat for the NH-247 edge cache; CORS is deferred to NH-250.
  @Get()
  @Header('Cache-Control', 'public, max-age=300')
  async list(): Promise<CatalogResponse> {
    const rows = await getDb()
      .select({
        id: playable.id,
        title: playable.title,
        kind: playable.kind,
        level: playable.level,
      })
      .from(playable)
      // Internal rows (e.g. the masked single-voice leaves) never reach the public page.
      .where(and(eq(playable.status, 'published'), eq(playable.listable, true)))
      .limit(50);

    const items: CatalogPlayable[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      // 'part' is never listable in the v1 seed; the response union stays song|pattern|lesson.
      kind: row.kind as CatalogPlayable['kind'],
      difficulty: toDifficulty(row.level),
    }));
    return { items, count: items.length };
  }
}
```

- [ ] **Step 4: Run the controller test to verify it passes**

Run: `pnpm --filter @notation-hero/server exec vitest run src/modules/catalog/catalog.controller.spec.ts`
Expected: PASS (band map + envelope mapping).

- [ ] **Step 5: Update the handler test** `server/src/entry/http.handler.spec.ts` so the existing `GET /api/catalog` case works without a live DB. `vi` is **already imported** (line 2) — do **not** re-import it. Add these two `vi.mock` calls after the existing import block (vitest hoists them above the imports; the health routes are unaffected):

```ts
// The catalog controller is now DB-backed; mock the neon-http driver so the route resolves through
// the real Nest DI graph without a live DB. Rows are inlined (a vi.mock factory cannot close over a
// top-level const).
vi.mock('@neondatabase/serverless', () => ({ neon: () => ({}) }));
vi.mock('drizzle-orm/neon-http', () => ({
  drizzle: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve([
              { id: 'pat_ssr_debut', title: 'Single Stroke Roll', kind: 'pattern', level: 0 },
            ]),
        }),
      }),
    }),
  }),
}));
```

In the existing `it('serves GET /api/catalog (200) …')` test, add as the first line:

```ts
process.env.DATABASE_URL = 'postgres://test';
```

(The existing assertions — `items` is a non-empty array of `{ id, title, kind }`, `count` is a number — still hold; `difficulty` is additive.)

- [ ] **Step 6: Run the server + client test suites to verify nothing regressed**

Run: `pnpm --filter @notation-hero/server run test && pnpm --filter @notation-hero/client run test`
Expected: PASS. The client's `About.test.tsx` is untouched — the response envelope is preserved (contract unchanged), so the live About page keeps rendering `count` + `difficulty`.

- [ ] **Step 7: Commit**

```bash
git add server/src/modules/catalog/catalog.controller.ts \
  server/src/modules/catalog/catalog.controller.spec.ts \
  server/src/entry/http.handler.spec.ts
git commit -m "feat(server): repoint GET /api/catalog at Neon via typed Drizzle read (NH-79)"
```

---

### Task 7: Operator runbook, robots.txt guard, and `.env.example`

**Files:**

- Create: `infra/README.md`
- Modify: `client/public/robots.txt`
- Create: `server/.env.example`

**Interfaces:** Documentation + a static guard only — no code paths. These are the operator steps (`nh_app` role, Phase-2 grants, the two GitHub secrets) the runtime code in Tasks 1–6 assumes.

- [ ] **Step 1: Edit `client/public/robots.txt`** — change the empty `Disallow:` (allow-all) to block the API (§8 compute guard):

```text
# https://www.robotstxt.org/robotstxt.html
User-agent: *
Disallow: /api/
```

- [ ] **Step 2: Create `server/.env.example`** (committed; the real `.env` is git-ignored — `.gitignore` already covers `.env` with a `!.env.example` exception)

```bash
# Local dev ONLY. Point DATABASE_URL at a Neon **dev branch** connection string
# (Neon console -> your project -> Branches -> dev -> Connection string), so local work never
# spends prod compute-hours. Copy this file to server/.env and fill it in.
#
# Production connection strings live ONLY as GitHub Actions secrets (NEON_DATABASE_URL = nh_app,
# NEON_MIGRATION_URL = owner) — never on a laptop, never committed. server/.env is git-ignored.
#
# Migrations + seed need the OWNER url (DDL); the app runtime needs the nh_app url (DML). Locally,
# a dev-branch owner url is fine for both.
DATABASE_URL=postgres://<user>:<password>@<dev-branch-host>/<db>?sslmode=require
```

- [ ] **Step 3: Create `infra/README.md`** with the operator runbook (§10)

````markdown
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
   `gh workflow run seed-catalog.yml`. Locally: `pnpm db:seed` against a dev branch.

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
````

- [ ] **Step 4: Verify the docs + robots lint clean**

Run: `pnpm run lint:md && pnpm run lint:spell`
Expected: markdownlint + cspell pass. If cspell flags `neondb` / `Neon` / `drizzle` / `tsx`, add them to `cspell.json` `words` (sorted) and re-run.

- [ ] **Step 5: Commit**

```bash
git add infra/README.md client/public/robots.txt server/.env.example cspell.json
git commit -m "docs(infra): Neon keys runbook + robots /api guard + server .env.example (NH-79)"
```

---

### Task 8: Decision-registry status flip + design-spec reconciliation

**Files:**

- Modify: `docs/decisions/decision-registry.md`
- Modify: `docs/superpowers/specs/2026-06-27-neon-pulumi-connection-keys-design.md`

**Interfaces:** Governance only. The registry is `merge=union` (won't conflict); add a **new** newest-first Change-log entry rather than editing the 2026-06-27 one in place.

- [ ] **Step 1: Add the registry Change-log entry** at the top of the `## Change log` list in `docs/decisions/decision-registry.md` (newest-first):

```markdown
### 2026-06-28 — NH-79 lands: connection keys enforced; CORS deferred to NH-250

Implemented the 2026-06-27 connection-keys design (NH-79): two Neon roles (owner DDL / `nh_app`
DML), both urls as GitHub Actions secrets, a DDL-first Drizzle runner + `0000_playable_init`
migration, a CI migrate-before-`up` step, an idempotent TS-4 seed (`seed.sql` + one-click
`seed-catalog` workflow), the `LambdaWithUrl` env injection, the `robots.txt` `/api/` guard, and a
thin Neon-backed `GET /api/catalog` (Cache-Control header).

- **Status flip:** the 2026-06-27 entry's "⏳ enforcement pending" is now **🤖 enforced** — the CI
  migrate step, the `LambdaWithUrl` env wiring, and the layout/depcheck guards cover it.
- **CORS deferred -> [NH-250](https://leocaseiro.atlassian.net/browse/NH-250)** (same sprint as the
  backend). The thin read ships only the `Cache-Control` header; the site-origin CORS policy §11
  put in NH-79 moves to NH-250, because the site origin (the CloudFront URL) is a deploy output
  created after the Lambda — injecting it would be circular — and the app is same-origin today.
- **Masked single-voice leaves** are seeded `listable=false`, so the thin read's `WHERE listable`
  hides them as §11 intended.
```

- [ ] **Step 2: Reconcile the design spec** `docs/superpowers/specs/2026-06-27-neon-pulumi-connection-keys-design.md`. Two light edits so the approved doc matches what shipped:

  - In **§11** (the thin read), replace the CORS sentence's promise with a deferral note: the thin read ships the `Cache-Control` header; the **site-origin CORS policy is deferred to NH-250** (circular-dependency reason), with true origin-locking still tracked in §14.
  - In **§14** (open follow-ups), add a bullet: **NH-250 — site-origin CORS policy on the catalog read API** (deferred from NH-79; same-sprint as the backend).

- [ ] **Step 3: Verify docs lint clean**

Run: `pnpm run lint:md && pnpm run lint:spell`
Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add docs/decisions/decision-registry.md docs/superpowers/specs/2026-06-27-neon-pulumi-connection-keys-design.md
git commit -m "docs: flip NH-79 registry status to enforced + record CORS deferral to NH-250 (NH-79)"
```

---

## Final verification (whole-plan gate)

- [ ] **Step 1: Run the full repo gate**

Run: `pnpm run check:all`
Expected: green — format, all per-package lint, layout, depcheck, core-purity, typecheck, all tests, tooling tests.

- [ ] **Step 2: Confirm the deploy preconditions are documented, not assumed.** The `nh_app` role, the Phase-2 grants, and the two GitHub secrets are **operator** steps (Task 7 runbook). The first auto-deploy returns 403 on the thin read until the Phase-2 grants run — this is called out in `infra/README.md` step 5. No code change can substitute for them.

- [ ] **Step 3: Push + open/extend the PR** (this plan lands on `worktree-neon-pulumi-keys` / PR #90 per the maintainer's instruction)

```bash
git push origin worktree-neon-pulumi-keys
```

## Open questions / follow-ups (not blocking)

- **Seed transport** — `postgres` (postgres-js) chosen for `seed.util.ts` (§14). If `drizzle-kit migrate` needs an explicit TCP driver in CI, `postgres` is already installed.
- **`db:env:dev` helper** (nice-to-have, §14) — a script that points `server/.env` at a fresh Neon dev branch. Out of scope.
- **Full-reset workflow** (§7) — the `TRUNCATE … CASCADE` + re-seed path is a separate, approval-gated workflow; intentionally **not** in `seed-catalog.yml` so an accidental re-run can never wipe data.
