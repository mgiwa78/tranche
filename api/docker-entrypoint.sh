#!/bin/sh
# Migrate, make sure the essentials exist, then start. Workers skip both (the api owns the schema).
set -e

if [ "${APP_ROLE:-all}" != "worker" ] && [ "${SKIP_MIGRATIONS:-false}" != "true" ]; then
  echo "Running migrations"
  node "$(node -p "require.resolve('typeorm/cli.js')")" migration:run -d dist/config/data-source.js

  # SEED_ON_BOOT: essentials (default) = settings, ledger accounts, super admin
  #               demo = full demo history, but only on an empty database
  #               none = skip
  case "${SEED_ON_BOOT:-essentials}" in
    demo) SEED_RESET=true SEED_IF_EMPTY=true node dist/database/seeders/seed-runner.js ;;
    essentials) SEED_RESET=false node dist/database/seeders/seed-runner.js ;;
    *) echo "Skipping seed" ;;
  esac
fi

exec "$@"
