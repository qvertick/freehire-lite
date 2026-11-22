#!/usr/bin/env bash
# Jobs per source, with the country each source's postings ended up in.
#
# Run from WSL (any working directory): the repo root comes from this script's
# own location, and the database is reached through `docker compose` rather than
# by a container name that embeds the checkout directory.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

docker compose -f DockerCompose.windows.yml exec -T db psql -U hire -d hire -c "
  select
    source,
    coalesce(countries[1], '(null)') as country,
    count(*)                   as jobs
  from jobs
  group by 1, 2
  order by jobs desc;
"
