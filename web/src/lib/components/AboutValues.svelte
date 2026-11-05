<script lang="ts">
  import { SectionLabel } from '#lib/ui/index.js';

  // The About page's principles.
  const values = [
    {
      n: '01',
      title: 'One search across supported sources.',
      body: 'Search listings from multiple integrated job platforms through a shared interface instead of repeating the same search on every site.',
    },
    {
      n: '02',
      title: 'The original posting stays authoritative.',
      body: 'Job Searcher helps you discover vacancies. The source listing remains the place to confirm details and apply.',
    },
    {
      n: '03',
      title: 'Search without an account.',
      body: 'The public catalogue and its search filters are available without signing in.',
    },
  ];
</script>

<!-- Each value is a heading, so the three promises are reachable by heading navigation; a
     <dl> could not carry that, since a <dt> may not contain one. -->
<section class="border-t border-border py-16 sm:py-20">
  <SectionLabel as="h2" text="values" />
  <ol class="mt-10 divide-y divide-border border-y border-border">
    {#each values as v (v.n)}
      <li class="grid gap-2 py-6 sm:grid-cols-[auto_1fr] sm:gap-8">
        <span class="font-mono text-sm text-muted-foreground" aria-hidden="true">{v.n}</span>
        <div>
          <h3 class="text-lg font-semibold tracking-tight">{v.title}</h3>
          <p class="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{v.body}</p>
        </div>
      </li>
    {/each}
  </ol>
</section>
