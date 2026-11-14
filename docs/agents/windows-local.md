# Local development on Windows — Job Searcher

This is the Windows-native way to run the Job Searcher stack. The Go API and the
SvelteKit dev server run **natively on Windows**; the three backing services
(PostgreSQL + pgvector, Redis, Meilisearch) run as containers inside **WSL2**, whose
published ports Windows reaches on `localhost`.

Nothing here changes the production path: `DockerCompose.yml` still builds the
Linux images, and `DockerCompose.windows.yml` only starts the backing services.

## 0. Prerequisites

| Tool | Why | Check |
|---|---|---|
| Go 1.27+ | API + workers | `go version` |
| Node 20+ + pnpm 11 | SvelteKit frontend | `node --version` |
| WSL2 (Ubuntu) | hosts the Docker engine | `wsl -l -v` |

pnpm comes from Corepack — it is declared in `package.json` as `packageManager`,
so no global install is needed:

```powershell
corepack.cmd pnpm --version   # 11.7.0
```

## 1. Start the backing services (WSL2)

Docker must be running inside WSL. On a fresh WSL install that means:

```bash
wsl -d Ubuntu -- bash -lc "systemctl start docker"
```

> **WSL shuts the distro down when the last session exits**, which stops `dockerd`
> and kills every container with it. Hold the distro open with a detached session
> before starting the stack:
>
> ```powershell
> Start-Process -FilePath "wsl.exe" -ArgumentList "-d","Ubuntu","--","sleep","infinity" -WindowStyle Hidden
> ```
>
> The keepalive is not optional and it is not enough on its own: if it dies (a
> reboot, a session logoff), the distro goes down with it. The services carry
> `restart: unless-stopped`, so they come back on their own the moment the engine
> is running again — but the stack has to be reachable from Windows, so WSL has
> to be up. Re-run the keepalive command and then:
>
> ```bash
> wsl -d Ubuntu -- bash -lc "cd /mnt/c/Users/<you>/OneDrive/Pulpit/freehire-lite && docker compose -f DockerCompose.windows.yml up -d"
> ```

Then start the services (from the repo root, inside WSL):

```bash
wsl -d Ubuntu -- bash -lc "cd /mnt/c/Users/<you>/OneDrive/Pulpit/freehire-lite && docker compose -f DockerCompose.windows.yml up -d"
```

| Service | Host address | Credentials |
|---|---|---|
| PostgreSQL 18 + pgvector | `127.0.0.1:5432` | `hire` / `hire`, db `hire` |
| Meilisearch | `127.0.0.1:7700` | key `dev-insecure-meili-key` |
| Redis | `127.0.0.1:6379` | — |

`meili-init` is a one-shot container that exits (0) once it has enabled the
Meilisearch feature `cmd/search-drain` needs — see §4.

Status helper (it locates the repo from its own path, so any working directory
works): `wsl -d Ubuntu -- bash scripts/windows-stack-status.sh`

> The first start applies all 318 files in `migrations/` through Postgres's own
> `initdb` hook (the same mechanism the Linux stack uses) and takes a few minutes.
> It only runs on an **empty** volume — if the container is killed mid-way, the
> volume looks initialised and the remaining migrations are skipped. Reset with
> `docker compose -f DockerCompose.windows.yml down -v && ... up -d`.

## 2. Apply migrations with the project's own runner

The `initdb` hook leaves `schema_migrations` empty, so the first `cmd/migrate` run
detects the legacy schema and **baselines** it — recording all 318 files as applied
without re-executing them:

```powershell
$env:DATABASE_URL='postgres://hire:hire@127.0.0.1:5432/hire?sslmode=disable'
go run ./cmd/migrate
# migrate: 318 file(s) on disk, 318 baselined, 0 applied
```

From then on, `cmd/migrate` applies new files normally.

## 3. Run the API (native Windows)

`scripts/windows-api.ps1` sets every required variable and runs the server:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows-api.ps1
```

It listens on `http://127.0.0.1:8080`. The environment it sets:

