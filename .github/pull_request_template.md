<!-- Keep the Jira key (NH-<n>, or legacy KAN-<n>) in the PR TITLE too, e.g.
     "[NH-16] Add the PR checklist gate". The key in the title/branch/commits is
     what populates the Jira Development panel. -->

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
     "N/A": these are standing acknowledgements (each stays true whether or not its
     condition applies), so tick them all. A real NH-#### (or legacy KAN-####) key must
     also appear in the PR title, body, or branch. Do NOT delete or reword items — the
     gate reads them from this template and fails if any is missing. -->

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
