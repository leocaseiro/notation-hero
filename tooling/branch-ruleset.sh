#!/usr/bin/env bash
# tooling/branch-ruleset.sh — manage the master-merge-queue Repository Ruleset.
#
# WHY THIS EXISTS (separate from tooling/branch-protection.sh): GitHub's classic
# Branch Protection API (which branch-protection.sh uses) DOES NOT support the
# merge queue feature — `Require merge queue` only exists in the modern
# Repository Rulesets API. These two layers coexist cleanly:
#
#   - branch-protection.sh = WHAT'S REQUIRED to merge (CI Green, linear history)
#   - branch-ruleset.sh    = HOW MERGES HAPPEN (squash, batch, queue)
#
# The merge_queue rule means master only accepts PRs through GitHub's queue:
# queued PRs get a synthetic merge commit, CI re-runs on the combined head
# (via the merge_group: trigger in ci.yml), and master only updates on green.
# Closes the "two independently-green PRs combine into a broken master" gap
# that motivated NH-172 / registry L7-merge-queue.
#
# Usage:
#   tooling/branch-ruleset.sh           # DRY-RUN: print the payload + show what changes
#   tooling/branch-ruleset.sh --apply   # CREATE or UPDATE the ruleset
#
# Env overrides: REPO, RULESET (default name in branch-ruleset.json).
# Needs: gh authenticated with admin on the repo, jq available.
# Idempotent — finds an existing ruleset with the same name and PUTs to update
# it; otherwise POSTs to create. Re-running is safe.
set -euo pipefail

REPO="${REPO:-leocaseiro/notation-hero}"
PAYLOAD_FILE="$(dirname "$0")/branch-ruleset.json"
RULESET_NAME="${RULESET:-$(jq -r .name "$PAYLOAD_FILE")}"
APPLY=0
[[ "${1:-}" == "--apply" ]] && APPLY=1

if [[ ! -f "$PAYLOAD_FILE" ]]; then
  echo "ERROR: payload file not found at $PAYLOAD_FILE" >&2
  exit 1
fi

echo "Repo:           $REPO"
echo "Ruleset name:   $RULESET_NAME"
echo "Payload:        $PAYLOAD_FILE"
echo

# Resolve an existing ruleset id by name (if any).
EXISTING_ID="$(gh api "repos/$REPO/rulesets" --jq ".[] | select(.name == \"$RULESET_NAME\") | .id" 2>/dev/null || true)"

if [[ "$APPLY" -eq 0 ]]; then
  echo "DRY-RUN — no changes made."
  if [[ -n "$EXISTING_ID" ]]; then
    echo "Would PUT to repos/$REPO/rulesets/$EXISTING_ID (update existing)."
  else
    echo "Would POST to repos/$REPO/rulesets (create new)."
  fi
  echo
  echo "Payload that would be sent:"
  jq . "$PAYLOAD_FILE"
  echo
  echo "Re-run with --apply to commit. Then verify:"
  echo "  gh api repos/$REPO/rulesets --jq '.[] | {id, name, target, enforcement}'"
  exit 0
fi

if [[ -n "$EXISTING_ID" ]]; then
  echo "Updating existing ruleset (id=$EXISTING_ID) …"
  gh api -X PUT "repos/$REPO/rulesets/$EXISTING_ID" \
    -H "Accept: application/vnd.github+json" --input "$PAYLOAD_FILE" >/dev/null
else
  echo "Creating new ruleset …"
  gh api -X POST "repos/$REPO/rulesets" \
    -H "Accept: application/vnd.github+json" --input "$PAYLOAD_FILE" >/dev/null
fi

echo "Done. Verify with:"
echo "  gh api repos/$REPO/rulesets --jq '.[] | {id, name, target, enforcement}'"
