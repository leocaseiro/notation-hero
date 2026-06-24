# NotationHero — Auto-inject + Resync PR Merge Checklist (NH-237) — Design

> **Status:** 🟢 IMPLEMENTED (2026-06-24, NH-237)
> **Ticket:** [NH-237](https://leocaseiro.atlassian.net/browse/NH-237) — "Auto-inject + resync PR merge checklist on every PR" (Task under Epic NH-176 Foundation & CI/CD)
> **Relates to:** [NH-16](https://leocaseiro.atlassian.net/browse/NH-16) — PR merge checklist v1/v1.1 ([spec](2026-06-15-pr-merge-checklist.md))
> **Decision source:** DACI **L6** (PR automation) — extends NH-16
> **Owner:** leocaseiro

---

## 1. Problem & goal

**Problem:** The 12-item merge checklist lives in `.github/pull_request_template.md`. GitHub auto-fills that template **only in the web "Open a pull request" form**. PRs opened by agents or the command line via `gh pr create --body "…"` (or the REST API) **skip** the template, so the new PR body has no checklist. The existing `pr-checklist` CI gate ([`tooling/pr-checklist.mjs`](../../tooling/pr-checklist.mjs)) then **requires** every canonical item present and ticked in the body — so whoever opened the PR must **paste the entire checklist by hand** to go green. That manual paste, on every PR, is the live pain.

**Goal:** Place the checklist on **every** PR automatically, regardless of how it was opened, and **resync all open PRs** whenever the checklist changes — without weakening the existing strict gate and without manual steps.

**Non-goals:** changing what the gate enforces (the gate is unchanged); smart/diff-aware rules (DangerJS — reserved for NH-16 v2); fork-PR auto-injection (see §5).

## 2. Scope

**In:**

- A sync step that, given a PR body, **appends only the canonical checklist items the body is missing** (unticked), preserving all existing content.
- A dedicated workflow that runs the sync: per-PR on `opened`, and as a **fan-out** across all open PRs on a manual button (`workflow_dispatch`) and when the template changes (`push` to `master` touching the template).
- Shared parse/match helpers so the sync and the gate agree on "present vs missing."
- Tests; an AGENTS.md note; a decision-registry entry.

**Out:**

- Any change to the gate's enforcement behavior (`tooling/pr-checklist.mjs` stays strict; refactor-only to share helpers).
- Comments / `mheap` / DangerJS (evaluated and rejected — see §8).
- Fork-PR auto-injection (the token is read-only on a fork `pull_request`; `pull_request_target` is deliberately avoided for security).

## 3. The model — body append-missing + automated fan-out

The checklist stays in the **PR body** (the single source of truth the gate already reads). The sync is **additive only**: it computes the set of canonical items not already present and appends them as unticked `- [ ]` lines under the `## Checklist` section (creating that section at the end of the body if absent). It **never edits or removes existing lines**, so:

- Already-ticked boxes are never disturbed (no tick-preservation logic to get wrong).
- The author's prose ("What & why", "Jira", "How to test") is never overwritten.
- Re-running is safe (idempotent): a compliant PR yields no change.

Two cases, one mechanism:

- **Initial inject** (new PR, no checklist): all items are missing → all appended.
- **Drift** (template gains a 13th item): only that item is missing in open PRs → only it appended.

Boxes arrive **unticked on purpose** — the existing gate still requires every box ticked, so auto-inject ensures the checklist is _present to tick_; it does **not** bypass the acknowledgement.

## 4. Architecture

Three small pieces:

1. **`tooling/pr-checklist-lib.mjs`** (new) — shared helpers extracted from the gate: `TASK_RE`, `stripNoise`, `norm`, `canonicalItems(templatePath)`, `parseBodyTasks(body)`, and `missingItems(body, canonical)` (canonical items whose normalized label is not the prefix of any body task — the **same** match the gate uses). One source of matching truth → the sync and the gate can never disagree.

2. **`tooling/pr-checklist-sync.mjs`** (new) — a small function `ensureChecklist(body, canonical) → { body, appended[] }` (with `canonical` from the lib's `canonicalItems()`): appends `missingItems(body, canonical)` as `- [ ]` lines under `## Checklist` (created at the end if absent); returns the new body plus which items were appended. Pure over its inputs (no PR/network I/O), so it unit-tests without fixtures; the workflow reads the template, supplies the body, and writes the result back.

3. **`.github/workflows/pr-checklist-sync.yml`** (new) — runs the sync through the `gh` CLI:
   - **Triggers:** `pull_request: [opened]`; `workflow_dispatch`; `push: branches: [master], paths: ['.github/pull_request_template.md']`.
   - **Permissions:** `pull-requests: write`, `contents: read` (least privilege; isolated from `ci.yml`, which stays `contents: read`).
   - **Per-PR (`opened`):** read the triggering PR body → `ensureChecklist` → if it changed, `gh pr edit --body`.
   - **Fan-out (`workflow_dispatch` / template `push`):** `gh pr list --state open` (exclude bots) → for each PR, read body → `ensureChecklist` → edit only if changed. Log which PRs were updated vs skipped.
   - **Bot bypass:** skip `user.type == 'Bot'` (dependabot) via the `pull_request` `if:` and a filter in the fan-out list.

The existing `tooling/pr-checklist.mjs` gate is **refactored to import the shared lib** (behavior identical, locked by the existing `tooling/pr-checklist.test.mjs`); nothing else about the gate changes.

## 5. Triggers, permissions, and the no-loop guarantee

- The sync edits a body → fires `pull_request: edited` → re-runs the **gate** (`ci.yml` already listens to `edited`) → the gate re-evaluates and stays **red until the boxes are ticked** (intended).
- The sync workflow does **not** trigger on `edited`, so its own body edit cannot re-trigger it → **no loop**. On `opened` it runs once; the fan-out is manual or template-driven.
- `pull_request` (not `pull_request_target`) is used → fork PRs get a read-only token and are **not** auto-injected. Acceptable: this is a single-owner repo with branch PRs, and `pull_request_target` is a known privilege-escalation vector we deliberately avoid.

## 6. Resync & backfill

- "Backfill all open PRs when I add a checklist item" = the **fan-out**: press the `workflow_dispatch` button, or simply merge the template change to `master` (the `push`-path trigger fans out automatically).
- The **first** fan-out run covers the currently-non-compliant open PRs (#57, #34); #64 is already compliant (no-op); #8 is BLOCKED (covered whenever it is next synced). No hand-fixing required.

## 7. Files touched

| File                                                | Change                                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `tooling/pr-checklist-lib.mjs`                      | **new** — shared template-parse + match helpers                                                              |
| `tooling/pr-checklist.mjs`                          | refactor to import the lib (behavior identical; existing tests cover it)                                     |
| `tooling/pr-checklist-sync.mjs`                     | **new** — `ensureChecklist(body)` append-missing logic                                                       |
| `tooling/pr-checklist-sync.test.mjs`                | **new** — node --test: missing→appended, present→no-op, drift→only-missing, ticks preserved, prose preserved |
| `.github/workflows/pr-checklist-sync.yml`           | **new** — opened + workflow_dispatch + template-push; `pull-requests: write`; gh-driven                      |
| `package.json`                                      | _no change_ — `test:tooling` already globs `tooling/*.test.mjs`                                              |
| `AGENTS.md`                                         | "PR checklist" note: the checklist is auto-added; agents still must tick it (no more manual paste)           |
| `docs/decisions/decision-registry.md`               | change-log entry (new automation under L6)                                                                   |
| `docs/specs/2026-06-24-pr-checklist-auto-inject.md` | this spec                                                                                                    |
| Jira **NH-237**                                     | tracking                                                                                                     |

## 8. Alternatives considered (and rejected)

- **Sticky comment (instead of body):** cleaner resync, but the gate reads the body — comment delivery forces a gate rewrite plus comment-edit event handling, and ticking moves off the body. Rejected: append-missing gives the same safety (prose untouched) with zero gate change.
- **`mheap/require-checklist-action`:** enforce-only (does not inject or resync) and **re-introduces the `~~strikethrough~~` = N/A escape removed in v1.1** (not disableable). Rejected.
- **DangerJS:** per-PR sticky comment + diff-aware rules; no fan-out to all open PRs. Reserved for NH-16 **v2** smart rules, not distribution.
- **Manual "post a comment to each open PR" via AGENTS.md:** re-introduces the manual fan-out we are removing, with a silent-skip gap (a forgotten PR merges without the new item). Rejected in favor of the automated fan-out.

## 9. Test plan

- **Unit (`pr-checklist-sync.test.mjs`):**
  - Body with no checklist → all canonical items appended, unticked; prose preserved.
  - Body already compliant → **no change** (idempotent).
  - Body missing one item (drift) → only that item appended; existing ticked boxes unchanged.
  - Body with the author's own unrelated `- [ ]` lines → not mistaken for canonical items; canonical still appended.
  - The sync output passes the **gate's** "present" check (shared lib → parity).
- **Gate regression:** the existing `tooling/pr-checklist.test.mjs` cases stay green after the lib refactor (incl. #64's infra-preview tests).
- **Workflow (manual once):** open a CLI PR with no checklist → the `opened` run injects it → gate goes red → tick → green. Press `workflow_dispatch` → #57/#34 get the checklist. Edit the template + merge → open PRs get the new item.
- **No-loop:** confirm the sync's body edit does not re-trigger the sync workflow.

## 10. Open points / caveats

- **Fork PRs** are not auto-injected (read-only token; `pull_request_target` avoided). Acceptable for a single-owner repo; the gate still forces a manual add if a fork PR ever appears.
- **Insertion placement:** missing items are appended under `## Checklist` (created at the end if absent). The exact insertion point (end-of-section vs end-of-body) is an implementation detail; the gate is position-independent.
- **Unticked-after-inject is intended** — auto-inject ensures presence, not a pass; the human or agent still ticks. This keeps the acknowledgement honest (the one thing the gate guarantees).
