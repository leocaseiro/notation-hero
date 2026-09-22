#!/bin/bash
# SessionStart hook — make the Compound Engineering and Superpowers plugins
# available in every Claude Code on the web session.
#
# They provide the ce-* workflow skills (ce-plan, ce-work, ce-code-review,
# ce-compound, lfg, ...) and the superpowers skills library (brainstorming,
# writing-plans, test-driven-development, systematic-debugging, ...).
#
# Why a hook: remote/web sessions boot from a fresh container with an ephemeral
# ~/.claude, so plugins installed interactively do not survive to the next
# session. This reinstalls them (idempotently) on each session start. Local
# sessions keep their own persistent plugin config, so this no-ops there.
set -euo pipefail

# Web/remote only. Local sessions manage their own plugins.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Install chatter is kept out of the session context (SessionStart stdout is
# injected as context); the log is surfaced only when an install fails.
log="$(mktemp)"
trap 'rm -f "$log"' EXIT

# ensure_plugin <marketplace-source> <plugin@marketplace> <plugin-list-match>
# Idempotent: skips entirely when the plugin is already enabled (warm/cached
# container), else adds the marketplace and installs the plugin.
ensure_plugin() {
  local marketplace="$1" plugin="$2" match="$3"

  if claude plugin list 2>/dev/null | grep -q "$match"; then
    return 0
  fi

  if ! { claude plugin marketplace add "$marketplace" \
    && claude plugin install "$plugin"; } >>"$log" 2>&1; then
    echo "session-start: failed to install '$plugin' from '$marketplace'" >&2
    cat "$log" >&2
    return 1
  fi
}

ensure_plugin EveryInc/compound-engineering-plugin \
  compound-engineering compound-engineering@compound-engineering-plugin
ensure_plugin obra/superpowers-marketplace \
  superpowers@superpowers-marketplace superpowers@superpowers-marketplace
