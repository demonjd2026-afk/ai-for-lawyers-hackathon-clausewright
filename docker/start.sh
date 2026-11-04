#!/bin/sh
# Container entrypoint: a demo chain on localhost for the escrow flow, then the API.
# The chain is bound to 127.0.0.1 and reached only through the API's /rpc proxy, which allows
# the handful of JSON-RPC methods the app needs. Its state is in memory. It runs in a restart
# loop: the API's keeper terminates it when "skip days" demos have pushed its clock far ahead
# of real time and it has been idle, and the loop brings it back with a fresh clock.
set -eu

PIDFILE=/tmp/demo-chain.pid
export CW_DEMO_CHAIN_PIDFILE="$PIDFILE"
(
  while true; do
    node /chain/node_modules/hardhat/dist/src/cli.js --config /chain/hardhat.config.ts node --hostname 127.0.0.1 --port 8545 >/dev/null 2>&1 &
    echo $! > "$PIDFILE"
    wait $! || true
    sleep 1
  done
) &

# Give the chain up to 60 s to answer before taking traffic; the API still starts without it.
i=0
until python -c "import urllib.request,json,sys;r=urllib.request.Request('http://127.0.0.1:8545',data=b'{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_chainId\",\"params\":[]}',headers={'content-type':'application/json'});sys.exit(0 if json.load(urllib.request.urlopen(r,timeout=2)).get('result') else 1)" >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then echo "demo chain did not start; continuing without it" >&2; break; fi
  sleep 2
done

exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips='*'
