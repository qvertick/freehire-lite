import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '#lib/api.js';

const api = {
  getJob: vi.fn(),
  getSimilarJobs: vi.fn(),
  getJobCopies: vi.fn(),
  facetCounts: vi.fn(),
};

vi.mock('#lib/server/api.js', () => ({ serverApi: () => api }));

const { load } = await import('./+page.server.js');

type LoadEvent = Parameters<typeof load>[0];

const job = {
  public_slug: 'a-1',
  title: 'Dev',
  enrichment: {},
  skills: [],
  countries: [],
  regions: [],
  collections: [],
};

function run(slug: string) {
  return load({ params: { slug }, fetch, url: new URL(`https://x/jobs/${slug}`) } as unknown as LoadEvent);
}

describe('job page load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getSimilarJobs.mockResolvedValue([]);
    api.getJobCopies.mockResolvedValue({ copies: [], total: 0 });
    api.facetCounts.mockResolvedValue(null);
  });

  it('loads public job details and discovery links without application data', async () => {
    api.getJob.mockResolvedValue(job);

    const data = await run('a-1');

    expect(api.getJob).toHaveBeenCalledWith('a-1');
    expect(data).toMatchObject({
      job,
      similar: [],
      copies: [],
      copiesTotal: 0,
    });
    expect(data).not.toHaveProperty('applyForm');
  });

  it('returns a 404 for an unknown job', async () => {
    api.getJob.mockRejectedValue(new ApiError(404, 'not found'));

    await expect(run('gone')).rejects.toMatchObject({ status: 404 });
  });
});
