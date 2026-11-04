#!/usr/bin/env bash
# Starts a local chain and the API, runs the on-chain end-to-end eval, then stops both.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="${TMPDIR:-/tmp}/clausewright-e2e"; mkdir -p "$LOG"

(cd "$ROOT/contracts" && npx hardhat node --port 8545 >"$LOG/chain.log" 2>&1) & CHAIN=$!
(cd "$ROOT/backend" && .venv/bin/uvicorn app.main:app --port 8000 >"$LOG/api.log" 2>&1) & API=$!
trap 'kill $CHAIN $API 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  curl -sf localhost:8000/api/health >/dev/null 2>&1 && grep -q "Started HTTP" "$LOG/chain.log" 2>/dev/null && break
  sleep 0.5
done
cd "$ROOT/contracts" && node scripts/e2e.mjs
