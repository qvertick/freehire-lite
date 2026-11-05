<script lang="ts">
  import { navigating, page, updated } from '$app/state';
  import { afterNavigate, beforeNavigate } from '$app/navigation';
  import { onMount } from 'svelte';
  import { initTheme } from '#lib/theme.svelte.js';
  import { capturePageview, syncReplayForRoute } from '#lib/analytics.js';
  import TopBar from '#lib/components/TopBar.svelte';
  import Footer from '#lib/components/Footer.svelte';
  import CookieConsent from '#lib/components/CookieConsent.svelte';
  import SupportToast from '#lib/components/SupportToast.svelte';
  import SkipLink from '#lib/components/SkipLink.svelte';
  import Announcer from '#lib/components/Announcer.svelte';
  import '../app.css';
  import 'flag-icons/css/flag-icons.min.css';

  let { children } = $props();

  onMount(initTheme);

  beforeNavigate(({ willUnload, to, shallow }) => {
    if (!shallow && updated.current && !willUnload && to?.url) location.href = to.url.href;
  });

  afterNavigate(({ shallow }) => {
    if (shallow) return;
    capturePageview();
    syncReplayForRoute(page.url.pathname);
  });
</script>

{#if navigating.to}
  <div
    class="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-brand/20"
    role="progressbar"
    aria-label="Loading"
    aria-busy="true"
  >
    <div class="nav-progress-bar h-full w-2/5 bg-brand"></div>
  </div>
{/if}

<SkipLink target="main-content" />
<Announcer />

<div class="flex min-h-svh flex-col">
  <TopBar />
  <main id="main-content" tabindex="-1" class="flex-1 focus:outline-none">
    {@render children()}
  </main>
  <Footer />
</div>

<CookieConsent />
<SupportToast />

<style>
  .nav-progress-bar {
    animation: nav-progress 1.1s ease-in-out infinite;
  }

  @keyframes nav-progress {
    0% {
      transform: translateX(-110%);
    }
    100% {
      transform: translateX(320%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .nav-progress-bar {
      animation: none;
      width: 100%;
    }
  }
</style>
