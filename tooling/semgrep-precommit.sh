#!/usr/bin/env bash
# semgrep pre-commit — fast SAST on STAGED source files. Best-effort: if semgrep
# isn't installed we warn and pass, because CI runs semgrep authoritatively
# (decision-registry E-semgrep; L8-6 "CI-side gates are authoritative", so a missing
# local binary never blocks a commit). Install for the local loop:  pipx install semgrep
#
# Portable to macOS bash 3.2 (no mapfile): NUL-delimited xargs.
set -euo pipefail

if ! command -v semgrep >/dev/null 2>&1; then
  echo "semgrep not installed — skipping local SAST (CI enforces it)."
  echo "  Install for local protection:  pipx install semgrep"
  exit 0
fi

# Only scan staged source files — keeps the hook fast.
files="$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx|mjs|cjs)$' || true)"
if [ -z "$files" ]; then
  echo "semgrep: no staged source files to scan."
  exit 0
fi
printf '%s\n' "$files" | tr '\n' '\0' | xargs -0 semgrep scan --config auto --error --quiet
