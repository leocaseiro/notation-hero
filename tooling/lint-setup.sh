#!/usr/bin/env bash
# tooling/lint-setup.sh — document/install the non-npm lint binaries.
# These are HARD-gated in CI; locally they're optional (hooks skip when missing).
set -euo pipefail

echo "Notation Hero — local lint binaries (optional; CI is the hard gate):"
echo
echo "  shellcheck   — shell script linter"
echo "  yamllint     — YAML linter (Python)"
echo "  actionlint   — GitHub Actions workflow linter"
echo
echo "macOS (Homebrew):"
echo "  brew install shellcheck yamllint actionlint"
echo
echo "Linux (apt + pip):"
echo "  sudo apt-get install -y shellcheck"
echo "  pip install --user yamllint==1.38.0"
echo "  # actionlint: download the pinned release binary, or \`go install\`"
echo
echo "editorconfig-checker is installed via pnpm (npm wrapper) — no extra step."
