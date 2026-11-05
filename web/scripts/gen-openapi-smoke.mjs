// Smoke checks for the public job-search OpenAPI generator.

import { loadDocsModules } from './gen-api-docs.mjs';
import { renderOpenApi } from './gen-openapi.mjs';
import { buildDeprecatedFixture } from './deprecatedFixture.mjs';

const checks = [];
function assert(name, condition) {
  checks.push({ name, ok: Boolean(condition) });
}

async function main() {
  const { spec, filters } = await loadDocsModules();
  const a = renderOpenApi(spec, filters);
  const b = renderOpenApi(spec, filters);

  assert('idempotent output', JSON.stringify(a) === JSON.stringify(b));
  assert('OpenAPI 3.1', a.openapi === '3.1.0');
  assert('title present', typeof a.info?.title === 'string' && a.info.title.length > 0);
  assert('pagination documented', a.info.description.includes('## Pagination'));
  assert('filters documented', a.info.description.includes('## Filtering jobs'));
  assert('string facet documented', a.info.description.includes('`seniority`'));
  assert('filter recipe documented', a.info.description.includes(filters.RECIPES[0].query));

  const search = a.paths['/jobs/search']?.get;
  assert('search endpoint documented', Boolean(search));
  assert('endpoint tag comes from group', search.tags?.includes('Jobs'));
  assert('public endpoint explicitly has no security', Array.isArray(search.security) && search.security.length === 0);

  const facets = a.paths['/jobs/facets']?.get;
  assert('filter placeholder is not emitted as a parameter', !(facets.parameters ?? []).some((p) => p.name.startsWith('(')));
  assert('placeholder note is included', facets.description.includes('Any supported search filter param'));

  const feed = a.paths['/feed/recent']?.get;
  assert('recent feed documented', Boolean(feed));
  assert('recent feed uses Server-Sent Events', 'text/event-stream' in (feed.responses?.['200']?.content ?? {}));
  assert('no account security schemes', a.components === undefined);
  assert('suggest endpoint documented', Boolean(a.paths['/suggest']?.get));
  assert('sitemap endpoint documented', Boolean(a.paths['/jobs/sitemap']?.get));
  assert('retired account routes omitted', !a.paths['/auth/login'] && !a.paths['/me/searches'] && !a.paths['/assistant/sessions']);
  assert('link-intake route omitted', !a.paths['/jobs/find']);

  const slug = a.paths['/jobs/{slug}']?.get;
  assert('job path parameter required', slug.parameters?.find((p) => p.name === 'slug')?.required === true);

  const deprecated = renderOpenApi(buildDeprecatedFixture(spec), filters);
  const fixture = deprecated.paths['/fixture/{id}'].get;
  assert('deprecated operation marked', fixture.deprecated === true);
  assert('replacement included', fixture.description.includes('GET /fixture/v2/{id}'));
  assert('path parameter required', fixture.parameters.find((p) => p.name === 'id')?.required === true);

  let failed = 0;
  for (const check of checks) {
    if (!check.ok) failed++;
    console.log(`${check.ok ? 'PASS' : 'FAIL'}  ${check.name}`);
  }
  if (failed) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${checks.length} checks passed.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
