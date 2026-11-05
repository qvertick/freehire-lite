import { render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import JobsView from './JobsView.svelte';

vi.mock('$app/env', () => ({ browser: true, PUBLIC_OPEN_WITHIN: '' }));
vi.mock('$app/state', () => ({
  page: { data: { locale: 'en' }, url: new URL('http://localhost/jobs'), state: {} },
}));
vi.mock('$app/paths', () => ({ resolve: (p: string) => p, base: '', assets: '' }));
vi.mock('$app/navigation', () => ({ afterNavigate() {}, replaceState: vi.fn() }));
vi.mock('#lib/auth.svelte.js', () => ({ isAuthenticated: () => false }));
vi.mock('#lib/analytics.js', () => ({ track() {} }));
const { searchJobs } = vi.hoisted(() => ({ searchJobs: vi.fn() }));
vi.mock('#lib/api.js', () => ({
  ApiError: class extends Error {},
  api: {
    searchJobs,
    facetCounts: async () => ({ total: 0, facets: {} }),
  },
}));
vi.mock('./filters/FilterModal.svelte', () => ({ default() {} }));

beforeEach(() => {
  searchJobs.mockReset().mockResolvedValue({ items: [], total: 0, hasMore: false });
  localStorage.clear();
  window.history.replaceState({}, '', '/jobs');
});

function mountList(params: string, scope = {}) {
  window.history.replaceState({}, '', `/jobs${params ? `?${params}` : ''}`);
  return render(JobsView, {
    initial: { items: [], total: 0, hasMore: false },
    initialParams: params,
    currentPage: 1,
    scope,
  });
}

describe('public job search', () => {
  it('renders the public filter and sort controls without account actions', () => {
    mountList('');

    expect(screen.getAllByRole('combobox', { name: 'Sort jobs' }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /sign in/i })).toBeNull();
  });

  it('drops legacy personal filters from public search requests', async () => {
    mountList('hide_seen=true&former_employers=true');

    await waitFor(() => expect(searchJobs).toHaveBeenCalled());
    const params = searchJobs.mock.calls[0]?.[0] as URLSearchParams;
    expect(params.has('hide_seen')).toBe(false);
    expect(params.has('former_employers')).toBe(false);
  });

  it('preserves keyword search and fixed company scope in the API request', async () => {
    mountList('q=engineer&sort=view_count', { company_slug: 'acme' });

    await waitFor(() => expect(searchJobs).toHaveBeenCalled());
    const params = searchJobs.mock.calls[0]?.[0] as URLSearchParams;
    expect(params.get('q')).toBe('engineer');
    expect(params.get('company_slug')).toBe('acme');
    expect(params.get('sort')).toBe('view_count');
  });
});
