---
date: 2026-06-27
type: decision
topic: playable-slug-url-token
status: Decided (wireframe + draft seed; ships with the real schema)
approver: leocaseiro
---

# Decision — `playable.slug`: a friendly URL token separate from the id

## Decision

Every playable carries a stored **`slug`** — a human-friendly URL token — **separate from
its opaque primary id** (ULID). Routes address playables by slug (`#/song/yellow`,
`#/lesson/learn-yellow`, `#/fill/zoio-de-lula-tom-fill`); the opaque id still resolves as a
fallback. The slug is minted from the title on insert and is admin-editable.

Decided by leocaseiro mid-review on **PR #88** (wireframe pass). **No separate Jira ticket** —
it rides with the routing work ([NH-221](https://leocaseiro.atlassian.net/browse/NH-221)).

## What changes

| Aspect  | Detail                                                                                                                                                                                                                                              |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema  | `playable.slug text` + a `UNIQUE` index; title→slug backfill then `SET NOT NULL` (modelled in the draft seed `docs/wireframe/2026-06-21-per-track-profiles-and-seed-draft.sql`).                                                                    |
| Routing | Router resolves **slug → playable** (`bySlug`); id still works. Songs derive their slug to their existing id (`yellow`) so those URLs are unchanged; patterns/lessons get friendly slugs distinct from the id — the visible proof that `slug ≠ id`. |
| Scope   | Wireframe + draft seed now; lands for real with the catalogue schema.                                                                                                                                                                               |

## Why

The id is an opaque ULID — good for storage, poor for URLs and for humans. A separate,
stable, friendly slug gives shareable, readable URLs without coupling them to the storage
key, and lets the URL stay stable even if an internal id ever changes.

## Status / enforcement

Decided · validated on a scratch Postgres DB (19 playables → 19 distinct non-null slugs).
Enforcement is the `UNIQUE` index + `NOT NULL` once the real migration lands; prose-only
until then.
