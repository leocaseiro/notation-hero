<!-- Keep the Jira key (NH-<n>, or legacy KAN-<n>) in the PR TITLE too. The title must be
     a valid Conventional Commit — commitlint runs in the `pr-title` gate — so put the key
     in PARENTHESES at the end, e.g. "feat: add the PR checklist gate (NH-16)". Do NOT use a
     "[NH-16] …" prefix: commitlint rejects it (type-empty / subject-empty). The key in the
     title/branch/commits is what populates the Jira Development panel. -->

## What & why

<!-- Brief description of the change and the reason for it. -->

## Jira

<!-- This repo is on the GitHub Free plan, so a bare "NH-16" does NOT auto-link
     (autolinks need GitHub Pro/Team/Enterprise). Paste the FULL Jira URL so the
     reference is clickable here on GitHub. Both NH- and KAN- keys are accepted. -->

- Closes [NH-16](https://leocaseiro.atlassian.net/browse/NH-16)
<!-- - Relates to [NH-17](https://leocaseiro.atlassian.net/browse/NH-17) -->

## How to test

<!-- Steps for a reviewer to verify the change. -->

## Checklist

<!-- The `pr-checklist` CI gate fails unless EVERY box below is ticked [x]. There is no
     "N/A": each item is a past-tense statement of what you DID, and the conditional ones
     ("If this PR changed X, I did Y") stay true even when the condition doesn't apply — so
     every box is always tickable. Tick only what is TRUE: a tick whose condition applied
     but whose action you skipped is a false claim (review + the NH-16 v2 gate check this).
     Cite specifics (file path / link) where it helps the reviewer. A real NH-#### (or
     legacy KAN-####) key must also appear in the PR title, body, or branch. Do NOT delete
     or reword items — the gate reads them from this template and fails if any is missing. -->

- [ ] I linked a Jira ticket (NH-####) and kept its status updated through review and merge.
- [ ] If this PR changed UI, I wrote or updated the Storybook stories for it.
- [ ] If this PR changed UI, I added or updated the VR (visual-regression) tests for it.
- [ ] If this PR changed testable code, I wrote or updated tests for it.
- [ ] If this PR changed a decision or what's enforced, I updated the decision log (docs/decisions).
- [ ] If this PR changed infra/, I ran pulumi preview locally, recorded the classification under "## Pulumi preview" below, and filed a required task for any destructive (replace/delete) or exposure (public-access / auth-weakening / wildcard IAM) change.
- [ ] If this PR needed doc updates, I updated README.md / the relevant docs with the change and the "why".
- [ ] I checked for overlapping open PRs / worktrees and noted any risks in the PR and Jira.
- [ ] I kept this PR small (baby commits), or explained below why it is large.
- [ ] I self-reviewed my own diff before requesting review.
- [ ] If this PR has breaking changes or data migrations, I called them out in the description.
- [ ] I did not commit secrets, keys, or credentials.
- [ ] I did not use --no-verify or skip any CI gate.

## Pulumi preview

<!-- If this PR changed infra/, paste the LOCAL `pulumi preview` CLASSIFICATION here — one of:
       safe        — only creates / benign updates; no destructive or exposure change
       destructive — a replace/delete of an existing resource (filed a required task: <link>)
       exposure    — public access / auth weakening / wildcard-or-admin IAM (filed a task: <link>)
     Classification ONLY — never paste resource IDs, ARNs, or URLs (this PR is public). The
     pr-checklist gate fails on an infra/ PR if this section is empty. If infra/ was untouched,
     write "n/a". -->
