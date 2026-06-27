#!/usr/bin/env bash
#
# Coverage-ignore guard — bans istanbul/c8/v8 ignore directives in source.
# These comments let agents skip lines from coverage measurement, gaming the
# coverage ratchet. Only source files (*.ts, *.tsx) are checked.
#
# Locked DACI decision F3-noescape / L5-no-escape-hatches; see decision-registry.md.
# Runs in CI (quality job) and Lefthook pre-commit.
set -euo pipefail

# `git grep` over the index avoids xargs whitespace-splitting bugs and treats
# no-match as exit 1 (vs grep's exit 2 on error), so we can fail-closed cleanly.
# Regex covers BOTH `// istanbul ignore next` (line) and `/* istanbul ignore */`
# (block) forms — Istanbul/c8/v8 all accept either.
set +e
violations="$(git grep -nE '(//|/\*)[[:space:]]*(istanbul|c8|v8)[[:space:]]+ignore' -- '*.ts' '*.tsx')"
rc=$?
set -e
if [ "$rc" -gt 1 ]; then
  echo "::error::check-no-coverage-ignore: git grep failed (exit $rc) — investigate."
  exit 2
fi

if [ -n "$violations" ]; then
  echo "::error::Coverage-ignore directives are banned (no-escape-hatches policy)."
  echo "Remove // istanbul ignore, /* c8 ignore */, /* v8 ignore */ etc. comments."
  echo "See AGENTS.md + decision-registry.md F3-noescape / L5-no-escape-hatches."
  echo "Offending lines:"
  # shellcheck disable=SC2001 # multi-line prefix: ${var//search/replace} cannot prepend to each line
  echo "$violations" | sed 's/^/  - /'
  exit 1
fi

echo "Coverage-ignore guard OK — no istanbul/c8/v8 ignore directives."
