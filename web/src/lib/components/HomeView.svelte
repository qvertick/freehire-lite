<script lang="ts">
  import { resolve } from '$app/paths';
  import { HOME_FAQ } from '#lib/homeFaq.js';

  const {
    stats,
  }: { stats: { jobs: number | null; companies: number | null; sources: number | null } } = $props();

  const formatter = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
  const figures = $derived(
    [
      { value: stats.jobs, label: 'open vacancies' },
      { value: stats.companies, label: 'companies' },
      { value: stats.sources, label: 'sources' },
    ].flatMap((figure) =>
      figure.value === null ? [] : [{ value: formatter.format(figure.value), label: figure.label }],
    ),
  );

  const steps = [
    {
      title: 'Collect',
      body: 'Independent source adapters read vacancies from the job platforms and public career boards currently supported.',
    },
    {
      title: 'Normalize and deduplicate',
      body: 'Listings are mapped to a shared structure and likely duplicates are grouped before they reach search.',
    },
    {
      title: 'Search and follow through',
      body: 'Use the available filters to find relevant openings, then continue to the original listing for its details and application.',
    },
  ];
</script>

<div>
  <section class="py-8 sm:py-12">
    <p class="font-mono text-xs uppercase tracking-wider text-muted-foreground">About</p>
    <h1 class="mt-4 max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
      Find vacancies from multiple sources in one place.
    </h1>
    <p class="mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
      Job Searcher brings listings from supported job platforms into one searchable catalogue,
      with a focus on the Polish job market. Search is available without an account. When you
      find a role, open its original listing to review the details and apply.
    </p>
    <a
      href={resolve('/jobs')}
      class="mt-7 inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
    >
      Browse vacancies
    </a>
  </section>

  {#if figures.length > 0}
    <section class="border-t border-border py-10" aria-label="Current catalogue">
      <h2 class="text-xl font-semibold tracking-tight">Current catalogue</h2>
      <dl class="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3">
        {#each figures as figure (figure.label)}
          <div class="flex flex-col-reverse gap-1">
            <dt class="text-sm text-muted-foreground">{figure.label}</dt>
            <dd class="text-3xl font-semibold tabular-nums tracking-tight">{figure.value}</dd>
          </div>
        {/each}
      </dl>
    </section>
  {/if}

  <section class="border-t border-border py-10">
    <h2 class="text-xl font-semibold tracking-tight">How it works</h2>
    <ol class="mt-6 grid gap-6 sm:grid-cols-3">
      {#each steps as step, index (step.title)}
        <li class="border-l-2 border-border pl-4">
          <p class="font-mono text-xs text-muted-foreground">0{index + 1}</p>
          <h3 class="mt-2 font-semibold">{step.title}</h3>
          <p class="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
        </li>
      {/each}
    </ol>
  </section>

  <section class="border-t border-border py-10">
    <h2 class="text-xl font-semibold tracking-tight">Frequently asked questions</h2>
    <dl class="mt-6 grid gap-6 sm:grid-cols-2">
      {#each HOME_FAQ as item (item.question)}
        <div>
          <dt class="font-semibold">{item.question}</dt>
          <dd class="mt-2 text-sm leading-relaxed text-muted-foreground">{item.answer}</dd>
        </div>
      {/each}
    </dl>
  </section>
</div>
