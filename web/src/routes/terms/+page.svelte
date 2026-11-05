<script lang="ts">
  import { page } from '$app/state';
  import Seo from '#lib/components/Seo.svelte';

  const repoUrl = 'https://github.com/strelov1/freehire';
  const telegramUrl = 'https://t.me/freehiredev';
  const contactEmail = 'hello@freehire.me';

  const canonical = $derived(`${page.url.origin}/terms`);

  // Static effective date — bump whenever the terms change.
  const lastUpdated = 'October 28, 2026';
</script>

<Seo
  title="Terms of Service — freehire"
  description="The terms for using freehire, the open-source job aggregator: acceptable use, job listings, data, and liability."
  {canonical}
/>

<div class="mx-auto w-full max-w-3xl px-4 py-6">
  <div class="flex flex-col gap-8">
    <header class="flex flex-col gap-3">
      <p class="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">// legal</p>
      <h1 class="text-4xl font-semibold leading-[1.0] tracking-tighter sm:text-5xl">
        Terms of Service
      </h1>
      <p class="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
    </header>

    <p class="text-base leading-relaxed text-muted-foreground">
      freehire (<a
        href="https://freehire.me"
        class="font-medium text-foreground underline-offset-4 hover:underline">freehire.me</a
      >) is a free, open-source job aggregator. By using it, you
      agree to these terms.
    </p>

    <p class="text-sm leading-relaxed text-muted-foreground">
      freehire is operated by ILYA STRELOV TECNOLOGIA DA INFORMACAO LTDA (CNPJ
      58.774.293/0001-44), Florianópolis, Brazil.
    </p>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-semibold tracking-tight">The service</h2>
      <p class="text-sm leading-relaxed text-muted-foreground">
        We aggregate job postings from public company career boards and other public sources,
        normalise and deduplicate them, and let you search and filter the resulting catalogue.
      </p>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-semibold tracking-tight">Acceptable use</h2>
      <p class="text-sm leading-relaxed text-muted-foreground">
        Don't misuse the service: respect rate limits, don't interfere with its operation, don't
        use it to violate the law or harm others, and don't republish third-party job data unless
        you have permission from its rights holder.
      </p>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-semibold tracking-tight">Job listings</h2>
      <p class="text-sm leading-relaxed text-muted-foreground">
        Job postings are aggregated from third-party sources. We don't control their content or
        accuracy, we don't guarantee a listing is still open, and applying is between you and the
        employer — we're not a party to that relationship.
      </p>
    </section>

    <section id="data-licence" class="flex scroll-mt-20 flex-col gap-3">
      <h2 class="text-xl font-semibold tracking-tight">Data and API use</h2>
      <p class="text-sm leading-relaxed text-muted-foreground">
        The API is a read-only way to search the catalogue and is subject to rate limits. Job
        descriptions and other source material remain the property of their respective publishers.
        These terms do not grant rights that a publisher or original source has not given us.
      </p>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-semibold tracking-tight">No warranty, limited liability</h2>
      <p class="text-sm leading-relaxed text-muted-foreground">
        The service is provided "as is," without warranties of any kind. To the extent permitted
        by law, we're not liable for indirect, incidental, or consequential damages arising from
        your use of it.
      </p>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-semibold tracking-tight">Changes</h2>
      <p class="text-sm leading-relaxed text-muted-foreground">
        We may update these terms as the product changes. Material changes will be reflected here
        with a new "last updated" date.
      </p>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-semibold tracking-tight">Contact</h2>
      <p class="text-sm leading-relaxed text-muted-foreground">
        Questions about these terms? Reach us at
        <a
          href="mailto:{contactEmail}"
          class="font-medium text-foreground underline-offset-4 hover:underline">{contactEmail}</a
        >, on
        <a href={telegramUrl} class="font-medium text-foreground underline-offset-4 hover:underline"
          >Telegram</a
        >, or via
        <a href={repoUrl} class="font-medium text-foreground underline-offset-4 hover:underline"
          >GitHub</a
        >.
      </p>
    </section>
  </div>
</div>
