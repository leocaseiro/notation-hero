---
title: "feat: Kanel DB-row layer + SQL migrations (adapters/postgres)"
type: feat
date: 2026-06-11
origin: docs/brainstorms/2026-06-11-kanel-db-row-layer-requirements.md
target_branch: claude/condescending-mendeleev-132bba
status: ready-for-work
---

# feat: Kanel DB-row layer + SQL migrations (`adapters/postgres`)

**Origin:** [kanel DB-row layer requirements](../brainstorms/2026-06-11-kanel-db-row-layer-requirements.md) · **Related:** [catalogue schema spec](../specs/2026-06-10-catalogue-schema.md) (§4 + §9 DDL) · [Area-K build plan](2026-06-07-001-feat-cms-k-build-plan.md) (U4 `adapters/postgres`) · [tooling DACI](../decisions/2026-06-09-tooling-stack-daci.md) · [decision registry](../decisions/decision-registry.md)

**Target branch:** `claude/condescending-mendeleev-132bba` (PR #8 — the `core/` catalogue domain). `master`'s `core/` is `.gitkeep` only; this work builds **on top of PR #8's branch** (currently `055cd3e`) so it can proceed before #8 merges. All paths below are repo-relative.

---

## Summary

Stand up the `adapters/postgres` package: plain-SQL migrations become the executable schema source of truth (`0001_init.sql` = the spec §4 + §9 DDL verbatim), a tiny hand-rolled `pg` runner applies them, and **Kanel + kanel-zod** introspect a real ephemeral Postgres to generate the committed **snake_case DB-row types (+ Zod)** the future U4 mapper will consume. A CI contract test regenerates against `postgres:16` and fails (`git diff --exit-code`) when the committed output drifts from the migrations. `core/` stays DB-agnostic — the `core ↛ adapters` dependency-cruiser rule already guarantees it cannot import the generated layer.

This plan **pulls the migration runner + first migration forward** from the build plan's U4 into this scaffold (type generation requires applying migrations first). The build plan's U4 then keeps only the `CatalogueRepositoryPostgres` + Row↔domain mapper.

---

## Problem Frame

`core/` (PR #8) is hand-written camelCase TypeScript + Zod mirroring the locked §4 DDL by hand. The Neon Postgres DB exists but was created out-of-band, and **nothing in the repo can rebuild or version the schema** (no migrations, no committed DDL, no `pg`/kanel deps). Three gaps follow, each mapped to this plan:

1. The schema has no in-repo source of truth → committed plain-SQL migrations (U2).
2. The snake_case DB-row types the U4 adapter needs don't exist → Kanel generation (U3).
3. No automated guard keeps the generated types honest against the migrations → CI contract test (U5).

The user wants version control **and** real migrations **and** no SaaS/ORM lock-in. Raw SQL + Kanel (a dev-time introspection tool whose output is committed) satisfies all three: migrations run on any Postgres, so Neon is a swappable host, not a dependency.

---

## Requirements Trace

| Req (origin) | Where addressed |
|---|---|
| R1 — committed plain-SQL migrations under `adapters/postgres/migrations/`; `0001_init.sql` = spec §4 DDL verbatim | U2 |
| R2 — migrations apply to any standard Postgres, no SaaS/ORM-DSL dependency | U2 (hand-rolled `pg` runner; raw SQL) |
| R3 — the live Neon DB reconciled to `0001_init.sql` | Operational Notes (one-time manual, owner-run) + U2 verification |
| R4 — Kanel (+ kanel-zod) generates snake_case rows + Zod into `adapters/postgres/generated/`, committed | U3 |
| R5 — generated id brands map to `core`'s `Brand<string,'XId'>` (this plan **tightens** R5 — see KTD-5); column→brand map + type-level test | U3 (override) + U4 (type test) |
| R6 — generated artifacts only in `adapters/postgres/`; `core/` imports nothing from `adapters/` | U1 (boundary) + U5 (`no-orphans` carve-out); enforced by `no-core-to-adapters` |
| R7 — `pnpm db:generate` reproduces generation locally (local Postgres → migrate → Kanel) | U3 |
| R8 — CI fails when committed generated output is stale vs migrations | U5 |
| R9 — connection strings from env only; throwaway CI DB; `.gitignored` `.env` + `.env.example`; Kanel reads `process.env.DATABASE_URL` | U6 (+ U3 config, U5 CI) |

---

## Key Technical Decisions

- **KTD-1 — Hand-rolled `pg` migration runner, forward-only.** Adopt the build plan's ~40-LOC runner: numbered `*.sql` applied in a `BEGIN/COMMIT` transaction, recorded in a `schema_migrations(name PK, applied_at)` table, ordered by filename. Zero new framework deps, full control, and matches the DACI "complete now, never migrate frameworks" principle. Research confirmed every §4/§9 statement (`CREATE EXTENSION`, `IMMUTABLE` functions, `GENERATED … STORED`, plpgsql trigger) is transaction-safe, so default wrapping is fine. Forward-only (roll-forward): down migrations are rarely tested and almost never applied; the throwaway CI DB is recreated each run anyway. *(see origin: Open Questions — migration runner)*
- **KTD-2 — Kanel v4 config is CommonJS; kanel-zod runs inside `makePgTsGenerator`.** kanel 4.0.2 / kanel-zod 4.0.0 are CJS-only, so the config file is `.kanelrc.cjs` (`module.exports`). The v4 shape is a `generators: [makePgTsGenerator({ preRenderHooks: [generateZodSchemas] })]` array — **not** the top-level `preRenderHooks` the stale kanel-zod README shows. `connection: process.env.DATABASE_URL`.
- **KTD-3 — kanel-zod 4.0.0 emits Zod v4; pin `zod ^4.4.3`.** Verified from the published tarball (`z.uuid()` top-level marker). kanel-zod declares **no `zod` peer dependency**, so the package pins `zod ^4.4.3` itself (matching `core`).
- **KTD-4 — Generated rows are snake_case (DB-truth); no camelCase hook.** Kanel's default preserves column names; `zodCamelCaseHook` is opt-in and omitted. camelCase conversion is the U4 mapper's job, not the generated layer's. *(see origin: R5)*
- **KTD-5 — Brands via `generateIdentifierType` override emitting `core`'s exact shape.** Kanel's default brand is `string & { __brand: 'public.<table>' }` (tag = `schema.table`, not `readonly`). Override `generateIdentifierType` with a column→brand-name map (`public.catalogue_item.id → CatalogueItemId`, `public.exercise.id → ExerciseId`, `public.pattern.id → PatternId`) emitting `string & { readonly __brand: '<XId>' }` — structurally identical to `core`'s `Brand<string,'XId'>`. **FK columns inherit the PK brand automatically** because the schema declares real `FOREIGN KEY` constraints (Kanel reads catalog FK metadata): `exercise.lesson_id` / `exercise.source_item_id` / `item_pattern.item_id` → `CatalogueItemId`, `item_pattern.pattern_id` → `PatternId`. A type-level test (U4) pins the structural match. **This plan tightens origin R5:** the origin allowed Kanel-side brands to differ and be converted at the mapper; this plan instead emits the identical shape so the U4 mapper needs no id cast — strictly better, and enabled by the research. **Fallback (the FK-inherit behavior is source-derived/unverified):** if a fresh `db:generate` types any FK column as raw `string`, add an explicit per-FK-column entry to the brand map (`lesson_id`/`source_item_id`/`item_id`/`pattern_id` → parent brand). **Never hand-edit `generated/` to make the test pass** — that defeats the U5 contract gate. *(see origin: R5)*
- **KTD-6 — Exclude `schema_migrations` from generation.** Kanel v4 top-level `filter: (pgType) => pgType.name !== 'schema_migrations'` drops the runner's bookkeeping table before any generator runs.
- **KTD-7 — Generated files are excluded from declaration emit, not annotated.** `isolatedDeclarations` is live in this package (locked DACI). Kanel **row types** (interfaces) satisfy it; the **kanel-zod consts** are the risk (an exported `const … as unknown as z.Schema<Row>`). Mirror the DACI's `*.test`/`*.stories` exclusion: `tsconfig.build.json` excludes `generated/**` from `--emitDeclarationOnly`. A smoke test (U4) determines whether the generated consts also need excluding from `isolatedDeclarations` typecheck; if so, `generated/` moves to a leaf tsconfig with `isolatedDeclarations: false` and an annotated barrel re-exports the public surface. Note `typecheck`/`build` run `tsc -b` over `tsconfig.json` (which `include`s `generated/**`), so the generated consts face `isolatedDeclarations` on the **typecheck** path — `tsconfig.build.json`'s exclude only covers declaration *emit*, so the leaf-tsconfig fallback (U4) is the primary mechanism if the smoke fails. *(see origin: Open Questions — isolatedDeclarations)*
- **KTD-8 — Real Postgres only; `services: postgres:16` in CI + reused compose locally.** The §4 DDL needs `pg_trgm`/`unaccent` extensions, `IMMUTABLE` wrappers, and a `GENERATED` tsvector — `pg-mem`/in-memory shims are ruled out. The official `postgres:16` (Debian) image ships `pg_trgm`/`unaccent` in contrib. CI uses a `services:` container with a `pg_isready` healthcheck + a fixed throwaway password; local dev reuses `docker-compose.test.yml`. *(see origin: Open Questions — ephemeral Postgres, DECIDED)*
- **KTD-9 — Deterministic generated output: no prettier, enforce LF.** Kanel joins output with `os.EOL` and its prettier hook **fails silently** when prettier isn't resolvable — both cause local↔CI diff flakiness. Skip the prettier hook entirely (Kanel's native output is deterministic: PK-first, then ordinal), enforce `text eol=lf` + `linguist-generated=true` in `.gitattributes`, and exclude `generated/` from `.prettierignore`/`.eslintignore` so format/lint passes can't rewrite the asserted bytes. Use Kanel's `markAsGenerated` hook for the `// @generated` header. Kanel declares a `prettier ^2||^3` **peer dependency** — add `prettier` to devDeps to satisfy it (the hook stays unconfigured) or accept the benign unmet-peer notice. **Pin the introspection surface** for cross-machine determinism: lock `kanel`/`kanel-zod`/transitive `extract-pg-schema` via `pnpm-lock.yaml` and pin the image to a fixed minor (`postgres:16.x`) matching `docker-compose.test.yml`, so local and CI introspect identical engines (otherwise a patch/version skew can flap the diff gate).
- **KTD-10 — Package name `@notation-hero/adapters-postgres`, tag `type:adapter`.** Follows the build plan's name and the `core/→type:core`, `adapters/→type:adapter` tag map. `adapters/*` is already globbed in `pnpm-workspace.yaml`.

---

## High-Level Technical Design

The pipeline and the boundary it must not cross:

```mermaid
flowchart LR
  subgraph repo["adapters/postgres/ (committed)"]
    M["migrations/0001_init.sql\n(= spec §4 + §9 DDL)"]
    CFG[".kanelrc.cjs"]
    GEN["generated/\nsnake_case rows + Zod"]
  end
  subgraph eph["ephemeral postgres:16 (local or CI)"]
    PG[("schema applied")]
  end
  M -->|"migrate.ts (hand-rolled pg runner)"| PG
  CFG -->|"kanel introspects live DB"| PG
  PG -->|"emit"| GEN
  GEN -.->|"consumed later by"| MAP["U4 Row↔domain mapper (deferred)"]
  MAP -.-> CORE["core/ domain (hand-written camelCase)"]

  subgraph ci["CI drift gate (R8)"]
    RUN["db:generate"] --> DIFF{"git diff --exit-code\n-- generated/"}
    DIFF -->|clean| OK["pass"]
    DIFF -->|differs| FAIL["::error:: run pnpm db:generate and commit"]
  end
```

Dependency direction (enforced by dependency-cruiser `no-core-to-adapters` = error):

```mermaid
flowchart LR
  AD["adapters/postgres\n(generated rows live here)"] -->|imports| CO["core (domain + ports)"]
  CO -. "forbidden (error)" .-x AD
```

Three representations meet only at the deferred U4 mapper: the **DB row** (snake_case, `search tsvector`, `jsonb → unknown`), the **generated type** (Kanel mirror of the row), and the **domain** (`core`'s hand-written camelCase). This plan delivers the first two; the mapper is U4.

---

## Output Structure

```
adapters/postgres/
├── package.json                 # @notation-hero/adapters-postgres; deps kanel, kanel-zod, pg, dotenv, tsx; peer @notation-hero/core; zod ^4.4.3
├── project.json                 # tags: ["type:adapter"]
├── tsconfig.json                # extends ../tsconfig.base.json; composite + isolatedDeclarations
├── tsconfig.build.json          # --emitDeclarationOnly; excludes generated/** and *.test.ts
├── .kanelrc.cjs                 # CommonJS Kanel v4 config (connection from env, brand override, filter)
├── docker-compose.test.yml      # postgres:16, throwaway creds, pg_isready healthcheck
├── .env.example                 # DATABASE_URL placeholder (real .env is gitignored)
├── migrations/
│   └── 0001_init.sql            # = spec §4 + §9 DDL verbatim
├── db/
│   ├── migrate.ts               # hand-rolled runner (schema_migrations, ordered, transactional)
│   ├── pgExecutor.ts            # pg.Pool executor (migrations + introspection)
│   ├── cli-migrate.ts           # CLI entry; reads process.env.DATABASE_URL
│   └── migrate.test.ts          # co-located integration test (Docker postgres)
├── generated/                   # COMMITTED Kanel output (snake_case rows + Zod); // @generated
│   └── …                        # one module per table + an index/barrel
└── brands.test-d.ts             # type-level brand-equality test (R5)
```

*(The implementer may adjust layout; per-unit `Files:` lists are authoritative.)*

---

## Implementation Units

> **Note on "U4":** within this plan, an unqualified **U4** means *this plan's* U4 (the brand-fidelity type test below). The Area-K build plan's U4 — the repository + Row↔domain mapper, deferred — is always written **"the build plan's U4"**.

### U1. Scaffold the `adapters/postgres` package

**Goal:** A typecheck-green, boundary-correct empty package wired into pnpm/Nx, with the TS config split that quarantines generated files from declaration emit.

**Requirements:** R6 (boundary). *(Package identity — name/tags — is plan-local scaffolding, not a separate origin requirement.)* **Dependencies:** none (first unit).

**Files:**
- `adapters/postgres/package.json` (create) — name `@notation-hero/adapters-postgres`, `type: module`, peer `@notation-hero/core`, `zod ^4.4.3`; devDeps added in U2/U3.
- `adapters/postgres/project.json` (create) — `"tags": ["type:adapter"]`, `projectType: "library"`, `sourceRoot: "adapters/postgres"`.
- `adapters/postgres/tsconfig.json` (create) — `extends ../../tsconfig.base.json`; `composite: true`, `isolatedDeclarations: true`, `outDir ./dist`, `include ["**/*.ts"]`, mirror `core/tsconfig.json`.
- `adapters/postgres/tsconfig.build.json` (create) — `--emitDeclarationOnly` target; `exclude` `generated/**`, `**/*.test.ts`, `**/*.test-d.ts`.
- `adapters/postgres/.gitignore` (create) — `.env`, `dist`.

**Approach:** `adapters/*` is already globbed in `pnpm-workspace.yaml` — no workspace edit needed. Copy `core/`'s `tsconfig.json` shape (it already runs `composite` + `isolatedDeclarations` with `.ts` import extensions). The `tsconfig.build.json` exclusion is KTD-7; it exists so machine-written `generated/` never flows into declaration emit.

**Patterns to follow:** `core/package.json`, `core/tsconfig.json`, `core/project.json`, `infra/project.json` (tag shape).

**Test scenarios:** `Test expectation: none — scaffolding`. Verification covers it.

**Verification:** `pnpm --filter @notation-hero/adapters-postgres typecheck` exits 0; `pnpm depcheck` reports no new violations; the package appears in `nx show projects`.

---

### U2. First migration + hand-rolled `pg` runner

**Goal:** `migrations/0001_init.sql` is the executable schema (spec §4 + §9 verbatim), and a tiny runner applies it idempotently to any Postgres.

**Requirements:** R1, R2, R3, R7 (partial). **Dependencies:** U1.

**Files:**
- `adapters/postgres/migrations/0001_init.sql` (create) — **= spec §4 + §9 DDL verbatim**: `CREATE EXTENSION pg_trgm`/`unaccent`; `immutable_unaccent` + `immutable_array_to_string` functions; tables `catalogue_item`, `exercise`, `pattern`, `item_pattern` with all named CHECK constraints (`ci_*`, `ex_*`, `pat_level`) and `text` PK/FK constraints; the `GENERATED ALWAYS AS (…) STORED` `search` tsvector column; all §9 GIN/btree indexes.
- `adapters/postgres/db/migrate.ts` (create) — applies numbered `*.sql` in filename order, each in `BEGIN/COMMIT`, recorded in `schema_migrations(name text PRIMARY KEY, applied_at timestamptz DEFAULT now())`; skips already-applied; idempotent.
- `adapters/postgres/db/pgExecutor.ts` (create) — `pg.Pool` executor (`query`, `batch`).
- `adapters/postgres/db/cli-migrate.ts` (create) — CLI entry reading `process.env.DATABASE_URL`; wired as the `migrate` script.
- `adapters/postgres/docker-compose.test.yml` (create) — `postgres:16`, user/pass `notation`, db `catalogue_test`, port `55432:5432`, `pg_isready` healthcheck (reuse the build plan's shape).
- `adapters/postgres/db/migrate.test.ts` (create) — co-located integration test (NO `__tests__/`).
- `adapters/postgres/package.json` (modify) — add devDeps `pg`, `@types/pg`, `tsx`, `dotenv`; add a `migrate` script, a **`test`** script that globs unit/type tests but **excludes `db/**`** (so the no-Docker CI job never boots Postgres), and a **`test:integration`** script (`node --test "db/**/*.test.ts"`) run only by the CI `db` job.

**Approach:** KTD-1. Forward-only; no down files. The runner runs each `.sql` file's full contents verbatim — `core`'s §4 CHECK constraint *names* must survive into the DB so error messages match `core`'s Zod refinement messages.

**Execution note:** Start with `migrate.test.ts` against Docker Postgres (the runner is infrastructure with a clear contract), then implement the runner to green.

**Patterns to follow:** build plan U4 runner sketch (lines ~787–820), `docker-compose` (lines ~837–852).

**Test scenarios** (`migrate.test.ts`, against Docker `postgres:16`):
- Happy path: `migrate()` applies `0001_init.sql` cleanly on a fresh DB; all 4 tables + the `search` column + indexes exist (introspect `information_schema`).
- Idempotency: a second `migrate()` run is a no-op (no error; `schema_migrations` unchanged).
- Extensions/functions: `pg_trgm`, `unaccent`, `immutable_unaccent`, `immutable_array_to_string` exist after migrate.
- Constraint fidelity: one failing `INSERT`/`UPDATE` per named CHECK (`ci_type`, `ci_status`, `ci_level`, `ci_song_bpm`, `ci_song_file`, `ci_song_fmt`, `ci_lesson_type_only`, `ci_shared_curated`, `ci_source`, `ci_pub_license`, `ex_one_source`, `ex_slice_bars`, `ex_bpm_ladder`, `pat_level`) raises with the constraint name in the error.
- FK enforcement: inserting an `exercise` with a non-existent `lesson_id` violates the FK.

**Verification:** the suite passes against a freshly booted `docker-compose.test.yml`; re-running `migrate` is idempotent.

---

### U3. Kanel + kanel-zod generation + `db:generate`

**Goal:** `pnpm db:generate` boots Postgres → applies migrations → runs Kanel → emits committed snake_case rows + Zod with `core`-shaped brands.

**Requirements:** R4, R5 (override), R7. **Dependencies:** U2.

**Files:**
- `adapters/postgres/.kanelrc.cjs` (create) — CommonJS (KTD-2): `connection: process.env.DATABASE_URL`; `schemaNames: ['public']`; `outputPath: './generated'`; `preDeleteOutputFolder: true`; `typescriptConfig: { tsModuleFormat: 'esm' }`; `filter` excludes `schema_migrations` (KTD-6); `generators: [makePgTsGenerator({ preRenderHooks: [generateZodSchemas], generateIdentifierType: <override> })]`; `postRenderHooks: [markAsGenerated]`; **no** prettier hook (KTD-9).
- `adapters/postgres/db/brandMap.ts` (create) — the column→brand-name map consumed by the `generateIdentifierType` override (`public.catalogue_item.id → CatalogueItemId`, `public.exercise.id → ExerciseId`, `public.pattern.id → PatternId`).
- `adapters/postgres/generated/**` (create, committed) — Kanel output; `// @generated` header.
- `adapters/postgres/package.json` (modify) — add devDeps `kanel ^4.0.2`, `kanel-zod ^4.0.0`; add `"db:generate"` script (compose up + wait + migrate + kanel + compose down).

**Approach:** KTD-2/4/5/6. The `generateIdentifierType` override emits `string & { readonly __brand: '<XId>' }` so generated ids are structurally identical to `core`'s branded ids; FK columns inherit automatically (real FK constraints). `jsonb → unknown`, `text[] → string[]`, `timestamptz → Date`, the `GENERATED` `search` column appears in the row/selector type but not the initializer (Kanel splits it). Config is `.cjs` because kanel/kanel-zod are CJS-only.

**Patterns to follow:** Kanel v4 `configuring.html`; `core/catalogue/ids.ts` (the brand shape the override must match).

**Test scenarios:** `Test expectation: structure asserted by U4 (brand/FK types), content-freshness by U5 (drift gate).` U3 itself adds a generation smoke: Kanel emits exactly one module per table (and **none** for `schema_migrations`), column keys are snake_case, and the four FK columns are present in the generated rows.

**Verification:** `pnpm db:generate` produces a stable `generated/` (running it twice yields no diff); generated modules exist for all 4 tables and not for `schema_migrations`; column keys are snake_case.

---

### U4. Brand-fidelity type test + `isolatedDeclarations` smoke

**Goal:** Pin — in this work, not deferred — that generated id brands match `core`'s, and resolve whether generated files survive `isolatedDeclarations`.

**Requirements:** R5, R6, R7. **Dependencies:** U3.

**Files:**
- `adapters/postgres/brands.test-d.ts` (create) — type-level assertions (a `tsd`-style or hand-rolled `Expect<Equal<…>>` pattern compiled by `tsc`).
- `adapters/postgres/tsconfig.json` / `tsconfig.build.json` (modify, only if the smoke fails) — relocate `generated/` to a leaf with `isolatedDeclarations: false` + an annotated barrel.

**Approach:** KTD-5/7. The brand test imports the generated id types and `core`'s `CatalogueItemId`/`ExerciseId`/`PatternId` and asserts mutual assignability (structural match), plus asserts the four FK columns carry the parent brand (not raw `string`). The smoke test runs `tsc -b` / `tsc --isolatedDeclarations --emitDeclarationOnly` over the package and confirms the kanel-zod consts compile under `isolatedDeclarations`; **this is the highest-uncertainty item** (see Risks) — if they fail, apply the leaf-tsconfig fallback before locking.

**Execution note:** Run the `isolatedDeclarations` smoke against a 1–2 table sample first to get a definitive yes/no cheaply, then decide the tsconfig shape.

**Test scenarios:**
- `CatalogueItemId` (generated) is assignable to `core`'s `CatalogueItemId` and vice versa; likewise `ExerciseId`, `PatternId`.
- FK columns are branded: `exercise.lesson_id` and `exercise.source_item_id` types extend `CatalogueItemId`; `item_pattern.item_id` extends `CatalogueItemId`; `item_pattern.pattern_id` extends `PatternId`. A raw `string` FK is a compile failure (guards the "FK lost its brand" regression).
- A deliberately-wrong assignment (`ExerciseId` → `CatalogueItemId`) fails to compile.
- `isolatedDeclarations` smoke: declaration emit over the package (with `generated/` excluded per KTD-7) exits 0; if `generated/` is included, the consts compile or the fallback is applied.

**Verification:** `pnpm --filter @notation-hero/adapters-postgres typecheck` (incl. the `.test-d.ts`) exits 0; the declaration-emit smoke is green. In the CI `db` job, the brand test + smoke run **after** a fresh `db:generate`, so they validate Kanel's real output — not the committed snapshot (this prevents a hand-edited `generated/` from passing a brand assertion the generator wouldn't actually produce).

---

### U5. CI contract-test gate + commit hygiene

**Goal:** CI regenerates against a real Postgres and fails on drift; generated files are review-quiet and byte-stable.

**Requirements:** R8, R6, R9 (CI portion). **Dependencies:** U3 (U4 in parallel).

**Files:**
- `.github/workflows/ci.yml` (modify) — add a **`db` job** with `services: postgres:16` (fixed throwaway password, `pg_isready` healthcheck): install → `migrate` → `db:generate` → `git diff --exit-code -- adapters/postgres/generated` with a `::error::` message "Generated DB types are stale — run `pnpm db:generate` and commit." Run the Docker-dependent integration tests via `pnpm --filter @notation-hero/adapters-postgres test:integration` in this `db` job. **The repo's CI test step is `pnpm -r --if-present run test` (NOT `nx run-many test`)**, which invokes each package's `test` script — so the adapter's `test` script must exclude `db/**` to keep the no-Docker `quality` job green. Wire the `db` job into `ci-green`: add `needs: changes` + `if: needs.changes.outputs.code == 'true'`; add `db` to `ci-green`'s `needs:` array AND extend its bash result-check to read `needs.db.result`, failing on `failure`/`cancelled` (skipped stays OK, matching the existing two-job pattern).
- `.github/workflows/ci.yml` (modify) — extend the `dorny/paths-filter` `code` filter so new root/config inputs (e.g. `adapters/**` already covered; confirm `.gitattributes` changes don't silently skip the gate).
- `.gitattributes` (create or modify) — `adapters/postgres/generated/** linguist-generated=true` and `text eol=lf` (KTD-9).
- `.prettierignore` / `.eslintignore` (create or modify) — exclude `adapters/postgres/generated/`.
- `.dependency-cruiser.cjs` (modify) — add a `generated/` carve-out to `no-orphans` so committed-but-not-yet-imported generated modules don't warn (the U4 mapper that imports them is deferred). Target the origin/master version of this file (the local worktree's copy is stale).

**Approach:** KTD-8/9. The gate is "regenerate, assert no diff." Determinism is protected by LF enforcement + no prettier on generated output. The `db` job is the **first** Docker-service usage in CI (none exists today).

**Test scenarios:**
- Drift detected: a migration change without regeneration makes the `db` job red (the `git diff` is non-empty); the error names the remediation command.
- Clean pass: regenerating after committing fresh output leaves `git diff` empty → green.
- Reproducibility: a second local `db:generate` yields no diff (no nondeterministic ordering / line-ending drift).
- `Covers` the R8 success criterion: green when types match migrations, red when a migration changes without regeneration.

**Verification:** a deliberately-stale commit fails the `db` job with the remediation message; after regeneration the job is green; `pnpm depcheck` stays clean (no orphan warnings for `generated/`).

---

### U6. Credentials hygiene + docs reconciliation

**Goal:** No connection string ever lands in the repo or CI logs; the docs reflect the new single source of truth.

**Requirements:** R9, and D1 (spec-as-pointer). **Dependencies:** U2, U3.

**Files:**
- `adapters/postgres/.env.example` (create) — `DATABASE_URL=postgres://USER:PASSWORD@localhost:55432/catalogue_test` placeholder; the real `.env` is gitignored (U1).
- `docs/specs/2026-06-10-catalogue-schema.md` (modify) — replace the §4 DDL block with a pointer to `adapters/postgres/migrations/0001_init.sql` (the sole executable source), per D1/F-3; keep the surrounding rationale as prose.
- `docs/plans/2026-06-07-001-feat-cms-k-build-plan.md` (modify) — add a supersede note to U4: Kanel now generates the row **types** (the hand-written `rowMappers.ts` row types are superseded; the mapping logic stays U4), and the migration runner + `0001` have moved into this work.

**Approach:** R9 — the Kanel config and CLI read `process.env.DATABASE_URL`; CI uses the throwaway service password and **never** the real Neon URL; local uses the gitignored `.env`. Docs edits close the D1 "spec §4 becomes a pointer" loop so there's no second DDL copy to drift.

**Test scenarios:** `Test expectation: none — config + docs`. Verification covers it.

**Verification:** `git grep` finds no literal connection string outside `.env.example`; the spec §4 block points at the migration; the build plan U4 note is present.

---

## Scope Boundaries

**In scope:** the `adapters/postgres` scaffold, `0001_init.sql`, the hand-rolled runner, Kanel + kanel-zod config, committed `generated/`, `db:generate`, the CI drift gate, the R5 brand override + type test, and R9 credential hygiene.

### Deferred to Follow-Up Work
- **U4 (Area-K build plan) `CatalogueRepositoryPostgres` + Row↔domain mapper** — the full domain↔DB compile-time link. This plan delivers the generated row types the mapper will consume; the mapper itself stays U4.
- **Applying migrations to the live Neon DB at deploy time** — infra / U4 (see Operational Notes for the one-time R3 reconcile).
- **`pattern_pairing` and other deferred schema** — out of the locked §4.
- **`docs/solutions/` capture** — after this lands, the codegen + contract-test + branded-id pattern is a strong `/ce-compound` candidate (the solutions KB is currently empty).

**Out of scope (not this work):** Drizzle/Prisma DSLs and Neon-proprietary tooling (rejected as the real lock-in); a separate `db/` package (YAGNI until a second consumer); live-DB↔migration drift detection (covered by the "all changes via migrations" convention, not an automated guard).

---

## Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **`isolatedDeclarations` rejects the kanel-zod consts** (highest-uncertainty item — `castToSchema`'s `as` cast may or may not satisfy it) | Medium | Medium | U4 smoke test on a 1–2 table sample BEFORE locking; default exclude `generated/` from declaration emit (KTD-7); fallback = leaf tsconfig with `isolatedDeclarations:false` + annotated barrel. |
| **FK columns generate as raw `string`** (Kanel only brands FKs via real FK constraints) | Low | Medium | The §4 DDL declares real `FOREIGN KEY` constraints; U4 type test fails if any FK loses its brand. |
| **Generated-output diff flakiness** (`os.EOL` line endings; silent prettier-hook failure) | Medium | Low | KTD-9: `eol=lf` in `.gitattributes`, no prettier on generated output, exclude from format/lint passes. |
| **`db` job is the first Docker-in-CI** — service wiring/healthcheck mistakes | Medium | Low | `services: postgres:16` + `pg_isready` healthcheck (documented GH Actions pattern); reuse `docker-compose.test.yml` locally for parity. |
| **Generated `search`/`schema_migrations` leak into types** | Low | Low | `filter` excludes `schema_migrations` (KTD-6); `search` is correctly emitted read-only-on-select (Kanel splits selector vs initializer). |
| **kanel/kanel-zod are CJS** under an ESM repo | Low | Low | Config is `.cjs` (KTD-2); generated output is ESM via `tsModuleFormat`. |

**Dependencies / prerequisites:**
- **PR #8 (`core/` catalogue domain)** — this work builds on its branch `claude/condescending-mendeleev-132bba` (`055cd3e`). `core`'s `Brand`/`ids` are imported by the U4 type test. **Gate this work's merge on PR #8 merging to `master` first**, then rebase onto `master` and re-run `db:generate` + the U4 brand test. No automated gate covers generated-brands↔`core`-brands drift, so a `core/` brand-tag change requires a manual U4 re-verify.
- **Local worktree is 3 commits behind `origin/master`** — target the origin/master shape of `ci.yml`, `.dependency-cruiser.cjs`, `.eslintrc.cjs` (rebase the work branch onto current `master`/PR #8 head before CI edits).
- **Live test runner is `node:test`** (Vitest is decided-but-deferred) — write `migrate.test.ts` against `node --test`, matching `core`, not the build plan's `vitest` assumption.

---

## Operational Notes

- **R3 — Neon reconcile is a one-time, owner-run, manual step (never CI).** It is destructive (DROP+recreate) only against a confirmed-empty/throwaway DB; if the live Neon DB already holds rows, it is instead a no-op schema diff (`pg_dump --schema-only` compare — the live schema must already equal `0001_init.sql`). Take a Neon snapshot first; use a DDL-only role. Not an implementation unit.
- **Convention:** every schema change goes through a committed migration — never a direct `ALTER` on the live DB (this is what keeps the migration the genuine source of truth; the contract test only guards migration↔generated).

---

## Open Questions (execution-time)

- **`no-orphans`: carve-out vs accept-warn for `generated/`.** Plan default (U5) adds a `pathNot` carve-out. If the U4 mapper lands soon after, accepting the `warn` until then is also valid — implementer's call, low stakes (it's `warn`, not `error`).
- **Whether the `generateIdentifierType` override fully removes the need for any brand cast in the U4 mapper.** If generated ids are emitted structurally identical to `core`'s, the mapper needs no id cast — to be confirmed when U4 is built.
- **Exact `db:generate` orchestration** (compose lifecycle vs a node script that boots/migrates/generates/tears down) — settle against the real `docker-compose.test.yml` during U3.

---

## Sources & Research

- **Origin:** [kanel DB-row layer requirements](../brainstorms/2026-06-11-kanel-db-row-layer-requirements.md) (R1–R9, D1–D5).
- **Repo:** build plan U4/RC-2 (runner + docker-compose + rowMappers prior art); spec §4+§9 DDL (4 tables, `text` PK/FK, CHECK names, extensions, `GENERATED` tsvector); `core/shared/kernel/Brand.ts` (`string & { readonly __brand: B }`); `core/catalogue/ids.ts`; `.dependency-cruiser.cjs` (`no-core-to-adapters` error, `no-orphans` warn, no `generated/` carve-out); `.github/workflows/ci.yml` (no Docker today; `dorny/paths-filter`); `tooling/check-layout.sh` (bans `__tests__/`); decision-registry (`isolatedDeclarations` locked, `node:test` live / Vitest deferred).
- **External (load-bearing):** kanel 4.0.2 / kanel-zod 4.0.0 emit **Zod v4** (`z.uuid()` marker), CJS-only, v4 `generators` config (kanel-zod README stale); `generateIdentifierType` brands PKs and FK-inherits via real FK constraints (default tag `'schema.table'`, not `readonly`); `filter` excludes tables; **`isolatedDeclarations` on generated consts is the one unverified item** (smoke-test). Best practices: `git diff --exit-code` gate + `::error::`; `services: postgres:16` ships `pg_trgm`/`unaccent`; hand-rolled runner idiomatic for plain-SQL forward-only; `os.EOL` + silent-prettier-hook are the diff-flakiness traps → `eol=lf` + no prettier on generated; `.gitattributes linguist-generated` + Kanel `markAsGenerated`.
