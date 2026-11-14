#!/usr/bin/env bash
# Inspect the Job Searcher catalogue tables in the local Windows stack.
#
# Run from WSL (any working directory): the repo root comes from this script's
# own location, and the database is reached through `docker compose` rather than
# by a container name that embeds the checkout directory.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

docker compose -f DockerCompose.windows.yml exec -T db psql -U hire -d hire -c "
  select
    (select count(*) from jobs)                                as jobs_all,
    (select count(*) from jobs where closed_at is null)         as jobs_open,
    (select count(*) from companies)                           as companies_all,
    (select count(*) from boards)                              as boards_all,
    (select count(*) from schema_migrations)                   as migrations_applied;
"
