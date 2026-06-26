# Spike — Offline-first sync design (plain Dexie) — 2026-06-17

> **Feeds:** the offline-first decision — `ARCH-OFFLINE-1` in [`../decisions/2026-06-17-architecture-decisions.md`](../decisions/2026-06-17-architecture-decisions.md).
> **Question:** is **plain Dexie + insert-outbox + blob queue** sufficient for offline-first against the draft `notation`/`source`/`lesson_step`/`notation_link` schema, or is a sync framework needed?
> **Verdict:** Dexie is sufficient AND the right tool — conditional on 4 schema/server changes. No framework.

---

## 1. Maintenance check (npm + GitHub, 2026-06-17)

| Package           | Latest    | Published      | Weekly DLs | Verdict                            |
| ----------------- | --------- | -------------- | ---------- | ---------------------------------- |
| dexie             | **4.4.4** | **2026-06-16** | 1.73M      | ✅ shipping yesterday              |
| dexie-react-hooks | 4.4.0     | 2026-03-18     | 380k       | ✅ same monorepo                   |
| ulid              | 3.0.2     | 2025-11-30     | 9.47M      | ✅ active (has `monotonicFactory`) |
| ulidx             | 2.4.1     | 2024-08-25     | 339k       | ⚠️ slower cadence; TS-native alt   |

GitHub `dexie/Dexie.js`: 14.4k★, v4.4.4 (2026-06-16), alive. **Pick `ulid`** (ecosystem weight + monotonic factory).

**Nothing clean to adopt as an "insert-outbox over Dexie" helper:**

- `dexie-syncable`/`dexie-observable` — ⛔ stale beta (`4.0.1-beta.13`, 2023-01-17), superseded by Dexie Cloud.
- **Dexie Cloud** (`dexie-cloud-addon@4.4.13`, active) — a whole sync engine + its own server protocol + auth; **replaces** the NestJS/oRPC/Neon backend. Free tier 3 users/100 MB. Rejected on stack-conflict.
- RxDB / Replicache / TanStack DB / Zero / LiveStore — all alive, all sync-engine frameworks that want the wire protocol and assume CRDT/LWW merge. Overkill here (no merge problem). RxDB also excluded by prior decision.
  **→ Hand-roll a ~150-line outbox over plain Dexie.** The thing a framework gives you (conflict resolution) is designed away.

## 2. Why insert-only makes it easy

- **No update conflicts** — a row is immutable until it syncs; server never merges divergent versions.
- **Idempotent pushes** — client owns the PK (ULID) before the row reaches the server → re-send = `INSERT … ON CONFLICT (id) DO NOTHING/UPDATE`.
- **Cache and truth never fight** — curated = pull-only; user content = push-only; only settings is bidirectional (LWW).

## 3. Dexie design (shape)

Mirror tables (what the UI reads via `useLiveQuery`, with a `_sync` flag) + a separate ordered **`outbox`** table, written together in one Dexie transaction (local "transactional outbox").

```ts
// outbox item (one per pending server op, FK-safe by ++seq, grouped by batchId)
interface OutboxItem {
  seq: number;
  op: 'upsert';
  entity: 'source' | 'notation' | 'notation_link' | 'lesson_step' | 'score' | 'settings';
  entityKey: string;
  batchId: string;
  payload: unknown;
  blobRef?: string;
  attempts: number;
  lastError?: string;
  state: 'queued' | 'inflight' | 'blob-pending' | 'done' | 'rejected';
  createdAt: string;
}
```

Mirror rows carry local-only `_sync: 'synced'|'pending'|'rejected'` + `_syncedAt` (never sent to the server). **ULID strategy:** user rows get client-minted monotonic ULIDs; curated rows keep their server ids; both coexist in the `text` PK space.

## 4. The flows — worked, and where they break

