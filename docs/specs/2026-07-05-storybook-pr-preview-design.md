# Storybook PR Preview — GitHub Pages per-PR + latest on master

**Status:** accepted (brainstormed + decided with leocaseiro 2026-07-05)
**Spec:** this doc · **Plan:** to follow in `docs/plans/` · **Jira:** optional (create NH-XXX to track if wanted)

---

## Goal

Open a pull request's Storybook **in the browser** to test the component library visually, with no local
setup — just a link on the PR. Also keep the **latest** Storybook (from `master`) live at a stable URL as a
public component-library showcase.

The client is a fully static Vite single-page app, so `storybook build` emits static assets that any static
host can serve. That makes GitHub Pages a natural, zero-cost fit for a **public** repo.

---

## Decision

Publish Storybook to **GitHub Pages** (the `gh-pages` branch) on this public repo:

- **Per-PR preview** at `/pr/<number>/` — e.g. `https://leocaseiro.github.io/notation-hero/pr/125/`
- **Latest `master`** at the site root `/` — `https://leocaseiro.github.io/notation-hero/`

Builds run **automatically** when client files change, plus **two manual triggers** (a label and a button).
Cost is **$0** (public repo → free Pages + free Actions minutes), needs **no external account**, and puts
**no secrets or AWS credentials on any PR** — so it leaves the NH-206 deploy hardening fully intact.

### Why GitHub Pages (alternatives considered)

| Option                     | Live URL from PR?     | Cost                 | External account? | Touches AWS security? |
| -------------------------- | --------------------- | -------------------- | ----------------- | --------------------- |
| **GitHub Pages** (chosen)  | yes — comment link    | $0                   | no                | no                    |
| Chromatic                  | yes — PR check        | $0 (5k snapshots/mo) | yes + token       | no                    |
| Cloudflare Pages / Netlify | yes — subdomain       | $0 (limits)          | yes               | no                    |
| Artifact-only zip          | no — download + serve | $0                   | no                | no                    |

Decisive trade-off: a live click-from-the-PR URL with **no external account** (Pages) versus adding one
software-as-a-service account to get it managed as a PR check (Chromatic). Pages wins for a solo, $0, public
repo. Chromatic's cloud visual regression would also **duplicate** the existing Playwright visual-regression
job, and the artifact-only option is not click-to-open. See the brainstorm trade-off in this doc's history.

---

## URL layout (on the `gh-pages` branch)

```text
gh-pages/
├── index.html      ← latest master Storybook (root)
├── ...             ← the rest of the master build
└── pr/
    ├── 123/        ← https://leocaseiro.github.io/notation-hero/pr/123/
    └── 125/        ← https://leocaseiro.github.io/notation-hero/pr/125/
```

The umbrella directory is `pr/` and each preview folder is the **PR number only** (no `pr-` prefix).

---

## Triggers

A new workflow `.github/workflows/storybook-preview.yml`, separate from `ci.yml` and `deploy.yml`:

