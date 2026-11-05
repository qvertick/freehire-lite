// The freehire public API, described as data. This single module is the source
// of truth for BOTH the rendered /docs/api page and the generated docs/API.md
// (web/scripts/gen-api-docs.mjs), so the two can never drift. The job-search
// filter vocabulary is NOT duplicated here — it lives in ./filters, derived from
// the generated contracts so it stays in lock-step with the Go StringFacets.

/** Production base URL for every path below. */
export const BASE_URL = 'https://freehire.me/api/v1';

/** Authentication requirement for an endpoint, rendered as a badge. */
export type Auth = 'none';

/** Human-readable label for an auth level. */
export const AUTH_LABELS: Record<Auth, string> = {
  none: 'Public',
};

/** A single request parameter (path, query, or body field). */
export interface Param {
  name: string;
  type: string;
  required?: boolean;
  description: string;
  example?: string;
}

/** One HTTP endpoint. `curl` and `responseExample` are plain strings so they
 *  drop verbatim into both the page's code blocks and the Markdown fences. */
export interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  auth: Auth;
  summary: string;
  description?: string;
  /** Marks the endpoint that carries the full job-search filter vocabulary, so
   *  the renderer can inject the shared filter table after its own params. */
  filterable?: boolean;
  /** Present when the endpoint is superseded but still served — both renderers
   *  mark it and name the replacement, rather than the caller learning only
   *  from prose. */
  deprecated?: { since: string; replacement: string };
  pathParams?: Param[];
  query?: Param[];
  body?: Param[];
  curl: string;
  responseExample?: string;
}

/** A group of related endpoints, rendered as one page section. The anchor is
 *  derived from the title (slugified) by both renderers, like Overview. */
export interface Group {
  title: string;
  intro: string;
  endpoints: Endpoint[];
}

/** A conceptual section before the endpoint reference (base URL, envelope,
 *  pagination, errors, rate limits). Kept as paragraphs + an optional code
 *  block so neither renderer needs a Markdown parser. The anchor is derived
 *  from the title (slugified) by both renderers, so there is no separate id. */
export interface Overview {
  title: string;
  paragraphs: string[];
  code?: string;
}

export const OVERVIEW: Overview[] = [
  {
    title: 'Base URL',
    paragraphs: [
      'The public job-search API is served under the base URL above. Catalogue reads do not require an account.',
    ],
  },
  {
    title: 'Response envelope',
    paragraphs: [
      `Single items use a \`data\` envelope. Collections include pagination metadata; errors use \`{ "error": "message" }\` with a matching HTTP status.`,
    ],
    code: `{ "data": { "...": "single item" } }

{ "data": [ ... ], "meta": { "total": 4213, "limit": 20, "offset": 0 } }

{ "error": "job not found" }`,
  },
  {
    title: 'Pagination',
    paragraphs: [
      'List and search endpoints accept limit and offset. Each endpoint documents its defaults, caps, and paging bounds; meta.total reports the matches before paging.',
    ],
  },
  {
    title: 'Errors',
    paragraphs: [
      'Errors use standard HTTP status codes, including 400 for invalid input, 404 when a job or company is not found, 429 when rate-limited, and 503 when search is unavailable.',
    ],
  },
  {
    title: 'Rate limits',
    paragraphs: [
      'Public reads are rate-limited. Requests over the applicable limit receive HTTP 429; honor Retry-After when it is present.',
    ],
  },
];

