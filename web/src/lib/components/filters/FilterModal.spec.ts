import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import { FilterStore } from '#lib/filters.js';
import FilterModal from './FilterModal.svelte';

vi.mock('$app/env', () => ({ browser: false, PUBLIC_OPEN_WITHIN: '' }));
vi.mock('$app/state', () => ({
  page: { data: { locale: 'en' }, url: new URL('http://localhost/jobs'), state: {} },
}));
vi.mock('$app/paths', () => ({ resolve: (p: string) => p, base: '', assets: '' }));
vi.mock('$app/navigation', () => ({ afterNavigate() {}, goto: vi.fn(), replaceState: vi.fn() }));
vi.mock('#lib/analytics.js', () => ({ track() {} }));
vi.mock('#lib/api.js', () => ({
  ApiError: class extends Error {},
  api: {
    listCompanies: async () => ({ items: [] }),
    searchCities: async () => [],
  },
}));

describe('public job filters', () => {
  it('keeps company filtering and excludes account-dependent controls', async () => {
    const store = new FilterStore();
    render(FilterModal, { store, open: true, onClose() {} });

    await fireEvent.click(screen.getByRole('button', { name: 'Company' }));
    expect(screen.getByRole('heading', { name: 'Company' })).toBeTruthy();
    expect(screen.queryByText('Hiring again')).toBeNull();
    expect(screen.queryByText('Auto-apply available')).toBeNull();
    expect(screen.queryByText('My filters')).toBeNull();
  });

  it('continues to apply public job filters', async () => {
    const store = new FilterStore();
    render(FilterModal, { store, open: true, onClose() {} });

    await fireEvent.input(screen.getByRole('textbox', { name: 'Search filters' }), { target: { value: 'visa' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Offers visa sponsorship' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Show jobs' }));
    expect(store.value.visa).toBe(true);
  });
});
