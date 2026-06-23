# Notation Hero — Data-Layer Requirements (for the architecture spec)

> **Status:** 🟢 REQUIREMENTS (2026-06-17) — companion to [`docs/decisions/2026-06-17-architecture-decisions.md`](../decisions/2026-06-17-architecture-decisions.md).
> **Purpose:** state **what the data layer must provide** for the architecture to work — **abstractly**, so leocaseiro's parallel schema redesign (table renames + changes, still Neon) can satisfy these *without* changing the architecture spec.
> **Scope:** the catalog store (Neon Postgres). Per-user data (scores/settings/sync) stays in **DynamoDB** and is out of scope here.
> **Baseline:** today's `docs/specs/2026-06-10-catalog-schema.md` already satisfies R2-R10; **R1 (`created_by`) + R13-R16 (offline-first) are the net-new requirements.**
> **Owner:** leocaseiro

---

## How to read this

Each requirement is a **capability the architecture depends on**, named by intent, not by table/column name. Wherever a concrete name appears it's *"e.g. (today's name)"* — your redesign may rename it; as long as the **capability** survives, the architecture spec is unaffected. The "Consumed by" column says which architecture decision relies on it.

---

## Requirements

| # | Requirement (capability) | Today's shape (e.g.) | Consumed by |
|---|---|---|---|
| **R1** ⭐ | **Ownership-by-identity** — every catalog item records the identity that created it: the Cognito `sub` (string), nullable. v1 = admin's sub; later UGC = uploader's sub. v1-vs-UGC must differ **only by value**, not schema. **Backfill:** existing curated rows get the admin sub in the same migration that adds the column (NULL reserved for legacy-unowned = admin-only-editable). **PII:** the sub is an internal identity key — omit from public/list DTOs by default; anonymize/reassign on user deletion (GDPR). | **net-new** `created_by text` (does not exist today) | ARCH-OWN-1, ARCH-AUTHZ-1 |
| **R2** | **Provenance** — a write-once category distinguishing curated vs user-contributed content. | `source text` (`'curated'｜'user-upload'`), write-once | ARCH-AUTHZ-1, UGC seam |
| **R3** | **Lifecycle / visibility** — a status with at least *draft / published / archived* (archived = soft-delete tombstone; never hard-delete). | `status text` default `'draft'` | ARCH-AUTHZ-1 |
| **R4** | **Curated-only-publish invariant (v1)** — nothing user-contributed can be published to the shared catalog: `published ⇒ curated`. | `CHECK (status<>'published' OR source='curated')` | ARCH-AUTHZ-1 |
| **R5** | **Publish requires license (curated)** — published curated items carry a non-null license from a controlled vocab. | `CHECK (… OR license IS NOT NULL)` | catalog domain |
| **R6** | **Variable/nested data without schema churn** — JSONB for type-specific + parsed extras. Drizzle must be able to type the payload (`$type<T>()`). | `data jsonb`, `audio`/`video jsonb` | ARCH-ORM-1 |
| **R7** | **Full-text + fuzzy search surface** — a searchable vector (tsvector) + GIN/trigram indexes the API filters/sorts on, **authored in raw SQL** (generated column). Drizzle/Kysely *reference* it; they don't author it. | `search tsvector GENERATED … STORED`, `pg_trgm`/`unaccent` | ARCH-ORM-1, ARCH-CONTRACT-1 |
| **R8** | **Neon HTTP-driver compatibility** — the schema/queries must work over `@neondatabase/serverless` (HTTP), the Lambda cold-start-friendly path Drizzle's `neon-http` adapter uses. No feature may require a persistent TCP pool. | Neon serverless driver (spec §9/§12) | ARCH-ORM-1, ARCH-LAMBDA-1 |
| **R9** | **Raw SQL DDL is the source of truth** — advanced objects (generated columns, functional/partial indexes, immutable-function wrappers, multi-column CHECKs) live in hand-written SQL. The ORM **references**, never **owns**, the schema (no schema-diff tool round-tripping it). | spec §4/§9 DDL | ARCH-ORM-1 |
| **R10** | **Shared/per-user split** — the catalog (Neon) holds **only** searchable/shared metadata + file keys (never blobs, never per-user data). Per-user scores/skill/settings stay in DynamoDB, joined at the app layer. | spec §2 storage table | ARCH-OFFLINE-1, data architecture |
| **R11** | **Stable item identity** — a stable primary key (slug or uuid) usable as a foreign key by exercises/patterns and as the S3 key prefix. | `id text PRIMARY KEY` | catalog domain |
| **R12** | **Untrusted-upload seam (M1, not built now)** — the storage design must allow a quarantine path for user uploads (presigned S3 → quarantine prefix → magic-byte validate → promote) without schema change when uploads land. | spec §2 quarantine prefix + `notation_checksum`/`notation_bytes` | UGC seam (deferred) |
| **R13** ⭐ | **Client-minted stable IDs (offline-first)** — PKs must be client-generatable (`text` ULID), not server-generated (`uuid DEFAULT`/`bigint`), so offline inserts mint their own IDs and re-sends are idempotent upserts by that ID. | `id text` (ULID) PKs | ARCH-OFFLINE-1 |
| **R14** ⭐ | **Transactional batch ingest (offline-first)** — a single server endpoint accepts an offline-created **graph** (notation + parts + source + links/steps) and commits **all-or-nothing**, idempotent by a client `batchId` (per-row pushes tear on partial failure). | `POST /sync/batch` (server) | ARCH-OFFLINE-1 |
| **R15** ⭐ | **Two-phase upload staging (offline-first)** — a file-backed row can sync *before* its blob exists: an `upload_status` (`pending_blob`｜`ready`) + a relaxed "exactly one of `s3_key`/`alphatex`" CHECK that's waived while `pending_blob`, so the row syncs first and the blob backfills. (Inline alphaTex has no wrinkle.) | `source.upload_status` + relaxed `source_one_of` | ARCH-OFFLINE-1, R12 |
| **R16** ⭐ | **Deferrable cross-row FKs (offline-first)** — cross-row FKs are `DEFERRABLE INITIALLY IMMEDIATE` so one batch txn commits a whole graph regardless of intra-batch insert order or cycles. | `DEFERRABLE` on `parent_id`/`source_id`/`notation_link`/`lesson_step` FKs | ARCH-OFFLINE-1 |

