# Storybook PR previews on GitHub Pages — runbook

**Ticket:** NH-266 (shipped PR #113, 2026-07-05) · refined by NH-267 (PR #117, 2026-07-08).
**Extracted from:** `AGENTS.md` on 2026-07-15 during the docs-cleanup trim.

## What it does

`.github/workflows/storybook-preview.yml` publishes the built Storybook to the `gh-pages` branch:

- Each PR at `https://leocaseiro.github.io/notation-hero/pr/<n>/` (sticky-commented on the PR).
- Latest `master` at the site root.

## When it runs

- **Auto** on `client/**` changes.
- On demand via the **`preview`** label or **Run workflow** (`workflow_dispatch` → PR number).

## Not a merge gate

The workflow is **not** part of `ci-green`, so a skip / failure never deadlocks merge.

## Security posture

The build runs untrusted PR code **with no secrets** (only the separate publish job holds the write token) — the NH-206 no-AWS-creds-on-PRs posture is untouched.

## One-time setup

Enable Pages in the GitHub UI: **Settings → Pages → Deploy from a branch → `gh-pages` / root**.

## Full guide

[`client/README.md`](../../client/README.md) — deeper dive into the Storybook config, VR/a11y integration, and preview UX.
