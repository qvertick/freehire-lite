<script lang="ts">
  import type { Company } from '#lib/types.js';
  import { companyLogoUrl } from '#lib/logo.js';
  import { EntityLogo } from '#lib/ui/index.js';
  import CredentialBadge from './CredentialBadge.svelte';
  import BackerBadge from './BackerBadge.svelte';

  // The company's header card: identity (logo + name + tagline) with the
  // industries and the website/LinkedIn links below a divider. The scalar company facts
  // live in a separate CompanyFacts card (jobs sidebar on desktop, under the header on
  // mobile), so this stays compact. The card is always shown, even for an unenriched
  // company (just the identity row) — the tagline and the meta divider are present-only.
  let { company }: { company: Company; slug?: string } = $props();

  const info = $derived(company.company_info ?? {});
  const industries = $derived(company.industries ?? []);
  // The homepage lives under `website` (hirebase) or `homepage` (older records) — read
  // whichever is present so the link renders regardless of which importer filled it.
  const website = $derived(info.website ?? info.homepage);
  const websiteHref = $derived(website ? (website.startsWith('http') ? website : `https://${website}`) : '');
  const linkedin = $derived(info.linkedin);

  const hasMeta = $derived(industries.length > 0 || !!website || !!linkedin);
</script>

<section class="rounded-2xl border border-border bg-card p-5">
  <div class="flex items-start gap-3">
    <EntityLogo name={company.name} src={companyLogoUrl(company.name) ?? undefined} shape="square" size="lg" />
    <div class="min-w-0 flex-1">
      <!-- break-words: a long single word ("International") is wider than the phone
           column and would otherwise overflow the card instead of wrapping. -->
      <h1 class="break-words text-xl font-semibold tracking-tight sm:text-2xl">{company.name}</h1>
      {#if company.tagline}
        <p class="mt-1 text-sm text-muted-foreground">{company.tagline}</p>
      {/if}
      <!-- Who backed the company, then the register-backed credentials (visa-sponsor
           licences) — both facts about the employer, so both sit under the identity.
           Backers lead: "picked by Y Combinator" is what a reader came to know.
           Each credential carries its issuing body and the disclaimer that the
           licence is not a promise about any given role. -->
      {#if company.collections?.length}
        <div class="mt-2 flex flex-wrap items-center gap-1.5">
          <BackerBadge collections={company.collections} withLabel />
          <CredentialBadge collections={company.collections} />
        </div>
      {/if}
    </div>
  </div>
  {#if hasMeta}
    <!-- Industries and links are two groups, not one flat wrap list: on a phone a flat
         list mixes a chip and a URL on the same line. Grouping keeps them on one row
         on desktop (both groups fit) and wraps them as whole blocks on mobile. -->
    <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3">
      {#if industries.length}
        <div class="flex flex-wrap items-center gap-2">
          {#each industries as industry (industry)}
            <span class="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">{industry}</span>
          {/each}
        </div>
      {/if}
      {#if website || linkedin}
        <div class="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
          {#if website}
            <!-- eslint-disable svelte/no-navigation-without-resolve -- external company website, not an internal route -->
            <a
              class="min-w-0 break-all text-sm font-medium text-primary hover:underline"
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer">{website} ↗</a
            >
            <!-- eslint-enable svelte/no-navigation-without-resolve -->
          {/if}
          {#if linkedin}
            <!-- eslint-disable svelte/no-navigation-without-resolve -- external LinkedIn URL, not an internal route -->
            <a
              class="text-sm font-medium text-primary hover:underline"
              href={linkedin}
              target="_blank"
              rel="noopener noreferrer">LinkedIn ↗</a
            >
            <!-- eslint-enable svelte/no-navigation-without-resolve -->
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</section>
