<script lang="ts">
  import { resolve } from '$app/paths';
  import { ArrowUpRight, Building2, MapPin } from '@lucide/svelte';
  import { categoryLabel } from '#lib/labels.js';
  import { formatSalary } from '#lib/enrichment.js';
  import { foreignContentLang } from '#lib/seo.js';
  import { Badge, EntityLogo } from '#lib/ui/index.js';
  import type { Job } from '#lib/types.js';
  import { formatDate } from '#lib/utils.js';
  import { locale } from '#lib/i18n/currentLocale.svelte.js';
  import JobDescription from './JobDescription.svelte';
  import JobSourceRow from './JobSourceRow.svelte';

  let { job }: { job: Job } = $props();

  const salary = $derived(formatSalary(job.enrichment));
  const category = $derived(job.enrichment.category);
  const detailItems = $derived(
    [
      job.enrichment.seniority,
      job.enrichment.employment_type,
      job.work_mode,
      job.enrichment.relocation,
    ].filter((value): value is string => Boolean(value)),
  );
  const skillList = $derived(job.skills.slice(0, 12));
  const postedDate = $derived(formatDate(job.posted_at, locale()));
</script>

<article class="mx-auto max-w-5xl">
  {#if job.closed_at}
    <div class="mb-5 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
      This vacancy is no longer listed as open. You can still visit the original posting for the latest information.
    </div>
  {/if}

  <header class="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
    <div class="flex flex-col gap-6 sm:flex-row sm:items-start">
      <EntityLogo
        name={job.company}
        size="lg"
        class="size-14 shrink-0 rounded-xl"
      />
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          {#if category}
            <Badge variant="secondary">{categoryLabel(category)}</Badge>
          {/if}
          {#if job.work_mode}
            <Badge variant="outline">{job.work_mode}</Badge>
          {/if}
          {#if job.is_tech === 'non_tech'}
            <Badge variant="outline">Non-IT role</Badge>
          {/if}
        </div>

        <h1 class="mt-3 text-2xl font-bold leading-tight tracking-tight text-foreground sm:text-3xl" lang={foreignContentLang(job)}>
          {job.title}
        </h1>

        <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <a
            href={resolve('/companies/[slug]', { slug: job.company_slug })}
            class="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-brand-strong hover:underline"
          >
            <Building2 class="size-4 shrink-0" aria-hidden="true" />
            {job.company}
          </a>
          {#if job.location}
            <span class="inline-flex items-center gap-1.5">
              <MapPin class="size-4 shrink-0" aria-hidden="true" />
              {job.location}
            </span>
          {/if}
        </div>

        {#if detailItems.length || salary}
          <div class="mt-5 flex flex-wrap gap-2">
            {#each detailItems as item (item)}
              <Badge variant="outline">{item}</Badge>
            {/each}
            {#if salary}
              <Badge variant="outline">{salary}</Badge>
            {/if}
          </div>
        {/if}

        {#if job.url}
          <!-- eslint-disable svelte/no-navigation-without-resolve -- original posting URL is external and must not be passed through SvelteKit's route resolver. -->
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            class="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            View original posting
            <ArrowUpRight class="size-4" aria-hidden="true" />
          </a>
          <!-- eslint-enable svelte/no-navigation-without-resolve -->
        {/if}
      </div>
    </div>

    {#if job.enrichment.summary}
      <p class="mt-7 border-t border-border pt-5 text-base leading-relaxed text-muted-foreground" lang={foreignContentLang(job)}>
        {job.enrichment.summary}
      </p>
    {/if}
  </header>

  <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
    <section class="min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-8">
      <h2 class="text-lg font-semibold tracking-tight">Job description</h2>
      {#if job.description}
        <div class="mt-5">
          <JobDescription html={job.description} lang={foreignContentLang(job)} />
        </div>
      {:else}
        <p class="mt-4 text-sm text-muted-foreground">
          The source did not provide a full description. Visit the original posting for details.
        </p>
      {/if}
    </section>

    <aside class="space-y-5">
      {#if skillList.length}
        <section class="rounded-2xl border border-border bg-card p-5">
          <h2 class="text-sm font-semibold">Skills</h2>
          <div class="mt-3 flex flex-wrap gap-2">
            {#each skillList as skill (skill)}
              <Badge variant="secondary">{skill}</Badge>
            {/each}
          </div>
        </section>
      {/if}

      <section class="rounded-2xl border border-border bg-card p-5">
        <h2 class="text-sm font-semibold">Listing source</h2>
        <div class="mt-4">
          <JobSourceRow source={job.source} jobUrl={job.url} manuallyAdded={job.manually_added} />
        </div>
        {#if job.posted_at}
          <p class="mt-4 text-xs text-muted-foreground">
            Posted <time datetime={job.posted_at}>{postedDate}</time>
          </p>
        {/if}
      </section>
    </aside>
  </div>
</article>
