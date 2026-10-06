#!/usr/bin/env bash
set -euo pipefail

: "${ETHEREUM_SOURCE_RPC_URL:?ETHEREUM_SOURCE_RPC_URL is required}"

ANVIL_CHAIN_ID="${ANVIL_CHAIN_ID:-1}"
ANVIL_PORT="${ANVIL_PORT:-8545}"
ANVIL_ACCOUNTS="${ANVIL_ACCOUNTS:-20}"
ANVIL_STATE_PATH="${ANVIL_STATE_PATH:-/data/state.json}"
ANVIL_NODE_ID="${ANVIL_NODE_ID:-ethereum}"
STARTUP_LOG="/tmp/curveyield-anvil-startup.log"

mkdir -p "$(dirname "$ANVIL_STATE_PATH")"

args=(
  --host 0.0.0.0
  --port "$ANVIL_PORT"
  --chain-id "$ANVIL_CHAIN_ID"
  --accounts "$ANVIL_ACCOUNTS"
  --fork-url "$ETHEREUM_SOURCE_RPC_URL"
  --state "$ANVIL_STATE_PATH"
  --preserve-historical-states
  --auto-impersonate
  --no-rate-limit
  --silent
)

child_pid=""

forward_signal() {
  local signal="$1"
  if [ -n "$child_pid" ] && kill -0 "$child_pid" 2>/dev/null; then
    kill "-$signal" "$child_pid" 2>/dev/null || true
    wait "$child_pid" || true
  fi
}

trap 'forward_signal TERM; exit 0' TERM
trap 'forward_signal INT; exit 130' INT

may_quarantine=1

while true; do
  : >"$STARTUP_LOG"
  anvil "${args[@]}" > >(tee -a "$STARTUP_LOG") 2>&1 &
  child_pid=$!

  ready=0
  exited=0
  status=0

  for _ in $(seq 1 100); do
    if ! kill -0 "$child_pid" 2>/dev/null; then
      if wait "$child_pid"; then status=0; else status=$?; fi
      exited=1
      break
    fi

    if cast chain-id --rpc-url "http://127.0.0.1:$ANVIL_PORT" >/dev/null 2>&1; then
      ready=1
      break
    fi

    sleep 0.1
  done

  if [ "$ready" -eq 1 ]; then
    if wait "$child_pid"; then
      exit 0
    else
      exit $?
    fi
  fi

  if [ "$exited" -eq 0 ]; then
    echo "[$ANVIL_NODE_ID] Anvil is still loading persisted state; leaving the process running."
    if wait "$child_pid"; then
      exit 0
    else
      exit $?
    fi
  fi

  if [ "$status" -eq 2 ] \
    && [ "$may_quarantine" -eq 1 ] \
    && [ -f "$ANVIL_STATE_PATH" ] \
    && grep -Fq "for '--state" "$STARTUP_LOG"; then
      corrupt="${ANVIL_STATE_PATH}.corrupt.$(date -u +%Y%m%dT%H%M%SZ).$$"
      mv "$ANVIL_STATE_PATH" "$corrupt"
      echo "[$ANVIL_NODE_ID] Unreadable Anvil state quarantined at $corrupt; retrying from upstream fork."
      may_quarantine=0
      continue
  fi

  echo "[$ANVIL_NODE_ID] Anvil failed before readiness with exit code $status."
  exit "$status"
done
