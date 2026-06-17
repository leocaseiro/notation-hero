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
#   2. Role suffix required: every *.ts/*.tsx/*.mts/*.cts under core/ adapters/ apps/ infra/ ends
#      in an approved role suffix (e.g. catalogue-item.entity.ts, logger.port.ts, neon.adapter.ts).
#      The suffix carries the role — this REPLACES the old PascalCase folder-per-entity rule.
#      ESLint check-file owns the casing (kebab); this rule owns the suffix VOCABULARY. The set
#      below is the global union (ADR D2); per-layer correctness is additionally guarded by Nx
#      tags + dependency-cruiser + eslint-plugin-boundaries. Exempt: index.{ts,tsx,mts,cts} (package/Nx entry),
#      *.config.ts, *.d.ts (both already excluded from the scan), and co-located
#      *.test.* / *.spec.* / *.stories.* / *.fake.* (in any of .ts/.tsx/.mts/.cts).
#
#   3. Co-located tests: every *.test.* / *.spec.* must sit next to the source it covers —
#      X.test.ts requires X.ts (or X.tsx) in the SAME folder. No orphan tests; no grouped
#      test directories.
#
# Pure git-tracked-file scan; no build needed. Bash 3.2 compatible (macOS default bash +
# Linux CI). BATS coverage is NH-40.
set -euo pipefail

# Run from the repo root so `git ls-files` yields repo-relative paths (the core/|adapters/|apps/|
# infra/ case-matching below assumes top-level paths). Fail CLOSED if we're not inside a git work
# tree — a silent exit 0 here would make this gate fail open (PR #25 review #13).
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || true
[ -n "$ROOT" ] || { printf '::error::check-layout.sh must run inside the git work tree\n' >&2; exit 1; }
cd "$ROOT"

# Fail CLOSED on a runtime `git ls-files` failure (corrupt/locked index, perms). The preflight
# above only covers "not a git work tree"; the scans below feed `while`/pipelines whose exit
# status bash does not propagate (process substitution, `|| true`), so a silent git failure would
# scan zero files and PASS — fail-open (PR #25 review #6). Probe it once up front.
git ls-files >/dev/null 2>&1 || { printf '::error::check-layout.sh: git ls-files failed (index unreadable?)\n' >&2; exit 1; }

fail=0
err() { printf '::error::%s\n' "$1" >&2; fail=1; }

# Approved role suffixes (ADR 2026-06-12 D2 taxonomy). Extended-regex alternation for grep -E.
# Refine the per-layer split in AGENTS.md; this global union enforces "every file declares a role".
approved_suffix='entity|value-object|aggregate|event|specification|port|service|error|adapter|repository|mapper|client|handler|use-case|command|query|controller|dto|stack|infra|util|module|guard|pipe|interceptor|filter|middleware|strategy|resolver|schema|policy'

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
# NUL-delimited scan: `git ls-files -z` emits paths RAW (never octal-quoted with a leading `"`,
# which `core.quotePath=false` does NOT prevent in a C/POSIX locale — i.e. CI). A quoted path
# silently slips the dir/role match below — a fail-open gate bypass (PR #25 review #4). `case`
# (not `grep -z`, which macOS BSD grep lacks) keeps it portable.
banned=""
while IFS= read -r -d '' p; do
  case "$p" in
    __tests__/* | */__tests__/* | __mocks__/* | */__mocks__/* | stories/* | */stories/*)
      banned="${banned}    - ${p}"$'\n' ;;
  esac
done < <(git ls-files -z)
if [ -n "$banned" ]; then
  err "Forbidden folder layout — co-locate by domain; no __tests__/ · __mocks__/ · stories/ directories:"
  printf '%s' "$banned" >&2
fi

# ── Rules 2 & 3: per-file, over tracked TS sources (config/tooling/declarations excluded) ──
while IFS= read -r -d '' f; do
  [ -z "$f" ] && continue
  # config/tooling/declaration files are out of scope. These were `grep -vE` filters on the feed
  # before the switch to NUL-delimited `ls-files -z`; doing them in-loop with `case` stays portable
  # (no `grep -z`) while preserving the raw, non-ASCII-safe paths (PR #25 review #4).
  case "$f" in
    tooling/* | */tooling/* | scripts/* | */scripts/*) continue ;;
    *.config.ts | *.config.tsx | *.config.mts | *.config.cts) continue ;;
    *.d.ts | *.d.mts | *.d.cts) continue ;;
  esac
  dir="$(dirname "$f")"
  base="$(strip_ext "$f")"
  file="$(basename "$f")"

  # Rule 2 — role suffix required for domain/application source (core/adapters/apps/infra only)
  case "$f" in
    server/src/*)
      case "$file" in
        # exempt: package/Nx entry + co-located test/spec/stories/fake markers (config/d.ts already
        # excluded by the scan). Patterns end in `.*` so .ts/.tsx/.mts/.cts variants all match — and
        # so legit *.stories.*/*.fake.* files aren't rejected for "missing a role suffix" (PR #25
        # review #2; strip_ext() already treats .stories/.fake as middle extensions).
        index.ts | index.tsx | index.mts | index.cts | main.ts | main.tsx | *.test.* | *.spec.* | *.stories.* | *.fake.*) : ;;
        *)
          # strip the TS extension (.ts/.tsx/.mts/.cts), then the token after the last dot is the
          # role suffix (none -> whole name)
          name="${file%.ts}"; name="${name%.tsx}"; name="${name%.mts}"; name="${name%.cts}"
          role="${name##*.}"
          if ! printf '%s' "$role" | grep -qE "^(${approved_suffix})$"; then
            err "Missing role suffix: '$f' — files under core/adapters/apps/infra must end in an approved role suffix (e.g. .entity.ts, .port.ts, .adapter.ts; full set = the approved_suffix list at the top of this script, mirrored in docs/decisions/decision-registry.md NAME-suffix). Exempt: index.{ts,tsx,mts,cts}, *.config.*, *.d.*, *.test.*/*.spec.*, *.stories.*/*.fake.*."
          fi
          ;;
      esac
      ;;
  esac

  # Rule 3 — co-located test must have its source sibling in the same folder
  case "$file" in
    *.test.* | *.spec.*)
      # sibling must be a TRACKED source (git-state, matching the git ls-files scan) — an untracked
      # working-tree file must not mask an orphan test (PR #25 review #12)
      if [ -z "$(git ls-files -- "$dir/$base.ts" "$dir/$base.tsx" "$dir/$base.mts" "$dir/$base.cts")" ]; then
        err "Orphan test: '$f' has no tracked source sibling '$base.{ts,tsx,mts,cts}' in $dir/. Co-locate the test next to the code it covers."
      fi
      ;;
  esac
done < <(git ls-files -z '*.ts' '*.tsx' '*.mts' '*.cts')

if [ "$fail" -ne 0 ]; then
  printf '\nLayout guard FAILED — approved role suffixes are the approved_suffix list at the top of this script; see docs/decisions/decision-registry.md (NAME-suffix, CONV-2).\n' >&2
  exit 1
fi

echo "Layout guard OK — role suffixes + co-located tests; no __tests__/ · __mocks__/ · stories/."
