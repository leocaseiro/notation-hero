# Kanel DB-row layer + SQL migrations — requirements

**Date:** 2026-06-11
**Status:** Ready for planning (`/ce-plan`)
**Type:** Tooling + architecture integration (not a product feature)
**Related:** [catalogue schema spec](../specs/2026-06-10-catalogue-schema.md) · [Area-K build plan](../plans/2026-06-07-001-feat-cms-k-build-plan.md) (U4 `adapters/postgres`) · [tooling DACI](../decisions/2026-06-09-tooling-stack-daci.md) · [PR #8 — U2 core domain](https://github.com/leocaseiro/notation-hero/pull/8)

## Summary

Stand up a portable, version-controlled schema + type-generation pipeline for the catalogue. Plain-SQL migrations become the executable source of truth (first migration = the spec §4 DDL); Kanel auto-generates the snake_case DB-row types (+ Zod) that the U4 Postgres adapter will consume; a CI contract-test fails when those generated types drift from the migrations. Everything lives in `adapters/postgres/` so `core/` stays DB-agnostic.

## Problem frame

`core/`'s catalogue domain (PR #8) is hand-written camelCase TypeScript + Zod that mirrors the locked §4 DDL by hand. The Neon Postgres DB already exists, but it was created out-of-band — and right now **nothing in the repo can rebuild or version the schema** (no migrations, no committed DDL, no DB tooling or `pg`/kanel deps). Three gaps follow: the schema has no in-repo source of truth; the snake_case DB-row types the U4 adapter needs don't exist; and no automated guard keeps the generated DB-row types honest against the migrations. The user wants version control **and** migrations **and** no SaaS/ORM lock-in.

## Key decisions

- **D1 — Plain-SQL committed migrations are the executable source of truth.** `migrations/0001_init.sql` is the spec §4 DDL verbatim. Chosen because raw SQL gives version control (git), real migrations (ordered files), and zero lock-in (runs on any Postgres — Neon becomes a swappable host, not a dependency). Drizzle/Prisma TS-schema DSLs and Neon-proprietary tooling are the real lock-in and are rejected. After this lands, `0001_init.sql` is the **sole** schema source: the spec §4 DDL block is replaced by a pointer to the migration (not a duplicated copy), so there is no second copy to drift. Convention: every schema change goes through a committed migration — never a direct `ALTER` on the live DB.
- **D2 — The generated DB-row layer lives in the adapter; `core/` stays pure.** Kanel output (snake_case row types + Zod) lands in `adapters/postgres/`, never `core/`. `core/` never imports it — the existing dependency-cruiser `core ↛ adapters` rule enforces this. The U4 Row↔domain mapper is the single place the generated row type and the domain type meet; the adapter imports `core` (domain + port), never the reverse. This keeps the domain ignorant of storage and makes a schema change surface as a compile error in exactly one spot (the mapper). **Why generate (the point of Kanel):** Kanel is a typed, always-in-sync **mirror of the real DB** — it removes hand-maintenance and silent drift from the row types the adapter consumes (the build plan's U4 was going to hand-write them in `rowMappers.ts`). It does **not** remove the mapper: generated rows are snake_case DB-truth, `core/` stays the hand-written camelCase domain, and the mapper bridges them. This **supersedes** the build plan's hand-written row *types*; the mapper itself remains U4's work.
- **D3 — CI runs a schema↔types contract test.** On every run: spin an ephemeral Postgres → apply migrations → run Kanel → fail if the committed generated output differs. Catches the "changed a migration, forgot to regenerate" case. (The deeper domain↔DB compile-time link rides on U4's mapper, which doesn't exist yet.) **Scope of the guarantee:** this gate enforces *migrations ↔ generated-types* only — **not** spec↔migration (the spec no longer holds a second DDL copy, per D1) and **not** live-DB↔migration (covered by the "all changes via migrations, never direct ALTER" convention; live-DB drift detection is deferred).
- **D4 — `adapters/postgres/` owns migrations, generated types, and Kanel config now.** U4 later adds `CatalogueRepositoryPostgres` + the mapper in the same package. Migrations are Postgres DDL, so they belong with the Postgres adapter; fewest packages (YAGNI on a separate `db/` package until a second consumer exists).
- **D5 — The `core/` `__tests__/` cleanup is a separate effort.** Decoupled from this work (Kanel only adds files in the adapter; it never reshapes `core/`). Tracked below.

## Requirements

**Schema & migrations**
- **R1** — The authoritative schema is committed plain-SQL migrations under `adapters/postgres/migrations/`; `0001_init.sql` is the spec §4 DDL verbatim.
- **R2** — Migrations apply to any standard Postgres with no SaaS-specific or ORM-DSL dependency.
- **R3** — The already-created Neon DB is reconciled to `0001_init.sql` so the migration is genuinely the source. **This is a one-time, owner-run, manual step (never CI).** It is **destructive only against a confirmed-empty / throwaway DB** (DROP+recreate); if the live DB already holds rows, R3 is instead a **no-op schema diff** (`pg_dump --schema-only` compare — the live schema must already equal `0001_init.sql`). Take a Neon snapshot first; use a DDL-only role.

**Generation**
- **R4** — Kanel (+ `kanel-zod`) generates snake_case row types and Zod schemas into `adapters/postgres/generated/`, committed to the repo.
- **R5** — Generated output mirrors the DB in **snake_case** (no camelCase hook; the camelCase conversion lives in the U4 mapper). Generated id columns carry Kanel-side brands via `generateIdentifierType` — **not required to be identical** to `core`'s `Brand<string,'XId'>`; the mapper is where row-brands convert to `core`'s brands. Because every §4 id is plain `text`, FK columns (`lesson_id`, `source_item_id`, `item_id`, `pattern_id`) only brand if Kanel reads the FK metadata — so pin an explicit column→brand-name map **and** a type-level test **in this work**, not deferred to U4.

**Boundaries**
- **R6** — Generated artifacts live only in `adapters/postgres/`; `core/` imports nothing from `adapters/` (dependency-cruiser `core ↛ adapters` stays green).

**CI & local workflow**
- **R7** — A `pnpm db:generate` script reproduces generation locally: spin a local Postgres → apply migrations → run Kanel.
- **R8** — CI fails when the committed generated output is stale versus the migrations (a **real** Postgres → migrate → Kanel → `git diff --exit-code`).

**Credentials & secrets**
- **R9** — Connection strings come from the environment, never literals: CI uses a throwaway ephemeral Postgres (the real Neon `DATABASE_URL` is **never** present in the contract-test job); local `db:generate` uses a `.gitignored` `.env` (with a committed `.env.example`); the Kanel config reads `process.env.DATABASE_URL`.

## Scope boundaries

**In scope**
- `adapters/postgres/` package scaffold: `migrations/0001_init.sql`, Kanel + `kanel-zod` config, committed `generated/`, the `pnpm db:generate` script, and the CI contract-test gate.

**Out of scope / deferred (named, not forgotten)**
- U4's `CatalogueRepositoryPostgres` and the Row↔domain mapper (the full domain↔DB compile-time link).
- Applying migrations to the real Neon DB at deploy time (infra / U4).
- The `core/` `__tests__/` → per-unit-folder cleanup — its own small PR (see below).

## Open questions (for planning)

- **Migration runner** — node-pg-migrate vs dbmate vs a tiny SQL runner. All are raw-SQL + portable; pick on ergonomics + CI fit.
- **Ephemeral Postgres in CI — DECIDED: a real Postgres engine** (Docker `postgres:16`, reusing the build plan's `docker-compose.test.yml`, or testcontainers). `pg-mem` / in-memory shims are **ruled out** — §4 needs `pg_trgm`/`unaccent` extensions, `IMMUTABLE` wrapper functions, and a `GENERATED` tsvector column that shims don't implement, so they would green a schema real Postgres rejects. Remaining sub-choice: Docker service container vs testcontainers.
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

Unrelated to Kanel; a pointer only. **The DACI-vs-build-plan `__tests__/` contradiction is already resolved** (PR #9: `tooling/check-layout.sh` machine-bans `__tests__/`, the build plan's `__tests__/` lines are struck, and [decision-registry.md](../decisions/decision-registry.md) records `L5-test-colocation`). The only remnant is mechanical: move PR #8's existing `core/**/__tests__/*.test.ts` next to their source (per-unit folders), update the `node:test` glob in `core/package.json` (`**/*.test.ts`), and drop the now-dead `__tests__/` carve-out in `.dependency-cruiser.cjs`. **Decision: land this in PR #8** (so PR #8 passes `check-layout.sh` once rebased on current `master`), not a separate PR — a sub-agent can do it. Tracked in Jira KAN.