1. **Auto (client changes)** — `pull_request` (`opened`, `synchronize`, `reopened`). An internal
   `dorny/paths-filter` job (the same pattern as `ci.yml`'s `changes` job) decides whether `client/**` was
   touched. This filter lives **inside** the workflow, not as a top-level `on: paths:`, so the manual
   triggers below can still fire on a PR that did **not** touch `client/**`.
2. **Manual — `preview` label** — `pull_request` (`labeled`). Adding the `preview` label to any PR builds a
   preview for it, even when `client/**` was not changed.
3. **Manual — button** — `workflow_dispatch` with a `pr_number` input. Runs from the Actions tab, checks out
   that PR's head, and publishes its `/pr/<number>/` preview. No new commit required.
4. **Latest on master** — `push` to `master` when `client/**` changed → build and publish to the site
   **root** `/`.
5. **Cleanup** — `pull_request` (`closed`) → remove that PR's `/pr/<number>/` folder.

The build job runs when: `client/** changed` **OR** `preview` label present **OR** `workflow_dispatch`.

Every push to a PR **rebuilds and republishes** to the same `/pr/<number>/` URL (the URL is stable; its
contents update to the latest commit).

---

## Isolation, concurrency, and cleanup (the "no overlap between PRs" guarantees)

Three layers make simultaneous PRs safe:

1. **Per-PR directory** — each PR writes only to `/pr/<number>/`, so two open PRs never share a path and can
   never overwrite each other.
2. **Preserve siblings + root** — every publish **keeps existing files** (`keep_files`-style), adding or
   updating only its own folder. No full-site force-push that could wipe a neighbouring preview or the root.
3. **Serialized publishes** — all writes to `gh-pages` (root, previews, and cleanups) share one repo-global
   concurrency group so concurrent publishes **queue** instead of racing the shared branch. Queued publishes
   are **not** cancelled, so none are lost.

Separately, **same-PR** rapid pushes are de-duplicated: a per-PR concurrency group cancels a superseded
in-progress **build** (commit A still building when commit B is pushed → A is cancelled, B builds). This
never skips the latest commit — it only avoids finishing a build for a commit already replaced.

On PR close, the PR's folder is deleted and the preview comment is updated, so previews do not pile up.

---

## Security

- Trigger is `pull_request` (**not** `pull_request_target`); the Storybook build uses **no secrets**.
- Publishing uses the built-in `GITHUB_TOKEN` with `contents: write` scoped to this workflow. For same-repo
  branches (the solo-dev case today) the token has write access, so publishing works.
- This introduces **no AWS credentials on any PR**, consistent with the NH-206 hardening in `deploy.yml`.
- Fork PRs receive a read-only `GITHUB_TOKEN` and cannot publish. That is acceptable for a solo repo; if fork
  previews are ever needed, split into a `pull_request` build (no secrets) + a `workflow_run` publish (the
  privileged step runs from the trusted default branch). Out of scope now.
- The workflow is **not** added to the `ci-green` required-checks list, so when it skips on a server/infra/docs
  PR there is no merge deadlock.

---

## Mechanism (finalize in the plan)

Two candidate implementations; the plan phase picks one after vetting:

- **`rossjrw/pr-preview-action`** — purpose-built for per-PR subdirectories, PR comments, and auto-cleanup.
  Must be **vetted** for (a) current maintenance (npm + GitHub activity — per the tool-vetting rule) and
  (b) whether it can produce the exact `/pr/<number>/` path. Its default inner folder is `pr-<number>`; if
  that is not configurable to the bare number, it does not meet the URL requirement.
- **Hand-rolled `peaceiris/actions-gh-pages`** — publish with `destination_dir: pr/<number>` (and root for
  master), plus a small PR-comment step and a cleanup step. This **guarantees** the exact `/pr/<number>/`
  path and full control, at the cost of a little more workflow YAML. This is the fallback if the action above
  is stale or cannot match the path.

Storybook v10 static builds use **relative** asset paths, so serving under a subpath generally works without
a base-path flag; the plan will confirm this on a real preview build.

---

## One-time manual setup (leocaseiro)

- Enable Pages: repo **Settings → Pages → Source = Deploy from a branch → `gh-pages` / root**. Cannot be
  toggled from the workflow; this is a one-time click.
- Optionally add a `preview` label to the repo's label set (or the workflow can create it on first use).

---

## Out of scope

- **Custom domain** (`notationhero.com`) for the Storybook — later; avoid paid DNS for now. The
  `github.io` URL is the target.
- **Playwright visual-regression and accessibility jobs** — unchanged; this does not replace them.
- **The AWS-hosted app** (`deploy.yml` → S3 + CloudFront) — unchanged. The Pages Storybook is a separate
  component-library showcase, not the single-page app.

---

## Open questions

- **Path scope** — `client/**` is confirmed as the auto-trigger. `shared/**` is **deferred**: if stories
  begin rendering code or types from `shared/`, add `shared/**` to the filter so a shared change rebuilds
  affected previews.
- **Jira** — no ticket yet. Create an NH issue to track if desired.
