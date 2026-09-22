#!/usr/bin/env bash
# tooling/shellcheck-fix.sh — scope-checked shellcheck autofix for .sh files.
# For each target: produce shellcheck's unified diff, assert it touches ONLY that
# file, then `git apply --reject`. Guarded: no-op if shellcheck is missing or the
# diff is empty. `--reject` makes a malformed/partial patch fail loudly.
# Usage: tooling/shellcheck-fix.sh <file.sh> [<file.sh> ...]
set -euo pipefail

if ! command -v shellcheck >/dev/null 2>&1; then
  echo "shellcheck not installed — skipping autofix (CI is the hard gate)"
  exit 0
fi

status=0
for f in "$@"; do
  case "$f" in
  *.sh) ;;
  *) continue ;;
  esac
  [ -f "$f" ] || continue

  # Capture shellcheck diagnostics (stderr) separately from the diff (stdout): a real
  # processing failure (e.g. an unparseable file) prints to stderr and yields no diff —
  # warn so the skipped autofix is visible instead of silent. CI's lint:shell still gates.
  err_file="$(mktemp)"
  diff="$(shellcheck -f diff "$f" 2>"$err_file")" || true
  if [ -s "$err_file" ]; then
    echo "shellcheck-fix: shellcheck could not fully process $f — autofix skipped (CI lint:shell still gates):" >&2
    cat "$err_file" >&2
  fi
  rm -f "$err_file"
  [ -z "$diff" ] && continue

  # Assert every `+++ b/<path>` header in the patch equals the target file.
  targets="$(printf '%s\n' "$diff" | sed -n 's#^+++ b/##p' | sort -u)"
  if [ "$targets" != "$f" ]; then
    echo "shellcheck-fix: refusing out-of-scope patch for $f (touches: ${targets:-none})"
    status=1
    continue
  fi

  printf '%s\n' "$diff" | git apply --reject - || {
    echo "shellcheck-fix: git apply --reject failed for $f"
    status=1
  }
done
exit "$status"
