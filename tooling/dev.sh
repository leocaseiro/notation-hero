#!/usr/bin/env bash
# Local dev runner: one tmux session, a pane per app (server | web).
#
# Why tmux and not `pnpm -r --parallel`: the server and web logs stay in separate scrollable panes,
# and either app can be restarted without killing the other — which matters when stepping breakpoints
# across the three runtimes (browser, Next.js server, NestJS server).
#
#   pnpm dev                    # both apps, normal mode
#   pnpm dev:debug              # both apps with Node inspectors (server 9229, web 9230)
#   SERVER_PORT=3010 pnpm dev   # move the API off 3001 when something else already holds it
#
# The web pane inherits API_BASE_URL from SERVER_PORT, so the two panes always agree on the port.
# Next.js resolves process.env before .env.local (see next/dist/docs .. environment-variables.md
# "Environment Variable Load Order"), so this wins over a stale API_BASE_URL in web/.env.local.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Deliberately NOT "notation-hero": that is a likely name for a hand-made working session, and
# attaching to it would silently start no apps at all.
SESSION="${TMUX_SESSION:-nh-dev}"
SERVER_PORT="${SERVER_PORT:-3001}"
# The web port lives in web/package.json ("next dev --port 3002"); this is only for the hint below.
WEB_PORT=3002

debug=0
for arg in "$@"; do
  case "$arg" in
    --debug) debug=1 ;;
    *)
      echo "usage: $0 [--debug]" >&2
      exit 2
      ;;
  esac
done

if ! command -v tmux >/dev/null 2>&1; then
  echo "tmux is not installed. Install it (brew install tmux), or run the apps separately:" >&2
  echo "  pnpm dev:server   # or pnpm debug:server" >&2
  echo "  pnpm dev:web      # or pnpm debug:web" >&2
  exit 1
fi

if [ "$debug" -eq 1 ]; then
  server_cmd="pnpm run debug:server"
  web_cmd="pnpm run debug:web"
else
  server_cmd="pnpm run dev:server"
  web_cmd="pnpm run dev:web"
fi

# Each pane re-exports the ports so a pane restarted by hand keeps the same wiring.
server_pane="PORT=$SERVER_PORT $server_cmd"
web_pane="API_BASE_URL=http://localhost:$SERVER_PORT $web_cmd"

# By this point the panes are running, so a failed attach must NOT exit non-zero -- that reads as
# "nothing started" while both servers are in fact up, and `set -e` would abort on it. Do not try to
# PREDICT whether attach works: a `[ -t 0 ]` probe and tmux disagree in practice (a captured-output
# shell can still look like a TTY), and `exec` would hand our exit status to the failed attach. Just
# try it and treat any failure as benign. The two known refusals are an existing tmux session
# ("sessions should be nested with care") and no TTY ("open terminal failed: not a terminal").
attach_or_explain() {
  if [ -n "${TMUX:-}" ]; then
    echo "Already inside tmux -- switch to the apps with: tmux switch-client -t $SESSION"
    return 0
  fi
  if tmux attach-session -t "=$SESSION"; then
    return 0
  fi
  echo "Could not attach to a terminal -- the apps ARE running detached in '$SESSION'."
  echo "  attach:  tmux attach -t $SESSION"
  echo "  logs:    tmux capture-pane -p -t $SESSION:apps.0    # server"
  echo "           tmux capture-pane -p -t $SESSION:apps.1    # web"
  echo "  stop:    tmux kill-session -t $SESSION"
  return 0
}

# "=$SESSION" forces an exact match; a bare name lets tmux prefix-match a different session.
if tmux has-session -t "=$SESSION" 2>/dev/null; then
  echo "The '$SESSION' session is already running (kill it with: tmux kill-session -t $SESSION)."
  echo "server -> http://localhost:$SERVER_PORT/api/catalog"
  echo "web    -> http://localhost:$WEB_PORT/catalog"
  attach_or_explain
  exit 0
fi

# Capture real pane IDs (%0, %1, ...) rather than assuming index 0: tmux's pane-base-index is a user
# setting, and a config with `pane-base-index 1` makes "apps.0" a "can't find pane" error -- which,
# under `set -e`, would abort here with both servers already started.
server_pane_id=$(tmux new-session -d -P -F '#{pane_id}' -s "$SESSION" -n apps -c "$ROOT" "$server_pane")
tmux split-window -h -t "$server_pane_id" -c "$ROOT" "$web_pane"
# Keep a crashed pane on screen instead of closing it, so a boot error stays readable.
tmux set-option -t "$SESSION" remain-on-exit on
tmux select-pane -t "$server_pane_id"

echo "server -> http://localhost:$SERVER_PORT/api/catalog"
echo "web    -> http://localhost:$WEB_PORT/catalog"
if [ "$debug" -eq 1 ]; then
  echo "inspectors -> server 9229, web 9230 (open chrome://inspect)"
fi

attach_or_explain