```
DATABASE_URL=postgres://hire:hire@127.0.0.1:5432/hire?sslmode=disable
REDIS_URL=redis://127.0.0.1:6379/0
MEILI_URL=http://127.0.0.1:7700
MEILI_MASTER_KEY=dev-insecure-meili-key
JWT_SECRET=dev-insecure-secret-change-me-0123456789
PORT=8080
FRONTEND_ORIGIN=http://localhost:5173
```

`MEILI_MASTER_KEY` is what switches search on — unset, the server starts but
`/api/v1/jobs/search` answers 503.

## 4. Create the Meilisearch index

A fresh Meilisearch has no `jobs` index, and every search-backed route answers
**500 `index_not_found`** until it exists:

```
500 | search: query: ... Index `jobs` not found.
```

Build it once per database:

```powershell
$env:DATABASE_URL='postgres://hire:hire@127.0.0.1:5432/hire?sslmode=disable'
$env:MEILI_URL='http://127.0.0.1:7700'
$env:MEILI_MASTER_KEY='dev-insecure-meili-key'
$env:MEILI_DATA_DIR='C:\'          # the disk guard probes this path
$env:REINDEX_MIN_FREE_GB='1'       # guard floor; 0 disables it
go run ./cmd/reindex
```

`MEILI_DATA_DIR` points at a **Windows** path because the guard measures the host
that runs the command. The default (`/var/lib/freehire/meili`) does not exist on
Windows — the guard then fails open and logs
`reindex: disk-guard skipped — cannot measure free space`.

The Meilisearch container also needs one experimental feature,
`editDocumentsByFunction`, which `cmd/search-drain`'s duplicate-marker and closure
passes use (`POST /indexes/jobs/documents/edit`). Meilisearch v1.49 offers no
startup switch for it: there is no CLI flag, no `MEILI_EXPERIMENTAL_*` variable
for this one, and `--config-file-path` reads TOML whose schema rejects an
`experimental_features` table. The only way to set it is the runtime API, so
`DockerCompose.windows.yml` carries a one-shot `meili-init` service that PATCHes
`/experimental-features` as soon as the engine is healthy. It re-runs on every
`docker compose up -d` because the flag does not survive a Meilisearch restart.
Check it:

```powershell
$h = @{ Authorization = 'Bearer dev-insecure-meili-key' }
(Invoke-RestMethod http://127.0.0.1:7700/experimental-features -Headers $h).editDocumentsByFunction
# True
```

Without the feature that pass fails while the rest of the drain succeeds,
leaving the outbox wave claimed for lease-expiry retry.

## 5. Run the frontend (native Windows)

```powershell
cd web
corepack.cmd pnpm install --frozen-lockfile
corepack.cmd pnpm dev
```

`web/vite.config.ts` proxies `/api` and `/health` to `http://localhost:8080`
(override with `VITE_API_URL`), so the browser only ever talks to
`http://localhost:5173` and the SPA matches production's same-origin shape.

`design-system` is a separate pnpm package that `web/` links to; install its
dependencies first if the link is broken:

```powershell
cd design-system; corepack.cmd pnpm install --frozen-lockfile
```

## 6. Smoke test the API

```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows-smoke.ps1
```

Exercises the Job Searcher routes: `/health`, the jobs list / search / facets, the
companies list, catalogue stats, suggest, geo cities and the three sitemap routes.
A 4xx counts as "mounted and answered"; a 5xx or a connection error fails the run.

## 7. Optional — put real jobs in the catalogue

The catalogue starts empty. To prove the ingest pipeline end to end:

```powershell
$env:DATABASE_URL='postgres://hire:hire@127.0.0.1:5432/hire?sslmode=disable'

go run ./cmd/add-board --provider=greenhouse --board=stripe --company="Stripe" --apply
go run ./cmd/ingest greenhouse      # crawls the board, writes jobs + search_outbox
go run ./cmd/search-drain           # pushes the outbox wave into Meilisearch
go run ./cmd/reindex                # optional: full swap-rebuild of the index
```

