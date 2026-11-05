import { serverApi } from '#lib/server/api.js';
import type { PageServerLoad } from './$types';

// Live catalogue scale for the landing stats strip. One call: the backend publishes
// every scale figure as a single snapshot, so the numbers here and the ones on /open
// describe the same measurement rather than two list totals taken at two moments.
//
// The endpoint can return approximate data when no exact snapshot is available. The
// catch covers transport failures; HomeView omits unavailable figures rather than
// presenting stale or illustrative counts.
export const load: PageServerLoad = async ({ fetch }) => {
  try {
    const scale = await serverApi(fetch).catalogScale();
    return {
      stats: {
        // The de-duplicated count /jobs shows, not the raw `open_jobs` (every repost
        // across boards). Zero means Meilisearch was not measured, so null, the same
        // as companies below.
        jobs: scale.unique_open_jobs || null,
        // Only the exact snapshot carries a company count; a degraded read reports
        // zero, which is "not measured", not "none". Null instead, so HomeView omits
        // the figure until an exact count is available.
        companies: scale.exact ? scale.companies : null,
        sources: scale.sources,
      },
    };
  } catch {
    return { stats: { jobs: null, companies: null, sources: null } };
  }
};
