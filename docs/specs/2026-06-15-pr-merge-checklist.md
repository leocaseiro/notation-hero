# NotationHero — Agent PR Merge Checklist (v1) — Design

> **Status:** 🟡 DESIGN (brainstorm-approved 2026-06-15) — pending spec review, then implementation plan
> **Ticket:** [NH-16](https://leocaseiro.atlassian.net/browse/NH-16) (moved from KAN-125) — "[Track 2] Advanced PR policy — DangerJS, VR-required-on-UI, Storybook-on-new-components"
> **Decision source:** DACI **L6** (PR automation) — [`docs/decisions/2026-06-09-tooling-stack-daci.md`](../decisions/2026-06-09-tooling-stack-daci.md)
> **Engine decisions (this session):** custom CI step (NOT DangerJS for v1) · Jira-key = required gate · keep local worktree reminder · Storybook/VR = required · "no-blank-boxes" rule
> **Owner:** leocaseiro

---

## 1. Problem & goal

**Problem (live pain):** agents open/merge PRs **without a Jira ticket** and **skip process steps** (decision-log updates, overlap checks) — work goes untracked.

**Goal:** a lightweight, **agent-readable checklist on every PR** + a **CI gate** that makes the required steps unskippable, while staying simple (no smart DangerJS rules yet). Must support **both `NH-` and `KAN-`** Jira keys during the migration.

**Non-goal (v1):** verifying the *work* behind a checkbox (e.g., that the ticket was actually updated). v1 is honesty-based + presence checks; deep verification is the **v2 "smart" backlog**.

## 2. Scope

**In (v1):**
- PR-body checklist (native GitHub task list) via the PR template.
- Custom CI gate (`tooling/pr-checklist.mjs` + a `pr-checklist` job): required/warn parsing + **no-blank-boxes** rule + Jira-key presence grep; bot-exempt; wired into **CI Green**.
- Local `lefthook` pre-push worktree reminder.
- Governance: DACI clarification, decision-registry entry, NH support in CONTRIBUTING + PR template, AGENTS.md note, CODEOWNERS.
- Jira NH-16 Smart Checklist (tracking).

**Out (→ v2 "smart" backlog on NH-16):** DangerJS; auto-create Jira ticket if missing; "is the ticket actually done?" check; smart diff-based UI/overlap detection; green-fake catch; first-use triggers; floor-downgrade / enforcement-isolation / probe-inversion rules.

## 3. The checklist (PR template)

```md
## Checklist
<!-- Every `required:`/`warn:` item must be ticked [x] OR have "N/A" on its line.
     Skip with "N/A — reason". No box may be left blank.
     EDITORS: never put the literal "N/A" in an item's label — it is the reserved marker. -->
- [ ] required: Links a Jira ticket — full URL to NH-#### (or KAN-####) in the body
- [ ] warn: Key in the PR title too, e.g. `[NH-16] …` (squash-merge uses the title)
- [ ] warn: Decision log updated (docs/decisions change-log)
- [ ] warn: Checked overlapping open PRs / worktrees; risks noted in the PR + Jira
- [ ] required: Storybook story / VR added or updated if this PR changes UI
- [ ] warn: If large (>~400 LOC) → explained why (baby commits within, not a hard cap)
```

## 4. Severity model — the "no-blank-boxes" rule + one hard check

Directly solves "agents ignore warnings": **the gate fails on ANY unaddressed box**, plus one un-skippable hard check for the Jira key.

| Prefix | Gate rule | `N/A` allowed? | Meaning |
|---|---|---|---|
| `required:` | `[x]` or `N/A` — never blank | ✅ write `N/A — reason` on the line when it genuinely doesn't apply | "Do this." |
| `warn:` | `[x]` or `N/A` — never blank | ✅ (conscious, visible skip) | "Address or consciously skip." |

**The teeth:** the **Jira-key grep** — a real `NH-`/`KAN-` key must appear in the PR **title, body, or branch** — is the one check that **cannot be N/A'd**. That is what guarantees every PR is tracked (the core pain). Every prefixed checkbox *additionally* follows the no-blank rule, so nothing is silently skipped: an agent must tick each box or write a visible `N/A`.

**Reserved marker:** the skip token is the literal `N/A` on an item's line, so PR-template item **labels must never contain `N/A`** (else the gate would read a blank box as already skipped — caught in testing 2026-06-15). A more robust marker / smart per-item detection is a v2 item.

v1 is honesty-based for the checkboxes (ticking ≠ proof). Promoting a `required:` item to a real, un-N/A-able gate (e.g. "a Storybook story exists when `*.tsx` changed") is **v2 smart detection** — the prefixes are intent labels until then.

## 5. Enforcement — `tooling/pr-checklist.mjs` + `pr-checklist` CI job

**Inputs** (from the `github` context via env vars): PR title, body, `head_ref` (branch), `user.type` (bot?).

**Logic:**
1. **Bot bypass:** `user.type === 'Bot'` → pass (dependabot etc. skip the whole gate).
2. **Jira key:** require `/(NH|KAN)-\d+/` in **title ∪ body ∪ branch**. Absent → **fail**.
3. **Checklist parse** — for each `- [ ]`/`- [x]` line prefixed `required:`/`warn:` (others ignored):
   - not `[x]` **and** not containing `N/A` → **fail** (collected). The no-blank rule is uniform across `required:`/`warn:`; the Jira grep (step 2) is the only un-N/A-able check.
4. Exit non-zero with a clear list of what's missing; otherwise pass and print the acknowledged warns.

**CI wiring:**
- New `pr-checklist` job, `if: github.event_name == 'pull_request' && github.event.pull_request.user.type != 'Bot'`.
- **Not path-filtered** (must run on every PR).
- Triggers: reuses the existing `pull_request: [opened, edited, synchronize, reopened]` — `edited` re-runs the gate when a box is ticked. ✓ already in `ci.yml`.
- Added to the `ci-green` aggregator's `needs:` + pass/fail check (skipped = OK, so a bot PR that skips never deadlocks the required check).

## 6. Local pre-push reminder (lefthook)

Add a non-blocking `worktree-reminder` to `lefthook.yml` `pre-push`: echo `git worktree list` so the developer/agent sees other active worktrees before pushing (the overlap signal CI structurally can't provide). Skip on merge/rebase, consistent with the existing hooks.

## 7. Files touched

| File | Change |
|---|---|
| `.github/pull_request_template.md` | new prefixed checklist; NH + KAN |
| `tooling/pr-checklist.mjs` | **new** — the gate parser |
| `.github/workflows/ci.yml` | new `pr-checklist` job; add to `ci-green` `needs` |
| `lefthook.yml` | pre-push `worktree-reminder` |
| `.github/CODEOWNERS` | cover `tooling/pr-checklist.mjs` |
| `docs/decisions/2026-06-09-tooling-stack-daci.md` | baby-steps = commits clarification |
| `docs/decisions/decision-registry.md` | Change-log entry + status flip |
| `CONTRIBUTING.md` | NH support + board URL |
| `AGENTS.md` | "PR checklist" subsection (prefixes, N/A, bot-exempt) |
| `docs/specs/2026-06-15-pr-merge-checklist.md` | this spec |
| Jira NH-16 | Smart Checklist (v1 + v2 backlog) |

## 8. Governance (required in-PR by AGENTS.md)

Per AGENTS.md "Decision governance," this PR changes what's enforced, so it must add a `decision-registry.md` Change-log entry + flip the relevant **L6** row(s) toward ✅ / 🤖 in the **same** PR. (This dogfoods check #2.)

## 9. Jira NH-16 Smart Checklist

Add a Smart Checklist to NH-16: v1 items (this work) + a "v2 smart (DangerJS)" section listing the deferred rules. If the Smart Checklist app field isn't writable via API, fall back to a markdown checklist in the description; leocaseiro promotes it.

## 10. Open points / caveats

- **Storybook/VR = required, but the harness isn't built yet** (deferred per DACI L13). v1 scopes it to `required: if UI changed` (self-attest + `N/A` escape). Until the Storybook/VR harness lands, a UI PR may mark `N/A (harness pending — <ticket>)`; once it lands, `N/A` is no longer acceptable for UI PRs. Smart `*.tsx`-diff detection = v2.
- **Honesty-based v1:** ticking a box is not proof the work was done — except the Jira-key grep, which is a real presence check. Deep verification = v2.
- **CODEOWNERS self-approval:** enforcement-file changes hit the solo-dev self-approval block; use the documented direct-master-push exception when one must merge (per DACI F-3 caveat).

## 11. Test plan

- PR with **no Jira key** → `pr-checklist` fails; add a key → passes.
- PR with an **unticked `required:`** box → fails; tick → passes.
- PR with a **blank `warn:`** box → fails; tick **or** `N/A` → passes.
- **Dependabot** (bot) PR → job skipped; CI Green not blocked.
- Tick a box after opening (`edited` event) → job re-runs and re-evaluates.
