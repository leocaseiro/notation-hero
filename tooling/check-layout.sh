#!/usr/bin/env bash
#
# Layout guard — enforces the locked co-located test/story convention.
# Tests and stories live NEXT TO their source (Foo.ts + Foo.test.ts), never in
# __tests__/, __mocks__/, or stories/ folders. Group by domain, not by file-type.
#
# Locked DACI convention (2026-06-09); see AGENTS.md "Test & story layout" and
# docs/decisions/decision-registry.md. Runs in CI (quality job) and — once PR #2
# lands — in the Lefthook pre-commit hook.
set -euo pipefail

violations="$(git ls-files | grep -E '(^|/)(__tests__|__mocks__|stories)/' || true)"

if [ -n "$violations" ]; then
  echo "::error::Forbidden test/story folder layout. Co-locate tests next to source"
  echo "(Foo.ts + Foo.test.ts) — no __tests__/, __mocks__/, or stories/ directories."
  echo "See AGENTS.md 'Test & story layout' + docs/decisions/decision-registry.md."
  echo "Offending paths:"
  echo "$violations" | sed 's/^/  - /'
  exit 1
fi

echo "Layout guard OK — no __tests__/, __mocks__/, or stories/ folders."
