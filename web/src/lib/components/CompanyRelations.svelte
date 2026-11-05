<script lang="ts">
  import { resolve } from '$app/paths';
  import type { CompanyRef } from '#lib/types.js';

  let {
    parent,
    subsidiaries,
  }: { parent: CompanyRef | null; subsidiaries: CompanyRef[] } = $props();

  const jobs = (n: number) => `${n} open job${n === 1 ? '' : 's'}`;
</script>

{#if parent || subsidiaries.length > 0}
  <div class="mt-3 flex flex-col gap-2 text-sm">
    {#if parent}
      <p class="text-muted-foreground">
        Part of
        <a class="font-medium text-primary hover:underline" href={resolve('/companies/[slug]', { slug: parent.slug })}
          >{parent.name}</a
        >
        · {jobs(parent.job_count)}
      </p>
    {/if}
    {#if subsidiaries.length > 0}
      <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-muted-foreground">
        <span>Subsidiaries:</span>
        {#each subsidiaries as company (company.slug)}
          <span>
            <a class="font-medium text-primary hover:underline" href={resolve('/companies/[slug]', { slug: company.slug })}
              >{company.name}</a
            >
            <span class="text-xs">({jobs(company.job_count)})</span>
          </span>
        {/each}
      </div>
    {/if}
  </div>
{/if}
