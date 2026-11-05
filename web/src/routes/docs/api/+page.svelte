<script lang="ts">
  // The external API reference: server-rendered by +page.server.ts
  // (renderApiReferenceToString) for real content on the initial response, then
  // hydrated client-side via ScalarReference with the identical config (minus how
  // the spec reaches each side — see scalarConfig.ts). Scalar owns all
  // navigation/search/try-it; this file only supplies the page's SEO metadata.
  import { page } from '$app/state';
  import ScalarReference from '#lib/components/ScalarReference.svelte';
  import Seo from '#lib/components/Seo.svelte';
  import { scalarConfigFromUrl } from '#lib/docs/scalarConfig.js';
  import { breadcrumbJsonLd, jsonLdScript, webApiJsonLd } from '#lib/seo.js';

  let { data } = $props();

  const origin = $derived(page.url.origin);
  const canonical = $derived(`${origin}/docs/api`);
  const jsonLd = $derived(
    jsonLdScript([
      webApiJsonLd(origin),
      breadcrumbJsonLd([
        { name: 'freehire', url: `${origin}/` },
        { name: 'API reference', url: canonical },
      ]),
    ]),
  );
</script>

<Seo
  title="freehire API reference — query jobs by filters"
  description="The public FreeHire HTTP API for searching and filtering jobs, reading job and company details, and discovering catalogue facets."
  {canonical}
/>

<svelte:head>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -- non-executable JSON-LD built by jsonLdScript, which escapes `<`; raw injection is the only way to emit a structured-data <script> -->
  {@html jsonLd}
</svelte:head>

<ScalarReference scalarHtml={data.scalarHtml} config={scalarConfigFromUrl} />
