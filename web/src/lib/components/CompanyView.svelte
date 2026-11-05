<script lang="ts">
  import type { Slice } from '#lib/api.js';
  import type { Company, CompanyRef, Job } from '#lib/types.js';
  import JobsView from './JobsView.svelte';
  import States from './States.svelte';
  import CompanyHeader from './CompanyHeader.svelte';
  import CompanyTabs from './CompanyTabs.svelte';
  import CompanyAbout from './CompanyAbout.svelte';
  import CompanyFacts from './CompanyFacts.svelte';
  import CompanyRelations from './CompanyRelations.svelte';

  // Both the company entity and its first page of jobs are server-rendered (route
  // `load`), so the header AND the job rows — with their /jobs/<slug> links — are in
  // the initial HTML for crawlers. The list reuses the same filterable, counted
  // search view as /jobs, pinned to this company: `company_slug` is fixed (not a
  // selectable facet) and the Source facet is hidden, since a single company's
  // postings share one source. `initial` is null when the search call failed; the
  // rest of the page still renders (see the route's load).
  let {
    company,
    initial,
    slug,
    currentPage,
    parent,
    subsidiaries,
  }: {
    company: Company;
    initial: Slice<Job> | null;
    slug: string;
    // Passed straight to JobsView, where page links are the only way through the
    // results — so it is required here too rather than defaulting to page one.
    currentPage: number;
    // The company that owns this one and the ones it owns: separate employers, linked.
    parent: CompanyRef | null;
    subsidiaries: CompanyRef[];
  } = $props();
</script>

<CompanyHeader {company} {slug} />
<CompanyRelations {parent} {subsidiaries} />

<CompanyTabs {slug} active="jobs">
  <!-- Company facts + About sit atop the jobs sidebar on desktop (passed into JobsView
       as `sidebarTop`); the sidebar is hidden on mobile, so mirror them here as cards
       under the header. Both render nothing when the company has no facts/description. -->
  <div class="mt-4 flex flex-col gap-4 md:hidden">
    <CompanyFacts {company} />
    <CompanyAbout {company} />
  </div>

  <div class="mt-4">
    <!-- The job cards are h3s under the company's h1; this names the list between them,
         the way /jobs does, so the outline does not skip a level. -->
    <h2 class="sr-only">Open positions</h2>
    {#if initial}
      <JobsView {initial} {currentPage} scope={{ company_slug: slug }} excludeFacets={['source']}>
        {#snippet sidebarTop()}
          <CompanyFacts {company} />
          <CompanyAbout {company} />
        {/snippet}
      </JobsView>
    {:else}
      <States state="error" message="Couldn't load jobs for this company." />
    {/if}
  </div>
</CompanyTabs>
