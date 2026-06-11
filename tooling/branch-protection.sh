#!/usr/bin/env bash
# tooling/branch-protection.sh — configure branch protection on master.
#
# Requires a PR before merge + the SINGLE "CI Green" status check (the always-running
# aggregation job in .github/workflows/ci.yml).
#
#   Footgun #1 (skipped-required-check deadlock): require ONLY the always-running
#   "CI Green" job, never a path-filtered per-job check — a skipped required check is
#   never reported and the PR can never merge.
#
#   Footgun #2 (solo-approval trap): require a PR but ZERO approvals. GitHub forbids
#   approving your own PR, so requiring "1 approval" on a solo repo self-blocks forever.
#   The "CI Green" check + the review skills (ce-code-review, /review) are the gate.
#
# Admins are NOT enforced (enforce_admins:false) so the solo maintainer keeps an
# emergency direct-push escape hatch (registry F3-solocaveat).
#
# Usage:
#   tooling/branch-protection.sh           # DRY-RUN: print the payload, change nothing
#   tooling/branch-protection.sh --apply   # ENABLE — run AFTER "CI Green" has run at
#                                          # least once (GitHub only accepts a required
#                                          # check context it has already observed)
#
# Env overrides: REPO, BRANCH, CHECK. Needs: gh authenticated with admin on the repo.
# Idempotent — the PUT fully replaces the protection config, so re-running is safe.
set -euo pipefail

REPO="${REPO:-leocaseiro/notation-hero}"
BRANCH="${BRANCH:-master}"
CHECK="${CHECK:-CI Green}"
APPLY=0
[[ "${1:-}" == "--apply" ]] && APPLY=1

read -r -d '' PAYLOAD <<JSON || true
{
  "required_status_checks": { "strict": false, "contexts": ["${CHECK}"] },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 0,
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false
  },
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": false,
  "restrictions": null
}
JSON

echo "Repo:           $REPO"
echo "Branch:         $BRANCH"
echo "Required check: \"$CHECK\"  (require PR · 0 approvals · linear history · no force-push)"
echo

if [[ "$APPLY" -eq 0 ]]; then
  echo "DRY-RUN — no changes made. --apply would PUT this to branches/$BRANCH/protection:"
  echo "$PAYLOAD"
  echo
  echo "Pre-flight before --apply: confirm \"$CHECK\" has run at least once (e.g. on a"
  echo "merged PR), else GitHub rejects the unseen context. Then: tooling/branch-protection.sh --apply"
  exit 0
fi

# Warn (don't fail) if GitHub hasn't yet observed the check on the branch tip.
if ! gh api "repos/$REPO/commits/$BRANCH/check-runs" --jq '.check_runs[].name' 2>/dev/null | grep -qx "$CHECK"; then
  echo "WARNING: \"$CHECK\" not seen on $BRANCH's latest commit yet. If the PUT fails on" >&2
  echo "         'contexts', merge one PR so CI Green runs on $BRANCH, then retry." >&2
fi

echo "Applying branch protection to $REPO@$BRANCH …"
printf '%s' "$PAYLOAD" | gh api -X PUT "repos/$REPO/branches/$BRANCH/protection" \
  -H "Accept: application/vnd.github+json" --input -
echo
echo "Done. Verify with:"
echo "  gh api repos/$REPO/branches/$BRANCH/protection --jq '{checks: .required_status_checks.contexts, pr: .required_pull_request_reviews.required_approving_review_count}'"
