#!/usr/bin/env bash
#
# Core-purity canary (ARCH-GUARD-1) — proves the dependency-cruiser hexagon fence actually
# REJECTS a forbidden core -> framework import, so the fence is verified, not assumed.
#
# The fence (.dependency-cruiser.cjs) is a fail-CLOSED ALLOW-LIST (ARCH-GUARD-1): the single
# `core-purity` rule permits core/ to import ONLY Node builtins + own-core + zod, and errors on
# everything else by default. An allow-list can't silently pass green on a new/unlisted framework
# import — but we still prove it actually fires: this canary plants an ephemeral `server/src/core`
# file with a deliberate `import '@nestjs/common'`, runs depcruise on it, and asserts depcruise
# exits non-zero AND names the `core-purity` rule. Then cleans up.
#
# Wired as a REQUIRED CI step in the `quality` job (so it gates merges via "CI Green"). Run
# locally with `pnpm run check:core-purity`. The canary file is ephemeral — never committed,
# so it never breaks the real `pnpm run depcheck`.
# NOTE: deliberately NOT `set -e`. depcruise is EXPECTED to exit non-zero (the
# fence firing), and `OUT=$(depcruise ...)` under `set -e` would abort the script
# before the RC check. Setup commands below are guarded explicitly instead.
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || true
[ -n "$ROOT" ] || { printf '::error::check-core-purity-canary.sh must run inside the git work tree\n' >&2; exit 1; }
cd "$ROOT" || exit 1

# Unique per-process filename so concurrent runs never delete each other's canary mid-cruise.
CANARY="server/src/core/__core_purity_canary_$$__.policy.ts"
# shellcheck disable=SC2317,SC2329 # cleanup IS invoked via trap EXIT; shellcheck can't detect trap invocations (SC2329 = shellcheck >=0.10 local; SC2317 = older apt shellcheck in CI)
cleanup() { rm -f "$CANARY"; }
trap cleanup EXIT

mkdir -p server/src/core || { printf '::error::check-core-purity-canary.sh: failed to create server/src/core (I/O error, NOT a fence problem)\n' >&2; exit 1; }
printf "import '@nestjs/common';\nexport const canary = true;\n" > "$CANARY" || { printf '::error::check-core-purity-canary.sh: failed to write the canary file (I/O error, NOT a fence problem)\n' >&2; exit 1; }

OUT="$(pnpm exec depcruise "$CANARY" --config .dependency-cruiser.cjs 2>&1)"
RC=$?

# Match the EXACT rule name — `core-purity` NOT followed by a hyphen, so a renamed rule
# (e.g. `core-purity-RENAMED`) can't keep the canary green by accident.
if [ "$RC" -ne 0 ] && printf '%s' "$OUT" | grep -qE 'core-purity([^-]|$)'; then
  echo "Core-purity canary OK — the fence rejects a deliberate core -> @nestjs/common import."
  exit 0
fi

printf '::error::Core-purity canary did NOT fire — the hexagon fence is not enforcing core purity (depcruise rc=%s, no core-purity violation).\n' "$RC" >&2
printf '%s\n' "$OUT" >&2
exit 1