`cmd/ingest` needs outbound access to the ATS host; `cmd/search-drain` needs
`MEILI_URL` and `MEILI_MASTER_KEY` in the environment.

Two more workers make the catalogue figures coherent:

```powershell
$env:REDIS_URL='redis://127.0.0.1:6379/0'
go run ./cmd/rollup-stats       # publishes the catalogue-scale snapshot
go run ./cmd/rollup-company     # per-company lifetime/views stats
go run ./cmd/recount-companies  # companies.job_count — the companies list scope
go run ./cmd/build-suggestions  # the "suggestions" Meilisearch index
```

Without `cmd/recount-companies` every company has `job_count = 0` and
`/api/v1/companies` answers an empty list (the query is scoped to
`job_count > 0`). Without `cmd/rollup-stats` the catalogue figures degrade to
the approximate estimate.

**The catalogue-scale snapshot lives in Redis only** (`internal/ingest/catalogstats`
publishes it with a TTL), so a Redis restart empties it and `/api/v1/stats/catalog`
falls back to the estimate until `cmd/rollup-stats` runs again. `exact` flips back
to `true` afterwards.

## 8. Optional — poppler

`pdftotext` (poppler) is what the résumé extractor shells out to. It is not
needed by the Job Searcher routes (the Job Searcher server mounts no account
route), so a Windows host without it is fine. The PDF-dependent tests then skip
themselves — but only outside CI: `.github/workflows/ci.yml` installs
poppler-utils and asserts the binary in every job that runs tests, and the tests
fail (rather than skip) when `CI` is set and `pdftotext` is absent, so a broken
install cannot hide behind a green tick.

The extractor reads `PDFTOTEXT_BIN` (default `pdftotext`); the tests probe
`pdftotext` on PATH, so put any poppler build's `pdftotext.exe` there:

```powershell
$env:PATH = 'C:\poppler\Library\bin;' + $env:PATH
go test ./internal/candidate/resume ./internal/api/handler -run PDF
```

## Known environment quirks

- **CRLF in the working tree.** The checkout has `core.autocrlf=true`, so every
  text file lands with CRLF endings while the toolchain (gofmt, the TSV
  loaders, the JSON fixtures) expects LF. `.gitattributes` now forces LF for
  `*.go`, `*.tsv`, `*.txt`, `*.json`, `*.sql` and `*.sh`, so a **fresh**
  checkout is clean; the current one still has CRLF until it is re-checked out.
  Until then:
  - `gofmt -l .` flags every file. Compare with the line endings normalised
    instead: `((Get-Content f) -replace "`r`n","`n") | Set-Content f -NoNewline`.
  - The parsers that read embedded data are CRLF-tolerant, because the \r would
    otherwise become part of a city name, a metro label or a JSON fixture.
    `internal/dict/location/metros.go` was the one that was not, and is now.
- **Vite is slow on a OneDrive-backed checkout.** The first `pnpm dev` took
  ~190 s to become ready and the first SSR request took ~180 s, because every
  route transform reads thousands of files through the sync folder. Both are
  one-time per route; a checkout on a local disk is much faster.
- **`wsl --status` warns about a duplicated `boot.systemd` key** in
  `/etc/wsl.conf`. Harmless, but it is why `systemctl` output can be noisy.
- **The WSL keepalive session matters.** Without it the distro exits when the
  last `wsl.exe` call returns, taking Docker and the database with it.
- **A few tests skip on Windows by design**, each for a platform reason: the
  PDF output-size guard (its stub is a POSIX shell script), the poppler-dependent
  PDF upload tests (no `pdftotext` unless poppler is on PATH), the unreadable
  registry test (Windows has no read permission bit), and the signal-context test
  (a Windows process cannot signal itself). All of them still run on Linux CI —
  and the poppler-gated ones FAIL there when the binary is missing, so the CI
  install step cannot silently degrade.
