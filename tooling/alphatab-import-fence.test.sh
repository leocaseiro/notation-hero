#!/usr/bin/env bash
#
# AlphaTab import-fence test (v0a plan, Task 3) — proves both lint fences still REJECT a forbidden
# @coderline/alphatab import, so a later config change cannot switch them off unnoticed.
#
#   web/     type imports only: a VALUE import must fail @typescript-eslint/no-restricted-imports.
#   client/  nothing at all: even a TYPE import must fail no-restricted-imports (v0 spec §7).
#   both     a DYNAMIC `await import('@coderline/alphatab')` must fail no-restricted-syntax. Neither
#            no-restricted-imports rule can see one — they match import/export DECLARATIONS only, so
#            without the selector a dynamic import bundles a second AlphaTab with lint green.
#
# A one-time probe is not enough. In ESLint flat config a later block's options for a rule REPLACE
# an earlier block's, so a no-restricted-imports block added after Task 3's would drop the AlphaTab
# group while lint stays green. Runs under `pnpm run test:tooling` (every tooling/*.test.sh), a
# required step of the CI `quality` job. The probe files are ephemeral and never committed.
#
# NOTE: deliberately NOT `set -e` — eslint is EXPECTED to exit non-zero (the fence firing).
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || true
[ -n "$ROOT" ] || { printf '::error::alphatab-import-fence.test.sh must run inside the git work tree\n' >&2; exit 1; }
cd "$ROOT" || exit 1

# Unique per-process names, so concurrent runs never delete each other's probe mid-lint.
WEB_PROBE="app/__alphatab_fence_probe_$$__.ts"
CLIENT_PROBE="src/__alphatab_fence_probe_$$__.ts"
WEB_DYN_PROBE="app/__alphatab_fence_dyn_probe_$$__.ts"
CLIENT_DYN_PROBE="src/__alphatab_fence_dyn_probe_$$__.ts"
# shellcheck disable=SC2317,SC2329 # cleanup IS invoked via trap EXIT (SC2329 = shellcheck >=0.10; SC2317 = older CI shellcheck)
cleanup() { rm -f "web/$WEB_PROBE" "client/$CLIENT_PROBE" "web/$WEB_DYN_PROBE" "client/$CLIENT_DYN_PROBE"; }
trap cleanup EXIT

printf "import { LayoutMode } from '@coderline/alphatab';\n\nexport const probe = LayoutMode.Page;\n" > "web/$WEB_PROBE" \
  || { printf '::error::failed to write the web/ probe (I/O error, NOT a fence problem)\n' >&2; exit 1; }
printf "import type * as AlphaTab from '@coderline/alphatab';\n\nexport type Probe = AlphaTab.AlphaTabApi;\n" > "client/$CLIENT_PROBE" \
  || { printf '::error::failed to write the client/ probe (I/O error, NOT a fence problem)\n' >&2; exit 1; }
# The dynamic form, identical in both packages: invisible to no-restricted-imports, caught only by
# the ImportExpression selector. A literal specifier on purpose — that is what the selector matches.
for pkg_probe in "web/$WEB_DYN_PROBE" "client/$CLIENT_DYN_PROBE"; do
  printf "export async function probe() {\n  return await import('@coderline/alphatab');\n}\n" > "$pkg_probe" \
    || { printf '::error::failed to write %s (I/O error, NOT a fence problem)\n' "$pkg_probe" >&2; exit 1; }
done

# expect_rejected <package> <probe path inside the package> <ERE for the rule id>
expect_rejected() {
  local out rc
  out="$(pnpm --filter "@notation-hero/$1" exec eslint "$2" 2>&1)"
  rc=$?
  # A whole rule id, so an unrelated error (a parse failure, a missing module) cannot pass for the
  # fence, and neither can a renamed rule.
  if [ "$rc" -ne 0 ] && printf '%s' "$out" | grep -qE "(^|[[:space:]])$3([[:space:]]|$)"; then
    echo "ok — $1/ rejects the probe"
  else
    printf '::error::the %s/ AlphaTab import fence did not fire (eslint exit %s)\n%s\n' "$1" "$rc" "$out" >&2
    exit 1
  fi
}

# web/ needs the @typescript-eslint version: only it has allowTypeImports. client/ may use either.
expect_rejected web "$WEB_PROBE" '@typescript-eslint/no-restricted-imports'
expect_rejected client "$CLIENT_PROBE" '(@typescript-eslint/)?no-restricted-imports'
# The dynamic-import hole. Both packages, both on no-restricted-syntax — not the import rule.
expect_rejected web "$WEB_DYN_PROBE" 'no-restricted-syntax'
expect_rejected client "$CLIENT_DYN_PROBE" 'no-restricted-syntax'
echo "AlphaTab import fences OK — web/ rejects a value import, client/ rejects even a type import, both reject a dynamic import()."
