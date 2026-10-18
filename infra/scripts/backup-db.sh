#!/usr/bin/env bash
# Custom-format dump of a Tranche database. Usage: DATABASE_URL=postgres://... ./backup-db.sh [out-dir]
set -euo pipefail
OUT="${1:-./backups}"
mkdir -p "$OUT"
FILE="$OUT/tranche-$(date +%Y%m%d-%H%M%S).dump"
pg_dump --format=custom --no-owner --dbname="${DATABASE_URL:?set DATABASE_URL}" --file="$FILE"
find "$OUT" -name 'tranche-*.dump' -mtime +14 -delete
echo "Wrote $FILE"
