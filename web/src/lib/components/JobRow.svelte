<script lang="ts">
  import type { Snippet } from 'svelte';
  import { resolve } from '$app/paths';
  import { ArrowUpRight, Building2, MapPin } from '@lucide/svelte';
  import { cardTags, cardTagsFromCard, formatSalary } from '#lib/enrichment.js';
  import { categoryLabel } from '#lib/labels.js';
  import { seniorityLabel } from '#lib/insights.js';
  import { foreignContentLang, metaDescription } from '#lib/seo.js';
  import type { Job, JobCard } from '#lib/types.js';
  import { Badge, EntityLogo } from '#lib/ui/index.js';
  import { locale } from '#lib/i18n/currentLocale.svelte.js';
  import { companyLogoUrl } from '#lib/logo.js';
  import { timeAgo } from '#lib/utils.js';

  let {
    job,
    newTab = false,
    compact = false,
  }: {
    job: Job | JobCard;
    newTab?: boolean;
    compact?: boolean;
    dimViewed?: boolean;
    footer?: Snippet;
    onHide?: (slug: string) => void;
    unsave?: (slug: string) => Promise<unknown>;
    children?: Snippet;
  } = $props();

  const blurb = $derived(
    'enrichment' in job
      ? job.enrichment.summary || metaDescription(job.description, 220)
      : metaDescription(job.blurb ?? '', 220),
  );
  const salary = $derived('enrichment' in job ? formatSalary(job.enrichment) : null);
  const tags = $derived('enrichment' in job ? cardTags(job) : cardTagsFromCard(job));
  const jobLocale = $derived(locale());
  const posted = $derived(timeAgo(job.posted_at, jobLocale));
  const category = $derived('enrichment' in job ? job.enrichment.category : undefined);
  const seniority = $derived(
    'enrichment' in job ? job.enrichment.seniority : job.seniority,
  );
  const href = $derived(resolve('/jobs/[slug]', { slug: job.public_slug }));
</script>

<article
  class={`group overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-muted-foreground/30 hover:bg-muted/30 ${job.closed_at ? 'opacity-65' : ''}`}
>
  <!-- eslint-disable svelte/no-navigation-without-resolve -- `href` is the route resolved above with the job's slug. -->
  <a
    {href}
    target={newTab ? '_blank' : undefined}
    rel={newTab ? 'noopener noreferrer' : undefined}
    class={`block p-4 sm:p-5 ${compact ? 'sm:p-4' : ''}`}
    aria-label={`${job.title} at ${job.company}`}
  >
    <div class="flex items-start gap-3">
      <EntityLogo
        name={job.company}
        src={companyLogoUrl(job.company) ?? undefined}
        size="md"
        class="mt-0.5 shrink-0"
      />
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h2
            class="min-w-0 flex-1 text-base font-semibold leading-snug tracking-tight text-foreground group-hover:text-brand-strong sm:text-lg"
            lang={foreignContentLang(job)}
          >
            {job.title}
          </h2>
          {#if job.closed_at}
            <Badge variant="outline">Closed</Badge>
          {/if}
        </div>
        <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span class="inline-flex items-center gap-1.5">
            <Building2 class="size-3.5 shrink-0" aria-hidden="true" />
            {job.company}
          </span>
          {#if job.location}
            <span class="inline-flex items-center gap-1.5">
              <MapPin class="size-3.5 shrink-0" aria-hidden="true" />
              {job.location}
            </span>
          {/if}
          {#if posted}
            <span class="text-xs">{posted}</span>
          {/if}
        </div>
      </div>
      <ArrowUpRight
        class="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </div>

    {#if blurb || salary}
      <div class="mt-3 flex flex-wrap items-start justify-between gap-3 pl-0 sm:pl-12">
        {#if blurb}
          <p
            class="max-w-3xl flex-1 text-sm leading-relaxed text-muted-foreground"
            lang={foreignContentLang(job)}
          >
            {blurb}
          </p>
        {/if}
        {#if salary}
          <span class="shrink-0 text-sm font-semibold tabular-nums text-foreground">{salary}</span>
        {/if}
      </div>
    {/if}

    {#if category || seniority || job.work_mode || tags.length > 0}
      <div class="mt-3 flex flex-wrap items-center gap-1.5 pl-0 sm:pl-12">
        {#if category}
          <Badge variant="secondary">{categoryLabel(category)}</Badge>
        {/if}
        {#if seniority}
          <Badge variant="outline">{seniorityLabel(seniority)}</Badge>
        {/if}
        {#if job.work_mode}
          <Badge variant="outline">{job.work_mode}</Badge>
        {/if}
        {#each tags.slice(0, 4) as tag (tag)}
          <Badge variant="outline">{tag}</Badge>
        {/each}
      </div>
    {/if}
  </a>
  <!-- eslint-enable svelte/no-navigation-without-resolve -->
</article>
