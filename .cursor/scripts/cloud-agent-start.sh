#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root"

wait_for_url() {
  local url="$1"
  local attempts="${2:-30}"
  for ((i = 1; i <= attempts; i++)); do
    if curl -sf "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.5
  done
  echo "Timed out waiting for $url" >&2
  return 1
}

if ! curl -sf http://127.0.0.1:4173/api/status >/dev/null 2>&1; then
  node server.mjs >/tmp/scoutly-api.log 2>&1 &
  wait_for_url http://127.0.0.1:4173/api/status
fi

if ! curl -sf http://127.0.0.1:3000/ >/dev/null 2>&1; then
  python3 -m http.server 3000 --directory docs --bind 127.0.0.1 >/tmp/scoutly-docs.log 2>&1 &
  wait_for_url http://127.0.0.1:3000/
fi

echo "Scoutly API and docs site are ready."
