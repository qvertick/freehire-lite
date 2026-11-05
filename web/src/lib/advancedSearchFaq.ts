// Advanced-search landing FAQ — the single source for both the visible section
// (AdvancedSearchLandingView.svelte) and the FAQPage JSON-LD
// (routes/features/advanced-search). Answers stay honest to the real facet
// registry (web/src/lib/facets.ts) and public API.

import type { FaqItem } from './seo';

export const ADVANCED_SEARCH_FAQ: FaqItem[] = [
  {
    question: 'How many filters are there?',
    answer:
      'The filters cover role, specialization, seniority, skills and AI specialization; region, country, city, work format and relocation; company type, company and industry; employment type, salary currency and English level; posting freshness, language and source; plus curated collections such as remote-worldwide roles or YC companies.',
  },
  {
    question: 'Can I exclude a value instead of just not selecting it?',
    answer:
      'For most facets, yes. Click a pill once to include it, again to exclude it, a third time to clear it. Leaving a filter untouched means “don’t care”; excluding a value means “never this one” — for example, excluding a source or a stack you’re not looking for. Curated collections do not have an exclude state.',
  },
  {
    question: 'Can I share a filtered search?',
    answer:
      'Yes. Filters are represented in the URL, so you can bookmark the results or share the link. Anyone who opens it sees the same public search.',
  },
  {
    question: 'Do the same filters work outside the browser?',
    answer:
      'Yes. The public API uses the same filter names as the search page, including role, regions, skills and company_type. See the API reference for request examples.',
  },
];
