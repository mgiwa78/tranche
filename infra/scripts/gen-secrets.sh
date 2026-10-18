#!/usr/bin/env bash
# Prints fresh JWT (RS256, base64 PEM) and encryption secrets for an api .env or the Render dashboard.
set -euo pipefail
cd "$(dirname "$0")/../.."
node api/scripts/generate-keys.js
