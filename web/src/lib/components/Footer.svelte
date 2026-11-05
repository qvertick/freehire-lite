<script lang="ts">
  import { resolve } from '$app/paths';
  import { reopen } from '#lib/consent.svelte.js';
  import { POPULAR_COLLECTIONS } from '#lib/popularCollections.js';
  import { SOCIAL_LINKS } from '#lib/socialLinks.js';
  import { ProviderIcon } from '#lib/ui/index.js';

  // Grouped navigation over existing routes only — kept deliberately small so the
  // footer stays uncluttered. Internal links go through resolve() (base-path safe),
  // mirroring the header.
  const groups = [
    {
      title: 'Product',
      links: [
        { label: 'Jobs', href: resolve('/jobs') },
        { label: 'Companies', href: resolve('/companies') },
        { label: 'Collections', href: resolve('/collections') },
        { label: 'Jobs by role', href: resolve('/roles') },
        { label: 'Skills glossary', href: resolve('/skills') },
      ],
    },
    {
      title: 'About',
      links: [
        { label: 'About', href: resolve('/about') },
        { label: 'How it works', href: resolve('/how-it-works') },
        { label: 'Open', href: resolve('/open') },
        { label: 'Sources', href: resolve('/sources') },
        { label: 'Status', href: resolve('/status') },
        { label: 'Contributors', href: resolve('/contributors') },
      ],
    },
    {
      title: 'Information',
      links: [
        { label: 'Support', href: resolve('/support') },
        { label: 'Privacy', href: resolve('/privacy') },
        { label: 'Terms', href: resolve('/terms') },
        { label: 'Job removal', href: resolve('/job-removal') },
      ],
    },
  ];

  // External profiles: open in a new tab, each rendered with its ProviderIcon brand
  // mark. All follow the muted text colour (so they match and hover works). Shared
  // with the /signin brand panel — see #lib/socialLinks.

  // Kept separate from the compact navigation groups because these are collection
  // landing pages, not top-level site navigation (see #lib/popularCollections).
  const popular = POPULAR_COLLECTIONS;

  const year = new Date().getFullYear();

  // Compact: the account shell (/my/*) is an app-like surface with its own sidebar
  // nav, so the link columns and popular-collections strip are marketing chrome that
  // doesn't belong there — only the
  // bottom bar (copyright, cookie settings, social links, open-source note) still
  // applies. Full-bleed account routes (/my/assistant/*) render no
  // footer at all, compact or otherwise — see routes/+layout.svelte's hideFooter.
  let { compact = false }: { compact?: boolean } = $props();
</script>

<footer class="border-t border-border">
  {#if !compact}
    <div class="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div class="grid grid-cols-2 gap-x-6 gap-y-7 sm:grid-cols-3 sm:gap-6">
        <!-- Navigation groups. Each is a named landmark (aria-label) so screen readers
             get a title without adding headings to the page outline. -->
        {#each groups as group (group.title)}
          <nav class="flex flex-col gap-3" aria-label={group.title}>
            <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {group.title}
            </p>
            <ul class="flex flex-col gap-2">
              {#each group.links as link (link.href)}
                <li>
                  <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- internal route already passed through resolve() when building `groups`; the linter can't trace it via the variable -->
                  <a href={link.href}
                    class="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              {/each}
            </ul>
          </nav>
        {/each}
      </div>

      <!-- Popular collections. Real <a href> in the server-rendered HTML: crawlers
           discover links by parsing markup, and these landing pages had none from the
           homepage at all. -->
      <nav class="mt-8 border-t border-border pt-6" aria-label="Popular collections">
        <p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Popular</p>
        <ul class="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          {#each popular as collection (collection.slug)}
            <li>
              <a href={resolve('/collections/[slug]', { slug: collection.slug })}
                class="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {collection.title}
              </a>
            </li>
          {/each}
        </ul>
      </nav>

    </div>
  {/if}

  <!-- Bottom bar: copyright + social links on the left, open-source note on the
       right. Split off by its own top border only when it follows the link
       groups above — compact, the footer's own top border already does that job. -->
  <div class={compact ? undefined : 'border-t border-border'}>
    <div
      class="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-1"
    >
      <div class="flex items-center gap-4">
        <p>© {year}</p>
        <!-- Re-opens the consent banner so a prior cookie choice can be changed —
             withdrawal as easy as granting (GDPR). -->
        <button
          type="button"
          onclick={reopen}
          class="text-muted-foreground transition-colors hover:text-foreground"
        >
          Cookie settings
        </button>
        <div class="flex items-center gap-3">
          {#each SOCIAL_LINKS as social (social.provider)}
            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external profile URL opened in a new tab; not an internal route -->
            <a href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              class="text-muted-foreground transition-colors hover:text-foreground"
            >
              <ProviderIcon provider={social.provider} />
            </a>
          {/each}
        </div>
      </div>
      <p>
        Free &amp; open-source.
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- external repository URL opened in a new tab; not an internal route -->
        <a href="https://github.com/strelov1/freehire"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-foreground transition-colors hover:text-muted-foreground"
        >
          View source on GitHub
        </a>.
      </p>
    </div>
  </div>
</footer>
