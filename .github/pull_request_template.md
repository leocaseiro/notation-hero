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

<!-- The `pr-checklist` CI gate fails on any BLANK box: every `required:`/`warn:` item
     must be ticked [x] OR have "N/A" written on its line. `required:` = do it;
     `warn:` = address, or consciously skip by writing "N/A — reason" on the line.
     A real NH-/KAN- key must also appear in the title, body, or branch.
     EDITORS: never put the literal "N/A" inside an item's label — it is the reserved
     skip marker the gate looks for. -->

- [ ] required: Links a Jira ticket — full URL to NH-#### (or KAN-####) in the body
- [ ] warn: Key in the PR title too, e.g. `[NH-16] …` (squash-merge uses the title)
- [ ] warn: Decision log updated (docs/decisions change-log)
- [ ] warn: Checked overlapping open PRs / worktrees; risks noted in the PR + Jira
- [ ] required: Storybook story / VR added or updated if this PR changes UI
- [ ] warn: If large (>~400 LOC) → explained why (baby commits within, not a hard cap)
- [ ] CI Green
