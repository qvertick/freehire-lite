<script lang="ts">
  import type { Snippet } from 'svelte';
  import { PUBLIC_OPEN_WITHIN } from '$app/env/public';
  import { openWithinEnabled } from '#lib/features.js';
  import { Info } from '@lucide/svelte';
  import { Tooltip } from '#lib/ui/index.js';
  import {
    companySearch,
    EMPLOYER_CREDENTIALS,
    FACETS,
    JOB_COLLECTION,
    searchCities,
    visibleEngagementGroups,
  } from '#lib/facets.js';
  import { FILTER_SEARCH_MIN_QUERY, jobFilterSearchItems, type FilterSearchHit } from '#lib/filterSearch.js';
  import { emptyFilters, appliesWorkModeRemoteAnywhere, workModeRemoteLabel, type FilterStore, type JobFilters } from '#lib/filters.js';
  import { StagedFilters } from '#lib/stagedFilters.svelte.js';
  import { RAIL, RAIL_SECTIONS, type RailEntry } from '#lib/filterSections.js';
  import type { FacetCounts } from '#lib/types.js';
  import {
    EXPERIENCE_PRESETS,
    FRESHNESS_PRESETS,
    SALARY_MAX,
    SALARY_STEP,
    experienceLabel,
    freshnessLabel,
    salaryLabel,
  } from '#lib/filterControls.js';
  import FacetSection from '../facets/FacetSection.svelte';
  import ChipFacet from './ChipFacet.svelte';
  import RangeSlider from './RangeSlider.svelte';
  import CategoryPane from './CategoryPane.svelte';
  import LocationPane from './LocationPane.svelte';
  import FilterModalShell from './FilterModalShell.svelte';

  // The job-search filter modal: a thin wrapper over FilterModalShell that supplies the
  // job rail, the staged job filters, and the pane controls. The shell owns the chrome
  // (rail, footer, deferred apply); this file owns only what's job-specific.
  //
  // `railKeys` restricts which rail panes show; `applyLabel`/`onApply` customize the
  // footer action, and `canApply` gates it.
  let {
    store,
    seed,
    counts = null,
    exclude = [],
    railKeys,
    title = 'All filters',
    applyLabel,
    onApply,
    canApply,
    plain = false,
    open = false,
    onClose,
    previewCount,
    stagedCounts,
    extra,
  }: {
    store?: FilterStore;
    seed?: JobFilters;
    counts?: FacetCounts | null;
    exclude?: string[];
    railKeys?: string[];
    title?: string;
    applyLabel?: string;
    onApply?: (staged: StagedFilters) => void | Promise<void>;
    canApply?: (f: JobFilters) => boolean;
    // Plain-select reuse: drop the search-only exclude/match
    // toggles so a facet value reads as a plain choice, not a filter.
    plain?: boolean;
    open?: boolean;
    onClose: () => void;
    previewCount?: (params: URLSearchParams) => Promise<number>;
    // Live disjunctive facet counts for the staged selection — when supplied, every
    // control shows counts that recompute as you pick (the job list). Absent for the
    // analytics/swipe reuse, which keep the applied `counts` + total-only preview.
    stagedCounts?: (params: URLSearchParams) => Promise<FacetCounts>;
    // Extra content rendered above the pane, handed the staged store so it can edit it.
    extra?: Snippet<[StagedFilters]>;
  } = $props();

  const staged = new StagedFilters();

  const SECTIONS = RAIL_SECTIONS;

  // Rail entries visible under the current scope: restricted to `railKeys` when given,
  // and a 'facet' entry is hidden when its param is excluded (e.g. Company on a company page).
  const visibleRail = $derived(
    RAIL.filter(
      (e) => (!railKeys || railKeys.includes(e.key)) && !(e.facetParam && exclude.includes(e.facetParam)),
    ),
  );

  const jobCollectionValues = JOB_COLLECTION.map((o) => o.value);
  const employerCredentialValues = EMPLOYER_CREDENTIALS.map((o) => o.value);

  // Values selected for one facet — included plus excluded — so the rail count reflects
  // any staged selection regardless of sign. `values`, when passed, scopes the count to
  // just that subset — for a param split across two panes (see ChipFacet's `options`
  // override), so a badge doesn't count values shown under a different tab.
  function selCount(f: JobFilters, param: string, values?: string[]): number {
    const st = f.facets[param];
    if (!st) return 0;
    if (!values) return st.include.length + st.exclude.length;
    const allowed = new Set(values);
    return st.include.filter((v) => allowed.has(v)).length + st.exclude.filter((v) => allowed.has(v)).length;
  }

  function entryCount(e: RailEntry): number {
    const f = staged.value;
    if (e.kind === 'category') return selCount(f, 'category') + selCount(f, 'ai_archetype');
    if (e.kind === 'experience')
      return selCount(f, 'seniority') + selCount(f, 'role_type') + (f.experienceYearsMax != null ? 1 : 0);
    if (e.kind === 'location') return selCount(f, 'regions') + selCount(f, 'countries') + selCount(f, 'metros') + selCount(f, 'cities');
    if (e.kind === 'salary')
      return (
        selCount(f, 'salary_currency') +
        (f.salaryMin != null || f.salaryMax != null ? 1 : 0) +
        selCount(f, 'equity')
      );
    if (e.kind === 'work') return selCount(f, 'work_mode') + selCount(f, 'employment_type') + selCount(f, 'engagement');
    if (e.kind === 'industry')
      return selCount(f, 'domains') + selCount(f, 'company_type') + selCount(f, 'collections', jobCollectionValues);
    if (e.kind === 'language') return selCount(f, 'english_level') + selCount(f, 'posting_language');
    if (e.kind === 'relocation')
      return (
        selCount(f, 'relocation') +
        (f.visa ? 1 : 0) +
        selCount(f, 'clearance_levels') +
        selCount(f, 'collections', employerCredentialValues)
      );
    if (e.kind === 'posted')
      return (
        (f.postedWithinDays != null ? 1 : 0) +
        (f.openWithinDays != null ? 1 : 0) +
        selCount(f, 'reality')
      );
    if (e.key === 'skills') return selCount(f, 'skills');
    if (e.key === 'source') return selCount(f, 'source_type') + selCount(f, 'source');
    return selCount(f, e.facetParam ?? e.key);
  }

  const englishDef = FACETS.find((d) => d.param === 'english_level');
  const postingDef = FACETS.find((d) => d.param === 'posting_language');

  // In plain mode strip the search-only exclude/match toggles from a facet control.
  function facetDefFor(param: string | undefined) {
    const d = FACETS.find((x) => x.param === param);
    return d && plain ? { ...d, excludable: false, hasAndOr: false } : d;
  }

  function seedStaged() {
    staged.seed(seed ?? store?.value ?? emptyFilters());
  }

  async function apply() {
    if (onApply) {
      await onApply(staged);
    } else if (store) {
      staged.commit(store);
    }
  }

  const applyDisabled = $derived(canApply ? !canApply(staged.value) : false);
  // Read straight from the runtime env rather than threaded through a prop: five callers
  // mount this modal and none of them has an opinion about the flag.
  const openWithinAvailable = openWithinEnabled({ PUBLIC_OPEN_WITHIN });

  let filterQuery = $state('');
  const specializationHint = $derived.by(() => {
    const q = filterQuery.trim().toLowerCase();
    return q.length >= 2 && ('specialization'.startsWith(q) || 'specializations'.startsWith(q));
  });
  let remoteHits = $state<FilterSearchHit[]>([]);
  const searchItems = $derived<FilterSearchHit[]>([
    ...jobFilterSearchItems({ exclude, railKeys, openWithin: openWithinAvailable }),
    ...remoteHits,
  ]);

  $effect(() => {
    const q = filterQuery.trim();
    const wantCompany =
      open && q.length >= FILTER_SEARCH_MIN_QUERY && !exclude.includes('company_slug') && (!railKeys || railKeys.includes('company_slug'));
    const wantCities =
      open && q.length >= FILTER_SEARCH_MIN_QUERY && !exclude.includes('cities') && (!railKeys || railKeys.includes('location'));
    if (!wantCompany && !wantCities) {
      if (remoteHits.length > 0) remoteHits = [];
      return;
    }
    if (remoteHits.length > 0) remoteHits = [];
    let cancelled = false;
    const timer = setTimeout(() => {
      void Promise.all([
        wantCompany ? companySearch(q).catch(() => []) : Promise.resolve([]),
        wantCities ? searchCities(q).catch(() => []) : Promise.resolve([]),
      ]).then(([companies, cities]) => {
        if (cancelled) return;
        remoteHits = [
          ...companies.slice(0, 8).map((company) => ({
            id: `company_slug:company_slug:${company.value}`,
            label: company.label,
            group: 'Company',
            railKey: 'company_slug',
            railLabel: 'Company',
            param: 'company_slug',
            value: company.value,
          })),
          ...cities.slice(0, 8).map((city) => ({
            id: `location:cities:${city.value}`,
            label: city.label,
            group: 'City',
            railKey: 'location',
            railLabel: 'Location',
            param: 'cities',
            value: city.value,
          })),
        ];
      });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  });

  function splitAction(action: string | undefined): { kind: string; rest: string } | null {
    if (!action) return null;
    const colon = action.indexOf(':');
    if (colon < 0) {
      if (action === 'visa')
        return { kind: action, rest: '' };
      return null;
    }
    const kind = action.slice(0, colon);
    if (kind === 'posted' || kind === 'open' || kind === 'experience') {
      return { kind, rest: action.slice(colon + 1) };
    }
    return null;
  }

  function searchSelection(hit: FilterSearchHit) {
    const off = { included: false, excluded: false, excludable: false };
    const action = splitAction(hit.action);
    switch (action?.kind) {
      case 'visa':
        return { ...off, included: staged.value.visa };
      case 'posted':
        return { ...off, included: staged.value.postedWithinDays === Number(action.rest) };
      case 'open':
        return { ...off, included: staged.value.openWithinDays === Number(action.rest) };
      case 'experience':
        return { ...off, included: staged.value.experienceYearsMax === Number(action.rest) };
    }
    if (!hit.param || hit.value == null) return off;
    const selected = staged.facet(hit.param);
    return {
      included: selected.include.includes(hit.value),
      excluded: selected.exclude.includes(hit.value),
      excludable: !plain && (FACETS.find((d) => d.param === hit.param)?.excludable ?? false),
    };
  }

  function onSearchToggle(hit: FilterSearchHit) {
    const action = splitAction(hit.action);
    switch (action?.kind) {
      case 'visa':
        staged.setVisa(!staged.value.visa);
        return;
      case 'posted':
        staged.setPostedWithinDays(staged.value.postedWithinDays === Number(action.rest) ? null : Number(action.rest));
        return;
      case 'open':
        staged.setOpenWithinDays(staged.value.openWithinDays === Number(action.rest) ? null : Number(action.rest));
        return;
      case 'experience':
        staged.setExperienceYearsMax(
          staged.value.experienceYearsMax === Number(action.rest) ? null : Number(action.rest),
        );
        return;
    }
    if (!hit.param || hit.value == null) return;
    const excludable = !plain && (FACETS.find((d) => d.param === hit.param)?.excludable ?? false);
    if (excludable) staged.cycle(hit.param, hit.value);
    else staged.pick(hit.param, hit.value);
  }

  // A non-preset value (hand-edited URL) has no exact stop, so it reads as "Any"
  // (the rightmost stop) rather than snapping to "Today".
  const freshnessIndex = $derived.by(() => {
    const i = FRESHNESS_PRESETS.findIndex((p) => p.days === staged.value.postedWithinDays);
    return i < 0 ? FRESHNESS_PRESETS.length - 1 : i;
  });

  // The first-seen bound rides the same stops and the same snap-to-Any rule.
  const openIndex = $derived.by(() => {
    const i = FRESHNESS_PRESETS.findIndex((p) => p.days === staged.value.openWithinDays);
    return i < 0 ? FRESHNESS_PRESETS.length - 1 : i;
  });

  // Same snap-to-Any rule as freshness above: an off-preset bound (hand-edited or
  // shared URL) has no exact stop, so the handle rests on the rightmost one. The
  // LABEL still reports the real bound — see experienceLabel — so the two do not
  // agree here on purpose: the handle says "no stop matches", the text says what
  // is actually filtering.
  const experienceIndex = $derived.by(() => {
    const i = EXPERIENCE_PRESETS.findIndex((p) => p.years === staged.value.experienceYearsMax);
    return i < 0 ? EXPERIENCE_PRESETS.length - 1 : i;
  });

  // "No ceiling" is a stop of its own, one step past the highest real bound — the
  // shape of the "Any" stop on the experience and freshness sliders. Letting
  // SALARY_MAX double as it would make SALARY_MAX unreachable as a ceiling, and,
  // since the thumbs stop a step apart, as a floor too.
  const SALARY_NO_CEILING = SALARY_MAX + SALARY_STEP;

  // What a salary thumb announces: each end of the track is "no bound", so the raw
  // 0 / SALARY_NO_CEILING would mislead a screen reader into a real figure.
  function salaryThumbText(n: number, thumb: 'lo' | 'hi'): string {
    if (thumb === 'lo' && n <= 0) return 'No minimum';
    if (thumb === 'hi' && n >= SALARY_NO_CEILING) return 'No ceiling';
    return n.toLocaleString('en-US');
  }
</script>

<FilterModalShell
  {open}
  {onClose}
  {title}
  rail={visibleRail}
  sections={SECTIONS}
  {staged}
  {entryCount}
  seed={seedStaged}
  initialKey={RAIL[0]?.key}
  {apply}
  {applyDisabled}
  {applyLabel}
  {previewCount}
  countsFetch={stagedCounts}
  {pane}
  {titleHint}
  extra={extra ? aboveThePane : undefined}
  {searchItems}
  {onSearchToggle}
  {searchSelection}
  bind:filterQuery
/>

<!-- Most facets are three-state (off / include / exclude); one quiet hint in the
     header covers all of them rather than repeating the explanation on every
     excludable section. -->
{#snippet titleHint()}
  <!-- side="right", not "bottom": the trigger sits at the modal's left edge, and a
       centered tooltip (left-1/2 -translate-x-1/2) grows equally both ways —
       overflowing the modal to the left no matter how short the content is.
       Growing rightward only stays inside it. -->
  <Tooltip side="right">
    <button
      type="button"
      aria-label="How filters work"
      class="relative flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors after:absolute after:-inset-1 hover:text-foreground"
    >
      <Info class="size-3.5" aria-hidden="true" />
    </button>
    {#snippet content()}
      <span class="block max-w-56">Include values to narrow results; exclude values to remove them.</span>
    {/snippet}
  </Tooltip>
{/snippet}

{#snippet aboveThePane()}
  {@render extra?.(staged)}
{/snippet}

{#snippet unrecognized(noun: string, _param: 'specialization' | 'skill', term: string)}
  <p class="py-1 text-sm text-muted-foreground">
    No {noun} matches “{term}”.
  </p>
{/snippet}
{#snippet unrecognizedRole(term: string)}{@render unrecognized('specialization', 'specialization', term)}{/snippet}
{#snippet unrecognizedSkill(term: string)}{@render unrecognized('skill', 'skill', term)}{/snippet}

{#snippet pane(entry: RailEntry, live: FacetCounts | null)}
  {@const c = live ?? counts}
  {#if entry.kind === 'category'}
    <CategoryPane store={staged} {plain} counts={c} empty={unrecognizedRole} hintSearch={specializationHint} />
    {#if !exclude.includes('ai_archetype')}
      {@const aiArchetypeDef = facetDefFor('ai_archetype')}
      {#if aiArchetypeDef}
        <div class="mt-6"><FacetSection def={aiArchetypeDef} store={staged} counts={c} expand /></div>
      {/if}
    {/if}
  {:else if entry.kind === 'location'}
    <LocationPane store={staged} counts={c} />
  {:else if entry.kind === 'facet'}
    {@const def = facetDefFor(entry.facetParam)}
    {#if entry.key === 'source'}
      <!-- The kind of source sits above the source picker: "everything but aggregators"
           is one pill here, where it would be a hundred source exclusions below. -->
      <div class="mb-6"><ChipFacet store={staged} param="source_type" label="Source type" counts={c} /></div>
    {/if}
    {#if def}<FacetSection {def} store={staged} counts={c} expand empty={entry.key === 'skills' ? unrecognizedSkill : undefined} />{/if}
    {#if entry.key === 'perks'}
      <p class="mt-2 text-xs text-muted-foreground">
        Based on job descriptions — not every employer lists every perk.
      </p>
    {/if}
  {:else if entry.kind === 'salary'}
    <ChipFacet store={staged} param="salary_currency" label="Currency" counts={c} />
    <div class="mb-2 mt-6 flex items-center justify-between">
      <h3 class="text-sm font-semibold tracking-tight">Salary range</h3>
      <span class="text-xs font-medium text-muted-foreground"
        >{salaryLabel(staged.value.salaryMin, staged.value.salaryMax)}</span
      >
    </div>
    <!-- Each end of the track is "no bound", so a thumb parked there writes nothing. -->
    <RangeSlider
      min={0}
      max={SALARY_NO_CEILING}
      step={SALARY_STEP}
      lo={staged.value.salaryMin ?? 0}
      hi={staged.value.salaryMax ?? SALARY_NO_CEILING}
      loLabel="Minimum salary"
      hiLabel="Maximum salary"
      onLo={(n) => staged.setSalaryMin(n > 0 ? n : null)}
      onHi={(n) => staged.setSalaryMax(n < SALARY_NO_CEILING ? n : null)}
      valueText={salaryThumbText}
    />
    <!-- The API bounds each end of a posting's own range (its minimum from below, its
         maximum from above), so a posting paying 90,000–160,000 is outside a
         100,000–150,000 search. Said up front, for the same reason as the experience
         note: a count that drops without explanation reads as a broken filter. -->
    <p class="mt-2 text-xs text-muted-foreground">
      Matches postings whose stated salary range falls entirely within these bounds.
    </p>
    <!-- Beside the salary because it is the other half of the pay: a posting can offer
         equity with no salary figure at all, so this is not a refinement of the range. -->
    <div class="mt-6">
      <ChipFacet store={staged} param="equity" label="Equity" counts={c} />
    </div>
    <p class="mt-2 text-xs text-muted-foreground">
      Not stated means the posting says nothing about equity, not that it offers none.
    </p>
  {:else if entry.kind === 'experience'}
    {@const showSeniority = !exclude.includes('seniority')}
    {@const showRoleType = !exclude.includes('role_type')}
    {#if showSeniority}
      {@const noLevelPicked = (staged.value.facets.seniority?.include.length ?? 0) === 0}
      <ChipFacet store={staged} param="seniority" label="Seniority" counts={c} />
      <!-- Most postings carry no level, and including one drops every one of them
           unless this is ticked. Disabled until a level is included: excluding levels
           already keeps the unlabelled postings, so there is nothing to widen. -->
      <label
        class="mt-3 flex items-center gap-2 text-sm {noLevelPicked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}"
      >
        <input
          type="checkbox"
          class="size-4 rounded border-border"
          checked={staged.value.seniorityIncludeUnspecified}
          disabled={noLevelPicked}
          onchange={(e) => staged.setSeniorityIncludeUnspecified(e.currentTarget.checked)}
        />
        <span>Include postings with no level stated</span>
      </label>
    {/if}
    <!-- Directly beneath seniority on purpose: the two are the axes users conflate.
         "Lead" reads to many as a management grade, while in this catalogue it names
         the IC ladder — of the 116,893 postings at seniority=lead, only 3,303 carry
         any management marker. Adjacency is what makes them read as two questions. -->
    {#if showRoleType}
      <div class:mt-6={showSeniority}>
        <ChipFacet store={staged} param="role_type" label="Role type" counts={c} />
      </div>
    {/if}
    <div class:mt-6={showSeniority || showRoleType}>
      <div class="mb-2 flex items-center justify-between">
        <h3 class="text-sm font-semibold tracking-tight">Years of experience</h3>
        <span class="text-xs font-medium text-muted-foreground"
          >{experienceLabel(staged.value.experienceYearsMax)}</span
        >
      </div>
      <input
        type="range"
        min="0"
        max={EXPERIENCE_PRESETS.length - 1}
        step="1"
        value={experienceIndex}
        oninput={(e) => staged.setExperienceYearsMax(EXPERIENCE_PRESETS[Number(e.currentTarget.value)]?.years ?? null)}
        aria-label="Maximum years of experience"
        aria-valuetext={experienceLabel(staged.value.experienceYearsMax)}
        class="h-6 w-full accent-primary"
      />
      <!-- Most of the catalogue states no experience requirement at all (about two
           thirds, measured on prod 2026-10-21: 2.42M of 3.67M open postings), and a
           bound excludes every one of those postings unless this is ticked. Shown
           permanently rather than only once bounded: a result count that collapses
           without explanation is read as a broken filter, and by then the user has
           already been misled. Disabled at "Any", where there is no bound to widen. -->
      <label
        class="mt-3 flex items-center gap-2 text-sm {staged.value.experienceYearsMax == null
          ? 'cursor-not-allowed opacity-50'
          : 'cursor-pointer'}"
      >
        <input
          type="checkbox"
          class="size-4 rounded border-border"
          checked={staged.value.experienceIncludeUnspecified}
          disabled={staged.value.experienceYearsMax == null}
          onchange={(e) => staged.setExperienceIncludeUnspecified(e.currentTarget.checked)}
        />
        <span>Include postings that don't state experience</span>
      </label>
      <!-- The entry-level profile seeds this (freehire#3655): a posting labelled with a
           picked level is answered by the level, so the limit reads only the postings
           with no level. Shown beside the other modifier so a profile applied to /jobs
           does not narrow the list through a switch nobody can see. -->
      <label
        class="mt-2 flex items-center gap-2 text-sm {staged.value.experienceYearsMax == null
          ? 'cursor-not-allowed opacity-50'
          : 'cursor-pointer'}"
      >
        <input
          type="checkbox"
          class="size-4 rounded border-border"
          checked={staged.value.experienceOnlySeniorityUnspecified}
          disabled={staged.value.experienceYearsMax == null}
          onchange={(e) => staged.setExperienceOnlySeniorityUnspecified(e.currentTarget.checked)}
        />
        <span>Apply the limit only to postings with no level stated</span>
      </label>
      <p class="mt-1 text-xs text-muted-foreground">
        Most postings don't state an experience requirement. A limit hides them unless this is ticked.
      </p>
    </div>
  {:else if entry.kind === 'work'}
    <ChipFacet store={staged} param="work_mode" label="Work format" counts={c} />
    {#if appliesWorkModeRemoteAnywhere(staged.value)}
      <!-- Only shown when it changes the answer (remote + a physical format + a
           location facet): a toggle that does nothing reads as broken. -->
      <label class="mt-3 flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          class="size-4 rounded border-border"
          checked={staged.value.workModeRemoteAnywhere}
          onchange={(e) => staged.setWorkModeRemoteAnywhere(e.currentTarget.checked)}
        />
        <span>{workModeRemoteLabel(staged.value)}</span>
      </label>
      <p class="mt-1 text-xs text-muted-foreground">
        Hybrid and on-site stay within the locations above; remote work is not bound by them.
      </p>
    {/if}
    <div class="mt-6"><ChipFacet store={staged} param="employment_type" label="Employment type" counts={c} /></div>
    <!-- The legal terms a posting states (internal/dict/engagement), one block per market
         whose term it is, and only the markets the current scope reaches. -->
    {@const engagementSel = staged.facet('engagement')}
    {@const engagementGroups = visibleEngagementGroups(c?.facets?.engagement, [
      ...engagementSel.include,
      ...engagementSel.exclude,
    ])}
    {#if engagementGroups.length > 0}
      <div class="mt-6">
        <h3 class="text-sm font-medium">Contract terms</h3>
        <p class="mt-1 text-xs text-muted-foreground">
          Employee or own business, in each market's own terms — as the posting states it.
        </p>
        {#each engagementGroups as g (g.market)}
          <div class="mt-4">
            <ChipFacet store={staged} param="engagement" label={g.market} options={g.options} counts={c} />
          </div>
        {/each}
      </div>
    {/if}
  {:else if entry.kind === 'industry'}
    <ChipFacet store={staged} param="domains" label="Industry" counts={c} />
    <div class="mt-6"><ChipFacet store={staged} param="company_type" label="Company type" counts={c} /></div>
    <div class="mt-6">
      <ChipFacet store={staged} param="collections" label="Collection" counts={c} options={JOB_COLLECTION} />
    </div>
  {:else if entry.kind === 'language'}
    {#if englishDef}<FacetSection def={englishDef} store={staged} counts={c} expand />{/if}
    <div class="mt-4">{#if postingDef}<FacetSection def={postingDef} store={staged} counts={c} expand />{/if}</div>
  {:else if entry.kind === 'relocation'}
    <ChipFacet store={staged} param="relocation" label="Relocation" counts={c} />
    <div class="mt-6">
      <ChipFacet
        store={staged}
        param="collections"
        label="Employer credentials"
        counts={c}
        options={EMPLOYER_CREDENTIALS}
      />
    </div>
    <h3 class="mb-2 mt-6 text-sm font-semibold tracking-tight">Visa</h3>
    <label class="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        class="size-4 rounded border-border"
        checked={staged.value.visa}
        onchange={(e) => staged.setVisa(e.currentTarget.checked)}
      />
      <span>Offers visa sponsorship</span>
    </label>
    <!-- The levels a posting states, not a yes/no: someone who cannot hold a clearance
         picks "No explicit reference", someone who holds Secret picks the rungs they
         can work under. The old Hide/Only toggle is this facet's `none` chip, included
         or excluded, and its links still read that way (facetModel.readLegacyClearance). -->
    <h3 class="mb-2 mt-6 text-sm font-semibold tracking-tight">Security clearance</h3>
    <ChipFacet store={staged} param="clearance_levels" label="Clearance level" counts={c} />
    <p class="mt-2 text-xs text-muted-foreground">
      {#if selCount(staged.value, 'clearance_levels') === 0}
        Showing every level — select one or more to narrow.
      {/if}
      Other covers non-US vetting (UK SC/DV, AU NV1, NATO) and clearances stated without a level.
    </p>
  {:else if entry.kind === 'posted'}
    <!-- Two bounds over one set of stops, each labelled for WHOSE date it reads. They
         agree on most postings, which is exactly why the labels matter: where they
         disagree is where a board has restated its posting date, and that is the case
         the second bound was added for. `Open within` leads because it is the one no
         source can rewrite. -->
    {#if openWithinAvailable}
      <div class="mb-2 flex items-center justify-between">
        <h3 class="text-sm font-semibold tracking-tight">Open within</h3>
        <span class="text-xs font-medium text-muted-foreground">{freshnessLabel(staged.value.openWithinDays)}</span>
      </div>
      <input
        type="range"
        min="0"
        max={FRESHNESS_PRESETS.length - 1}
        step="1"
        value={openIndex}
        oninput={(e) => staged.setOpenWithinDays(FRESHNESS_PRESETS[Number(e.currentTarget.value)]?.days ?? null)}
        aria-label="Open within"
        aria-valuetext={freshnessLabel(staged.value.openWithinDays)}
        class="h-6 w-full accent-primary"
      />
      <p class="mt-2 text-xs text-muted-foreground">How long the posting has been here.</p>
    {/if}
    <div class="mb-2 flex items-center justify-between" class:mt-6={openWithinAvailable}>
      <h3 class="text-sm font-semibold tracking-tight">Posted within</h3>
      <span class="text-xs font-medium text-muted-foreground">{freshnessLabel(staged.value.postedWithinDays)}</span>
    </div>
    <input
      type="range"
      min="0"
      max={FRESHNESS_PRESETS.length - 1}
      step="1"
      value={freshnessIndex}
      oninput={(e) => staged.setPostedWithinDays(FRESHNESS_PRESETS[Number(e.currentTarget.value)]?.days ?? null)}
      aria-label="Posted within"
      aria-valuetext={freshnessLabel(staged.value.postedWithinDays)}
      class="h-6 w-full accent-primary"
    />
    {#if openWithinAvailable}
      <p class="mt-2 text-xs text-muted-foreground">
        The date the board states. Some boards restate it on every crawl.
      </p>
    {/if}
    <!-- Under the age bound, not in a pane of its own: the reality classes answer the
         same question the slider does, and the age is most of what makes a posting read
         as evergreen. -->
    <div class="mt-6"><ChipFacet store={staged} param="reality" label="Posting reality" counts={c} /></div>
    <p class="mt-2 text-xs text-muted-foreground">
      Evergreen postings sit open permanently rather than for one opening.
    </p>
  {/if}
{/snippet}
