<script lang="ts">
  import { sourceLabel } from '#lib/facets.js';
  import { filterHref } from '#lib/enrichment.js';
  import { SOURCE_LOGO_DOMAINS, sourceLogoUrl } from '#lib/logo.js';
  import { Badge, EntityLogo } from '#lib/ui/index.js';
  import AdzunaAttribution from './AdzunaAttribution.svelte';
  import DevGlobalJobsAttribution from './DevGlobalJobsAttribution.svelte';

  // The job page's provenance row: where this posting came from, and the control to stop
  // seeing that source at all. Lifted out of JobView — which is 1,100 lines — because it is
  // the one part of that sidebar with its own state and its own write, and because a
  // control that edits a profile deserves a test that does not have to mount a job page.
  let {
    source,
    jobUrl,
    manuallyAdded = false,
  }: { source: string; jobUrl: string; manuallyAdded?: boolean } = $props();

  const label = $derived(sourceLabel(source));
</script>

<div
  class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 border-t border-border pt-4 text-xs text-muted-foreground first:border-t-0 first:pt-0"
>
  <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- internal /jobs filter link from filterHref; query-only, no route to resolve -->
  <a href={filterHref('source', source)} class="inline-flex items-center gap-1.5">
    <!-- The source's own brand mark: its DISPLAY NAME, plus the platform's own domain where
         one is curated — never a posting host, which serves the employer's logo under the
         platform's name. EntityLogo also catches a 404 that landed before hydration, which a
         hand-rolled onerror cannot. -->
    <EntityLogo
      name={label}
      src={sourceLogoUrl(label, SOURCE_LOGO_DOMAINS[source]) ?? undefined}
      shape="square"
      size="xs"
      class="shrink-0"
    />
    <Badge variant="outline" class="transition-colors hover:bg-accent hover:text-foreground">
      {label}
    </Badge>
  </a>

  {#if source === 'adzuna'}
    <!-- Required by Adzuna's API terms, not a courtesy credit — see the component. It sits
         in the provenance row beside the source chip, which is where a reader already looks
         to find out where a posting came from. -->
    <AdzunaAttribution {jobUrl} />
  {:else if source === 'devglobaljobs'}
    <!-- Required by Dev Global Jobs API terms: visible link to https://devglobaljobs.com
         wherever postings from their feed are shown. -->
    <DevGlobalJobsAttribution />
  {/if}

  {#if manuallyAdded}
    <Badge variant="secondary">Manually added</Badge>
  {/if}
</div>
