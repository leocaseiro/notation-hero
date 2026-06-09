# Linear MCP — Token Hygiene Runbook

Source of truth: [`docs/decisions/2026-06-09-tooling-stack-daci.md`](../decisions/2026-06-09-tooling-stack-daci.md), Layer **L10a**.

## What this is

The Linear MCP server lets AI agents create + update Linear issues directly (it is the agent's hands into Linear). This runbook captures token hygiene so we never end up with a leaked admin token in a repo dotfile.

## Workspace identity

| Field | Value |
|---|---|
| Team name | `Leocaseiro` |
| Team key | `LEO` |
| Team ID | `ed9131a1-9fa2-4662-bac8-12735692f59a` |
| Project name | `Notation Hero` |
| Project ID | `75dc3e7c-0157-482a-9fc9-caf032b7d117` |
| Project URL | <https://linear.app/leocaseiro/project/notation-hero-db465058e201> |

Branch naming convention (used once L10b Linear GitHub App is wired): `LEO-<issue-number>-<slug>`.

## Token hygiene rules

1. **Scope: `write:issues` only** — never `admin`. The MCP needs to create/update issues, nothing else.
2. **Storage: OS keychain only** — never a dotfile in `$HOME`, never a repo env var, never inline in shell history.
   - macOS: Keychain Access → login keychain → new password item.
   - The MCP client reads the keychain entry at startup; no plaintext on disk.
3. **Rotation: every 90 days** — calendar reminder lives outside the repo (set in personal calendar). Next rotation: **2026-09-07**.
4. **Revocation:** at any sign of machine compromise (lost laptop, suspicious activity), immediately revoke at <https://linear.app/settings/api>. Then re-issue a new scoped token + re-store in keychain.
5. **Sharing: never** — do not paste tokens into chat tools, screen shares, Slack, or PRs. If a token is exposed even briefly, revoke + reissue.

## Machine-compromise response (runbook step-by-step)

1. **Revoke now:** open <https://linear.app/settings/api>, find the active personal access token, click "Revoke". The MCP will start failing — that is the desired blast radius.
2. **Audit recent Linear activity:** Inbox → Activity → filter by your user → check for any unrecognized issue edits in the last 24h. Roll back surprising changes.
3. **Re-issue:** create a new token, `write:issues` scope only, friendly name like `mcp-laptop-2026-09-07`. Copy once to clipboard.
4. **Re-store in keychain** (don't paste anywhere else first). Delete clipboard after pasting.
5. **Restart MCP client** so it picks up the new keychain entry.
6. **Smoke-test the new token** (F-12 hardening) — run one low-risk Linear MCP call (e.g. `list_teams` or `get_user me`) and confirm it returns data without error. A misnamed keychain entry, wrong token scope, or stale-copy MCP client all fail silently otherwise. Only proceed once one successful call has gone through.
7. **Drain the fallback queue** (see [tooling/README.md](../../tooling/README.md)) — any deferred Linear updates queued while the MCP was offline will replay.

## Fallback when MCP is unavailable

If the MCP returns errors (token expired, Linear outage, network blip), agents log the intended Linear update to [`tooling/linear-queue.json`](../../tooling/linear-queue.json) and continue work. The queue drains on the next successful agent session OR via a CI drain job.

See [`tooling/README.md`](../../tooling/README.md) for the queue format and drain procedure.

## Related decisions

- **L10a** — this runbook covers the foundation MCP wiring.
- **L10b** — Linear GitHub App is deferred to the first PR (`danger.github.pr.number === 1`); see [DACI Deferred section](../decisions/2026-06-09-tooling-stack-daci.md#deferred--awaiting-first-use-trigger).
