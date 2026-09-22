#!/usr/bin/env bash
# scripts/resync-worktree.sh
#
# Align the CURRENT worktree with origin after a history rewrite
# (e.g., `git filter-repo` force-pushed new SHAs).
#
# Background: when filter-repo + force-push lands on origin, every
# local worktree pointing at the rewritten branches sees its working
# tree disagree with the new branch head. The fix is mechanical
# (fetch + reset --hard) but error-prone if done by hand across many
# worktrees, especially when one of them has in-flight uncommitted
# work.
#
# This script:
#   1. Refuses to run if the working tree has uncommitted changes
#      (commits, untracked files honoring .gitignore, dirty index).
#      Stash or commit first.
#   2. Fetches the upstream branch.
#   3. Hard-resets the current branch to its upstream tip.
#
# Usage:
#   cd /path/to/worktree
#   ./scripts/resync-worktree.sh
#
# Or via the matching ~/.claude/skills/ wrapper for an agent-driven
# version.

set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

branch=$(git branch --show-current 2>/dev/null || true)
if [ -z "$branch" ]; then
  echo "ERROR: not on a branch (detached HEAD?). Refusing to resync." >&2
  exit 2
fi

# Dirty-tree guard (modified, staged, or untracked-non-ignored).
dirty=$(git status --porcelain)
if [ -n "$dirty" ]; then
  echo "ERROR: working tree has uncommitted changes. Stash or commit first:" >&2
  # shellcheck disable=SC2001 # multi-line prefix: ${var//search/replace} cannot prepend to each line
  echo "$dirty" | sed 's/^/  /' >&2
  echo "" >&2
  echo "Then re-run this script." >&2
  exit 1
fi

# Find the upstream for the current branch.
upstream=$(git rev-parse --abbrev-ref --symbolic-full-name "@{upstream}" 2>/dev/null || true)
if [ -z "$upstream" ]; then
  echo "ERROR: '$branch' has no upstream configured." >&2
  echo "Set one with: git push -u origin $branch" >&2
  exit 3
fi

echo "Resyncing $branch ← $upstream"
echo ""

current=$(git rev-parse HEAD)
echo "  before: $current"

git fetch --quiet "$(echo "$upstream" | cut -d/ -f1)" "$(echo "$upstream" | cut -d/ -f2-)"
new=$(git rev-parse "$upstream")

if [ "$current" = "$new" ]; then
  echo "  already up to date ($new) — nothing to do."
  exit 0
fi

echo "  after:  $new"
echo ""
echo "Hard-resetting (your local commits NOT on origin will be discarded — make sure you have nothing to keep)..."
git reset --hard "$upstream"

echo ""
echo "Done. Worktree '$(basename "$(pwd)")' is now aligned with $upstream."
