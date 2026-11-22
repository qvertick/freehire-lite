#!/usr/bin/env bash
# What the local catalogue actually holds, by source.
set -euo pipefail

docker exec freehire-lite-db-1 psql -U hire -d hire -c "
  select source,
         count(*)                                   as jobs,
         count(*) filter (where closed_at is null) as open_jobs,
         count(distinct company_slug)              as companies
  from jobs
  group by source
  order by jobs desc;
"

echo "=== boards ==="
docker exec freehire-lite-db-1 psql -U hire -d hire -c "
  select provider, board, region, status
  from boards
  order by provider, board
  limit 60;
"
