#!/usr/bin/env bash
#
# Layout guard — CI sidecar to the ESLint naming rules. ESLint's check-file plugin enforces
# filename CASING (kebab-case), but it CANNOT enforce that every domain file declares a role
# suffix: `ignoreMiddleExtensions:true` (needed so a co-located `*.entity.test.ts` passes the
# kebab rule) strips the `.entity` token before check-file ever sees it. So suffix-PRESENCE
# lives here. Runs in CI (quality job) and the Lefthook pre-commit hook.
#
# Rules (decision-registry NAME-suffix / CONV-2 + ADR 2026-06-12 D2/F-1; this SUPERSEDES the
# prior folder-per-entity convention — see the 2026-06-12 registry change log):
#
#   1. No __tests__/, __mocks__/, or stories/ directories — group by domain, not file-type.
#
#   2. Role suffix required: every *.ts/*.tsx under core/ adapters/ apps/ infra/ must end in an
#      approved role suffix (e.g. catalogue-item.entity.ts, logger.port.ts, neon.adapter.ts).
#      The suffix carries the role — this REPLACES the old PascalCase folder-per-entity rule.
#      ESLint check-file owns the casing (kebab); this rule owns the suffix VOCABULARY. The set
#      below is the global union (ADR D2); per-layer correctness is additionally guarded by Nx
#      tags + dependency-cruiser + eslint-plugin-boundaries. Exempt: index.ts (package/Nx entry),
#      *.config.ts, *.d.ts (both already excluded from the scan), and *.test.ts / *.spec.ts.
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

# Approved role suffixes (ADR 2026-06-12 D2 taxonomy). Extended-regex alternation for grep -E.
# Refine the per-layer split in AGENTS.md; this global union enforces "every file declares a role".
approved_suffix='entity|value-object|aggregate|event|specification|port|service|error|adapter|repository|mapper|client|handler|use-case|command|query|controller|dto|stack|infra|util'

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
  base="$(strip_ext "$f")"
  file="$(basename "$f")"

  # Rule 2 — role suffix required for domain/application source (core/adapters/apps/infra only)
  case "$f" in
    core/* | adapters/* | apps/* | infra/*)
      case "$file" in
        # exempt: package/Nx entry + test/spec markers (config/d.ts already excluded by the scan)
        index.ts | index.tsx | *.test.ts | *.test.tsx | *.spec.ts | *.spec.tsx) : ;;
        *)
          # strip .ts/.tsx, then the token after the last dot is the role suffix (none -> whole name)
          name="${file%.ts}"; name="${name%.tsx}"
          role="${name##*.}"
          if ! printf '%s' "$role" | grep -qE "^(${approved_suffix})$"; then
            err "Missing role suffix: '$f' — files under core/adapters/apps/infra must end in an approved role suffix (e.g. .entity.ts, .port.ts, .adapter.ts; full set in AGENTS.md naming). Exempt: index.ts, *.config.ts, *.d.ts, *.test.ts/*.spec.ts."
          fi
          ;;
      esac
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
  printf '\nLayout guard FAILED — see AGENTS.md "Naming & layout" + docs/decisions/decision-registry.md (NAME-suffix, CONV-2).\n' >&2
  exit 1
fi

echo "Layout guard OK — role suffixes + co-located tests; no __tests__/ · __mocks__/ · stories/."
