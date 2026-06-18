# Spike: Is TanStack DB a good idea for Notation Hero?

- **Date:** 2026-06-18
- **Verdict:** **REJECT for now** (adopt-later, on flip conditions)
- **Method:** current-doc research (tanstack.com/db, GitHub, npm) + adversarial verification. No training assumptions.
- **Decision owner:** Leo — confirmed "Reject for now" (2026-06-18).

---

## One-line verdict

Reject for now: TanStack DB is excellent **beta** tech that solves a client-merge / live-reactivity problem v1 deliberately **doesn't have** — and your own ADR (`ARCH-OFFLINE-1`) already files it as a future flip-condition tool, so adopting it pre-feature is premature complexity, not a well-architected base.

## Three converging reasons (all verified)

1. **Maturity — HIGH risk for a foundation.** Core `@tanstack/db` is **0.6.8, BETA, no 1.0** (repo created 2025-03-11; ~100 releases in 2 months). Durable persistence is a **first-alpha SQLite-WASM** layer (March 2026). *Version trap:* `@tanstack/query-db-collection 1.0.40` is a separate adapter, not the core lib.
2. **No problem to solve yet.** TanStack DB earns its keep on normalized cross-component live queries + optimistic-mutation merge ergonomics. `ARCH-OFFLINE-1` ([docs/decisions/2026-06-17-architecture-decisions.md:147](../decisions/2026-06-17-architecture-decisions.md)) deliberately **designs merge conflicts away** (insert-only offline, online-first updates, client ULIDs, settings LWW). v1 is one-admin, online CMS — plain TanStack Query (already wired) covers it.
3. **Backend fit is half-broken.** The good part (`queryCollection`) works over our **oRPC API with zero infra change** ✅. But real-time *push* needs **ElectricSQL** — a new service + **irreversible** Neon logical replication — and Electric is **Postgres-only**, so it **categorically cannot sync the per-user DynamoDB data**. A new dependency that covers only half the data model.

## It does NOT touch the Dexie decision

TanStack DB is **in-memory**; it does **not** do IndexedDB durability (the team explicitly rejected a direct-IndexedDB design). Its only first-party durable adapter is **RxDB** — already rejected. So **Dexie stays** as the durability layer, untouched. Don't reopen it.

## Flip to "adopt-later" only when ALL three hold

1. TanStack DB reaches **1.0** + stable persistence; **and**
2. a real `ARCH-OFFLINE-1` flip occurs (true offline edits of shared rows, or multi-device live collaboration), e.g. interactive practice-progress shared across many components; **and**
3. the value lands via `queryCollection` over the existing oRPC API with **no new infra** (adding ElectricSQL in front of Neon is a separate, larger decision and is moot for DynamoDB regardless).

If interactivity arrives but you want zero new deps, the cheaper first step is `@tanstack/react-store` (already installed) or plain Query — not TanStack DB.

## Verified facts (primary sources, 2026-06-18)

- `@tanstack/db` 0.6.8 BETA, `@tanstack/react-db` 0.1.86; no core 1.0 — CONFIRMED (npm, GitHub).
- `queryCollection` works over any async `queryFn` (our oRPC) with no Electric — CONFIRMED (query-db-collection source).
- In-memory; no IndexedDB durability; SQLite-WASM persistence is pre-1.0 — CONFIRMED.
- ElectricSQL is Postgres-only via logical replication; cannot front DynamoDB — CONFIRMED (electric-sql.com).
- ADR `ARCH-OFFLINE-1` line 147 lists TanStack DB as a flip-condition tool — CONFIRMED (local ADR).
