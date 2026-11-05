<script lang="ts">
  import { page } from '$app/state';
  import Seo from '#lib/components/Seo.svelte';

  const repoUrl = 'https://github.com/strelov1/freehire';
  const telegramUrl = 'https://t.me/freehiredev';
  const contactEmail = 'hello@freehire.me';
  const canonical = $derived(`${page.url.origin}/privacy`);
  const lastUpdated = 'November 5, 2026';
</script>

<Seo
  title="Privacy Policy — freehire"
  description="How freehire collects and uses data to provide public job search, operate the service, and measure site usage."
  {canonical}
/>

<div class="mx-auto w-full max-w-3xl px-4 py-6">
  <div class="flex flex-col gap-8">
    <header class="flex flex-col gap-3">
      <p class="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">// legal</p>
      <h1 class="text-4xl font-semibold leading-[1.0] tracking-tighter sm:text-5xl">
        Privacy Policy
      </h1>
      <p class="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
    </header>

    <p class="text-base leading-relaxed text-muted-foreground">
      freehire (<a
        href="https://freehire.me"
        class="font-medium text-foreground underline-offset-4 hover:underline">freehire.me</a
      >) is a free, open-source job-search service. This policy explains what data is processed to
      provide public job search and operate the site. freehire does not offer user accounts or
      personalized job-search features.
    </p>

    <p class="text-sm leading-relaxed text-muted-foreground">
      freehire is operated by ILYA STRELOV TECNOLOGIA DA INFORMACAO LTDA (CNPJ
      58.774.293/0001-44), Florianópolis, Brazil.
    </p>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-semibold tracking-tight">Data processed when you use the site</h2>
      <ul class="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
        <li>
          <span class="font-medium text-foreground">Search requests.</span> Search terms and filters
          are sent to our API so it can return matching vacancies. They are not attached to a
          freehire account or saved as a personal search history. If you opt in to analytics,
          search-event data, including the search text, may also be sent to PostHog.
        </li>
        <li>
          <span class="font-medium text-foreground">Technical logs.</span> Requests may be recorded
          in operational and security logs, which can include an IP address, requested path, browser
          information, and timestamp. These logs help operate, troubleshoot, and protect the service.
        </li>
        <li>
          <span class="font-medium text-foreground">Analytics.</span> If enabled through the cookie
          banner, Google Analytics and PostHog process page views and site interactions to help us
          understand usage. Search text is not sent to Google Analytics. Where consent is required,
          analytics load only after you opt in. You can change your choice using “Cookie settings”
          in the footer.
        </li>
      </ul>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-semibold tracking-tight">Cookies</h2>
      <p class="text-sm leading-relaxed text-muted-foreground">
        The site does not use sign-in or session cookies. A preference may be stored to remember
        your cookie choice. Analytics providers may set their own cookies when analytics are
        enabled, as described above.
      </p>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-semibold tracking-tight">Job listings</h2>
      <p class="text-sm leading-relaxed text-muted-foreground">
        Vacancies are collected from public company career pages and other public sources. We
        normalize and deduplicate listing data to make it searchable. Some public vacancy text may
        be processed by a language-model provider to enrich job data. This processing is part of
        maintaining the catalogue, not a feature that analyzes visitors or their personal data.
        Applying for a vacancy happens on the original employer or source website, which has its
        own privacy policy.
      </p>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-semibold tracking-tight">Retention and your rights</h2>
      <p class="text-sm leading-relaxed text-muted-foreground">
        Search requests are used to provide results and are not stored in a personal profile.
        Operational logs and analytics data are retained as needed to operate the service and by
        the relevant providers. If you have a question or a request concerning personal data, contact
        us using the details below. If you are in the EU/EEA or UK, you may also exercise the rights
        available under applicable data-protection law, including the right to complain to a
        supervisory authority.
      </p>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-semibold tracking-tight">Contact</h2>
      <p class="text-sm leading-relaxed text-muted-foreground">
        Questions or requests about your data? Reach us at
        <a
          href="mailto:{contactEmail}"
          class="font-medium text-foreground underline-offset-4 hover:underline">{contactEmail}</a
        >, on
        <a href={telegramUrl} class="font-medium text-foreground underline-offset-4 hover:underline"
          >Telegram</a
        >, or via
        <a href={repoUrl} class="font-medium text-foreground underline-offset-4 hover:underline"
          >GitHub</a
        >. As an open-source project, our data handling follows what the
        <a href={repoUrl} class="font-medium text-foreground underline-offset-4 hover:underline"
          >source code</a
        >
        actually does.
      </p>
    </section>
  </div>
</div>
