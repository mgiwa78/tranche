#!/usr/bin/env bash
# Polls the api health endpoint after a deploy. Usage: ./wait-healthy.sh https://tranche-api.onrender.com [timeout-seconds]
set -euo pipefail
URL="${1:?api base url}/api/v1/health"
DEADLINE=$(( $(date +%s) + ${2:-600} ))
until curl -fsS "$URL" >/dev/null 2>&1; do
  if [ "$(date +%s)" -ge "$DEADLINE" ]; then echo "Timed out waiting for $URL"; exit 1; fi
  sleep 10
done
curl -fsS "$URL"; echo
