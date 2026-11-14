#!/usr/bin/env bash
# Local dev helper: inspect the Windows-local service stack.
#
# Run from WSL (any working directory): the repo root is derived from this
# script's own location, so nothing here is tied to a user or machine. Services
# are addressed through `docker compose` rather than by container name, which
# carries the project name and changes with the checkout directory.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

compose=(docker compose -f DockerCompose.windows.yml)

echo "=== containers ==="
"${compose[@]}" ps

echo
echo "=== last migration applied ==="
"${compose[@]}" logs db 2>&1 \
  | grep -E 'running /docker-entrypoint-initdb.d' | tail -3 || true

echo
echo "=== initdb finished ==="
"${compose[@]}" logs db 2>&1 \
  | grep -c 'init process complete' || true

echo
echo "=== public tables ==="
"${compose[@]}" exec -T db psql -U hire -d hire -tAc \
  "select count(*) from information_schema.tables where table_schema = 'public';"

echo
echo "=== pgvector available ==="
"${compose[@]}" exec -T db psql -U hire -d hire -tAc \
  "select extversion from pg_extension where extname = 'vector';"

echo
echo "=== migrations in repo vs applied ==="
echo "repo files: $(ls migrations/*.sql | wc -l)"
