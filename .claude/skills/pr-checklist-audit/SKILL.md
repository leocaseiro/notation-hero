---
name: pr-checklist-audit
description: >-
  Audit a PR's merge checklist — verify each ticked box against the actual diff and
  flag likely false ticks (the NH-16 v2 verification layer; the CI gate only checks
  that boxes are ticked, not that the claims are true). Use when the user runs
  /pr-checklist-audit, or asks to "audit", "verify", or "check" a PR's checklist
  before merge.
---

# PR Checklist Audit

Thin wrapper that runs the `pr-checklist-auditor` subagent and presents its report.
All the verification logic lives in the persona — keep this skill minimal.

## Steps

1. **Resolve the target** from the argument:
   - a PR number (`56`) or URL → use it.
   - blank → the current branch's PR (or its local diff against `origin/master` if no PR exists yet).

2. **Dispatch the auditor.** Spawn the `pr-checklist-auditor` subagent (the Agent/Task
   tool with `subagent_type: pr-checklist-auditor`). Pass the target in the prompt, e.g.:

   > "Audit the merge checklist on PR #<n>. Verify each ticked box against the diff and
   > repo per your instructions; return the verdict table."

   The auditor is read-only and returns a markdown verdict table.

3. **Present the report verbatim** to the user — the verdict table + tally + verdict +
   to-fix lines.

4. **Offer follow-ups (do NOT do them unautoned):** if anything was ❌/⚠️, offer to
   draft a PR review comment from the findings, or to help fix the gap (e.g. add the
   missing `docs/decisions/` entry). Posting to GitHub or editing the PR is the user's
   call — never do it without an explicit ask.

## Notes

- This audits **truth**, not presence — `tooling/pr-checklist.mjs` already enforces
  "every box ticked + a real Jira key." Don't duplicate that; surface false ticks.
- Works on any PR, including ones still using the older "I am aware I must …" wording.
