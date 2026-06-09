# tooling/

Lives outside the workspace package graph — repo-wide enforcement scaffolding, fallback queues, and rule modules. Files here are imported by CI workflows + Dangerfile, not by application code.

## Files

| File | Purpose | Source-of-truth decision |
|---|---|---|
| `linear-queue.json` | Fallback queue for Linear MCP updates when the MCP is unreachable. Drained on next successful agent session OR via CI. | DACI L10a |
| `linear-queue.schema.json` | JSON Schema for queue items. | DACI L10a |

Files coming in later Sequencing steps (placeholders documented for foresight, NOT created in this PR):

| File | Purpose | DACI step |
|---|---|---|
| `first-use-flags.json` | Persisted flags for DangerJS first-use triggers (Storybook, Playwright, LocalStack, first-PR). Concurrency-safe across parallel PRs. | L6 hardening (Step 3) |
| `floors.json` | Per-Nx-project floors for coverage / mutation / type-coverage (read-only in PR; bumped only by the `update-floors` workflow). | F-3 (Step 4) |
| `isolated-declarations-log.json` | 3-bucket classification log for `isolatedDeclarations` CI failures during the F-1 measurement window. | F-1 addendum (Step 4) |
| `probes/` | Self-testing probe suite — one Vitest spec per dep-cruise/boundary rule. | L2 implementation detail (Step 9) |
| `dangerfile.ts` + rule modules | DangerJS configuration entry + per-rule modules. | L6 (Step 3) |

## `linear-queue.json` — usage

### When to enqueue

An agent enqueues an item when ALL of:
1. The agent wanted to write to Linear (create issue, update status, etc.).
2. The Linear MCP call failed (`mcp-unreachable`, `token-expired`, `rate-limited`, or `unknown-error`).
3. The work being captured matters enough that losing it would create real bookkeeping debt (e.g., mirroring a Deferred item from the DACI; logging a follow-up issue from a code review).

If the MCP call succeeds on the first try, never touch this file.

### Item shape

See [`linear-queue.schema.json`](./linear-queue.schema.json). Minimum example:

```json
{
  "id": "q-01HZK3MECHZX3TBDSZ7XR8QY3D",
  "action": "create_issue",
  "payload": {
    "team": "Leocaseiro",
    "title": "Wire Linear GitHub App at PR #1",
    "description": "From DACI L10b deferred trigger…",
    "labels": ["deferred", "L10b"]
  },
  "queuedAt": "2026-06-09T12:34:56Z",
  "queuedBy": "agent-session-competent-poitras-8b8d05",
  "reason": "mcp-unreachable",
  "attempts": 0,
  "lastError": null,
  "linearId": null
}
```

### `id` format (F-2 hardening — ULID)

`q-<ULID>` where `<ULID>` is a 26-character [Crockford base32](https://github.com/ulid/spec) string. The first 10 chars encode a millisecond Unix timestamp (sortable — newest entries lexicographically last); the last 16 chars are crypto-random (80 bits of entropy → collision probability vanishingly small without coordination).

- **Example:** `q-01HZK3MECHZX3TBDSZ7XR8QY3D`
- **Generation:** use the [`ulid`](https://www.npmjs.com/package/ulid) npm package (`ulid()` returns the 26-char string). Add as a devDependency when the first agent code that enqueues lands.
- **Why ULID (not a sequential counter):** counter-style ids (`q-YYYY-MM-DD-NNN`) require read-scan-increment-write, which lets two concurrent agent sessions both pick the same id and silently clobber one item on write. ULID eliminates the race without coordination AND removes the daily-counter ceiling that capped enqueues at 999/day.
- **Recovery if a collision IS observed** (theoretical but document for audit): the second-arriving write should detect the duplicate `id` on read-back, regenerate, and retry. Agents must validate against the schema regex after generation.

### Drain procedure

**Manual (next agent session):**
1. Read `tooling/linear-queue.json`.
2. For each item in `queue`, attempt the corresponding Linear MCP call with `payload` (see the action→tool table below).
3. **On success — idempotency-aware (F-1 hardening):**
   - If `action == "create_issue"` AND `linearId` is **unset**: write the Linear-returned issue id into `linearId` on the item **BEFORE** removing — this turns a future crash-before-remove + replay into a benign `update_issue` no-op instead of a duplicate-issue bug.
   - If `action == "create_issue"` AND `linearId` is **already set** (a prior partial-success scenario replaying): call `update_issue` with that id instead of `create_issue`, then remove the item.
   - For all other actions: remove the item.
4. On failure: increment `attempts`, set `lastError`, keep the item; surface to the user if `attempts >= 3`.
5. Commit the resulting `linear-queue.json` change in a small chore-commit (`chore(linear): drain N queued items`).

#### Action → Linear MCP tool mapping (F-5 hardening)

The `action` enum names a logical operation; the table below gives the concrete Linear MCP tool to invoke. All Linear MCP tools live under the workspace's Linear MCP server prefix (the prefix is session-specific — agents resolve it via their tool registry).

| Queue action | Linear MCP tool | How to call |
|---|---|---|
| `create_issue` | `save_issue` (no `id` in args) | Pass `payload` fields (`title`, `team`, `description`, `labels`…) as args. On success, write the returned issue id into the item's `linearId` field BEFORE removing — see drain step 3. |
| `update_issue` | `save_issue` (with `id` in args) | Pass `payload.id` + updated fields. |
| `add_comment` | `save_comment` | Pass `payload.issueId` + `payload.body`. |
| `set_status` | `save_issue` (with `id` + `state`) | Pass `id` + new `state` (status type, name, or ID). |
| `add_label` | `save_issue` (with `id` + `labels`) | Pass `id` + `labels` array. |

**Automated (CI drain job — wired in a later Sequencing step):**
- Lives at `.github/workflows/linear-drain.yml`.
- Runs on `schedule: cron '0 */6 * * *'` (every 6 h) and on `workflow_dispatch`.
- Uses a repo-secret `LINEAR_API_TOKEN` (NOT the personal MCP token — a separate `write:issues`-scoped token for CI).
- On success, commits the cleared queue back to `master` (allowed via the `update-floors`-style environment-reviewer pattern OR a dedicated bot).
- The drain job is **not** wired in PR #1 (this one) — only the queue file + format. The CI job is a separate baby PR.

### Why the file is committed

Both the queue and its drain history are auditable from `git log -- tooling/linear-queue.json`. Solo-dev context, but the audit habit is cheap to keep.

## Related runbooks

- [`docs/runbooks/linear-mcp.md`](../docs/runbooks/linear-mcp.md) — token hygiene, machine-compromise response.

## Related decisions

The DACI ([`docs/decisions/2026-06-09-tooling-stack-daci.md`](../docs/decisions/2026-06-09-tooling-stack-daci.md)) anchors every file in this directory. Files appear here as their parent Sequencing step lands.
