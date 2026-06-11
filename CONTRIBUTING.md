# Contributing

## Linking work to Jira (project KAN)

Issues live in Jira:
<https://leocaseiro.atlassian.net/jira/software/projects/KAN/boards/1>

This repo is connected to Jira via the **GitHub for Jira** app. It auto-populates a
Jira issue's **Development** panel (branches, commits, pull requests) — but **only
when the issue key `KAN-<n>` appears** in the branch name, a commit message, or the
PR title/body.

### Conventions

- **Branch:** `KAN-<n>-<short-slug>` — e.g. `KAN-118-aws-creds-bootstrap`.
  (Or click **Create branch** on the Jira issue, which names it for you.)
- **PR title:** prefix the key — `[KAN-118] Bootstrap AWS creds`.
- **Commits:** include the key in the subject — `KAN-118 add OIDC trust policy`.

### Smart commits (optional)

Commit-message commands post straight back to the Jira issue:

- `KAN-118 #comment ready for review` — adds a comment
- `KAN-118 #time 2h scaffolding` — logs work
- `KAN-118 #close` / `#done` — transitions the issue (when the transition is enabled)

### "Development panel is empty" is not a bug

If an issue's Development panel shows nothing, it just means no branch, commit, or
PR has referenced that `KAN-<n>` key yet — not that the integration is broken. The
panel fills in within ~a minute of the first keyed git object reaching GitHub.
