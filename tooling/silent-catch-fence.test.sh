#!/usr/bin/env bash
#
# Silent-catch fence test — proves web/'s lint rule still REJECTS a catch that reports nothing, so a
# later config change cannot switch it off unnoticed.
#
#   catch { … }            a catch clause that calls neither reportError nor noteError
#   .catch(() => null)     a .catch() callback that calls neither
#   reportError(…)         the BROWSER's global reportError, reached through a forgotten import
#
# The first two must fail no-restricted-syntax, the third no-restricted-globals. In ESLint flat
# config a later block's options for a rule REPLACE an earlier block's, so a no-restricted-syntax
# block added after web/'s would drop both selectors while lint stays green. Runs under
# `pnpm run test:tooling` (every tooling/*.test.sh), a required step of the CI `quality` job. The
# probe files are ephemeral and never committed.
#
# NOTE: deliberately NOT `set -e` — eslint is EXPECTED to exit non-zero (the fence firing).
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || true
[ -n "$ROOT" ] || { printf '::error::silent-catch-fence.test.sh must run inside the git work tree\n' >&2; exit 1; }
cd "$ROOT" || exit 1

# Unique per-process names, so concurrent runs never delete each other's probe mid-lint.
CATCH_PROBE="app/__silent_catch_probe_$$__.ts"
PROMISE_PROBE="app/__silent_promise_catch_probe_$$__.ts"
GLOBAL_PROBE="app/__global_report_error_probe_$$__.ts"
# shellcheck disable=SC2317,SC2329 # cleanup IS invoked via trap EXIT (SC2329 = shellcheck >=0.10; SC2317 = older CI shellcheck)
cleanup() { rm -f "web/$CATCH_PROBE" "web/$PROMISE_PROBE" "web/$GLOBAL_PROBE"; }
trap cleanup EXIT

printf "export function probe(raw: string): unknown {\n  try {\n    return JSON.parse(raw);\n  } catch {\n    return null;\n  }\n}\n" > "web/$CATCH_PROBE" \
  || { printf '::error::failed to write the catch probe (I/O error, NOT a fence problem)\n' >&2; exit 1; }
printf "export async function probe(load: () => Promise<number>): Promise<number | null> {\n  return load().catch(() => null);\n}\n" > "web/$PROMISE_PROBE" \
  || { printf '::error::failed to write the .catch() probe (I/O error, NOT a fence problem)\n' >&2; exit 1; }
printf "export function probe(): void {\n  reportError(new Error('probe'));\n}\n" > "web/$GLOBAL_PROBE" \
  || { printf '::error::failed to write the global reportError probe (I/O error, NOT a fence problem)\n' >&2; exit 1; }

# expect_rejected <probe path inside web/> <ERE for the rule id>
expect_rejected() {
  local out rc
  out="$(pnpm --filter @notation-hero/web exec eslint "$1" 2>&1)"
  rc=$?
  # A whole rule id, so an unrelated error (a parse failure, a missing module) cannot pass for the
  # fence, and neither can a renamed rule.
  if [ "$rc" -ne 0 ] && printf '%s' "$out" | grep -qE "(^|[[:space:]])$2([[:space:]]|$)"; then
    echo "ok — web/ rejects $1"
  else
    printf '::error::the web/ silent-catch fence did not fire on %s (eslint exit %s)\n%s\n' "$1" "$rc" "$out" >&2
    exit 1
  fi
}

expect_rejected "$CATCH_PROBE" 'no-restricted-syntax'
expect_rejected "$PROMISE_PROBE" 'no-restricted-syntax'
expect_rejected "$GLOBAL_PROBE" 'no-restricted-globals'
echo "Silent-catch fence OK — web/ rejects a silent catch, a silent .catch() and the global reportError."
