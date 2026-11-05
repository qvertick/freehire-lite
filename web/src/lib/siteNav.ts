// The site's top-level destinations, named once.
//
// Two navigations lead to them: the menu behind the header's burger (HeaderMenu),
// which lists all of them, and the homepage header's own row (TopBar), which on that
// one route stands in for the search box and shows a subset. They were two arrays, and
// the last time a destination moved — the feed, from `/` to `/jobs` — the menu's copy
// went on pointing at the old one until someone read both lists side by side. One list
// is how that stops being possible.
//
// A destination carries its glyph so the header navigations stay consistent.

import {
  Briefcase,
  Building2,
  Compass,
  Info,
  Layers,
  Unlock,
} from '@lucide/svelte';
import type { LucideIcon } from '@lucide/svelte';
import type { Pathname } from '#lib/pathname.js';

export type SiteNavItem = {
  /** SvelteKit's own union of this app's route paths, not a string — so a destination
   *  that stops existing, or was never spelled right, is a compile error rather than a
   *  link that 404s. `satisfies` below checks each entry against it while keeping the
   *  literal `resolve()` needs. */
  href: Pathname;
  label: string;
  icon: LucideIcon;
};

export const NAV = {
  // The catalogue itself — what a visitor came to walk.
  jobs: { href: '/jobs', label: 'Jobs', icon: Briefcase },
  companies: { href: '/companies', label: 'Companies', icon: Building2 },
  collections: { href: '/collections', label: 'Collections', icon: Layers },

  // What this is and how it works — what a first-time visitor reads.
  howItWorks: { href: '/how-it-works', label: 'How it works', icon: Compass },
  about: { href: '/about', label: 'About', icon: Info },
  open: { href: '/open', label: 'Open', icon: Unlock },
} as const satisfies Record<string, SiteNavItem>;

/** What the homepage header shows where every other page shows the search box.
 *
 *  This is the compact set of destinations most useful to vacancy search. TopBar draws
 *  only the first two below `lg`; the remaining links fit at desktop widths.
 *
 *  TopBar decides when the row is drawn — and, below `lg`, how much of it: it takes
 *  entries from the FRONT of this list, so the ORDER here is what a narrow screen gets,
 *  not just the order it reads in. */
export const HEADER_LINKS = [
  NAV.jobs,
  NAV.companies,
  NAV.collections,
  NAV.about,
] as const;