export const GROUPS: Group[] = [
  {
    title: 'Jobs',
    intro: 'Public job catalogue, keyword search, filters, and duplicate discovery.',
    endpoints: [
            {
          method: 'GET',
          path: '/jobs',
          auth: 'none',
          summary: 'List jobs, newest first, with limit/offset pagination.',
          description: 'Takes no filters at all — `limit` and `offset` are the whole vocabulary. ' +
              'Anything else is ignored rather than refused, and listed in ' +
              '`meta.ignored_params`: a filter param sent here returns the entire ' +
              'catalogue, which is indistinguishable from a narrow result unless you ' +
              'check. Use `/jobs/search` to filter.',
          query: [
              { name: 'limit', type: 'integer', description: 'Page size, 1–100.', example: '20' },
              { name: 'offset', type: 'integer', description: 'Rows to skip.', example: '0' },
          ],
          curl: `curl "${BASE_URL}/jobs?limit=20&offset=0"`,
          responseExample: `{
              "data": [
                {
                  "public_slug": "senior-go-engineer-acme-1a2b",
                  "source": "greenhouse",
                  "manually_added": false,
                  "external_id": "123",
                  "url": "https://boards.greenhouse.io/acme/jobs/123",
                  "title": "Senior Go Engineer",
                  "company": "Acme",
                  "company_slug": "acme",
                  "location": "Remote — EU",
                  "description": "...",
                  "countries": ["DE"],
                  "regions": ["eu"],
                  "work_mode": "remote",
                  "skills": ["go", "postgresql"],
                  "cities": ["Berlin"],
                  "collections": ["yc"],
                  "is_tech": "tech",
                  "posted_at": "2026-06-18T00:00:00Z",
                  "created_at": "2026-06-18T09:12:00Z",
                  "updated_at": "2026-06-18T09:12:00Z",
                  "closed_at": null,
                  "enrichment": {
                    "summary": "...",
                    "seniority": "senior",
                    "category": "backend",
                    "employment_type": "full_time",
                    "relocation": "not_supported",
                    "visa_sponsorship": false,
                    "experience_years_min": 5,
                    "english_level": "b2",
                    "education_level": "bachelor",
                    "domains": ["fintech"],
                    "posting_language": "en",
                    "company_type": "product",
                    "company_size": "51-200",
                    "salary_min": 90000,
                    "salary_max": 130000,
                    "salary_currency": "EUR",
                    "salary_period": "year"
                  },
                  "enriched_at": "2026-06-18T09:20:00Z",
                  "enrichment_version": 7,
                  "view_count": 42,
                  "reality": {
                    "class": "fresh",
                    "age_days": 3,
                    "repost_count": 0,
                    "mass_posting_count": 0,
                    "fake_freshness": false
                  }
                }
              ],
              "meta": { "total": 4213, "limit": 20, "offset": 0 }
            }`,
      },
            {
          method: 'GET',
          path: '/jobs/search',
          auth: 'none',
          summary: 'Full-text + faceted search over open jobs.',
          description: 'Combine free-text `q` with any of the filter params below. Repeated ' +
              'facet params are ORed; add `<param>_mode=and` to require all, or ' +
              '`<param>_exclude=<value>` to exclude. Without `q`, results default to ' +
              'newest first; with `q`, to relevance. A param no filter reads is ignored ' +
              'rather than refused, and listed in `meta.ignored_params` — check it, ' +
              'since a dropped filter otherwise looks like a broad result.',
          filterable: true,
          query: [
              { name: 'q', type: 'string', description: 'Full-text query over `title`, `company`, `description`, and `location`. Plain words use the default engine matching: the first words are required and trailing ones are dropped when too few postings match, so word order can change the result. Operators: quotes (`"systems engineer"`) require every quoted word in any order (not a contiguous phrase); `-word` excludes; uppercase `OR` between words matches any alternative (at most 5, merged and deduplicated); `title:` at the start of an alternative matches it in the title only, e.g. `title:"product owner" -junior OR title:produktchef`. Narrow the fields of the other alternatives with `q_fields`. Exact-phrase matching is not offered, and default relevance order does not reliably rank a contiguous match above a scattered-token one.', example: 'golang' },
              { name: 'q_fields', type: 'string', description: 'Comma-separated subset of `title,company,description,location` to restrict `q` to, e.g. `title`. A name outside that set drops the whole parameter (reported in `meta.ignored_params`) rather than partially applying.', example: 'title' },
              { name: 'sort', type: 'string', description: 'One of `created_at`, `posted_at`, `view_count`, `salary_min`, `salary_max`. Omit for relevance/newest.', example: 'posted_at' },
              { name: 'order', type: 'string', description: '`asc` or `desc` (default `desc`).', example: 'desc' },
              { name: 'limit', type: 'integer', description: 'Page size, 1–100.', example: '20' },
              { name: 'offset', type: 'integer', description: 'Rows to skip; `offset + limit` ≤ 10000.', example: '0' },
          ],
          curl: `curl "${BASE_URL}/jobs/search?q=golang&seniority=senior&work_mode=remote&regions=cis&sort=posted_at"`,
          responseExample: `{
              "data": [ { "public_slug": "...", "title": "Senior Go Engineer", "...": "..." } ],
              "meta": { "total": 137, "limit": 20, "offset": 0 }
            }`,
      },
            {
          method: 'GET',
          path: '/jobs/facets',
          auth: 'none',
          summary: 'Count of matching jobs per facet value (and numeric stats).',
          description: 'Takes the same `q` and facet filter params as search, but returns the ' +
              'distribution of values instead of a page of jobs — use it to build ' +
              'filter UIs or see how a filter narrows the set. Continuous numeric ' +
              'facets are returned as `stats` (min/max), not per-value buckets.',
          query: [
              { name: 'q', type: 'string', description: 'Same full-text query as search.', example: 'golang' },
              { name: '(any filter)', type: 'string', description: 'Any supported search filter param narrows the counted set.', example: 'work_mode=remote' },
          ],
          curl: `curl "${BASE_URL}/jobs/facets?work_mode=remote"`,
          responseExample: `{
              "data": {
                "total": 1820,
                "facets": {
                  "seniority": { "senior": 640, "middle": 410, "junior": 120 },
                  "category": { "backend": 700, "frontend": 380 }
                },
                "stats": {
                  "salary_min": { "min": 20000, "max": 400000 }
                }
              }
            }`,
      },
            {
          method: 'GET',
          path: '/jobs/{slug}',
          auth: 'none',
          summary: 'A single job by its public slug (serves closed jobs too).',
          pathParams: [{ name: 'slug', type: 'string', required: true, description: 'The job `public_slug`.', example: 'senior-go-engineer-acme-1a2b' }],
          curl: `curl "${BASE_URL}/jobs/senior-go-engineer-acme-1a2b"`,
          responseExample: `{ "data": { "public_slug": "senior-go-engineer-acme-1a2b", "title": "Senior Go Engineer", "closed_at": null, "...": "..." } }`,
      },
            {
          method: 'GET',
          path: '/jobs/{slug}/similar',
          auth: 'none',
          summary: 'Similar jobs within the same location and specialization.',
          description: 'Searches the live Meilisearch index with the source job’s known location and ' +
              'specialization as mandatory filters. Uses stored-vector hybrid ranking when ' +
              'available, falling back to keyword search under the same filters. Returns an ' +
              'empty list when location or specialization is unknown or no visible matches remain.',
          pathParams: [{ name: 'slug', type: 'string', required: true, description: 'The job `public_slug`.', example: 'senior-go-engineer-acme-1a2b' }],
          query: [{ name: 'limit', type: 'integer', description: 'Max similar jobs.', example: '10' }],
          curl: `curl "${BASE_URL}/jobs/senior-go-engineer-acme-1a2b/similar?limit=10"`,
          responseExample: `{ "data": [ { "public_slug": "...", "title": "...", "...": "..." } ] }`,
      },
            {
          method: 'GET',
          path: '/jobs/{slug}/copies',
          auth: 'none',
          summary: 'Other open postings in the same role cluster (per-city duplicates).',
          description: 'The per-city openings folded under one canonical card by content-dedup — ' +
              'each keeps its own `location` and `apply_url` so a seeker picks their city. ' +
              'The anchor job itself is included. `meta.total` is the whole cluster size, ' +
              'so it stays accurate when the list is a capped page.',
          pathParams: [{ name: 'slug', type: 'string', required: true, description: 'The job `public_slug`.', example: 'senior-go-engineer-acme-1a2b' }],
          query: [
              { name: 'limit', type: 'integer', description: 'Page size, 1–200 (default 50).', example: '50' },
              { name: 'offset', type: 'integer', description: 'Rows to skip.', example: '0' },
          ],
          curl: `curl "${BASE_URL}/jobs/senior-go-engineer-acme-1a2b/copies"`,
          responseExample: `{
              "data": [
                {
                  "public_slug": "senior-go-engineer-acme-1a2b",
                  "location": "Berlin, Germany",
                  "apply_url": "https://boards.greenhouse.io/acme/jobs/123",
                  "posted_at": "2026-06-18T00:00:00Z"
                }
              ],
              "meta": { "total": 4 }
            }`,
      }
    ],
  },
  {
    title: 'Companies',
    intro: 'Public company directory and company job listings.',
    endpoints: [
            {
          method: 'GET',
          path: '/companies',
          auth: 'none',
          summary: 'List companies with job counts and denormalized facets; optional filters.',
          description: 'Most active first. Facet params are repeatable and filter by array overlap ' +
              '(OR within a facet, AND across facets), composably with `q`. `meta.total` ' +
              'reports the count matching the full filter.',
          query: [
              { name: 'q', type: 'string', description: 'Case-insensitive name substring filter.', example: 'acme' },
              { name: 'collections', type: 'string', description: 'Curated-collection slug (e.g. `yc`, `bigtech`). Repeatable.', example: 'yc' },
              { name: 'regions', type: 'string', description: 'Region the company hires in. Repeatable.', example: 'eu' },
              { name: 'countries', type: 'string', description: 'ISO 3166-1 alpha-2 country. Repeatable.', example: 'DE' },
              { name: 'industries', type: 'string', description: 'Curated industry. Matches a company through its curated industries **or** the equivalent job-derived domain. Repeatable.', example: 'fintech' },
              { name: 'domains', type: 'string', description: 'Raw job-derived domain, including values no industry names (`other`, `media`, `mobility`). Repeatable.', example: 'fintech' },
              { name: 'company_type', type: 'string', description: 'Company type (e.g. `product`, `outstaff`). Repeatable.', example: 'product' },
              { name: 'company_size', type: 'string', description: 'Size bucket (e.g. `51-200`). Repeatable.', example: '51-200' },
              { name: 'remote_regions', type: 'string', description: 'Job-derived remote-hiring region. Repeatable.', example: 'eu' },
              { name: 'yc_batch', type: 'string', description: 'YC batch (e.g. `W21`). Repeatable.', example: 'W21' },
              { name: 'yc_status', type: 'string', description: 'YC company status. Repeatable.', example: 'active' },
              { name: 'yc_stage', type: 'string', description: 'YC funding stage. Repeatable.', example: 'series-a' },
              { name: 'yc_flags', type: 'string', description: 'Curated YC highlight flag. Repeatable.', example: 'hiring' },
              { name: 'maturity', type: 'string', description: 'Company stage/maturity. Repeatable.', example: 'growth' },
              { name: 'subindustries', type: 'string', description: 'YC subindustry leaf (see /companies/subindustries). Repeatable.', example: 'payments' },
              { name: 'limit', type: 'integer', description: 'Page size, 1–100.', example: '20' },
              { name: 'offset', type: 'integer', description: 'Rows to skip.', example: '0' },
          ],
          curl: `curl "${BASE_URL}/companies?q=acme&collections=yc"`,
          responseExample: `{
              "data": [
                {
                  "slug": "acme",
                  "name": "Acme",
                  "job_count": 12,
                  "collections": ["yc"],
                  "regions": ["eu"],
                  "countries": ["DE"],
                  "domains": ["fintech"],
                  "company_types": ["product"],
                  "company_sizes": ["51-200"],
                  "industries": ["payments"],
                  "year_founded": 2015,
                  "employee_count": 120,
                  "hq_country": "DE",
                  "organization_type": "private",
                  "tagline": "Payments for builders",
                  "company_info": { "...": "..." },
                  "remote_regions": ["eu"],
                  "yc_batch": ["W21"],
                  "yc_status": ["active"],
                  "yc_stage": ["series-a"],
                  "yc_flags": ["hiring"],
                  "maturity": "growth"
                }
              ],
              "meta": { "total": 1, "limit": 20, "offset": 0 }
            }`,
      },
            {
          method: 'GET',
          path: '/companies/subindustries',
          auth: 'none',
          summary: 'Distinct company subindustry vocabulary with company counts.',
          description: 'Backs the searchable “Industry” facet’s option list, most common first. ' +
              'Counts are unconditional (they do not reflect other active list filters).',
          curl: `curl "${BASE_URL}/companies/subindustries"`,
          responseExample: `{ "data": [ { "value": "payments", "count": 42 }, { "value": "developer-tools", "count": 31 } ] }`,
      },
            {
          method: 'GET',
          path: '/companies/{slug}',
          auth: 'none',
          summary: 'A company and a page of its open jobs.',
          pathParams: [{ name: 'slug', type: 'string', required: true, description: 'The company slug.', example: 'acme' }],
          query: [
              { name: 'limit', type: 'integer', description: 'Page size for the jobs list.', example: '20' },
              { name: 'offset', type: 'integer', description: 'Rows to skip in the jobs list.', example: '0' },
          ],
          curl: `curl "${BASE_URL}/companies/acme"`,
          responseExample: `{
              "data": {
                "company": {
                  "slug": "acme",
                  "name": "Acme",
                  "job_count": 12,
                  "collections": ["yc"],
                  "regions": ["eu"],
                  "countries": ["DE"],
                  "domains": ["fintech"],
                  "company_types": ["product"],
                  "company_sizes": ["51-200"],
                  "industries": ["payments"],
                  "year_founded": 2015,
                  "employee_count": 120,
                  "hq_country": "DE",
                  "organization_type": "private",
                  "tagline": "Payments for builders",
                  "company_info": { "...": "..." },
                  "remote_regions": ["eu"],
                  "yc_batch": ["W21"],
                  "yc_status": ["active"],
                  "yc_stage": ["series-a"],
                  "yc_flags": ["hiring"],
                  "maturity": "growth"
                },
                "jobs": [ { "public_slug": "...", "title": "...", "...": "..." } ]
              }
            }`,
      },
            {
          method: 'GET',
          path: '/companies/{slug}/hiring',
          auth: 'none',
          summary: 'How one company hires over time — the company page’s Hiring tab.',
          description: 'The company’s postings added vs. removed per period (dense, missing periods ' +
              'are 0, same window rules as `/stats/jobs-activity`), its open postings now and ' +
              '30 days ago, and the median days its postings stay open before an ' +
              'employer-side closure over the last 180 days, and the page views its postings ' +
              'drew over the last 30 days and the 30 before (`views`, `views_prev`: one visitor ' +
              'counted once per posting per day, crawlers excluded). `lifetime` is omitted below 5 ' +
              'such closures — absent, never 0. An unknown slug is a `404`; a slug retired ' +
              'by a company merge redirects `301` to the canonical one.',
          pathParams: [{ name: 'slug', type: 'string', required: true, description: 'The company slug.', example: 'acme' }],
          query: [
              { name: 'granularity', type: 'string', description: 'One of `day`, `week`, `month` (default `day`).', example: 'week' },
              { name: 'from', type: 'string (YYYY-MM-DD)', description: 'Start date (UTC). Defaults to a per-granularity window before `to`.', example: '2026-01-01' },
              { name: 'to', type: 'string (YYYY-MM-DD)', description: 'End date (UTC). Defaults to today.', example: '2026-06-30' },
          ],
          curl: `curl "${BASE_URL}/companies/acme/hiring?granularity=week"`,
          responseExample: `{
              "data": {
                "open": 42,
                "open_prev": 30,
                "growth": 12,
                "views": 2114,
                "views_prev": 1800,
                "series": [
                  { "period": "2026-06-01", "added": 5, "removed": 2 },
                  { "period": "2026-06-08", "added": 3, "removed": 4 }
                ],
                "lifetime": { "closed": 37, "median_days": 21.5 }
              }
            }`,
      },
            {
          method: 'GET',
          path: '/companies/{slug}/closed-jobs',
          auth: 'none',
          summary: 'A company’s closed postings — the company page’s Closed tab.',
          description: 'A page of the postings the company has closed, most recently closed first. Closed ' +
              'postings are not in search, so this is the only list of them. There is no total: ' +
              '`meta.has_more` says whether another page follows. Paging reaches the first 2000 ' +
              'rows (`offset + limit` ≤ 2000); a deeper page is a `400`. An unknown slug is a ' +
              '`404`; a slug retired by a company merge redirects `301` to the canonical one.',
          pathParams: [{ name: 'slug', type: 'string', required: true, description: 'The company slug.', example: 'acme' }],
          query: [
              { name: 'limit', type: 'integer', description: 'Page size (max 100).', example: '20' },
              { name: 'offset', type: 'integer', description: 'Rows to skip; `offset + limit` may not exceed 2000.', example: '0' },
          ],
          curl: `curl "${BASE_URL}/companies/acme/closed-jobs"`,
          responseExample: `{
              "data": [{ "public_slug": "backend-engineer-acme-1a2b3c4d", "title": "Backend Engineer", "closed_at": "2026-10-01T09:00:00Z" }],
              "meta": { "limit": 20, "offset": 0, "has_more": true }
            }`,
      }
    ],
  },
  {
    title: 'Geography',
    intro: 'Public location lookup for search filters.',
    endpoints: [
            {
          method: 'GET',
          path: '/geo/cities',
          auth: 'none',
          summary: 'Prefix-search city names for autocomplete.',
          description: 'Population-ranked prefix search over the embedded city dictionary, ' +
              'optionally narrowed to one country. A blank `q` returns an empty list.',
          query: [
              { name: 'q', type: 'string', description: 'Prefix to match.', example: 'berl' },
              { name: 'country', type: 'string', description: 'ISO 3166-1 alpha-2 code to narrow to.', example: 'DE' },
          ],
          curl: `curl "${BASE_URL}/geo/cities?q=berl&country=DE"`,
          responseExample: `{ "data": [ { "value": "Berlin", "country": "DE" } ] }`,
      }
    ],
  },
  {
    title: 'Suggestions and live feed',
    intro: 'Search completions and the live stream shown on the public homepage.',
    endpoints: [
      { "method": "GET", "path": "/suggest", "auth": "none", "summary": "Complete a partially typed job or company query.", "description": "Returns at most 20 suggestions. An empty query returns an empty list.", "query": [{ "name": "q", "type": "string", "description": "Text to complete.", "example": "gol" }, { "name": "limit", "type": "integer", "description": "Maximum results, default 5 and capped at 20.", "example": "10" }], "curl": "curl \"https://freehire.me/api/v1/suggest?q=gol&limit=10\"", "responseExample": "{ \"data\": [{ \"text\": \"golang\", \"type\": \"skill\", \"count\": 42 }], \"meta\": { \"count\": 1 } }" },
      { "method": "GET", "path": "/feed/recent", "auth": "none", "summary": "Stream recent catalogue activity using Server-Sent Events.", "description": "Replays the current feed backlog on connect, then sends new entries and periodic ping events. The connection remains open until the client disconnects.", "curl": "curl -N \"https://freehire.me/api/v1/feed/recent\"", "responseExample": "event: job\ndata: {\"kind\":\"single\",\"title\":\"Senior Go Engineer\",\"company_name\":\"Acme\",\"job_slug\":\"senior-go-engineer-acme-1a2b\",\"produced_at\":\"2026-11-05T12:00:00Z\"}\n\n" }
    ],
  },
  {
    title: 'Catalogue',
    intro: 'Public catalogue scale and freshness information.',
    endpoints: [
            {
          method: 'GET',
          path: '/stats/catalog',
          auth: 'none',
          summary: 'The headline catalogue-scale figures (open jobs, companies, sources, …).',
          description: 'The canonical numbers behind every "how big is this" figure on the ' +
              'site (the jobs list total, the /about and /open pages). Backed by one ' +
              'snapshot `cmd/rollup-stats` republishes periodically, not a live ' +
              'count. `exact: false` means the cache was cold and the figures fell ' +
              'back to a planner estimate — treat them as approximate when it is ' +
              'false.',
          curl: `curl "${BASE_URL}/stats/catalog"`,
          responseExample: `{
              "data": {
                "open_jobs": 42130,
                "companies": 6210,
                "sources": 48,
                "ats_platforms": 22,
                "telegram_channels": 340,
                "computed_at": "2026-06-18T06:00:00Z",
                "exact": true
              }
            }`,
      }
    ],
  },
  {
    title: 'Sitemaps',
    intro: 'Public paginated reads used to build job and company XML sitemaps.',
    endpoints: [
      { "method": "GET", "path": "/jobs/sitemap", "auth": "none", "summary": "Return one page of job sitemap entries.", "description": "Page size and offset are bounded; defaults to 10,000 entries.", "query": [{ "name": "limit", "type": "integer", "description": "Page size.", "example": "10000" }, { "name": "offset", "type": "integer", "description": "Rows to skip.", "example": "0" }], "curl": "curl \"https://freehire.me/api/v1/jobs/sitemap?limit=10000&offset=0\"", "responseExample": "{ \"data\": [{ \"slug\": \"senior-go-engineer-acme-1a2b\", \"updated_at\": \"2026-11-05T12:00:00Z\" }] }" },
      { "method": "GET", "path": "/jobs/sitemap/fresh", "auth": "none", "summary": "Return a newest-first page of job sitemap entries.", "description": "The newest-job window is bounded; requests beyond it return an empty page.", "query": [{ "name": "limit", "type": "integer", "description": "Page size.", "example": "10000" }, { "name": "offset", "type": "integer", "description": "Rows to skip.", "example": "0" }], "curl": "curl \"https://freehire.me/api/v1/jobs/sitemap/fresh?limit=10000&offset=0\"", "responseExample": "{ \"data\": [{ \"slug\": \"senior-go-engineer-acme-1a2b\", \"updated_at\": \"2026-11-05T12:00:00Z\" }] }" },
      { "method": "GET", "path": "/jobs/sitemap/boundaries", "auth": "none", "summary": "List offsets for job sitemap chunks.", "description": "The chunk size is clamped to the supported range.", "query": [{ "name": "chunk", "type": "integer", "description": "Sitemap chunk size.", "example": "10000" }], "curl": "curl \"https://freehire.me/api/v1/jobs/sitemap/boundaries?chunk=10000\"", "responseExample": "{ \"data\": [0, 10000] }" },
      { "method": "GET", "path": "/companies/sitemap", "auth": "none", "summary": "Return one page of company sitemap entries.", "description": "Page size and offset are bounded; defaults to 10,000 entries.", "query": [{ "name": "limit", "type": "integer", "description": "Page size.", "example": "10000" }, { "name": "offset", "type": "integer", "description": "Rows to skip.", "example": "0" }], "curl": "curl \"https://freehire.me/api/v1/companies/sitemap?limit=10000&offset=0\"", "responseExample": "{ \"data\": [{ \"slug\": \"senior-go-engineer-acme-1a2b\", \"updated_at\": \"2026-11-05T12:00:00Z\" }] }" },
      { "method": "GET", "path": "/companies/sitemap/boundaries", "auth": "none", "summary": "List offsets for company sitemap chunks.", "description": "The chunk size is clamped to the supported range.", "query": [{ "name": "chunk", "type": "integer", "description": "Sitemap chunk size.", "example": "10000" }], "curl": "curl \"https://freehire.me/api/v1/companies/sitemap/boundaries?chunk=10000\"", "responseExample": "{ \"data\": [0, 10000] }" }
    ],
  }
];
