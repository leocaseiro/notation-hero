# tooling/

Lives outside the workspace package graph — repo-wide enforcement scaffolding, fallback files, and rule modules. Files here are imported by CI workflows + Dangerfile, not by application code.

## Files

| File | Purpose | Source-of-truth decision |
|---|---|---|
| [`branch-protection.sh`](./branch-protection.sh) | Apply classic Branch Protection to `master` (CI Green required, linear history, no force push, no deletions). DRY-RUN by default; `--apply` to commit. Idempotent. | DACI L7 (classic-API portion) |
| [`branch-ruleset.json`](./branch-ruleset.json) | Declarative GitHub Repository Ruleset for `master-merge-queue`. Targets `~DEFAULT_BRANCH`. Encodes squash merge, ALLGREEN strategy, 5-concurrent build, 1–5 group size, 60-min check timeout. | DACI L7-merge-queue (KAN-140) |
| [`branch-ruleset.sh`](./branch-ruleset.sh) | Apply the Ruleset above to the repo. DRY-RUN by default; `--apply` to commit. Idempotent (POST if new, PUT if a ruleset with the same name already exists). | DACI L7-merge-queue (KAN-140) |
| [`linear-pending.md`](./linear-pending.md) | ~~Markdown TODO file. Lightweight fallback for Linear MCP outages — agents append a bullet when MCP is unreachable; next session drains.~~ <!-- now Jira; see docs/decisions/2026-06-11-tracker-linear-to-jira.md --> | DACI L10a (v2 — replaces the JSON queue) |

Files coming in later Sequencing steps (placeholders documented for foresight, NOT created in this PR):

| File | Purpose | DACI step |
|---|---|---|
| `first-use-flags.json` | Persisted flags for DangerJS first-use triggers (Storybook, Playwright, LocalStack, first-PR). Concurrency-safe across parallel PRs. | L6 hardening (Step 3) |
| `floors.json` | Per-Nx-project floors for coverage / mutation / type-coverage (read-only in PR; bumped only by the `update-floors` workflow). | F-3 (Step 4) |
| `isolated-declarations-log.json` | 3-bucket classification log for `isolatedDeclarations` CI failures during the F-1 measurement window. | F-1 addendum (Step 4) |
| `probes/` | Self-testing probe suite — one Vitest spec per dep-cruise/boundary rule. | L2 implementation detail (Step 9) |
| `dangerfile.ts` + rule modules | DangerJS configuration entry + per-rule modules. | L6 (Step 3) |

## Branch protection + merge queue — two layers, one repo

GitHub has **two separate APIs** for protecting `master`. They coexist; you
need both for the full setup. **Run order matters** — apply protection first
(it's the gate), then the ruleset (it routes merges through the gate).

### Layer 1: Classic Branch Protection ([`branch-protection.sh`](./branch-protection.sh))

The legacy API. Controls **what's required to merge** into `master`:
required PR, required `CI Green` status check, linear history, no force
pushes, no deletions. Solo-repo policy: **0 approvals** — GitHub forbids
self-approval, so requiring "1 approval" on a solo repo self-blocks forever.

```bash
bash tooling/branch-protection.sh           # DRY-RUN — print the payload
bash tooling/branch-protection.sh --apply   # CREATE / UPDATE the protection
```

⚠️ Pre-flight before `--apply`: a `CI Green` check must have run at least
once on `master` (GitHub only accepts a status-check context it has already
observed). After PR #21 merged this was true; the script logs a warning and
proceeds if missing.

### Layer 2: Repository Ruleset for merge queue ([`branch-ruleset.sh`](./branch-ruleset.sh))

The modern API — **and the only place GitHub exposes the merge queue**. The
classic API has no `Require merge queue` toggle; if you want a queue, you
add a Ruleset. Layer 2 sits on top of Layer 1: classic = WHAT'S REQUIRED,
Ruleset = HOW MERGES HAPPEN.

```bash
bash tooling/branch-ruleset.sh              # DRY-RUN — print the payload + show create-vs-update
bash tooling/branch-ruleset.sh --apply      # CREATE / UPDATE the ruleset
```

The script is idempotent: it lists existing rulesets, finds one with the
same `name` (default `master-merge-queue` from the JSON), and PUTs to update
it if found; otherwise POSTs to create.

### What the merge queue does (the "why")

Two parallel-agent PRs can each pass CI in isolation while combining into a
broken `master` (different agents touch the same hot file; locked together
they fail). The merge queue catches this:

1. PR is approved and gated (CI Green + linear history from Layer 1).
2. Author clicks **"Merge when ready"** (replaces "Squash and merge").
3. GitHub adds the PR to the queue. The queue creates a synthetic merge
   commit representing **`master + queued PRs`** and runs CI on it (via the
   `merge_group:` trigger in `.github/workflows/ci.yml`).
4. Only if that synthetic commit is green does `master` advance.

`ALLGREEN` grouping means every queue entry must individually pass; a single
failure rejects only the failing PR, not the whole group.

### Verification after applying both layers

```bash
gh api repos/leocaseiro/notation-hero/branches/master/protection \
  --jq '{checks: .required_status_checks.contexts, pr: .required_pull_request_reviews.required_approving_review_count}'
# -> {"checks": ["CI Green"], "pr": 0}

gh api repos/leocaseiro/notation-hero/rulesets \
  --jq '.[] | {id, name, target, enforcement}'
# -> {"id": <id>, "name": "master-merge-queue", "target": "branch", "enforcement": "active"}
```

### When to re-run

- **Adding a new required CI check** → edit the script, re-run `branch-protection.sh --apply`.
- **Tuning queue size / timeouts / merge method** → edit `branch-ruleset.json`, re-run `branch-ruleset.sh --apply`.
- **Repo settings changes in GitHub UI** → the next `--apply` re-asserts the JSON, overwriting the UI drift. The JSON in git is the source of truth.

### Why two scripts, not one

Three reasons: (1) the APIs are genuinely separate at GitHub; (2) you'll
sometimes want to update one without re-asserting the other (e.g., adding a
required check shouldn't bounce the queue config); (3) idempotent
single-purpose scripts are easier to reason about than a multi-mode wrapper.

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

- [`docs/runbooks/linear-mcp.md`](../docs/runbooks/linear-mcp.md) — ~~token hygiene + machine-compromise response.~~ <!-- now Jira; see docs/decisions/2026-06-11-tracker-linear-to-jira.md -->

## Related decisions

The DACI ([`docs/decisions/2026-06-09-tooling-stack-daci.md`](../docs/decisions/2026-06-09-tooling-stack-daci.md)) anchors every file in this directory. Files appear here as their parent Sequencing step lands.
