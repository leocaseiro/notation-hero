#!/usr/bin/env bash
# Test tooling/check-decision-docs.sh: passes on a state-only registry, FAILS on a dated entry.
# The failing case is the point — a guard nobody has seen reject a violation is not a guard.
set -euo pipefail

# Resolve the script-under-test relative to THIS file, BEFORE we cd into the tmp dir —
# don't rely on $OLDPWD/CWD (the test must pass regardless of where it's invoked from).
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
guard="$here/check-decision-docs.sh"
repo_root="$(cd "$here/.." && pwd)"

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

# Case 1: a state-only registry passes.
cat > "$tmp/clean.md" <<'MD'
# Decision Registry

## Change log — see `decision-changelog.md`

Entries live in the changelog.

## A · Foundation

| ID  | Decision | Status |
| --- | -------- | ------ |
| X-1 | Something | 🔒 |
MD
if bash "$guard" "$tmp/clean.md" >/dev/null; then
  echo "PASS: state-only registry accepted"
else
  echo "FAIL: guard rejected a clean state-only registry"
  exit 1
fi

# Case 2: a dated change-log entry is REJECTED (exit 1) and named in the output.
cat > "$tmp/dirty.md" <<'MD'
# Decision Registry

## Change log

### 2026-09-20 — something was decided (NH-291)

Body text.

## A · Foundation
MD
set +e
out="$(bash "$guard" "$tmp/dirty.md" 2>&1)"
rc=$?
set -e
if [ "$rc" -ne 1 ]; then
  echo "FAIL: expected exit 1 on a dated entry, got $rc"
  echo "$out"
  exit 1
fi
if ! printf '%s' "$out" | grep -q '2026-09-20'; then
  echo "FAIL: rejection did not name the offending heading"
  echo "$out"
  exit 1
fi
echo "PASS: dated change-log entry rejected (exit 1) and named"

# Case 3: a non-dated h3 sub-heading is allowed — only dated entries are the change log.
cat > "$tmp/subheading.md" <<'MD'
# Decision Registry

## A · Foundation

### Notes on enforcement

Prose.
MD
if bash "$guard" "$tmp/subheading.md" >/dev/null; then
  echo "PASS: non-dated h3 sub-heading allowed"
else
  echo "FAIL: guard rejected a non-dated h3 sub-heading"
  exit 1
fi

# Case 4: a missing file is an error (exit 2), not a silent pass.
set +e
bash "$guard" "$tmp/does-not-exist.md" >/dev/null 2>&1
rc=$?
set -e
if [ "$rc" -eq 2 ]; then
  echo "PASS: missing registry file exits 2"
else
  echo "FAIL: expected exit 2 for a missing file, got $rc"
  exit 1
fi

# Case 5: the real registry on this branch passes (the guard's actual job, default arg).
cd "$repo_root"
if bash "$guard" >/dev/null; then
  echo "PASS: the committed decision-registry.md passes"
else
  echo "FAIL: the committed decision-registry.md holds dated change-log entries"
  exit 1
fi
