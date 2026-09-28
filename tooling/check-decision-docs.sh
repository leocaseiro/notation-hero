#!/usr/bin/env bash
#
# Decision-docs guard — the registry is STATE, the changelog is HISTORY.
#
# `docs/decisions/decision-registry.md` holds current state per topic (what's decided, its
# status, what enforces it). Dated `### YYYY-MM-DD` change-log entries belong in
# `docs/decisions/decision-changelog.md`, newest first. The split is #143 (NH-25).
#
# Why this is a machine check and not just a line in AGENTS.md: the prose rule already existed
# and was followed wrongly. PR #163 wrote its entry into the registry, and because the registry
# still carried `merge=union` at the time, the merge concatenated the ENTIRE change log back in —
# 1,586 lines, no conflict, so nothing surfaced in review. It sat unnoticed across three more
# merges. NH-322 removed the merge driver; this guard removes the wrong-file write that fed it.
#
# Runs in CI (lint job — gated on docs_or_config, so it fires on docs-only PRs where the
# quality job is skipped) and in the Lefthook pre-commit + pre-push hooks.
set -euo pipefail

registry="${1:-docs/decisions/decision-registry.md}"

if [ ! -f "$registry" ]; then
  echo "::error::check-decision-docs: $registry not found."
  exit 2
fi

# A change-log entry is an h3 whose text starts with an ISO date. Other h3 sub-headings in the
# registry are fine — only dated entries are the log, and the log lives in the other file.
set +e
entries="$(grep -nE '^###[[:space:]]+[0-9]{4}-[0-9]{2}-[0-9]{2}' "$registry")"
rc=$?
set -e
if [ "$rc" -gt 1 ]; then
  echo "::error::check-decision-docs: grep failed (exit $rc) — investigate."
  exit 2
fi

if [ -n "$entries" ]; then
  count="$(printf '%s\n' "$entries" | wc -l | tr -d '[:space:]')"
  echo "::error::$registry holds $count dated change-log entr(y/ies) — it is the STATE view."
  echo "Move them to docs/decisions/decision-changelog.md, newest first, at the top."
  echo "See AGENTS.md \"Decision governance\". Offending headings:"
  # shellcheck disable=SC2001 # multi-line prefix: ${var//search/replace} cannot prepend per line
  echo "$entries" | sed 's/^/  - /'
  exit 1
fi

echo "Decision-docs guard OK — no dated change-log entries in the registry."
