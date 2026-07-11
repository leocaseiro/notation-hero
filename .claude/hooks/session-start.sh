#!/bin/bash
# SessionStart hook — make the Compound Engineering plugin available in every
# Claude Code on the web session.
#
# It provides the ce-* workflow skills (ce-plan, ce-work, ce-code-review,
# ce-compound, lfg, …) from EveryInc/compound-engineering-plugin.
#
# Why a hook: remote/web sessions boot from a fresh container with an ephemeral
# ~/.claude, so a plugin installed interactively does not survive to the next
# session. This reinstalls it (idempotently) on each session start. Local
# sessions keep their own persistent plugin config, so this no-ops there.
set -euo pipefail

# Web/remote only. Local sessions manage their own plugins.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Fast path: on a warm/cached container (resume, compact, or a rebooted remote
# session) the plugin is already enabled — nothing to do.
if claude plugin list 2>/dev/null | grep -q 'compound-engineering@compound-engineering-plugin'; then
  exit 0
fi

# Cold path: add the marketplace and install the plugin. Both commands are
# idempotent. Keep their progress chatter out of the session context (SessionStart
# stdout is injected as context); surface output only on failure.
log="$(mktemp)"
if claude plugin marketplace add EveryInc/compound-engineering-plugin >"$log" 2>&1 \
  && claude plugin install compound-engineering >>"$log" 2>&1; then
  rm -f "$log"
  exit 0
else
  echo "session-start: compound-engineering plugin bootstrap failed" >&2
  cat "$log" >&2
  rm -f "$log"
  exit 1
fi
