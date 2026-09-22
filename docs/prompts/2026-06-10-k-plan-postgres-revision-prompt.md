# Handoff prompt — revise the Area-K CMS build plan for the locked Postgres catalog

> [!WARNING]
> ⛔ **SUPERSEDED / PARTIALLY STALE.** This doc predates the **2026-06-09 decision cliff**
> (pnpm + Nx replaced Bun; the song/lesson catalog moved to **Neon Postgres + JSONB**,
> DynamoDB is per-user data only) and/or the 2026-06-10 schema lock. **Do not build from the
> struck lines below.**
>
> **Authoritative now →** `docs/decisions/decision-registry.md` (every decision + status),
> `docs/decisions/2026-06-09-tooling-stack-daci.md`, `docs/decisions/2026-06-09-catalog-store-postgres-neon.md`,
> `docs/specs/2026-06-10-catalog-schema.md`, `AGENTS.md`.
>
> _Kept for history (per "strike, don't delete"). Stale lines are ~~struck~~ with a reason._

> Created 2026-06-10. **Paste the fenced block below into a fresh Claude session** to run the K-plan revision. Your global collaboration rules auto-load, so they're not repeated here. All paths are in worktree `optimistic-lalande-2ad538` (this branch) — or under `docs/` once merged to `master`.

