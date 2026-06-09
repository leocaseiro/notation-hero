# Linear-pending TODO

Lightweight fallback for Linear MCP outages. When MCP is unavailable, append a bullet describing the pending operation. Next agent session (with MCP working) drains items by attempting each Linear MCP call and removing the bullet on success.

This is intentionally simple — solo-dev context + Linear's high SLA mean we don't need a typed queue with a state machine. The file is plain markdown, human-eyeballable, drainable in ~30 lines of code, and survives any concurrent-write conflict via standard git rebase / merge.

Companion runbook: [`docs/runbooks/linear-mcp.md`](../docs/runbooks/linear-mcp.md) — token hygiene + machine-compromise response.

## When to enqueue

Append a bullet when ALL of:
1. The agent intended to write to Linear (`create_issue`, `update_issue`, `add_comment`, etc.).
2. The Linear MCP call failed AND a single retry also failed.
3. Losing the bookkeeping would matter (e.g., mirroring a DACI Deferred item, logging a follow-up issue from a real workflow). Skip transient noise.

If the MCP call succeeds on the first try (or after a retry), never touch this file.

## Item format

```
- [ ] **<action>** — <fields the call needs>
```

| Action | Required fields |
|---|---|
| `create_issue` | `Team: <name>` + `Project: <name>` + `Title: <text>`; optional `Labels: [...]`, `Description: <text>` |
| `update_issue` | `Issue: <LEO-XX>` + at least one field to change |
| `add_comment` | `Issue: <LEO-XX>` + `Body: <text>` |
| `set_status` | `Issue: <LEO-XX>` + `State: <Backlog | Todo | In Progress | In Review | Done | Canceled>` |
| `add_label` | `Issue: <LEO-XX>` + `Labels: [...]` |

After enqueueing, commit in a small chore commit: `chore(linear): enqueue <action> (mcp unreachable)`. Then continue work — don't block on Linear being down.

## Drain procedure

When MCP is reachable again (e.g., start of next agent session, after a token rotation, or in a CI drain job once that lands):

1. Read the `## Items` section below.
2. For each `- [ ]` bullet:
   - Parse the action + fields from the bullet text (LLMs are good at this; a future drain script can use a small parser).
   - Call the corresponding Linear MCP tool. Linear MCP `create_issue` / `update_issue` / `set_status` / `add_label` all route through the `save_issue` tool; `add_comment` uses `save_comment`.
   - **On success** (and `action == create_issue`): note the returned Linear issue id inline as ` — DONE <LEO-XXX> <YYYY-MM-DD>` and flip `- [ ]` to `- [x]`. Keep the line as an audit trail for one week, then remove. Recording the new id makes accidental replays a no-op (idempotency by reading the file).
   - **On success** (other actions): flip to `- [x]` with ` — DONE <YYYY-MM-DD>`.
   - **On failure**: leave the bullet; append ` — RETRY <N>` (or increment if already present) so future drains see the count. After 3 retries, surface to the user.
3. Commit: `chore(linear): drain <N> pending items`.

## Why markdown, not a JSON queue (DACI L10a v2)

The original DACI L10a designed a typed JSON queue (`tooling/linear-queue.json` + JSON Schema) with state-machine drain (linearId write-back, ULID id format, action enum, attempt tracking). After implementing it, the actual failure surface area for solo-dev + Linear's ~99.9% SLA didn't justify the complexity. Markdown handles the same use case in ~30 LOC instead of ~200, stays human-eyeballable in git diffs, and matches the user's stated preference for "Linear is only needed for large changes — small ops go to markdown".

The schema-based queue is preserved in git history (commits before [`<TBD>`](../tooling/linear-pending.md)) if we ever need to revisit.

## Items

<!--
Append new items at the bottom under "### Pending". When a drain pass flips
items to `- [x]`, move them under "### Drained recently (clean up after a week)"
to keep `### Pending` lean.
-->

### Pending

_(empty — drain on next agent session means we steady-state at zero)_

### Drained recently (clean up after a week)

_(empty)_
