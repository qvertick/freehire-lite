<script lang="ts">
  // Shared search symbol for the Job Searcher wordmark in the header and mobile menu.
  let { class: cls = 'size-5 shrink-0' }: { class?: string } = $props();
</script>

<svg
  viewBox="0 0 24 24"
  class={cls}
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  xmlns="http://www.w3.org/2000/svg"
>
  <circle cx="10.8" cy="10.8" r="7.3" />
  <path d="m16.2 16.2 4.3 4.3" />
</svg>
