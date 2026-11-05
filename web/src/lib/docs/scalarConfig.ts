// Shared Scalar API Reference configuration, used identically by the SSR render
// (+page.server.ts, via renderApiReferenceToString) and the client-side hydration
// (ScalarReference.svelte, via createApiReference) — so the two never disagree on how the spec
// reaches them: the server imports the generated file directly (no self-fetch),
// the client fetches it as an ordinary cacheable static asset rather than
// duplicating the whole spec inline in the page's own data payload.
import type { AnyApiReferenceConfiguration } from '@scalar/types/api-reference';

const SCALAR_SPEC_URL = '/api-reference.openapi.json';

const SCALAR_BASE_CONFIG = {
  layout: 'modern',
  // The site has its own theme toggle (TopBar); Scalar's own would be a second,
  // unsynced dark-mode control fighting the first.
  hideDarkModeToggle: true,
} satisfies Partial<AnyApiReferenceConfiguration>;

export function scalarConfigFromContent(spec: Record<string, unknown>): AnyApiReferenceConfiguration {
  return { ...SCALAR_BASE_CONFIG, content: spec };
}

/** `/docs/api`'s own generated public spec by default. */
export function scalarConfigFromUrl(url: string = SCALAR_SPEC_URL): AnyApiReferenceConfiguration {
  return { ...SCALAR_BASE_CONFIG, url };
}
