#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root"

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

node --check server.mjs
node --check amazon-creators.mjs
node --check promotion-agent/run-campaign.mjs
node --check promotion-agent/run-analytics.mjs
node --check promotion-agent/lib/x-api.mjs
node --check lib/analytics-api.mjs

echo "Scoutly environment install complete."
