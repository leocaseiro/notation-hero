# Contributing

## Linking work to Jira (project KAN)

Issues live in Jira:
<https://leocaseiro.atlassian.net/jira/software/projects/KAN/boards/1>

This repo is connected to Jira via the **GitHub for Jira** app. Two directions:

### Jira → GitHub (the Development panel) — automatic

The app auto-populates a Jira issue's **Development** panel (branches, commits,
pull requests) **when the issue key `KAN-<n>` appears** in the branch name, a
commit message, or the PR title. This works on any GitHub plan.

- **Branch:** `KAN-<n>-<short-slug>` — e.g. `KAN-118-aws-creds-bootstrap`.
  (Or click **Create branch** on the Jira issue.)
- **PR title:** prefix the key — `[KAN-118] Bootstrap AWS creds`.
- **Commits:** include the key in the subject — `KAN-118 add OIDC trust policy`.
- **Smart commits** (optional) post back to Jira:
  `KAN-118 #comment ready`, `KAN-118 #time 2h`, `KAN-118 #close`.

### GitHub → Jira (clickable links on GitHub) — use full URLs

This repo is on the **GitHub Free plan**, where a bare `KAN-123` does **not**
auto-link ([autolink references require GitHub Pro/Team/Enterprise][autolinks]).
So in PR/issue bodies, link Jira issues with a **full markdown link**:

```md
- Closes [KAN-118](https://leocaseiro.atlassian.net/browse/KAN-118)
```

The PR template includes this line ready to fill in.

> If the Development panel on a Jira issue is empty, it just means no branch,
> commit, or PR has referenced that `KAN-<n>` key yet — not a broken connection.

[autolinks]: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/configuring-autolinks-to-reference-external-resources
