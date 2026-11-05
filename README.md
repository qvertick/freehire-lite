<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.svg">
  <img src="docs/assets/logo-dark.svg" alt="freehire-lite" width="84" height="84">
</picture>

# freehire

<h3 align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=JetBrainsMono+Nerd+Font&size=18&pause=100&color=FFFFFF&center=true&width=560&lines=Every+job+has+a+source.;We+find+them+all.;One+search.+Hundreds+of+sources.;Turning+websites+into+searchable+data.;No+more+endless+tab+switching.;Collect.+Parse.+Normalize.+Search.;The+web+is+full+of+opportunities.;Let+the+parsers+do+the+work.;One+engine.+Multiple+job+platforms.;From+raw+HTML+to+real+opportunities.;Fresh+data.+Unified+search.;Stop+searching.+Start+finding.;Every+source.+One+destination.;Built+to+collect.+Designed+to+discover.;Your+job+search%2C+automated.">
</h3>

[**Try it live →**](https://freehire.me/?utm_source=github&utm_medium=readme&utm_campaign=hero) · [Features](docs/features.md) · [Architecture](docs/architecture.md) · [Sources](#sources) · [API](#api) · [Add a source](#adding-a-source) · [Contributing](CONTRIBUTING.md)

[![Live](https://img.shields.io/badge/live-freehire.me-0a0a0a)](https://freehire.me/?utm_source=github&utm_medium=readme&utm_campaign=badge)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Go version](https://img.shields.io/github/go-mod/go-version/strelov1/freehire)
![Last commit](https://img.shields.io/github/last-commit/strelov1/freehire)

<img src="docs/assets/freehire.gif" alt="freehire — faceted search narrowing 4.7M+ live postings by region, work format, specialization and seniority, each linking straight to the company's own careers page" width="860">

</div>

## Why freehire?

- **Straight from the source.** Every listing is crawled directly from a company's
  own ATS — Workday, Greenhouse, Lever, Ashby, iCIMS and a long tail of others — and
  links to the original posting. No recruiter reposts, no aggregator middlemen, no
  dead links.
- **One schema, deduplicated.** The same role posted to three boards collapses into
  one entry: every posting is normalized into a single shape and deduplicated on a
  stable key.
- **Search that understands jobs.** Faceted full-text search over region, work mode,
  seniority, skills and salary — derived from curated dictionaries, never guessed.
- **Actually open.** MIT-licensed and self-hostable, pipeline and data both in the
  open. Adding a company is one row in the board catalog
  ([how](#adding-a-source)).
- **Yours to build on.** A clean HTTP API, a CLI, Telegram digests, and a whole
  workspace on top of the catalogue — see [Beyond the catalogue](#beyond-the-catalogue).
  Use the hosted site, run your own, or build on top.

Aggregating **4.7M+ unique live postings** from **700,000+ companies** across
**168 ATS platforms**, a long tail of aggregators and direct feeds, and **97
Telegram channels** — **421 sources** in all, see [Sources](#sources) for the full
breakdown. Reposts of one job across boards are collapsed, so every figure here is
what [freehire.me/jobs](https://freehire.me/jobs?utm_source=github&utm_medium=readme&utm_campaign=stats) actually shows.

## Free and Pro

[freehire.me](https://freehire.me/) is a public job search engine. Search and filter
IT and non-IT vacancies from multiple sources, then follow the original posting to
apply directly with the employer.

> If freehire saves you time — or you just like the idea of jobs straight from the
> source — a ⭐ helps other people find it.

## How it works

| | |
| --- | --- |
| **Collect** | Source adapters fetch vacancies and refresh their status |
| **Normalize** | A shared pipeline maps source data to one job schema and deduplicates postings |
| **Search** | PostgreSQL stores the catalogue; Meilisearch serves keyword search, filters and sorting |
| **Browse** | A public frontend presents job and company pages with links to the original postings |

## Stack

- **Go** + [Fiber v2](https://gofiber.io/) — HTTP server
- **PostgreSQL** + [pgvector](https://github.com/pgvector/pgvector) — storage, filtering, semantic embeddings
- **[sqlc](https://sqlc.dev/)** — type-safe DB access from SQL (no ORM)
- **[Meilisearch](https://www.meilisearch.com/)** — full-text and faceted job search
- **[langchaingo](https://github.com/tmc/langchaingo)** — LLM access over any OpenAI-compatible endpoint (no vendor baked in)
- **[Bifrost](https://github.com/maximhq/bifrost)** — LLM gateway: per-user virtual keys, cross-provider fallback, spend tracking
- **[Langfuse](https://langfuse.com/)** — LLM call tracing and observability
- **[SvelteKit](https://kit.svelte.dev/) 2** (Svelte 5 runes) + **Tailwind 4** — the server-rendered frontend under `web/`
- **Redis** — rate limiting and realtime fan-out · **S3-compatible object storage** — CVs, headshots, previews
- **[Prometheus](https://prometheus.io/)** (via the node_exporter textfile collector) + **[Grafana](https://grafana.com/)** — metrics and dashboards for the ingest/LLM infrastructure
- **Docker Compose** — local development

## Quick start

```bash
make up        # build + start the whole stack in Docker:
               # api, web, postgres, meilisearch, redis, s3
curl localhost:8080/health
curl localhost:8080/api/v1/jobs
```

Migrations are applied automatically on first Postgres volume init
(the `migrations/` folder is mounted into `/docker-entrypoint-initdb.d`).
Changing a migration does not re-apply to an existing volume — recreate it with
`docker compose down -v && make up`, or apply pending files manually with
`make migrate`.

If port 8080 is already taken, pick another host port:

```bash
HIRE_HOST_PORT=8090 make up
```

## Local development

```bash
docker compose up -d db   # database only
make run                  # server on host, reads DATABASE_URL
```

Copy `.env.example` to `.env` and adjust as needed. `JWT_SECRET` is required for
the server to start; OAuth and LLM credentials are optional (the features they
gate stay disabled when unset).

## Commands

```bash
make help      # list all commands
make sqlc      # regenerate code from SQL (via Docker, no local sqlc needed)
make tidy      # go mod tidy
make psql      # psql inside the DB container
make reindex   # rebuild the Meilisearch index from Postgres
make migrate   # apply migrations manually to an existing DB volume
```

## Workers

The server only serves the API. Everything else — crawling, enrichment, indexing,
notifications — is a standalone, run-once worker meant for cron: it crawls or
drains its queue and exits. `ls cmd/` for the full list; the ones you are most
likely to run:

```bash
go run ./cmd/migrate       # apply pending migrations (run before deploying code that reads new schema)
go run ./cmd/ingest greenhouse  # crawl one provider's catalog boards and upsert jobs (also via INGEST_PROVIDER)
go run ./cmd/enrich        # drain the enrichment queue (LLM); needs LLM_* config
go run ./cmd/embed         # drain the semantic queue into pgvector chunks
go run ./cmd/search-drain  # push queued job writes into the live search index (run every 1-2 min)
go run ./cmd/reindex       # rebuild the Meilisearch index from Postgres (full swap)
go run ./cmd/tg-ingest     # crawl the active channels in telegram_channels
go run ./cmd/tg-extract    # LLM-extract vacancies from crawled Telegram posts
go run ./cmd/capture-apply-form  # fetch queued postings' ATS application forms
go run ./cmd/backfill-derive     # re-derive every deterministic column — facets, fingerprints,
                                 # slugs — in one keyset pass (follow with make reindex)
```

Every worker needs `DATABASE_URL` and exits non-zero on failure. No worker
hard-deletes jobs; the lifecycle only soft-closes them.

## Layout

```
cmd/                 entry points: server + the standalone workers above
migrations/          SQL schema (source for both sqlc and initdb)
web/                 the SvelteKit frontend
design-system/       shared tokens and components, linked into web/
internal/            ~130 domain packages; the load-bearing ones:
  config/            env configuration
  database/ db/      pgxpool pool; generated sqlc code + queries/*.sql
  handler/           HTTP handlers
  sources/           source adapters (greenhouse / lever / adzuna / …) + registry
  boardcatalog/      the board catalog: which company crawls on which ATS, under what board id
  pipeline/          ingest runner (fetch → normalize → dedup → upsert)
  linksource/        resolves outbound job links found in Telegram posts
  telegram/          Telegram-channel crawl + LLM vacancy extraction
  enrich/            typed AI-enrichment contract + queue-draining runner
  search/ searchdrain/  Meilisearch indexing and query; incremental drain of the write queue
  embed/             semantic chunk embeddings into pgvector
  location/ classify/ skilltag/  the curated facet dictionaries — never guess, emit nothing
  ghost/             the posting-reality signal behind "is this job real?"
  jobview/           the single public wire shape of a job
  collections/       curated company collections
```

## Architecture

How the pieces fit together — the crawl-to-search topology, what each directory
above is for, and walkthroughs of the two main flows (ingestion and public job
search), plus the job
lifecycle: **[docs/architecture.md](docs/architecture.md)**.

It is the map; the per-package `AGENTS.md` files it links to are the territory.

## API

The catalogue is served over a public, keyless HTTP API — `GET
https://freehire.me/api/v1/jobs` needs no credential. All responses use
`{"data": ...}` (single), `{"data": ..., "meta": {...}}` (lists), or
`{"error": msg}`; jobs and companies are addressed by their public slug.

**Full reference — every endpoint, its parameters, auth mode and the whole
search-filter vocabulary: [freehire.me/docs/api](https://freehire.me/docs/api?utm_source=github&utm_medium=readme&utm_campaign=api).**

## Sources

Snapshot of 2026-10-30 — **4,785,488 unique open postings** across **701,972
companies**, from **421 sources**; **400** of them carry a posting today. Counts are
unique open postings: a job reposted on several boards is counted once (the
per-kind sums below run slightly higher, since a posting two sources carry is
counted under each). Every source is one of three kinds:

- **ATS platforms** — one adapter per multi-tenant applicant-tracking system,
  each serving many companies (Workday, Greenhouse, Lever, iCIMS…).
  **160 platforms with postings · 3,827,693 open postings.**
- **Aggregators & job boards** — third-party feeds that republish many
  companies' postings (Adzuna, trudvsem, himalayas, **97 Telegram channels**…).
  **179 with postings · 937,728 open postings.**
- **Company career sites** — direct single-company feeds crawled from a
  company's own careers page (Amazon, Apple, Google, Yandex, Sber…).
  **58 feeds with postings · 25,350 open postings.**

A source's kind is not configuration but a property of the adapter's own Go type,
so `internal/ingest/sources` classifies every provider without a network call.

Full per-source breakdown — every source with its own open-jobs count — lives on
its own page: [docs/sources.md](docs/sources.md), and always current at
[freehire.me/sources](https://freehire.me/sources?utm_source=github&utm_medium=readme&utm_campaign=sources).

## Adding a source

Adding a company is one row in the `boards` catalog — `company` + `provider` +
`board` — added through the "contribute a board" form on the site, or by a curator
with `go run ./cmd/add-board --provider=… --board=… --company=… --apply`. Adding an
ATS platform is a new adapter in `internal/ingest/sources` plus one line in
`sources.All` — every adapter speaks the same `Source` interface, and a board is
validated against the registry when it enters the catalog, before any crawl.

For most companies the platform is already supported, so adding them is just one
catalog row. Only when a company runs on an ATS we don't cover yet does it need a
new provider (a new adapter). Either way, if you want a source added,
**start by [opening an issue](https://github.com/strelov1/freehire/issues)** — name
the company and its careers URL, and we'll confirm whether it's a one-line add or a
new provider before any code.

## Frontend

A server-rendered SvelteKit 2 app (Svelte 5 runes, Tailwind 4, `adapter-node`)
lives under `web/` and consumes the API same-origin; a dev Vite proxy forwards
`/api` to the backend. Shared tokens and components come from the sibling
`design-system/` package — install it before building `web/`, since it is
symlinked, not copied. See [web/AGENTS.md](web/AGENTS.md).

## Contributing

**Contributions are welcome, and issues and PRs are open to everyone.** No
allowlist, no approval step — open one.

The easiest way to help is to **add a source**: submit a board through the
"contribute a board" form on the site, or send a new adapter in
`internal/ingest/sources`. Missing a company you would apply to? Contributing its
board takes a URL, and it is the single most useful thing you can send.

Questions and half-formed ideas are equally welcome in
[Discussions](https://github.com/strelov1/freehire/discussions) — no need to
polish them into an issue first. For anything large, an issue up front saves you
from building the wrong thing, but nothing stops you from just opening the PR.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the checks CI runs and
[AGENTS.md](AGENTS.md) for the architecture and conventions.

<a href="https://github.com/strelov1/freehire/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=strelov1/freehire" alt="Contributors" />
</a>

## Security

Found a vulnerability? Report it privately — see [SECURITY.md](SECURITY.md). Do
not open a public issue for security-sensitive reports.

## License

[MIT](LICENSE)
