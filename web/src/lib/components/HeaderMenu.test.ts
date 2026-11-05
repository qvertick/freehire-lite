import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SOURCE = readFileSync(join(import.meta.dirname, 'HeaderMenu.svelte'), 'utf8');

describe('public site navigation', () => {
  it('keeps the public job-search destinations and theme controls', () => {
    expect(SOURCE).toContain('NAV.jobs');
    expect(SOURCE).toContain('NAV.companies');
    expect(SOURCE).toContain('NAV.collections');
    expect(SOURCE).toContain('NAV.about');
    expect(SOURCE).toContain('themeButton()');
  });

  it('does not expose account or recruitment destinations', () => {
    expect(SOURCE).not.toMatch(/signin|sign in|profile|workspace|employer|referral|talent|mentor|discord/i);
    expect(SOURCE).not.toContain('HeaderProfileMenu');
    expect(SOURCE).not.toContain('WorkspaceSwitcher');
  });
});
