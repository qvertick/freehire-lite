# Job Searcher

freehire collects public vacancies from multiple sources and brings them into
one searchable catalogue. The catalogue supports both IT and non-IT roles.

## Vacancy collection

Source adapters fetch listings from company career pages and job boards. The
ingest pipeline validates and normalizes postings, deduplicates them, tracks
whether they remain live at their source, and updates the search index.

**Code:** `internal/ingest`, `internal/job`, `internal/dict`, `internal/search`

## Search

Search the catalogue by keyword, then narrow and sort results using the
available job, location, company, salary, and work-mode filters. Curated
collections and catalogue insights provide additional ways to explore roles.

**Live:** [/jobs](https://freehire.me/jobs) · [/collections](https://freehire.me/collections) ·
[/insights](https://freehire.me/insights) ·
**Code:** `web/src/routes/jobs`, `internal/search`

## Vacancy and company pages

Vacancy pages show the normalized posting and link to its original source for
the application. Company pages collect a company's open postings in one place.

**Live:** [/companies](https://freehire.me/companies) ·
**Code:** `web/src/routes/jobs/[slug]`, `web/src/routes/companies`

## Public API

The public HTTP API exposes searchable vacancies, vacancy details, company
pages, geographic data, search suggestions, catalogue statistics, and
sitemaps. It does not require user authentication.

**Live:** [/docs/api](https://freehire.me/docs/api) ·
**Reference:** [API.md](./API.md) · **Code:** `internal/api/handler`

## Background processing

Run-once workers keep source listings, the catalogue, and the search index in
sync. PostgreSQL stores the catalogue and processing state; Meilisearch powers
faceted search. Redis is used by the server for cache and shared runtime state.

**Code:** `cmd/ingest`, `cmd/search-drain`, `cmd/reindex`

## Project setup

See the [README](../README.md) for running the project, its architecture, and
how to add a source adapter.
