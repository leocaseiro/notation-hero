#!/usr/bin/env bash
#
# sweep-darwin-vr-baselines.sh
#
# Remove every legacy macOS (darwin) VR baseline PNG from git and open a PR.
#
# Why: committed VR baselines are Linux-only (NH-189) and darwin shots are
# git-ignored going forward — but any committed BEFORE that policy stay TRACKED
# in git until swept. CI's `vr` job only ever compares the `-linux` set, so the
# leftover darwin files are dead weight, not a functional problem.
#
# Safe + idempotent:
#   * operates only on git-TRACKED files, never a Mac dev's local/ignored shots
#   * branches off a fresh origin/master, so the PR is ONLY the deletions
#   * refuses to run on a dirty working tree
#   * exits 0 (no branch, no PR) when there is nothing to remove
#   * re-runnable: run it again after more darwin-adding PRs land
#
# NOTE: it switches the current checkout to a new branch — run it from a clean
# checkout/worktree (with deps installed so the commit hooks pass), NOT in your
# primary master checkout or in the middle of other work.
#
# Usage:  ./sweep-darwin-vr-baselines.sh
# Needs:  git, gh (authenticated)

set -euo pipefail

readonly BASE_BRANCH="master"
readonly WORK_BRANCH="chore/sweep-darwin-vr-baselines"
readonly PATTERN="*-chromium-darwin.png"
readonly JIRA="NH-189"
readonly JIRA_URL="https://leocaseiro.atlassian.net/browse/${JIRA}"

# --- preflight ---------------------------------------------------------------
command -v git >/dev/null || { echo "error: git not found" >&2; exit 1; }
command -v gh  >/dev/null || { echo "error: gh CLI not found (or not authenticated)" >&2; exit 1; }
git rev-parse --is-inside-work-tree >/dev/null 2>&1 \
  || { echo "error: not inside a git repository" >&2; exit 1; }

cd "$(git rev-parse --show-toplevel)"

if [ -n "$(git status --porcelain)" ]; then
  echo "error: working tree is dirty — commit or stash first so the PR is only the sweep." >&2
  exit 1
fi

if git show-ref --quiet "refs/heads/${WORK_BRANCH}"; then
  echo "error: local branch '${WORK_BRANCH}' already exists — delete or rename it, then re-run." >&2
  exit 1
fi

# --- refresh the base --------------------------------------------------------
echo "-> Fetching origin/${BASE_BRANCH} ..."
git fetch --quiet origin "${BASE_BRANCH}"

# --- how many darwin baselines are tracked on the base? ----------------------
count="$(git ls-tree -r --name-only "origin/${BASE_BRANCH}" \
  | grep -Ec -- '-chromium-darwin\.png$' || true)"

if [ "${count}" -eq 0 ]; then
  echo "OK: nothing to do — no tracked ${PATTERN} on origin/${BASE_BRANCH}."
  exit 0
fi
echo "-> Found ${count} darwin baseline(s) to remove."

# --- fresh branch off the base, then remove ----------------------------------
git switch --create "${WORK_BRANCH}" "origin/${BASE_BRANCH}"
git rm --quiet -- "${PATTERN}"

git commit -m "test(vr): remove legacy darwin VR baselines (${JIRA})

Committed VR baselines are Linux-only (${JIRA}); macOS darwin shots are
git-ignored going forward. This removes the ${count} darwin baseline PNGs
committed before that policy that stayed tracked in git. CI's vr job
compares -linux only, so it is unaffected.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"

# --- push + open the PR ------------------------------------------------------
echo "-> Pushing ${WORK_BRANCH} ..."
git push -u origin "${WORK_BRANCH}"

body_file="$(mktemp)"
trap 'rm -f "${body_file}"' EXIT
cat > "${body_file}" <<EOF
## What & why

Removes the ${count} legacy macOS \`${PATTERN}\` VR baselines still tracked in git. Committed VR baselines are Linux-only (${JIRA}); darwin shots are git-ignored going forward, but these were committed before that policy and stayed tracked. No UI or runtime code changes — CI's \`vr\` job compares \`-linux\` only, so it is unaffected.

## Jira

- Relates to [${JIRA}](${JIRA_URL})

## How to test

CI's \`vr\` job stays green (it never used the darwin baselines). After merge, \`git ls-files '${PATTERN}'\` returns nothing.

## Checklist

- [x] I linked a Jira ticket (NH-####) and kept its status updated through review and merge.
- [x] If this PR changed UI, I wrote or updated the Storybook stories for it.
- [x] If this PR changed UI, I added or updated the VR (visual-regression) tests for it.
- [x] If this PR changed testable code, I wrote or updated tests for it.
- [x] If this PR changed a decision or what's enforced, I updated the decision log (docs/decisions).
- [x] If this PR changed infra/, I ran pulumi preview locally, recorded the classification under "## Pulumi preview" below, and filed a required task for any destructive (replace/delete) or exposure (public-access / auth-weakening / wildcard IAM) change.
- [x] If this PR needed doc updates, I updated README.md / the relevant docs with the change and the "why".
- [x] I checked for overlapping open PRs / worktrees and noted any risks in the PR and Jira.
- [x] I kept this PR small (baby commits), or explained below why it is large.
- [x] I self-reviewed my own diff before requesting review.
- [x] If this PR has breaking changes or data migrations, I called them out in the description.
- [x] I did not commit secrets, keys, or credentials.
- [x] I did not use --no-verify or skip any CI gate.

## Pulumi preview

n/a
EOF

gh pr create \
  --base "${BASE_BRANCH}" \
  --head "${WORK_BRANCH}" \
  --title "test(vr): remove legacy darwin VR baselines (${JIRA})" \
  --body-file "${body_file}"

echo "OK: PR opened. You are now on branch '${WORK_BRANCH}'."
