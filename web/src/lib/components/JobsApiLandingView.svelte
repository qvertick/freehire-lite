<script lang="ts">
  import { resolve } from '$app/paths';
  import { JOBS_API_FAQ } from '#lib/jobsApiFaq.js';
  import { Button, SectionLabel } from '#lib/ui/index.js';

  // Public documentation for the read API: its coverage, response shape and filters.
  const {
    stats,
  }: {
    stats: { jobs: number | null; companies: number | null; atsPlatforms: number | null };
  } = $props();

  const compact = (n: number) =>
    new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

  const figures = $derived(
    [
      stats.jobs && { value: compact(stats.jobs), label: 'open postings, de-duplicated' },
      stats.companies && { value: compact(stats.companies), label: 'companies with profiles' },
      stats.atsPlatforms && { value: String(stats.atsPlatforms), label: 'ATS platforms read directly' },
    ].filter((f) => !!f),
  );

  const audiences = [
    {
      title: 'Job boards',
      body: 'Search current openings by keyword, location, category or stack, then link visitors to the original posting.',
    },
    {
      title: 'Market research',
      body: 'Explore hiring activity by skill, seniority, region or work mode across a deduplicated catalogue.',
    },
  ];

  const fields = [
    ['Role', 'title, category, seniority, employment type, skills'],
    ['Place', 'countries, regions, cities, work mode (remote / hybrid / on-site)'],
    ['Pay', 'salary range, currency and period when the posting states it'],
    ['Company', 'name, slug, industry, size, headquarters, founding year, YC batch'],
    ['Apply', 'the employer’s own ATS link and the source platform it came from'],
    ['Lifecycle', 'posted, first and last seen, and closed — a closed posting says so'],
  ];

  const curl = `curl "https://freehire.me/api/v1/jobs/search?countries=de&category=software_engineering&limit=100"`;

  const sample = `{
  "data": [{
    "public_slug": "golang-software-engineer-…-ebn6r4wq",
    "title": "Golang Software Engineer - Identity & Access Management",
    "company": "Allianz",
    "company_slug": "allianz",
    "source": "successfactors",
    "url": "https://internal-careers.allianz.com/job/…",
    "countries": ["de", "pt"],
    "cities": ["Berlin", "Lisbon"],
    "skills": ["go", "keycloak", "oauth", "rbac", "sso"],
    "enrichment": { "category": "software_engineering", "employment_type": "full_time" },
    "posted_at": "2026-10-17T00:00:00Z",
    "closed_at": null
  }],
  "meta": { "total": 161, "limit": 100, "offset": 0 }
}`;
</script>

