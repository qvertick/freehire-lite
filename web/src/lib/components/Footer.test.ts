import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// A source-text audit, not a mounted-component test: `compact` keeps the bottom bar
// and drops the site navigation and collection links for account layouts.
const SOURCE = readFileSync(join(import.meta.dirname, 'Footer.svelte'), 'utf8');

const GUARD_START = SOURCE.indexOf('{#if !compact}');
const GUARD_END = SOURCE.indexOf('{/if}', GUARD_START);

describe('Footer compact mode', () => {
  it('declares a compact prop defaulting to false', () => {
    expect(SOURCE).toMatch(/let\s*\{\s*compact\s*=\s*false\s*\}/);
  });

  it('skips the link groups and popular collections when compact', () => {
    const groupsAt = SOURCE.indexOf('{#each groups as group');
    const popularAt = SOURCE.indexOf('aria-label="Popular collections"');
    expect(GUARD_START, 'expected an {#if !compact} guard').toBeGreaterThan(-1);
    expect(groupsAt).toBeGreaterThan(GUARD_START);
    expect(popularAt).toBeGreaterThan(GUARD_START);
    expect(GUARD_END).toBeGreaterThan(popularAt);
  });

  it('keeps only job-search and site-information destinations in the footer navigation', () => {
    expect(SOURCE).toContain("resolve('/jobs')");
    expect(SOURCE).toContain("resolve('/companies')");
    expect(SOURCE).toContain("resolve('/collections')");
    expect(SOURCE).toContain("resolve('/sources')");
    expect(SOURCE).not.toContain("resolve('/talent')");
    expect(SOURCE).not.toContain("resolve('/features/");
    expect(SOURCE).not.toContain("resolve('/agents')");
  });

  it('still renders the bottom bar (copyright, cookie settings, social, open-source note) unconditionally', () => {
    const bottomBar = SOURCE.slice(GUARD_END);
    expect(bottomBar).toContain('©');
    expect(bottomBar).toContain('Cookie settings');
    expect(bottomBar).toContain('SOCIAL_LINKS');
    expect(bottomBar).toContain('View source on GitHub');
  });

  it("only borders the bottom bar's own top when compact (no divider from a section that isn't rendered)", () => {
    const commentAt = SOURCE.indexOf('Bottom bar:');
    const innerDivAt = SOURCE.indexOf('mx-auto flex max-w-6xl flex-col');
    const wrapperOpenTag = SOURCE.slice(commentAt, innerDivAt);
    expect(wrapperOpenTag).toContain('compact ?');
  });
});
