# tooling/

Lives outside the workspace package graph — repo-wide enforcement scaffolding, fallback files, and rule modules. Files here are imported by CI workflows + Dangerfile, not by application code.

## Files

| File | Purpose | Source-of-truth decision |
|---|---|---|
| [`linear-pending.md`](./linear-pending.md) | Markdown TODO file. Lightweight fallback for Linear MCP outages — agents append a bullet when MCP is unreachable; next session drains. | DACI L10a (v2 — replaces the JSON queue) |

Files coming in later Sequencing steps (placeholders documented for foresight, NOT created in this PR):

| File | Purpose | DACI step |
|---|---|---|
| `first-use-flags.json` | Persisted flags for DangerJS first-use triggers (Storybook, Playwright, LocalStack, first-PR). Concurrency-safe across parallel PRs. | L6 hardening (Step 3) |
| `floors.json` | Per-Nx-project floors for coverage / mutation / type-coverage (read-only in PR; bumped only by the `update-floors` workflow). | F-3 (Step 4) |
| `isolated-declarations-log.json` | 3-bucket classification log for `isolatedDeclarations` CI failures during the F-1 measurement window. | F-1 addendum (Step 4) |
| `probes/` | Self-testing probe suite — one Vitest spec per dep-cruise/boundary rule. | L2 implementation detail (Step 9) |
| `dangerfile.ts` + rule modules | DangerJS configuration entry + per-rule modules. | L6 (Step 3) |

## Linear MCP outage fallback — quick guide

The DACI calls out a Linear MCP outage as a real failure mode worth handling. The v2 approach is a markdown TODO file at [`linear-pending.md`](./linear-pending.md), drained on the next successful agent session.

When to enqueue:
- The agent intended to write to Linear AND a single retry failed AND losing the bookkeeping would matter.
- If the MCP works on the first try, never touch the file.

How to enqueue / drain: see the in-file procedure at the top of [`linear-pending.md`](./linear-pending.md).

### History — why not the JSON queue?

An earlier version of this directory used `tooling/linear-queue.json` + a JSON Schema + a state-machine drain (ULID id, `linearId` write-back, action enum, attempt tracking). After implementing it for the first time, the actual failure surface area for solo-dev + Linear's ~99.9% SLA didn't justify the complexity. Markdown handles the same use case in ~30 LOC instead of ~200, stays human-eyeballable in git diffs, and matches the user's stated preference for "Linear is only needed for large changes — small ops go to markdown".

The schema-based queue is preserved in git history if we ever need to revisit. This is a DACI L10a re-decision (v1 → v2); the DACI doc updates separately.

## Related runbooks

- [`docs/runbooks/linear-mcp.md`](../docs/runbooks/linear-mcp.md) — token hygiene + machine-compromise response.

## Related decisions

The DACI ([`docs/decisions/2026-06-09-tooling-stack-daci.md`](../docs/decisions/2026-06-09-tooling-stack-daci.md)) anchors every file in this directory. Files appear here as their parent Sequencing step lands.