<div class="jobs-api">
  <section class="grid-bg relative -mx-4 px-4 pb-14 pt-12 sm:pt-16">
    <SectionLabel text="public jobs api" />
    <h1
      class="mt-6 max-w-3xl text-balance text-4xl font-semibold leading-none tracking-tighter sm:text-6xl"
    >
      Search the job catalogue through a public API.
    </h1>
    <p class="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">
      Postings read straight from employers’ own applicant-tracking systems, de-duplicated,
      classified and linked to the company behind them. The API uses the same filters as the
      public search page and does not require an account.
    </p>
    <div class="mt-9 flex flex-wrap items-center gap-3">
      <Button href={resolve('/jobs')} variant="primary" size="lg">Browse jobs</Button>
      <Button href={resolve('/docs/api')} variant="outline" size="lg">API reference</Button>
    </div>
    <p class="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
      Requests are subject to public rate limits. The reference documents available routes and filters.
    </p>

    {#if figures.length > 0}
      <dl class="mt-12 grid max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
        {#each figures as f (f.label)}
          <div class="bg-background p-5">
            <dt class="text-xs text-muted-foreground">{f.label}</dt>
            <dd class="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{f.value}</dd>
          </div>
        {/each}
      </dl>
    {/if}
  </section>

  <section class="border-t border-border py-14 sm:py-16">
    <SectionLabel text="who it is for" />
    <h2 class="mt-6 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
      Built for products that show jobs to people.
    </h2>
    <div class="mt-10 grid gap-4 sm:grid-cols-2">
      {#each audiences as a (a.title)}
        <div class="rounded-xl border border-border p-6">
          <h3 class="font-semibold">{a.title}</h3>
          <p class="mt-2 text-sm leading-relaxed text-muted-foreground">{a.body}</p>
        </div>
      {/each}
    </div>
  </section>

  <section class="border-t border-border py-14 sm:py-16">
    <SectionLabel text="what you get" />
    <h2 class="mt-6 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
      A posting, already structured.
    </h2>
    <p class="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
      Every filter the site’s own search has — country, region,
      city, category, seniority, skills, work mode, salary, company, source and freshness.
    </p>
    <div class="mt-10 grid gap-8 lg:grid-cols-2">
      <dl class="flex flex-col gap-4">
        {#each fields as [name, body] (name)}
          <div class="border-b border-border/60 pb-4">
            <dt class="font-medium">{name}</dt>
            <dd class="mt-1 text-sm text-muted-foreground">{body}</dd>
          </div>
        {/each}
      </dl>
      <div class="flex min-w-0 flex-col gap-3">
        <pre
          class="overflow-x-auto rounded-xl border border-border bg-secondary/60 p-4 font-mono text-xs leading-relaxed">{curl}</pre>
        <pre
          class="overflow-x-auto rounded-xl border border-border bg-secondary/40 p-4 font-mono text-xs leading-relaxed">{sample}</pre>
      </div>
    </div>
  </section>

  <section class="border-t border-border py-14 sm:py-16">
    <SectionLabel text="how to use it" />
    <h2 class="mt-6 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
      Start with the API reference.
    </h2>
    <div class="mt-10 grid gap-4 md:grid-cols-2">
      <div class="rounded-xl border border-border p-6">
        <h3 class="font-semibold text-muted-foreground">Search the catalogue</h3>
        <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
          Read the API reference, then send a keyword or structured search request.
        </p>
      </div>
      <div class="rounded-xl border-2 border-primary p-6">
        <h3 class="font-semibold">No account required</h3>
        <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
          Catalogue browsing is available directly on the site. API requests are anonymous
          and rate-limited to protect the service.
        </p>
      </div>
    </div>
  </section>

  <section class="border-t border-border py-14 sm:py-16">
    <SectionLabel text="the licence" />
    <h2 class="mt-6 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">
      Use the catalogue responsibly.
    </h2>
    <ul class="mt-8 flex max-w-2xl flex-col gap-3 text-muted-foreground">
      <li><span class="text-foreground">Store</span> what you read and <span class="text-foreground">show</span> it in your own product, commercial or not.</li>
      <li><span class="text-foreground">Don’t resell</span> the raw data as a dataset, download or feed of its own.</li>
      <li><span class="text-foreground">Analyse</span> it over time and train your own models on it.</li>
      <li>Respect source terms and the data licence in our terms.</li>
    </ul>
    <p class="mt-6 text-sm text-muted-foreground">
      <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolve() is applied; the rule cannot see through the appended section anchor -->
      The full text is the <a href={resolve('/terms') + '#data-licence'} class="font-medium text-foreground underline-offset-4 hover:underline"
        >data licence</a
      > in our terms.
    </p>
  </section>

  <section class="border-t border-border py-14 sm:py-16">
    <SectionLabel text="questions" />
    <h2 class="mt-6 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">Before you ask.</h2>
    <div class="mt-8 flex max-w-3xl flex-col divide-y divide-border border-y border-border">
      {#each JOBS_API_FAQ as item (item.question)}
        <details class="group py-4">
          <summary class="cursor-pointer list-none font-medium">{item.question}</summary>
          <p class="mt-3 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
        </details>
      {/each}
    </div>
  </section>

  <section class="border-t border-border py-14 text-center sm:py-16">
    <h2 class="text-2xl font-semibold tracking-tight sm:text-3xl">Try the public API.</h2>
    <div class="mt-8 flex flex-wrap justify-center gap-3">
      <Button href={resolve('/docs/api')} variant="primary" size="lg">Read the API reference</Button>
    </div>
  </section>
</div>

<style>
  /* Dotted hero background, faded toward the edges — the device /agents, /cli and the
     homepage heroes use, duplicated because component styles are scoped. */
  .grid-bg::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    background-image: radial-gradient(var(--muted-foreground) 1px, transparent 1.2px);
    background-size: 22px 22px;
    opacity: 0.16;
    -webkit-mask-image: radial-gradient(ellipse 90% 75% at 25% 0%, currentColor 18%, transparent 80%);
    mask-image: radial-gradient(ellipse 90% 75% at 25% 0%, currentColor 18%, transparent 80%);
  }
</style>
