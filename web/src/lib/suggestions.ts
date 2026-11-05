// What the header search box offers, and what an EMPTY box offers in particular.
//
// The dropdown used to hold one kind of thing (roles) and so needed no vocabulary for
// "what sort of suggestion is this". It now holds two, and will hold more once the
// suggestions index lands — so `Suggestion` is the shape the dropdown renders and
// applies, independent of where the rows came from.
//
// Pure by design: no Svelte, no DOM, no network. The caller passes the facet
// distribution it has already fetched.

import { CATEGORY_GROUPS } from './filterSections';
import type { FacetCounts } from './types';

/** One row of the dropdown. `kind` is the vocabulary the row comes from, which decides
 *  its glyph — and, for the locally-built starter rows, which facet a pick applies.
 *  Rows from the suggestions endpoint carry their own parts and are applied from
 *  those, so there `kind` is presentation only. */
export interface Suggestion {
  kind: 'title' | 'skill' | 'category' | 'company';
  slug: string;
  label: string;
  /** Open postings behind it. Absent when the distribution has not been measured yet
   *  — an absent measurement must not render as a zero. */
  count?: number;
}

/** How many rows an empty box offers. Ten is what a visitor will actually read. */
const maxStarters = 10;

/** The catch-all category. A real facet value and a useless suggestion: it names no
 *  craft, so it cannot answer the question an empty box is asking. */
const catchAll = 'other';

/** The most common measured categories across the whole catalogue. The flat ranking is
 *  intentional: suggestions should describe the jobs people can actually find, not a
 *  product's former IT-only focus. CATEGORY_GROUPS supplies the stable tie order. */
export function starterSuggestions(
  counts: FacetCounts | null,
  limit: number = maxStarters,
): Suggestion[] {
  const dist = counts?.facets?.category;
  if (!dist) return [];

  return CATEGORY_GROUPS.flatMap((section) => section.options)
    .filter((option) => option.value !== catchAll && dist[option.value] !== undefined)
    .sort((a, b) => (dist[b.value] ?? 0) - (dist[a.value] ?? 0))
    .slice(0, limit)
    .map((option) => ({
      kind: 'category',
      slug: option.value,
      label: option.label,
      count: dist[option.value],
    }));
}
