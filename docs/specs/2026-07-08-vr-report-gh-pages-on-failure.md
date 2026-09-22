# VR report on gh-pages + PR comment (on failure) — NH-273

Date: 2026-07-08
Status: Implemented (extends PR #122)
Ticket: NH-273

## Goal

When the `vr` (visual-regression) job **fails** on a PR, make the Playwright HTML report — the
image-diff **Slider** and the trace **timeline/filmstrip** — viewable **one-click from the PR**,
instead of only as a downloadable zip artifact.

GitHub's native image view modes (2-up / Swipe / Onion Skin / Difference) only compare **committed
baseline PNGs**, and only when they are modified in place — so they cannot show a red VR run where
the baselines were not updated. The hosted report fills exactly that gap (and is the only surface
that carries the trace **timeline**).

## Non-goals

- Not a merge gate — `vr-report` is absent from `ci-green`'s `needs:`, and it only acts after `vr`
  already failed (the PR is already red).
- No hosting on green runs (no diffs to review) — the report is published only on failure.
- Does not replace GitHub's native image modes for intentional baseline changes (still shown in
  Files changed) or the Storybook preview (live components per PR).

## Design

Two jobs, both `needs: vr`, both gated to `pull_request` on a **same-repo** head
(`github.event.pull_request.head.repo.full_name == github.repository`) — a fork's read-only token
cannot publish or comment, so forks skip cleanly instead of going red. Neither is in `ci-green`'s
`needs:`.

**`vr-report` (on `vr` failure)** — holds the write token (`contents: write`,
`pull-requests: write`); the `vr` job that runs PR/Storybook code stays read-only and only uploads
the `playwright-vr-report` artifact (added in #122). Shares the `gh-pages-deploy` concurrency group
so it never non-fast-forward-races the Storybook publish. Steps:

1. Download the `playwright-vr-report` artifact (`continue-on-error`), then gate the rest on
   `playwright-report/index.html` being present — a `vr` failure that crashes **before** Playwright
   writes a report produces no artifact, so the job no-ops cleanly instead of hard-failing.
2. Publish `playwright-report/` to `gh-pages` at **`vr-report/pr/<n>/`** via the pinned
   `peaceiris/actions-gh-pages`. Published **outside** `pr/<n>/` because Storybook owns that path
   with scoped deletion (`keep_files: false`) and would wipe a nested report on its next publish.
3. Post/update a sticky PR comment (marker `<!-- vr-report-preview -->`) with the URL
   `https://leocaseiro.github.io/notation-hero/vr-report/pr/<n>/`, the PR head short-SHA, and the
   time in **Sydney** time (AEST/AEDT via `Intl`). Refreshes on every commit (PR `synchronize`).

**`vr-report-resolve` (on `vr` success)** — a comment-only job (`pull-requests: write` only, **no**
gh-pages-deploy group, so a green run never contends for the publish slot). If a report comment
exists, it updates it to `✅ VR passing on <sha>`; it never creates one on a green PR.

### Cleanup (in `storybook-preview.yml`)

The existing PR-close cleanup job also removes `vr-report/pr/<n>` from gh-pages — extended to sweep
both the Storybook preview and the VR report in one commit, without early-exiting when only one
exists.

## Risks / caveats

- **Hosting PR-built HTML on github.io** — the same accepted risk as the Storybook preview (both
  host content built from PR code). The token is confined to the publish job.
- **Concurrency-group eviction** — a burst of cross-PR gh-pages writes can drop one queued run
  (re-converges on the next push); the same accepted trade-off documented for Storybook.
- **Missing-artifact edge** — a `vr` failure before Playwright writes a report produces no
  artifact; the `continue-on-error` download + `index.html` presence gate make `vr-report` no-op
  cleanly (no spurious red, no comment) rather than hard-fail.
- **Extra check on green PRs** — `vr-report-resolve` runs (comment-only, no gh-pages write) on
  green code PRs; neither report job is a required gate.
- **Stale folder on red→green** — when a failing PR is fixed, the comment flips to `✅ VR passing`
  (no link) but the last `vr-report/pr/<n>/` folder lingers on gh-pages until PR close, when the
  cleanup job removes it. Cosmetic (the folder is unlinked).

## Verification

- `actionlint` on both workflows; `cspell`; yaml lint.
- Live: a deliberate baseline break on the PR triggers a real `vr` failure → confirm the report
  publishes to gh-pages and the comment appears with the correct URL / SHA / Sydney time → revert.
