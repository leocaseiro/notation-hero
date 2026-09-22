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

## Git hooks in worktrees

Hooks are managed by [lefthook] and live in the **shared** `.git/hooks` directory,
so every worktree uses the same installed hooks automatically.

Heads-up: `git worktree add` can copy a stray `core.hooksPath` (pointing at the
main repo's `.git/hooks`) into a new worktree's `config.worktree`. Older lefthook
versions then refuse to run (`core.hooksPath is set locally … not supported`),
which can block the first commit.

The `prepare` script handles this for you — `pnpm install` runs
`lefthook install --reset-hooks-path`, which normalizes the hooks path. So the
normal first step in a fresh worktree just works:

```sh
git worktree add ../my-worktree my-branch
cd ../my-worktree
pnpm install          # runs prepare → lefthook install --reset-hooks-path
```

If you ever still see a `core.hooksPath` error, run the binary **directly**
(not `pnpm exec`, which re-triggers the failing `prepare` and loops):

```sh
./node_modules/.bin/lefthook install --reset-hooks-path
```

[lefthook]: https://lefthook.dev/
