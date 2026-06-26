# NotationHero — Agent PR Merge Checklist (v1) — Design

> **Status:** 🟢 SHIPPED (2026-06-15, NH-16 v1) → 🔧 **v1.1 (2026-06-16)** reframed to all-required acknowledgements (no `N/A`) after a real-world miss (PR #40); v2 smart rules deferred (NH-16 backlog)
> **Ticket:** [NH-16](https://leocaseiro.atlassian.net/browse/NH-16) (moved from KAN-125) — "[Track 2] Advanced PR policy — DangerJS, VR-required-on-UI, Storybook-on-new-components"
> **Decision source:** DACI **L6** (PR automation) — [`docs/decisions/2026-06-09-tooling-stack-daci.md`](../decisions/2026-06-09-tooling-stack-daci.md)
> **Engine decisions:** custom CI step (NOT DangerJS for v1) · Jira-key = required gate (keeps `KAN` in code, `NH` in template text) · keep local worktree reminder · **v1.1: every box is a standing acknowledgement that MUST be ticked `[x]` — `N/A` and `required:`/`warn:` removed** · branch protection includes administrators
> **Owner:** leocaseiro

---

## 1. Problem & goal

**Problem (live pain):** agents open/merge PRs **without a Jira ticket** and **skip process steps** (decision-log updates, overlap checks) — work goes untracked.

**Goal:** a lightweight, **agent-readable checklist on every PR** + a **CI gate** that makes the required steps unskippable, while staying simple (no smart DangerJS rules yet). Must support **both `NH-` and `KAN-`** Jira keys during the migration.

**Non-goal (v1):** verifying the _work_ behind a checkbox (e.g., that the ticket was actually updated). v1 is honesty-based + presence checks; deep verification is the **v2 "smart" backlog**.

## 2. Scope

**In (v1):**

- PR-body checklist (native GitHub task list) via the PR template.
- Custom CI gate (`tooling/pr-checklist.mjs` + a `pr-checklist` job): **every acknowledgement ticked** (no `N/A`) + anti-deletion + Jira-key presence grep; bot-exempt; wired into **CI Green**.
- Local `lefthook` pre-push worktree reminder.
- Governance: DACI clarification, decision-registry entry, NH support in CONTRIBUTING + PR template, AGENTS.md note, CODEOWNERS.
- Jira NH-16 Smart Checklist (tracking).

**Out (→ v2 "smart" backlog on NH-16):** DangerJS; auto-create Jira ticket if missing; "is the ticket actually done?" check; smart diff-based UI/overlap detection; green-fake catch; first-use triggers; floor-downgrade / enforcement-isolation / probe-inversion rules.

## 3. The checklist (PR template)

```md
## Checklist

<!-- Every box must be ticked [x]. No N/A — these are standing acknowledgements, so tick them all.
     Do NOT delete/reword items (the gate reads them from this template). A real NH-/KAN- key must
     also appear in the title, body, or branch. -->

- [ ] I am aware I must link a Jira ticket (NH-####) and keep its status updated through implementation, review, and merge.
- [ ] I am aware I must write/maintain Storybook stories if this PR includes any UI changes.
- [ ] I am aware I must add/update VR (visual-regression) tests if this PR includes any UI changes.
- [ ] I am aware I must write/maintain tests if this PR includes any testable code changes.
- [ ] I am aware I must update the decision log (docs/decisions) if this PR changes a decision or what's enforced.
- [ ] I am aware I must update README.md / relevant docs with essential changes and the "why", for easy tracking later.
- [ ] I am aware I must check for overlapping open PRs / worktrees and note any risks in the PR and Jira.
- [ ] I am aware I must keep PRs small (baby commits), or explain why this one is large.
- [ ] I have self-reviewed my own diff before requesting review.
- [ ] I am aware I must call out any breaking changes or data migrations in the PR description.
- [ ] I am aware I must not commit secrets, keys, or credentials.
- [ ] I am aware I must not use --no-verify or skip CI gates.
```

## 4. The model — all-required acknowledgements (v1.1) + one hard check

**Why v1.1:** v1 used per-PR action items (`required:`/`warn:`) with an `N/A` escape. PR #40 exposed the weakness — an agent left required boxes unticked-but-`N/A`'d and the gate passed (legitimately, for a docs PR, but the `N/A` escape is self-asserted and abusable). The fix: **reframe every item as a standing acknowledgement** ("I am aware I must … _if_ …") that is _always_ true to tick — so **`N/A` is removed entirely** and **every box must be `[x]`**. No checked, no merge. (User's model: "an agreement of terms & conditions.")

| Rule                                                | Behaviour                                                       |
| --------------------------------------------------- | --------------------------------------------------------------- |
| Every canonical item present                        | missing/reworded item → **fail** (anti-deletion)                |
| Every box ticked `[x]`                              | any blank `[ ]` → **fail** — there is **no `N/A`**              |
| Real Jira key (`NH`/`KAN`) in title ∪ body ∪ branch | absent → **fail** — the one check with real teeth, un-skippable |

**The teeth:** the **Jira-key grep** is the only check that verifies something concrete (a real key exists) — it guarantees every PR is tracked (the core S.1 pain). The acknowledgements are **honesty-based** (ticking ≠ proof the work was done); their value is forcing the agent to read + affirm each standing rule, with no silent skip. Promoting an acknowledgement to a _verified_ gate (e.g. "a Storybook story **exists** when `*.tsx` changed", diff-aware) is **v2 smart detection**.

**Robustness (carried from the 2026-06-15 hardening):** the gate reads canonical items from the PR template (deleting one fails) and strips comments / fences / checklist-lines from the key search (the template's example key doesn't count). Plus branch protection now **includes administrators**, so a red gate can't be clicked past.

## 5. Enforcement — `tooling/pr-checklist.mjs` + `pr-checklist` CI job

**Inputs** (from the `github` context via env vars): PR title, body, `head_ref` (branch), `user.type` (bot?).

**Logic** (hardened after ce-code-review, 2026-06-15):

1. **Bot bypass:** `user.type === 'Bot'` → pass.
2. **Strip noise:** remove HTML comments + ` ``` ` / `~~~` code fences from the body, so keys/checkboxes hidden in comments or quoted samples don't count (fixes a false-fail on quoted checklists + a commented-key false-pass).
3. **Jira key:** require `/(NH|KAN)-\d+/` in **title ∪ branch ∪ body-minus-checklist-lines**. Excluding checklist lines stops the template's own example key (`[NH-16] …`) from satisfying the check. Absent → **fail**.
4. **Canonical items:** read **every** checklist item (task line) from `.github/pull_request_template.md`. Each must appear in the body — a missing/reworded item **fails** (closes the delete-the-checklist bypass).
5. **All ticked:** each canonical item must be `[x]`. **There is no `N/A` (v1.1)** — a blank `[ ]` fails. Items are phrased as standing acknowledgements, so they're always tickable.
6. Exit non-zero with the list of missing/unticked items; else pass.

**CI wiring:**

- New `pr-checklist` job, `if: github.event_name == 'pull_request' && github.event.pull_request.user.type != 'Bot'`.
- **Not path-filtered** (must run on every PR).
- Triggers: reuses the existing `pull_request: [opened, edited, synchronize, reopened]` — `edited` re-runs the gate when a box is ticked. ✓ already in `ci.yml`.
- Added to the `ci-green` aggregator's `needs:` + pass/fail check (skipped = OK, so a bot PR that skips never deadlocks the required check).

## 6. Local pre-push reminder (lefthook)

Add a non-blocking `worktree-reminder` to `lefthook.yml` `pre-push`: echo `git worktree list` so the developer/agent sees other active worktrees before pushing (the overlap signal CI structurally can't provide). Skip on merge/rebase, consistent with the existing hooks.

## 7. Files touched

| File                                              | Change                                                                      |
| ------------------------------------------------- | --------------------------------------------------------------------------- |
| `.github/pull_request_template.md`                | acknowledgement checklist (v1.1, all-required, no N/A)                      |
| `tooling/pr-checklist.mjs`                        | **new** — the gate parser (template-anchored)                               |
| `tooling/pr-checklist.test.mjs`                   | node --test suite (12 cases; v1.1 all-ticked + anti-deletion + N/A-removed) |
| `package.json`                                    | `test:tooling` script (runs the suite; CI quality job calls it)             |
| `.github/workflows/ci.yml`                        | new `pr-checklist` job; add to `ci-green` `needs`                           |
| `lefthook.yml`                                    | pre-push `worktree-reminder`                                                |
| `.github/CODEOWNERS`                              | cover `tooling/pr-checklist.mjs`                                            |
| `docs/decisions/2026-06-09-tooling-stack-daci.md` | baby-steps = commits clarification                                          |
| `docs/decisions/decision-registry.md`             | Change-log entry + status flip                                              |
| `CONTRIBUTING.md`                                 | NH support + board URL                                                      |
| `AGENTS.md`                                       | "PR checklist" subsection (prefixes, N/A, bot-exempt)                       |
| `docs/specs/2026-06-15-pr-merge-checklist.md`     | this spec                                                                   |
| Jira NH-16                                        | Smart Checklist (v1 + v2 backlog)                                           |

## 8. Governance (required in-PR by AGENTS.md)

Per AGENTS.md "Decision governance," this PR changes what's enforced, so it must add a `decision-registry.md` Change-log entry + flip the relevant **L6** row(s) toward ✅ / 🤖 in the **same** PR. (This dogfoods check #2.)

## 9. Jira NH-16 Smart Checklist

Add a Smart Checklist to NH-16: v1 items (this work) + a "v2 smart (DangerJS)" section listing the deferred rules. If the Smart Checklist app field isn't writable via API, fall back to a markdown checklist in the description; leocaseiro promotes it.

## 10. Open points / caveats

- **Storybook/VR acknowledgements work even though the harness isn't built yet** (deferred per DACI L13). Because they're acknowledgements ("I am aware I must … _if_ UI changes"), they're always tickable — no harness dependency and no `N/A` needed. A _verified_ gate (a Storybook story / VR test must **exist** when `*.tsx` changed, diff-aware) is v2.
- **Robustness:** the delete-the-checklist bypass, the quoted-sample false-fail, and the template-example-key false-pass are **closed** (template-anchoring + noise-stripping), locked by `tooling/pr-checklist.test.mjs`. The `N/A` mechanism — and its self-asserted-skip abuse vector (PR #40) — was **removed entirely** in v1.1.
- **Honesty-based v1:** ticking a box is not proof the work was done — except the Jira-key presence check. Deep verification (real Jira-API lookup, "is the ticket done?", smart per-item detection) = v2.
- **CODEOWNERS self-approval:** enforcement-file changes hit the solo-dev self-approval block; use the documented direct-master-push exception when one must merge (per DACI F-3 caveat).

## 11. Test plan

- PR with **no Jira key** → `pr-checklist` fails; add a key → passes.
- PR with **any unticked box** → fails (lists them); tick all → passes.
- **`N/A` is no longer honored** — an unticked box with "N/A" appended still fails (regression-tested).
- **Dependabot** (bot) PR → job skipped; CI Green not blocked.
- Tick a box after opening (`edited` event) → job re-runs and re-evaluates.
- 12 `node --test` cases in `tooling/pr-checklist.test.mjs` (TDD: written red, then green).