- **Flow 1 — Pull-to-cache (curated, read-only):** cache the full play graph (notation + parent + source + blob + lesson_steps + patterns + links); freshness via server `updated_at`/ETag + a `since=` delta fetch. Tolerate eviction (re-pull). ✅
- **Flow 2 — Insert-outbox:** create mirror-row + outbox-item in one txn; flush in `seq` order online; server upserts by ULID (idempotent). ✅ no breakage.
- **Flow 3 — Offline-created GRAPH 🔴 breaks at the server** without a batch: `parent_id`/`source_id`/`notation_link` FKs reject children before parents/sources commit; multi-request push **tears** on partial failure and **strands** the graph on a validation reject. **Fix (required): a transactional `POST /sync/batch` endpoint (all-or-nothing, idempotent by `batchId`) + `DEFERRABLE` FKs.** Client still sends FK-ordered ops as the fast path.
- **Flow 4 — `source_one_of` 🔴 breaks** for file-backed offline uploads: at sync time `alphatex` is null AND `s3_key` is null (blob not uploaded yet) → violates "exactly one". **Fix (required): `source.upload_status='pending_blob'` staging + relaxed CHECK** (insert the row in staging inside the atomic batch; backfill `s3_key` via PATCH after the blob lands). Decouples metadata sync from blob upload. (Inline alphaTex: no wrinkle.)
- **Flow 5 — Blob queue:** Capacitor Filesystem (offline) → presigned S3 PUT (online) → PATCH `source.s3_key` + `upload_status='ready'`. Its own outbox item; retries independently; blobs survive WebKit eviction (native storage). ✅
- **Flow 6 — Server rejection** (magic-byte/quota/quarantine/validation): NOT a conflict — write `lastError` + mark `_sync:'rejected'`; **distinguish transient (retry w/ backoff) vs terminal (stop)**; "fix" = a _new_ ULID row (insert-only). Atomic batch → whole-graph reject is clean. ✅ (needs structured reason enum)
- **Flow 7 — Scores (append-only → DynamoDB) + Settings (LWW):** both fit the same outbox; scores ordered after their notation's batch; settings is the only pull-time merge (compare `updated_at`). ✅

## 5. Does any flow force a framework? — No.

#3 (server batch endpoint), #4 (schema relax), #6 (transient/terminal classification) are all yours to build regardless; a framework imposes a protocol and assumes conflicts you don't have.

## 6. Schema implications (feed into the redesign)

1. **(P1)** Client-ULID `text` PKs must survive (no server-default PKs).
2. **(P1)** Transactional `POST /sync/batch` (idempotent by `batchId`).
3. **(P1)** `source.upload_status` staging + relaxed `source_one_of`.
4. **(P1)** `DEFERRABLE INITIALLY IMMEDIATE` cross-row FKs.
5. **(P2)** idempotency key + structured rejection-reason enum.
6. **(P2, optional)** add `'quarantine'`/`'rejected'` to `n_status`.
7. **(client-only)** `_sync`/`_syncedAt` mirror columns + separate `outbox` table.
8. **(client durability)** local = cache except the unsynced outbox; sync eagerly; blobs in Capacitor Filesystem; optional outbox-mirror to Capacitor Preferences as v1.x hardening.

## 7. Recommendation + flip conditions

**Lock plain Dexie** (`dexie@4.4.4` + `dexie-react-hooks` + `ulid`) + hand-rolled insert-outbox + blob queue, **conditional on the 4 P1 changes**. No framework; not Dexie syncable/Cloud.
**Decisive trade-off:** _because every offline write is insert-only with a client ULID, the only thing a framework buys — conflict resolution — doesn't exist here, so a thin hand-rolled outbox is sufficient and lower-risk than a protocol that fights the fixed stack._
**Flip if:** offline edits of shared rows are allowed (real conflicts → TanStack DB / Zero / Replicache) · real-time multi-device collab · outbox logic sprawls · Dexie stalls (no release in ~12+ months).

## Sources

- [WebKit — Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/) · [WebKit — Tracking Prevention](https://webkit.org/tracking-prevention/)
- [Capacitor — Storage guide](https://capacitorjs.com/docs/guides/storage) · [Dexie Cloud](https://dexie.org/cloud/)
- npm registry API + GitHub `dexie/Dexie.js` (queried 2026-06-17)
