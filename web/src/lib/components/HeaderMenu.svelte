<script lang="ts">
  import { page } from '$app/state';
  import { afterNavigate } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { toPath } from '#lib/pathname.js';
  import { Menu, Moon, Sun, X } from '@lucide/svelte';
  import { themeStore } from '#lib/theme.svelte.js';
  import { lockScroll, unlockScroll } from '#lib/ui/index.js';
  import { openedOverlay, closedOverlay } from '#lib/headerOverlay.js';
  import { cn } from '#lib/ui/index.js';
  import { menuNav } from '#lib/actions/menuNav.js';
  import BrandMark from './BrandMark.svelte';
  import GithubStars from './GithubStars.svelte';
  import { NAV } from '#lib/siteNav.js';

  let open = $state(false);
  let root = $state<HTMLElement | null>(null);

  const path = $derived(page.url.pathname);
  const isDark = $derived(themeStore.isDark);
  const navLinks = [NAV.jobs, NAV.companies, NAV.collections, NAV.howItWorks, NAV.about, NAV.open];
  const rowBase =
    'flex min-h-11 items-center gap-2 rounded-md px-4 text-base transition-colors hover:bg-accent hover:text-accent-foreground sm:min-h-0 sm:rounded-none sm:px-3 sm:py-2 sm:text-sm';
  const linkClass = (href: string) =>
    cn(rowBase, path === href || path.startsWith(`${href}/`)
      ? 'font-medium text-foreground'
      : 'text-muted-foreground');

  function closeSelf() {
    open = false;
  }

  $effect(() => {
    if (!open || window.matchMedia('(min-width: 640px)').matches) return;
    lockScroll();
    return () => unlockScroll();
  });

  $effect(() => {
    if (!open) return;
    openedOverlay(closeSelf);
    return () => closedOverlay(closeSelf);
  });

  afterNavigate(({ shallow }) => {
    if (!shallow) open = false;
  });

  function onWindowClick(event: MouseEvent) {
    if (open && root && !root.contains(event.target as Node)) open = false;
  }
</script>

<svelte:window
  onclick={onWindowClick}
  onkeydown={(event) => event.key === 'Escape' && (open = false)}
/>

{#snippet themeButton()}
  <button
    type="button"
    role="menuitem"
    onclick={() => themeStore.toggle()}
    class={cn(rowBase, 'w-full text-left text-muted-foreground')}
  >
    {#if isDark}
      <Moon class="size-4 shrink-0" /> Light theme
    {:else}
      <Sun class="size-4 shrink-0" /> Dark theme
    {/if}
  </button>
{/snippet}

<div class="relative flex items-center gap-1" bind:this={root}>
  <GithubStars class="hidden sm:inline-flex" />
  <button
    type="button"
    aria-label="Menu"
    aria-haspopup="menu"
    aria-expanded={open}
    onclick={(event) => {
      event.stopPropagation();
      open = !open;
    }}
    class="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    {#if open}
      <X class="size-5" />
    {:else}
      <Menu class="size-5" />
    {/if}
  </button>

  {#if open}
    <div
      role="menu"
      aria-label="Site navigation"
      {@attach menuNav({ onclose: closeSelf })}
      class="z-50 bg-background max-sm:fixed max-sm:inset-0 max-sm:flex max-sm:flex-col sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:max-h-[80vh] sm:w-64 sm:overflow-y-auto sm:rounded-md sm:border sm:border-border sm:py-1 sm:shadow-lg"
    >
      <div class="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 sm:hidden">
        <span class="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <BrandMark />
          Job Searcher
        </span>
        <button
          type="button"
          role="menuitem"
          aria-label="Close menu"
          onclick={() => (open = false)}
          class="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <X class="size-5" />
        </button>
      </div>

      <nav class="max-sm:flex-1 max-sm:overflow-y-auto max-sm:overscroll-contain max-sm:px-2 max-sm:py-3" aria-label="Site">
        {#each navLinks as link (link.href)}
          {@const Icon = link.icon}
          <a
            href={resolve(toPath(link.href))}
            role="menuitem"
            onclick={() => (open = false)}
            class={linkClass(link.href)}
          >
            <Icon class="size-4 shrink-0" />
            {link.label}
          </a>
        {/each}
      </nav>

      <div class="shrink-0 border-t border-border p-2 sm:hidden">
        <GithubStars variant="row" class={cn(rowBase, 'text-muted-foreground')} />
        {@render themeButton()}
      </div>
      <div class="hidden sm:block">
        <div class="my-1 h-px bg-border"></div>
        {@render themeButton()}
      </div>
    </div>
  {/if}
</div>
