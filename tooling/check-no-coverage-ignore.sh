#!/usr/bin/env bash
#
# Coverage-ignore guard — bans istanbul/c8/v8 ignore directives in source.
# These comments let agents skip lines from coverage measurement, gaming the
# coverage ratchet. Only source files (*.ts, *.tsx) are checked.
#
# Locked DACI decision F3-noescape / L5-no-escape-hatches; see decision-registry.md.
# Runs in CI (quality job) and Lefthook pre-commit.
set -euo pipefail

violations="$(git ls-files -- '*.ts' '*.tsx' \
  | xargs grep -nE '/\*\s*(istanbul|c8|v8)\s+ignore' 2>/dev/null || true)"

if [ -n "$violations" ]; then
  echo "::error::Coverage-ignore directives are banned (no-escape-hatches policy)."
  echo "Remove /* istanbul ignore */, /* c8 ignore */, or /* v8 ignore */ comments."
  echo "See AGENTS.md + decision-registry.md F3-noescape / L5-no-escape-hatches."
  echo "Offending lines:"
  echo "$violations" | sed 's/^/  - /'
  exit 1
fi

echo "Coverage-ignore guard OK — no istanbul/c8/v8 ignore directives."
