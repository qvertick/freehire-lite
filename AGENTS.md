# AGENTS.md

Compact guidance for OpenCode sessions in this repo. Deeper per-area docs are linked at the end; read them when touching that area.

## What this is

`freehire` (freehire.me) — open-source IT job aggregator. Go + Fiber v2 backend, SvelteKit frontend in `web/`, Postgres, sqlc, Meilisearch, Docker Compose, langchaingo. Many source parsers feed one normalizing/dedup/enrichment pipeline.

## Before you change anything

- Go: `gofmt -w` on touched paths (`gofmt -l .` must print nothing), then `go vet ./...` and `go test ./...`. Skip the suite only if the commit has no Go.
- Integration-tagged tests are NOT compiled by `go test ./...` (187 files across 20 packages). Run `go vet -tags=integration ./...` before every push; full tagged suite when behavior changes.
- `internal/platform/db` is generated. Edit `internal/platform/db/queries/*.sql`, then `make sqlc`. Pre-commit hook regenerates and diffs.
- Never edit an applied migration. Add a new file in `migrations/`. `pnpm check:sql` enforces this.
- Adding a package: register it in `internal/platform/arch/layering/blocks.go` or the depguard fails.

## Architecture (layering)

Blocks form 8 layers; a block imports only blocks strictly below it; same-layer blocks can't see each other. Layers top→bottom: api → engage/ingest → application/search → job → candidate → ai/identity → dict → platform. Enforced by depguard + `internal/platform/arch/layering`. Two non-obvious placements: LLM client is `platform/llm` (transport), and moderator vacancies + public submission queue are `ingest`.

## Commands

```bash
make up / down / logs       # app + postgres in Docker
make run                    # server on host (needs Postgres)
make psql / make sqlc       # psql / regenerate db code
make reindex                # rebuild Meilisearch jobs index
go build ./... && go vet ./...
go test ./...               # unit tests (no external deps)
go vet -tags=integration ./...   # compile tagged tests (before every push)
golangci-lint run           # CI fails only on new issues (ratchet)
pnpm check:links            # relative Markdown links
pnpm check:dead             # knip (CI only, needs both node_modules)
pnpm check:deps             # shared dep versions
pnpm check:sql              # migration lint
```

## Repo layout

- `cmd/<name>/` — every binary is run-once-and-exit except `cmd/server` (the long-lived API). The rest are cron-driven and need `DATABASE_URL`. Account/social/CV workers were removed for the Job Searcher direction.
- `internal/<block>/<pkg>/` — see layering above.
- `web/` — SvelteKit app. `design-system/` — separate pnpm package (install before building consumers). `extension/` — WXT browser extension (npm-managed).
- `migrations/` — source for both sqlc codegen and Postgres initdb.
- `services/pii-filter` — standalone service, not Go.

## Key conventions

- Response shapes: lists `{"data":..., "meta":{...}}`, single `{"data":...}`, errors `{"error": msg}`.
- A dropped filter is reported in `meta.ignored_params` / `meta.ignored_values`.
- Dedup key: `jobs.UNIQUE (source, external_id)`.
- Company key: `normalize.CompanySlug`, never `normalize.Slug`.
- Auth: JWT in httpOnly cookie, carries `token_version`. `RequireAuth` / `RequireAuthOrKey` / `RequireAuthOrScopedKey`.
- Enrichment and embeddings are queue-driven (`enrichment_outbox`, `semantic_outbox`).
- Catalogue size figures read the snapshot from `cmd/rollup-stats` (`internal/ingest/catalogstats`); never count on a request path.
- Dictionaries are dict-only in production — never guess, emit nothing for unknowns.
- View counts: use `job_daily_views.page_uniques`, never `uniques` (which mixes in bot/API reads).
- Job lifecycle only soft-closes; nothing hard-deletes jobs.
- "CV", not "résumé" for new surfaces (don't mass-rename existing `resume*`).

## Important gotchas

- Two guards go blind without `-tags=integration,llmlive` build tags (depguard + layering test). `run.build-tags` names them.
- `deadcode -test -tags=integration,llmlive ./...` for dead Go code.
- No `sources/` directory; board catalog is the `boards` table (`internal/ingest/boardcatalog`); Telegram channels are `telegram_channels`.
- `design-system` is a symlink; install its deps before building `web/`/`extension/`. `pnpm check:deps` holds shared type deps to identical versions.
- `deploy/` snapshot of host is gone; host config lives in private `freehire-ops`.
- Lefthook pre-commit runs gofmt/vet/golangci-lint/eslint; gitleaks scans staged index (fails hard if binary missing).
- Migrations: file-level transaction property via `migrate: no-transaction` marker on its own line.

## Where to look deeper

- `docs/architecture.md` — high-level map.
- Per-package AGENTS.md under `internal/...` (e.g. `internal/platform/db/AGENTS.md`, `internal/ingest/AGENTS.md`).
- `web/AGENTS.md`, `design-system/AGENTS.md`, `extension/AGENTS.md`.
- `docs/agents/*.md` for job-lifecycle, mail-stack, company-identity, etc.
- `.github/workflows/` — CI (actionlint + zizmor).