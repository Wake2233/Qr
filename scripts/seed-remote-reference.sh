#!/usr/bin/env bash
# Loads supabase/seeds/reference.sql (settings, catalog, house dealer) into the HOSTED database.
# Idempotent: existing rows are left untouched. Ask the user before running (CLAUDE.md).
# Uses psql from the local Supabase DB container, so `pnpm db:start` must be running.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a && . ./.env.remote.local && set +a
url=$(node -e '
  const u = new URL(require("fs").readFileSync("supabase/.temp/pooler-url", "utf8").trim());
  u.password = process.env.SUPABASE_DB_PASSWORD;
  process.stdout.write(u.toString());
')
docker exec -i -e PGURL="$url" supabase_db_car-platform \
  sh -c 'psql "$PGURL" -v ON_ERROR_STOP=1 --single-transaction -q' < supabase/seeds/reference.sql
echo "reference data loaded"
