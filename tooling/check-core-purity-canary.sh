#!/usr/bin/env bash
#
# Core-purity canary (ARCH-GUARD-1) — proves the dependency-cruiser hexagon fence actually
# REJECTS a forbidden core -> framework import, so the fence is verified, not assumed.
#
# The `core-purity` rule in .dependency-cruiser.cjs is fail-CLOSED (an allow-list). A deny-list
# can silently match zero edges and pass green; this canary guards against that: it plants an
# ephemeral `server/src/core` file with a deliberate `import '@nestjs/common'`, runs depcruise on
# it, and asserts depcruise exits non-zero AND names the `core-purity` rule. Then it cleans up.
#
# Wired as a REQUIRED CI step in the `quality` job (so it gates merges via "CI Green"). Run
# locally with `pnpm run check:core-purity`. The canary file is ephemeral — never committed,
# so it never breaks the real `pnpm run depcheck`.
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || true
[ -n "$ROOT" ] || { printf '::error::check-core-purity-canary.sh must run inside the git work tree\n' >&2; exit 1; }
cd "$ROOT"

CANARY="server/src/core/__core_purity_canary__.policy.ts"
cleanup() { rm -f "$CANARY"; }
trap cleanup EXIT

mkdir -p server/src/core
printf "import '@nestjs/common';\nexport const canary = true;\n" > "$CANARY"

OUT="$(pnpm exec depcruise "$CANARY" --config .dependency-cruiser.cjs 2>&1)"
RC=$?

if [ "$RC" -ne 0 ] && printf '%s' "$OUT" | grep -q 'core-purity'; then
  echo "Core-purity canary OK — the fence rejects a deliberate core -> @nestjs/common import."
  exit 0
fi

printf '::error::Core-purity canary did NOT fire — the hexagon fence is not enforcing core purity (depcruise rc=%s, no core-purity violation).\n' "$RC" >&2
printf '%s\n' "$OUT" >&2
exit 1
