import { serverApi } from '#lib/server/api.js';
import type { PageServerLoad } from './$types';

// Load the catalogue figures server-side so crawlers see the same measured counts as visitors.
export const load: PageServerLoad = async ({ fetch }) => {
  const api = serverApi(fetch);
  const scale = await api.catalogScale().catch(() => null);
  return {
    stats: scale
      ? {
          // The de-duplicated count /jobs shows; zero means not measured.
          jobs: scale.unique_open_jobs || null,
          companies: scale.exact ? scale.companies : null,
          atsPlatforms: scale.ats_platforms || null,
        }
      : { jobs: null, companies: null, atsPlatforms: null },
  };
};