```text
NotationHero — revise the Area-K CMS build plan so its data layer matches the LOCKED Neon Postgres catalog schema. The plan (units U1–U9) was written 2026-06-07 against a DynamoDB catalog + a draft single-`Lesson` schema; Track 3 has since locked the catalog as Neon PostgreSQL + JSONB with a richer model. Keep all the AWS plumbing; swap the catalog store DynamoDB → Postgres.

Goal: produce the revised, executable K-plan (bite-sized TDD tasks, exact file paths) that builds Area K against the locked schema.

Read first (absolute paths; all under /Users/leocaseiro/Sites/notation-hero/.claude/worktrees/optimistic-lalande-2ad538/ , or docs/ after merge):
- docs/specs/2026-06-10-catalog-schema.md — ★ THE LOCKED catalog contract (brainstormed, reviewed twice via ce-doc-review, validated against a live Postgres). Entities: `catalog_item` (type='song'|'lesson', shared facets as typed columns) + `exercise` (a lesson's ordered steps) + `pattern` (beats/fills/rudiments) + `item_pattern` (m:n). Neon Postgres + JSONB. This is AUTHORITATIVE — implement it; do NOT re-litigate the schema fields or the Postgres decision.
- docs/plans/2026-06-07-001-feat-cms-k-build-plan.md — the existing K-plan to revise (U1–U9, 1125 lines, fully doc-reviewed). U1 (the Layout-4 hexagonal skeleton) is already built/committed. Its R6 anticipated this: "implement against song-schema.md (DRAFT — Track 3 finalizes); if Track 3 lands changes, update core/lesson/Lesson.ts." That trigger has now fired.
- docs/decisions/2026-06-09-catalog-store-postgres-neon.md — why Neon Postgres+JSONB for the catalog, and why DynamoDB stays for per-user data only.
- docs/cicd-pipeline.md — the LOCKED Layout-4 hexagonal architecture + toolchain you must fit into (core/ + adapters/ + apps/ + infra/; @notation-hero/*; ~~bun 1.3.11~~ <!-- SUPERSEDED: pnpm+Nx locked 2026-06-09; Bun fully dropped (tooling-stack-daci.md F-6) -->; dependency-cruiser-enforced layer boundaries).
- docs/feature-freeze.md — K-1/K-3/H-11/D-2/H-10 rows + Alpha milestone context.

WHAT CHANGES (the catalog data layer):
1. Domain model (U2): the single `core/lesson/Lesson.ts` interface → the `catalog_item`/`exercise`/`pattern` model. Update the core types, the repository PORT, and the filter/query language (LessonFilter → catalog filter: type, level [nullable 1–10], bpm-range, time_sig, genre, tags[], skill[], instruments[], lesson_type, pattern, fuzzy + accent-insensitive search). Note `level` is nullable (ungraded), `source` is curated-only-publishable + write-once, songs vs lessons are distinct shapes, exercises carry the start→goal BPM ladder, patterns are one table discriminated by `kind`.
2. Adapter (U4): `adapters/dynamodb/LessonRepositoryDynamoDB` (catalog) → a NEW `adapters/postgres/` (`@notation-hero/adapters-postgres`) implementing the repository port via `@neondatabase/serverless` + raw PARAMETERIZED SQL (no ORM — portability is the point). The MIGRATIONS live here: the spec's §4 DDL verbatim — `CREATE EXTENSION pg_trgm + unaccent`, the `immutable_unaccent` + `immutable_array_to_string` wrapper functions, the 4 tables with ALL their CHECK constraints, the §9 indexes + the GENERATED `search` tsvector column. Tests run against a local Docker Postgres (docker-compose.test.yml, postgres:16), NOT LocalStack — Postgres isn't an AWS service.
3. DynamoDB drops from K v1: the catalog no longer needs it, so remove the inline DynamoDB table + the `adapters/dynamodb` catalog repo from K's scope (U4/U9). DynamoDB returns for PER-USER data (scores/settings/mappings/sync) at M1 — a separate plan, not this one.
4. Lambdas (U5–U7): the K-3 public read API + K-2 admin CRUD now query Postgres via the new repository. Use the spec's §9 K-3 list projection exactly. Enforce the spec's publish-gates: curated-only (the `ci_shared_curated` CHECK + write-once `source`), ≥1 exercise before a lesson can publish, license required for published curated items. Honor the §10 ingest pipeline: parse-once-at-upload, MIDI is convert-BEFORE-upload (AlphaTab can't render .mid — Guitar Pro conversion is a curator step; automated convert = M1), quarantine S3 prefix + streaming size limit (~20 MB, abort before buffering in Lambda memory), checksum/size capture.
5. Infra (U9): Neon is off-AWS SaaS → Pulumi does NOT provision the database. Store the Neon connection string as a Pulumi secret (or SSM SecureString) and inject it into the Lambda env (least-privilege). Document the AWS-managed equivalent (Aurora Serverless v2 / RDS + RDS Proxy, with the connection-pooling rationale) as the interview talking point; the store is swappable behind the K-3 API.
6. Cover images: the locked schema HAS `cover_image_key` (the K-plan had DEFERRED cover-image upload, R1 narrowed to source-file-only). Reconcile — at minimum the column exists; decide upload-pipeline-vs-paste-URL for v1.

KEEP (schema-agnostic AWS plumbing — do NOT rework): the 3 Lambdas (admin CRUD / public read / upload validator), S3 file store + magic-byte validator (`file-type`), CloudFront + OAC + KVS-backed edge Basic-Auth, the two distributions, React-Admin SPA + DataProvider, SNS `lesson-events`, the Pulumi components (LambdaWithUrl, CloudFrontStaticSite), the CI + dependency-cruiser layer rules. These are all data-store-agnostic.

RECONCILE THE PROBLEM-FRAME TENSION (call this out explicitly in the revised plan): the K-plan justified the custom-AWS backend partly on "don't move data off AWS (SaaS)." Neon moves the *catalog* off AWS. The resolution (per the 2026-06-09 decision): the AWS-portfolio value lives in the Lambda + S3 + CloudFront + edge-auth + Pulumi/IaC plumbing (which a headless CMS would delete) and the swappable-behind-K-3 framing + the Aurora/RDS-Proxy talking point — so the custom backend still earns its keep; only the catalog's data store moved to a portable, $0, swappable Postgres. DynamoDB still demonstrates NoSQL via the per-user data at M1.

Constraints (LOCKED — don't re-litigate):
- Layout 4 hexagonal monorepo (core/adapters/apps/infra; @notation-hero/* names; @core/@adapters/@apps path aliases; dependency-cruiser-enforced). ~~bun 1.3.11.~~ <!-- SUPERSEDED: pnpm+Nx locked 2026-06-09; Bun fully dropped (tooling-stack-daci.md F-6) --> ~~Node.js 22 Lambda runtime.~~ <!-- SUPERSEDED: Node 22→24; Node 24 is Active LTS per K-plan Wave 1 changelog 2026-06-10 + tooling DACI --> @pulumi/aws v7.
- The catalog schema (docs/specs/2026-06-10-catalog-schema.md) is LOCKED — implement it as-written; do not change fields/constraints.
- DynamoDB = per-user only (not the catalog).
- AWS Always-Free tier (~$0/mo). Neon's $0 free tier is the one deliberate off-AWS exception (justified in the decision doc).

Deliverable: the revised K-plan — either edit docs/plans/2026-06-07-001-feat-cms-k-build-plan.md in place (clearly headed "revised 2026-06-10 for the Postgres catalog", with a changelog of what moved Dynamo→Postgres), or a new versioned plan doc next to it. Use the superpowers:writing-plans skill so every unit is bite-sized TDD tasks with exact file paths and runnable commands. Then run ce-doc-review on the revised plan before building. Commit at every solid checkpoint (do not ask).
```
