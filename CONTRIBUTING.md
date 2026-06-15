# Contributing

## Linking work to Jira (projects NH and KAN)

Issues live in Jira. The active project is **NH** (Notation Hero); **KAN** is the
legacy project being migrated to NH — both keys are still recognized everywhere.

- NH board: <https://leocaseiro.atlassian.net/jira/software/c/projects/NH/boards/2>
- KAN board (legacy): <https://leocaseiro.atlassian.net/jira/software/projects/KAN/boards/1>

This repo is connected to Jira via the **GitHub for Jira** app. Two directions:

### Jira → GitHub (the Development panel) — automatic

The app auto-populates a Jira issue's **Development** panel (branches, commits,
pull requests) **when the issue key (`NH-<n>` or `KAN-<n>`) appears** in the branch
name, a commit message, or the PR title. This works on any GitHub plan.

- **Branch:** `NH-<n>-<short-slug>` — e.g. `NH-16-pr-checklist-gate`.
  (Or click **Create branch** on the Jira issue.)
- **PR title:** prefix the key — `[NH-16] Add the PR checklist gate`.
- **Commits:** include the key in the subject — `NH-16 add the gate parser`.
- **Smart commits** (optional) post back to Jira:
  `NH-16 #comment ready`, `NH-16 #time 2h`, `NH-16 #close`.

> The `pr-checklist` CI gate enforces that a real `NH-`/`KAN-` key appears in the
> PR title, body, or branch — a PR with no key fails the check.

### GitHub → Jira (clickable links on GitHub) — use full URLs

This repo is on the **GitHub Free plan**, where a bare `NH-16` does **not**
auto-link ([autolink references require GitHub Pro/Team/Enterprise][autolinks]).
So in PR/issue bodies, link Jira issues with a **full markdown link**:

```md
- Closes [NH-16](https://leocaseiro.atlassian.net/browse/NH-16)
```

The PR template includes this line ready to fill in.

> If the Development panel on a Jira issue is empty, it just means no branch,
> commit, or PR has referenced that key yet — not a broken connection.

[autolinks]: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/configuring-autolinks-to-reference-external-resources
