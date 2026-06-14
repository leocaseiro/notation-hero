---
date: 2026-06-11
type: decision
topic: issue-tracker-linear-to-jira
status: Done (migration complete)
approver: leocaseiro
supersedes: DACI L10a (Linear MCP), DACI L10b (Linear GitHub App), docs/runbooks/linear-mcp.md, tooling/linear-pending.md
---

# Decision — Issue tracker: Linear → Jira

## Decision

The project's issue tracker is **Jira Cloud**, project key **KAN**
(<https://leocaseiro.atlassian.net/jira/software/projects/KAN/summary>).
**Linear is retired.** Migration completed **2026-06-11**.

## What changes

| Was (Linear) | Now (Jira) |
|---|---|
| Linear workspace `leocaseiro`, team `LEO`, project `notation-hero-db465058e201` | Jira Cloud, project key **KAN** |
| Ticket ids `LEO-<n>` | **`KAN-<n>`** (old `LEO-<n>` ids are historical only) |
| Branch naming `LEO-<n>-<slug>` (DACI L10b) | **`KAN-<n>-<slug>`** |
| Linear MCP, `write:issues` token in keychain (DACI L10a) | Jira integration — see Follow-ups |
| Linear GitHub App, deferred (DACI L10b) | Jira ↔ GitHub (Smart Commits / GitHub for Jira) |
| MCP-downtime fallback `tooling/linear-pending.md` | Same fallback pattern, retargeted to Jira |

## Why

_(Inferred from the migration context — confirm/expand in review.)_ Linear's flat
backlog could not produce the single ordered, dependency-aware "one ticket at a time"
cascade leocaseiro needs — it lacked machine-readable blocking-dependency edges and a
deterministic global order. Jira's epic → story → sub-task hierarchy + issue links +
boards/sprints are a better fit for that workflow.

## Supersedes

- **DACI L10a (Linear MCP)** and **L10b (Linear GitHub App)** in
  `docs/decisions/2026-06-09-tooling-stack-daci.md` — those rows are now historical.
- `docs/runbooks/linear-mcp.md` — Linear token-hygiene runbook.
- `tooling/linear-pending.md` — Linear-MCP-downtime fallback queue (pattern retargeted to Jira).

This doc is the authoritative pointer; the superseded files carry a banner back to it.

## Follow-ups (not yet done — track in Jira/KAN)

- [ ] Wire a Jira integration for agents (Jira MCP or REST) with token hygiene
      (keychain, minimum scope, rotation) — the L10a-equivalent for Jira.
- [ ] Link Jira ↔ GitHub (Smart Commits / "GitHub for Jira") and adopt the
      `KAN-<n>-<slug>` branch-naming convention — the L10b-equivalent.
- [ ] Author `docs/runbooks/jira.md` to replace `docs/runbooks/linear-mcp.md`.
- [ ] Re-point any remaining `LEO-<n>` references to their `KAN-<n>` equivalents as they surface.
