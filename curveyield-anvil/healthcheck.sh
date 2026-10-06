#!/usr/bin/env bash
set -euo pipefail

RPC_URL="http://127.0.0.1:${ANVIL_PORT:-8545}"
CHAIN_ID="${ANVIL_CHAIN_ID:-1}"

observed="$(cast chain-id --rpc-url "$RPC_URL" 2>/dev/null)"
test "$observed" = "$CHAIN_ID"
