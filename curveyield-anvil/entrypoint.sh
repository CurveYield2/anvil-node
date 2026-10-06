#!/usr/bin/env bash
set -euo pipefail

: "${ETHEREUM_SOURCE_RPC_URL:?ETHEREUM_SOURCE_RPC_URL is required}"

ANVIL_CHAIN_ID="${ANVIL_CHAIN_ID:-1}"
ANVIL_PORT="${ANVIL_PORT:-8545}"
ANVIL_ACCOUNTS="${ANVIL_ACCOUNTS:-20}"
ANVIL_STATE_PATH="${ANVIL_STATE_PATH:-/data/state.json}"

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

exec anvil "${args[@]}"
