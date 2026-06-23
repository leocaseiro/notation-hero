# Spike — ORM for Neon + NestJS (Drizzle vs Prisma vs TypeORM vs Kysely) — 2026-06-17

> **Feeds:** `ARCH-ORM-1` (keep Drizzle). Stack: Neon Postgres (JSONB + tsvector, raw-SQL DDL is truth), NestJS hexagon (ORM in an adapter behind a port), AWS Lambda (Neon HTTP driver), SWC.

## Is there a built-in NestJS ORM? — No
Nest is ORM-agnostic. First-party integration modules: **`@nestjs/typeorm`** (most "blessed", `11.0.2` 2026-06-16), `@nestjs/sequelize`, `@nestjs/mongoose`; official adapter `@mikro-orm/nestjs` (`7.0.2`). **Prisma** = a docs *recipe*, no `@nestjs/prisma` package. **No `@nestjs/drizzle`** — Drizzle is a ~15-line custom `DRIZZLE` provider (clean for a hexagon). **The Neon NestJS guide uses raw `pg` (no ORM).**

## Comparison
| Dimension | **Drizzle** | Prisma 7 | TypeORM 1.0 | Kysely |
|---|---|---|---|---|
| Maintenance (2026-06-17) | ✅ active; ⚠️ `latest` still 0.x (1.0-rc) | ✅ strongest (7.8.0) | ✅ revived end-2024, 1.0 May-2026; ⚠️ recent | ✅ active; ⚠️ pre-1.0 |
| NestJS first-party | ❌ custom provider | ❌ recipe | ✅ `@nestjs/typeorm` | ❌ custom provider |
| Hexagon cleanliness | ✅✅ | ✅ (keep gen types out) | ◐ Repository sugar bypassed | ✅✅ |
| **Neon HTTP driver** | ✅✅ `neon-http` | ✅ `@prisma/adapter-neon` | ⛔ **TCP pool only** | ✅✅ `kysely-neon` |
| Lambda cold-start | ✅✅ tiny | ✅ good (v7 Rust-free, ~1.6MB) | ⛔ pool+singleton+known bugs | ✅✅ ~120KB |
| JSONB type-safety | ✅✅ `$type<T>()` | ◐ `Json`≈any | ◐ | ✅ via iface |
| tsvector / generated cols / functional idx | ◐ reference your GENERATED col + `sql` | ⛔ `$queryRaw` | ⛔ raw | ✅ write the SQL |
| Fights raw-SQL DDL | ✅ low (custom SQL migrations) | ⛔ high (wants to own schema) | ◐ med-high | ✅✅ lowest |
| SWC / decorators | ✅ none (schema-as-TS) | ✅ none (codegen) | ⚠️ `decoratorMetadata`+`Relation<>` footguns | ✅ none |

## Recommendation
**Keep Drizzle** (`drizzle-orm/neon-http` + `drizzle-kit` + `drizzle-zod`). Decisive: *only true ORM that natively rides Neon's HTTP driver, has zero SWC/decorator friction, and lets the raw SQL DDL stay source-of-truth.* `@nestjs/typeorm` wins only the "first-party" axis — least relevant under a hexagon — and loses Neon-HTTP + SWC. **"TypeORM is abandoned" is now stale** (governed 1.0 shipped May 2026) but it still loses this stack.
**Caveat:** Drizzle `latest` is 0.x with a 1.0 RC mid-flight (no GA date) — track v1 / Relational-Queries-V2.
**Flip to Kysely** if the adapter ends up in the raw `sql` tag for most JSONB/tsvector work (its migrator-runs-your-SQL model fits raw-DDL-is-truth even better). **Flip to Prisma 7** if a second long-running service appears + you accept Prisma owning the schema. **Flip to TypeORM** only if you drop the Neon HTTP driver (e.g. RDS+Proxy) and accept the SWC setup.

## Sources
[Neon: NestJS](https://neon.com/docs/guides/nestjs) / [TypeORM](https://neon.com/docs/guides/typeorm) / [Prisma](https://neon.com/docs/guides/prisma) / [Kysely](https://neon.com/docs/guides/kysely) · [Drizzle Neon](https://orm.drizzle.team/docs/connect-neon) / [roadmap](https://orm.drizzle.team/roadmap) / [FTS](https://orm.drizzle.team/docs/guides/postgresql-full-text-search) · [TypeORM 1.0 (InfoQ)](https://www.infoq.com/news/2026/06/typeorm-1-released/) · [Prisma Rust-free](https://www.prisma.io/blog/rust-free-prisma-orm-is-ready-for-production) · [MikroORM 7](https://mikro-orm.io/blog/mikro-orm-7-released) · [kysely-neon](https://github.com/kysely-org/kysely-neon) · npm/GitHub 2026-06-17.
