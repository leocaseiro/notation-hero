# Offline-first store — decision (PENDING REVIEW)

> **Status:** 🟡 **PENDING REVIEW** — captured separately on purpose. The main ADR (`2026-06-17-architecture-decisions.md`, `ARCH-OFFLINE-1`) **still says RxDB**; this doc records the **pivot to plain Dexie** reached later in the same session. **Do not reconcile into the main ADR until reviewers finish the main spec.** Then flip `ARCH-OFFLINE-1` RxDB → Dexie and fold the requirements below into `docs/specs/2026-06-17-data-layer-requirements.md`.
> **Evidence:** [`docs/spikes/2026-06-17-offline-first-sync.md`](../spikes/2026-06-17-offline-first-sync.md) (the full design + pressure-test).
> **Schema under design (parallel):** `docs/wireframe/2026-06-17-notation-model-draft.sql` (unified `notation`/`source`/`lesson_step`/`notation_link`).
> **Owner:** leocaseiro · **Date:** 2026-06-17

---

## Why this is separate

The main architecture ADR was committed with `ARCH-OFFLINE-1 = RxDB (free Dexie storage)`. During review, two things changed the call:
1. The RxDB free/paid boundary (premium = native SQLite/OPFS) raised a "is offline-first actually free?" concern.
2. A harder case surfaced — **users creating their own notation offline, then syncing up** — which looked like a hard bidirectional diff.

A simplifying constraint (below) + a spike resolved it: **plain Dexie is the right free tool**, conditional on four schema/server changes. This doc parks that conclusion until the main review is done.

## Decision (proposed)

**Offline store = plain Dexie** (`dexie@4.4.4` + `dexie-react-hooks` + `ulid`), with a **hand-rolled insert-outbox + blob queue**. **No sync framework** (RxDB / Replicache / Dexie Cloud) — each fights the fixed NestJS/oRPC/Neon/S3 stack, and the only thing they buy (conflict resolution) is **designed away** by the constraint below.

### The load-bearing constraint
**Offline writes are INSERT-ONLY; updates & deletes are online-first. The client mints its own ULID PKs. Settings are the one exception → last-write-wins by `updated_at`.**
This removes all merge conflicts by construction: a row created offline is immutable until it syncs; the server is authoritative; re-sends are idempotent upserts by client ULID.

### Sync topology
- **Curated catalogue (Neon):** pull-to-cache (read-only mirror for offline play). Disposable — re-pull if evicted.
- **User-created notation/source (Neon, `origin='user-upload'`, `listable=false`):** insert-outbox → push when online.
- **Per-user scores (DynamoDB):** append-only outbox.
- **Settings:** LWW.
- **Binary files (S3):** Capacitor Filesystem (offline, eviction-safe) → presigned S3 PUT → patch `source.s3_key`.

## The 4 gating changes (REQUIRED for the free Dexie path; feed into the schema redesign)

1. **(P1) Keep client-minted `text` (ULID) PKs.** Offline insert-only requires client-generated IDs. Do **not** switch to server-generated `uuid DEFAULT`/`bigint`.
2. **(P1) A transactional `POST /sync/batch` endpoint** (idempotent by `batchId`) so an offline-created graph (song + parts + source + links/steps) commits **all-or-nothing**. Per-row pushes tear on partial failure.
3. **(P1) `source.upload_status` staging + relaxed `source_one_of`.** A file-backed offline upload has no `s3_key` yet → it violates "exactly one of s3_key/alphatex". Add a `pending_blob` status so the row syncs first and the blob backfills. (Inline alphaTex has no wrinkle.)
   ```sql
   ALTER TABLE source ADD COLUMN upload_status text NOT NULL DEFAULT 'ready'
     CHECK (upload_status IN ('pending_blob','ready'));
   ALTER TABLE source DROP CONSTRAINT source_one_of;
   ALTER TABLE source ADD CONSTRAINT source_one_of CHECK (
     (upload_status = 'pending_blob')
     OR ((s3_key IS NOT NULL)::int + (alphatex IS NOT NULL)::int = 1));
   ```
4. **(P1) `DEFERRABLE INITIALLY IMMEDIATE` on cross-row FKs** (`notation.parent_id`, `notation.source_id`, `notation_link.from_id/to_id`, `lesson_step.lesson_id/pattern_id`) so one batch txn commits a whole graph regardless of intra-batch order/cycles.
- **(P2)** idempotency key (reuse `batchId`) + **structured rejection reasons** (`quota|magic_byte|quarantine|validation|…`); optionally add `'quarantine'`/`'rejected'` to `n_status` so quarantined uploads are a visible row-state, not a hard reject.

## iOS durability caveat
Capacitor's WKWebView ≠ Safari → 7-day ITP eviction doesn't apply; the real risk is **storage-pressure LRU**, and `navigator.storage.persist()` is unreliable on iOS. So **local = cache**: curated content is disposable (re-pull); the durable risk is *user-created-but-unsynced* rows → **sync eagerly**, keep blobs in **Capacitor Filesystem** (native, eviction-safe). Optional v1.x hardening: mirror the outbox to Capacitor Preferences/Filesystem; ship without it, add only if field data shows eviction-before-sync.

## Flip conditions (when a framework WOULD be warranted)
- You drop insert-only and allow true **offline edits** of shared rows → real conflicts → reconsider (TanStack DB / Zero / Replicache). *(Genuine pivot — contradicts the spine.)*
- **Real-time multi-device collaboration** becomes a goal.
- The hand-rolled outbox's retry/ordering/rejection logic sprawls past a few hundred lines / sprouts edge-case bugs.
- Dexie itself stalls (no release in ~12+ months from the 2026-06-16 baseline).

## To do after the main review
- Flip `ARCH-OFFLINE-1` (RxDB → plain Dexie) in the main ADR + its summary table + §9.
- Add the 4 gating changes as requirements (e.g. `R13`-`R16`) to `docs/specs/2026-06-17-data-layer-requirements.md`.
- Add a decision-registry change-log entry recording the pivot.
- Hand the 4 schema changes to the parallel schema redesign.
