#!/usr/bin/env bash
#
# Layout guard — enforces the locked folder-per-entity domain layout + co-located tests.
# This is the CI sidecar to the ESLint naming rules: ESLint's check-file plugin can enforce
# filename casing, but it CANNOT express "folder name == file basename" (folder-per-entity),
# so that structural rule lives here. Runs in CI (quality job) and the Lefthook pre-commit hook.
#
# Rules (decision-registry CONV-1/CONV-2 + naming decision A/B; this SUPERSEDES the prior
# side-by-side convention — see the 2026-06-12 registry change log):
#
#   1. No __tests__/, __mocks__/, or stories/ directories — group by domain, not file-type.
#
#   2. Folder-per-entity: every PascalCase *.ts/*.tsx file (an entity / value object / port /
#      service / error type) must live in a folder of the SAME name. So
#      shared/kernel/Brand/Brand.ts — NOT shared/kernel/Brand.ts. camelCase utility files
#      (ids.ts, publishGates.ts) are exempt; the PascalCase-vs-camelCase split is the
#      entity-vs-utility judgement (see AGENTS.md). A co-located Brand.test.ts is checked on
#      its stripped base ("Brand"), so it must sit in Brand/ too.
#
#   3. Co-located tests: every *.test.* / *.spec.* must sit next to the source it covers —
#      X.test.ts requires X.ts (or X.tsx) in the SAME folder. No orphan tests; no grouped
#      test directories.
#
# Pure git-tracked-file scan; no build needed. Bash 3.2 compatible (macOS default bash +
# Linux CI). BATS coverage is KAN-153.
set -euo pipefail

fail=0
err() { printf '::error::%s\n' "$1" >&2; fail=1; }

# base name with all extensions stripped: Foo.ts->Foo, Foo.test.ts->Foo, X.stories.tsx->X
strip_ext() {
  local f
  f="$(basename "$1")"
  f="${f%.*}"        # drop the final extension (.ts / .tsx)
  f="${f%.test}"     # drop a test/spec/stories/fake middle extension, if present
  f="${f%.spec}"
  f="${f%.stories}"
  f="${f%.fake}"
  printf '%s' "$f"
}

# ── Rule 1: banned test/story/mock directories ────────────────────────────────────────
banned="$(git ls-files | grep -E '(^|/)(__tests__|__mocks__|stories)/' || true)"
if [ -n "$banned" ]; then
  err "Forbidden folder layout — co-locate by domain; no __tests__/ · __mocks__/ · stories/ directories:"
  printf '%s\n' "$banned" | sed 's/^/    - /' >&2
fi

# ── Rules 2 & 3: per-file, over tracked TS sources (config/tooling/declarations excluded) ──
while IFS= read -r f; do
  [ -z "$f" ] && continue
  dir="$(dirname "$f")"
  parent="$(basename "$dir")"
  base="$(strip_ext "$f")"
  file="$(basename "$f")"

  # Rule 2 — PascalCase entity must be folder-per-entity
  case "$base" in
    [A-Z]*)
      if [ "$parent" != "$base" ]; then
        err "Folder-per-entity: '$f' — PascalCase entity '$base' must live in a folder named '$base/' (expected $dir/$base/$file). Move it into $base/, or rename it to camelCase if it is a utility."
      fi
      ;;
  esac

  # Rule 3 — co-located test must have its source sibling in the same folder
  case "$file" in
    *.test.ts | *.test.tsx | *.spec.ts | *.spec.tsx)
      if [ ! -f "$dir/$base.ts" ] && [ ! -f "$dir/$base.tsx" ]; then
        err "Orphan test: '$f' has no source sibling '$base.ts' in $dir/. Co-locate the test next to the code it covers."
      fi
      ;;
  esac
done < <(git ls-files '*.ts' '*.tsx' \
  | grep -vE '(^|/)(tooling|scripts)/' \
  | grep -vE '\.config\.(ts|tsx|mts|cts)$' \
  | grep -vE '\.d\.ts$' || true)

if [ "$fail" -ne 0 ]; then
  printf '\nLayout guard FAILED — see AGENTS.md "Test & story layout" + docs/decisions/decision-registry.md (CONV-1/CONV-2, folder-per-entity).\n' >&2
  exit 1
fi

echo "Layout guard OK — folder-per-entity + co-located tests; no __tests__/ · __mocks__/ · stories/."
