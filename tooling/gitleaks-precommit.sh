#!/usr/bin/env bash
# gitleaks pre-commit — scan STAGED changes for secrets before they're committed.
#
# Local best-effort: if gitleaks isn't installed we warn and pass, because CI runs
# gitleaks authoritatively (decision-registry E-gitleaks; L8-6 "CI-side gates are
# authoritative", so a missing local binary never blocks a commit).
# Install for the fast local loop:  brew install gitleaks
#
# Requires gitleaks >= 8.19 (the `git --staged` verb). Verified against 8.30.
set -euo pipefail

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "gitleaks not installed — skipping local secret scan (CI enforces it)."
  echo "  Install for local protection:  brew install gitleaks"
  exit 0
fi

exec gitleaks git --staged --redact --no-banner
