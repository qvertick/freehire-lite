# api-documentation

## Purpose

Document the public Job Searcher API: job search and details, company listings,
geography lookup, query suggestions, the recent-jobs stream, catalogue
statistics, and sitemap reads. The reference is generated from one typed source
and contains no account, application, or recruiting endpoints.

## Requirements

### Requirement: One public API reference

The system SHALL describe the public catalogue API in
`web/src/lib/docs/api-spec.ts`. The source SHALL generate the server-rendered
`/docs/api` reference, `docs/API.md`, and the OpenAPI 3.1 document used by the
Scalar reference. There SHALL be no internal or session-only API reference.

#### Scenario: Generated representations stay in sync

- **WHEN** a documented endpoint or parameter changes
- **THEN** running `pnpm run gen:api-docs` and `pnpm run gen:openapi` in `web/`
  updates their respective generated files from the same source

#### Scenario: Only public catalogue operations are documented

- **WHEN** the API reference is rendered
- **THEN** every documented endpoint is unauthenticated and belongs to the
  public catalogue, search, discovery, or sitemap surface
- **AND** authentication, profile, CV, application, notification, assistant,
  extension, employer, referral, and talent endpoints are absent

### Requirement: Search filter vocabulary

The job-search reference SHALL document the supported keyword, facet, sorting,
numeric, and boolean filters. String facet names and values SHALL be derived
from the shared frontend facet registry and generated contracts rather than
maintained as a second vocabulary. The documentation SHALL explain repeated
values, AND/OR behavior, exclusions, geography semantics, ignored parameters,
and include working query examples.

#### Scenario: Filter documentation follows the application vocabulary

- **WHEN** a supported search facet is added or changed
- **THEN** the facet table reflects the shared registry and the search example
  remains available in both generated API references

### Requirement: Static OpenAPI contract

`web/static/openapi.yaml` SHALL describe the public Job Searcher API using
OpenAPI 3.0.3. CI SHALL validate the file and detect breaking changes against
the main branch. Deliberate breaking changes SHALL carry an `API-Break` commit
trailer explaining the reason.

#### Scenario: Static contract changes are deliberate

- **WHEN** a change removes or narrows a documented public API operation or
  response
- **THEN** the breaking-contract check fails unless the change includes an
  `API-Break` trailer
