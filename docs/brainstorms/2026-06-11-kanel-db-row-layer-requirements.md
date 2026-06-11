# Kanel DB-row layer + SQL migrations — requirements

**Date:** 2026-06-11
**Status:** Ready for planning (`/ce-plan`)
**Type:** Tooling + architecture integration (not a product feature)
**Related:** [catalogue schema spec](../specs/2026-06-10-catalogue-schema.md) · [Area-K build plan](../plans/2026-06-07-001-feat-cms-k-build-plan.md) (U4 `adapters/postgres`) · [tooling DACI](../decisions/2026-06-09-tooling-stack-daci.md) · [PR #8 — U2 core domain](https://github.com/leocaseiro/notation-hero/pull/8)

## Summary

Stand up a portable, version-controlled schema + type-generation pipeline for the catalogue. Plain-SQL migrations become the executable source of truth (first migration = the spec §4 DDL); Kanel auto-generates the snake_case DB-row types (+ Zod) that the U4 Postgres adapter will consume; a CI contract-test fails when those generated types drift from the migrations. Everything lives in `adapters/postgres/` so `core/` stays DB-agnostic.

## Problem frame

`core/`'s catalogue domain (PR #8) is hand-written camelCase TypeScript + Zod that mirrors the locked §4 DDL by hand. The Neon Postgres DB already exists, but it was created out-of-band — and right now **nothing in the repo can rebuild or version the schema** (no migrations, no committed DDL, no DB tooling or `pg`/kanel deps). Three gaps follow: the schema has no in-repo source of truth; the snake_case DB-row types the U4 adapter needs don't exist; and no automated guard keeps the TypeScript honest against the real schema. The user wants version control **and** migrations **and** no SaaS/ORM lock-in.

## Key decisions

- **D1 — Plain-SQL committed migrations are the executable source of truth.** `migrations/0001_init.sql` is the spec §4 DDL verbatim. Chosen because raw SQL gives version control (git), real migrations (ordered files), and zero lock-in (runs on any Postgres — Neon becomes a swappable host, not a dependency). Drizzle/Prisma TS-schema DSLs and Neon-proprietary tooling are the real lock-in and are rejected. The spec §4 DDL block becomes design rationale that points at the migration, so the two can't drift.
- **D2 — The generated DB-row layer lives in the adapter; `core/` stays pure.** Kanel output (snake_case row types + Zod) lands in `adapters/postgres/`, never `core/`. `core/` never imports it — the existing dependency-cruiser `core ↛ adapters` rule enforces this. The U4 Row↔domain mapper is the single place the generated row type and the domain type meet; the adapter imports `core` (domain + port), never the reverse. This keeps the domain ignorant of storage and makes a schema change surface as a compile error in exactly one spot (the mapper).
- **D3 — CI runs a schema↔types contract test.** On every run: spin an ephemeral Postgres → apply migrations → run Kanel → fail if the committed generated output differs. Catches the "changed a migration, forgot to regenerate" case. (The deeper domain↔DB compile-time link rides on U4's mapper, which doesn't exist yet.)
- **D4 — `adapters/postgres/` owns migrations, generated types, and Kanel config now.** U4 later adds `CatalogueRepositoryPostgres` + the mapper in the same package. Migrations are Postgres DDL, so they belong with the Postgres adapter; fewest packages (YAGNI on a separate `db/` package until a second consumer exists).
- **D5 — The `core/` `__tests__/` cleanup is a separate effort.** Decoupled from this work (Kanel only adds files in the adapter; it never reshapes `core/`). Tracked below.

## Requirements

**Schema & migrations**
- **R1** — The authoritative schema is committed plain-SQL migrations under `adapters/postgres/migrations/`; `0001_init.sql` is the spec §4 DDL verbatim.
- **R2** — Migrations apply to any standard Postgres with no SaaS-specific or ORM-DSL dependency.
- **R3** — The already-created Neon DB is reconciled to `0001_init.sql` (rebuilt from it) so the migration is genuinely the source.

**Generation**
- **R4** — Kanel (+ `kanel-zod`) generates snake_case row types and Zod schemas into `adapters/postgres/generated/`, committed to the repo.
- **R5** — Generated id types are branded to match `core`'s `Brand<string,'XId'>` (Kanel `generateIdentifierType`), and column casing follows the configured convention (camelCase hook decision recorded in planning).

**Boundaries**
- **R6** — Generated artifacts live only in `adapters/postgres/`; `core/` imports nothing from `adapters/` (dependency-cruiser `core ↛ adapters` stays green).

**CI & local workflow**
- **R7** — A `pnpm db:generate` script reproduces generation locally: spin a local Postgres → apply migrations → run Kanel.
- **R8** — CI fails when the committed generated output is stale versus the migrations (ephemeral Postgres → migrate → Kanel → `git diff --exit-code`).

## Scope boundaries

**In scope**
- `adapters/postgres/` package scaffold: `migrations/0001_init.sql`, Kanel + `kanel-zod` config, committed `generated/`, the `pnpm db:generate` script, and the CI contract-test gate.

**Out of scope / deferred (named, not forgotten)**
- U4's `CatalogueRepositoryPostgres` and the Row↔domain mapper (the full domain↔DB compile-time link).
- Applying migrations to the real Neon DB at deploy time (infra / U4).
- The `core/` `__tests__/` → per-unit-folder cleanup — its own small PR (see below).

## Open questions (for planning)

- **Migration runner** — node-pg-migrate vs dbmate vs a tiny SQL runner. All are raw-SQL + portable; pick on ergonomics + CI fit.
- **Ephemeral Postgres in CI** — Docker service container vs testcontainers vs an in-memory shim (note: `pg-mem` may not honor every §4 CHECK/DDL feature, which would weaken the contract test).
- **`isolatedDeclarations` and generated files** — annotate the generated output, or exclude `generated/` from the adapter package's declaration emit (it's machine-written, not hand-edited).
- **Down/rollback migrations** — forward-only vs up+down.

## Dependencies & assumptions

- Neon DB already exists (user-created); R3 reconciles it to the migration.
- The spec §4 DDL is the content of `0001_init.sql`; after this lands, spec §4 is design rationale that points at the migration (single executable source).
- The DACI "complete now, never migrate" principle supports standing up the migration foundation now, while `core/`/`adapters/` are still small.

## Success criteria

- A fresh Postgres can be built from `migrations/` alone, with no Neon/SaaS dependency.
- `pnpm db:generate` regenerates the committed types; the CI gate is green when types match the migrations and red when a migration changes without regeneration.
- `core/` has zero imports from `adapters/` (dependency-cruiser green); the generated row types are consumed only inside `adapters/postgres/`.

## Separate follow-up — `core/` test co-location (not part of this work)

Tracked here so it isn't lost. Per the [tooling DACI](../decisions/2026-06-09-tooling-stack-daci.md) ("tests co-located, no `__tests__/`"), the PR #8 tests in `core/**/__tests__/` should move next to their source as **per-unit folders** (e.g. `core/catalogue/CatalogueItem/CatalogueItem.ts` + `CatalogueItem.test.ts`). Delivered as its **own small standalone PR**: move the test files, delete the `__tests__/` dirs, update the `node:test` glob in `core/package.json` (`**/*.test.ts`), and simplify the now-dead `__tests__/` carve-out in `.dependency-cruiser.cjs`. Unrelated to Kanel; lands independently. Reconciling the DACI-vs-build-plan `__tests__/` contradiction (the build plan currently prescribes `__tests__/`) is part of that PR.