⭐ = net-new (not satisfied by today's schema): **R1** (ownership) + **R13-R16** (offline-first, from the Dexie insert-only design — see ARCH-OFFLINE-1).

---

## Contract with the parallel redesign

- **You may freely** rename tables/columns, split/merge tables, change indexes, and reorganize the DDL.
- **You must preserve** the *capabilities* R1-R12 above. If a requirement can no longer be met (e.g. a redesign that needs a TCP pool, breaking R8), flag it — it would feed back into ARCH-ORM-1 / ARCH-LAMBDA-1.
- **The architecture spec references capabilities, not names** — e.g. it says "the item records its creator (R1)", not "`catalog_item.created_by`". So renames don't ripple into the architecture doc.
- **The mapping layer absorbs naming:** the Drizzle schema (in `server/src/adapters`) mirrors the final DDL; the adapter maps rows → domain entities; the oRPC contract (`shared/`) exposes curated DTOs. A column rename touches the Drizzle schema + one mapper, not the API contract (see ARCH-CONTRACT-1 "derive + curate").

---

## Open items for the redesign

- **R1 `created_by`** — add a nullable `text` column holding the Cognito `sub`. **Backfill existing curated rows with the admin sub in the same migration**, and treat the `sub` as an internal identity key (omit from public DTOs; anonymize on deletion). See ARCH-OWN-1.
- **R13-R16 (offline-first, from ARCH-OFFLINE-1's Dexie insert-only design):** keep **client-minted ULID `text` PKs** (R13); add a transactional **`POST /sync/batch`** server endpoint (R14); add **`source.upload_status`** staging + relax the `source_one_of` CHECK (R15); make cross-row FKs **`DEFERRABLE INITIALLY IMMEDIATE`** (R16). Together these let an offline-created graph sync all-or-nothing with no merge conflicts. **Timing (from the 2026-06 review, SCOPE-1):** R13 (ULID PKs), R15 (`upload_status`) and R16 (`DEFERRABLE` FKs) are cheap schema seams that land with the redesign so the schema is offline-ready; **R14 (the `POST /sync/batch` endpoint) is built at M1**, when the offline path is wired — not v1 (per ARCH-OFFLINE-1's installed-but-stubbed scope).

Everything else (R2-R12) the current schema already provides.
