# Catalogue store = Neon PostgreSQL + JSONB (DynamoDB stays for per-user)

> **Status:** ✅ Decided · **Date:** 2026-06-09 · **Owner:** leocaseiro
> **Supersedes:** the "catalogue = DynamoDB" assumption in `feature-freeze.md` (`H-3`/`H-11`/`K-1`/`K-3`) and `song-schema.md`.
> **Companions:** [song-schema.md](../song-schema.md) · [feature-freeze.md](../feature-freeze.md) · [design-stack.md](../design-stack.md) · [aws-learning-map.md](../aws-learning-map.md)

## Decision

Polyglot persistence, **two stores**:

| Data | Store | Why |
|---|---|---|
| Per-user (scores, settings, mappings, offline sync) | **DynamoDB** | known-key lookups at scale; Streams change-feed for sync; the AWS-portfolio centerpiece; NoSQL key-value reps |
| Song/Lesson **catalogue** (+ search) | **Neon — PostgreSQL + JSONB** | relational for queried/structured fields; `data jsonb` for variable/nested (Song `parts`, `meta`); `pg_trgm`/`tsvector` search; one store covers relational *and* document |
| *(optional, later)* cache / rate-limit | Redis (AWS ElastiCache/MemoryDB) | speed layer; never a source of truth |
| MongoDB / DocumentDB | **not used** | evaluated, dropped — kept as an interview talking-point + optional local-Docker learning exercise |

- **Lesson ≠ Song** — distinct entities (different schemas): one `catalogue` table with a `type` discriminator + shared base columns; type-specific structure lives in `data jsonb` / related tables.
- **Songs gain `parts`/sections later** — model as a relational `song_parts` table *or* embed under `data->'parts'` (embed-vs-reference decided when the feature lands).

## Why Postgres + JSONB (not Mongo, not DynamoDB) for the catalogue

- The catalogue is **queryable** (multi-attribute filter: artist + tags + difficulty + timeSignature + …, plus partial/fuzzy search) and **relational-ish** (Lesson/Song entities, future joins to courses/artists). Relational fits; SQL + indexes are the natural tool.
- **JSONB removes the need for a separate document DB** — schemaless/nested content (Song `parts`, `meta`, per-section tags, late `/design-shotgun` findings) lives in a `data jsonb` column with GIN indexing. The hybrid (typed columns + JSONB) is *more* capable here than pure Mongo: real constraints/joins/transactions **and** document flexibility in one store.
- **DynamoDB is wrong for the catalogue** — its rigid PK/SK/GSI model makes arbitrary multi-attribute + `tags[]` + partial-text search awkward; its strength is known-key lookups, which is exactly the per-user data it keeps.
- **MongoDB/DocumentDB has no natural home** once the catalogue is Postgres and per-user is DynamoDB — it gets squeezed between Postgres-JSONB (above) and DynamoDB (below). Kept as a talking-point (*"I consolidated into Postgres JSONB instead of bolting on a document DB"* — a senior judgment signal) and an optional local-Docker exercise (like the `H-12` Kafka exercise) if hands-on Mongo reps are wanted.

## Why Neon (provider)

- **$0 permanent free tier** (verified 2026-06-09: 100 projects, 0.5 GB + 100 compute-hours each, scale-to-zero @5 min, 10 branches/project).
- **Standard Postgres** → portable skill (no ORM/provider lock-in); JSONB / GIN / `pg_trgm` / `tsvector` all supported.
- **Serverless HTTP driver** (`@neondatabase/serverless`) sidesteps the Lambda↔Postgres connection-pool problem.
- **Off-AWS caveat:** Neon is a third-party SaaS (runs on AWS infra). The **AWS-managed equivalent = Aurora/RDS + RDS Proxy** (speak this in interviews, incl. the connection-pooling rationale). The store is **swappable behind the `K-3` catalog API**.

## Alternatives considered (and why not)

- **DynamoDB-only + client-side search** — simplest / all-AWS / $0, but no real catalogue query store and no added skill; rejected because the user wants a real backend + DB breadth.
- **DynamoDB + OpenSearch** — canonical AWS rich-search, but ~$25+/mo (no real free tier) and overkill at catalogue scale.
- **MongoDB Atlas** — free document DB; chosen briefly, then dropped once it was clear Postgres-JSONB covers the document need and *"why not Postgres?"* is hard to defend. Mongo + DynamoDB also reads as "two NoSQL stores — why?".
- **Supabase** — free Postgres + batteries (auth/API/storage), but those overlap & compete with the AWS portfolio surface (Cognito/S3/Lambda), and its auto-API removes the Lambda work that *is* the demonstration.
- **Prisma Postgres (on Unikraft Cloud)** — generous free tier (~50 DBs) and great Lambda fit, but couples to the Prisma ecosystem; Neon matches the multi-project benefit with standard Postgres. (Unikraft Cloud itself is a *compute* platform, not a managed Postgres.)
- **AWS Aurora Serverless v2 / DSQL / RDS Postgres** — on-portfolio but not reliably $0 (RDS 12-mo free expired; Aurora v2 ~$43/mo min) and VPC/RDS-Proxy complexity. Kept as the "AWS-managed equivalent" talking-point.

## Consequences

- `song-schema.md` reframed: logical record (Lesson | Song) → Neon Postgres table (typed columns + `data jsonb`) + indexes; Lesson/Song distinct; Song `parts` later.
- `feature-freeze.md`: `H-3` = per-user + analytics counters (not catalogue); `H-11`/`K-1`/`K-3` metadata store = Neon Postgres; decisions-log entry added.
- Lambda for `K-3`/`K-1` connects to Neon via the serverless HTTP driver.
- DynamoDB remains the AWS data centerpiece (sync via Streams) — the AWS story is intact.
- **Paradigm coverage for interviews:** NoSQL key-value (DynamoDB) + relational + document-in-relational (Postgres JSONB).

## The decision journey (so future-me doesn't re-spiral)

Catalogue store moved: DynamoDB → MongoDB Atlas (document fit + DocumentDB-adjacent skill) → reconsidered toward Postgres (catalogue is relational-ish; "two NoSQL stores" is hard to defend) → compared providers (Neon vs Supabase vs Prisma/Unikraft vs Aurora) → realized **Postgres JSONB covers the document need**, so a separate document DB (Atlas) is unnecessary → **landed: DynamoDB (per-user) + Neon Postgres + JSONB (catalogue).**
