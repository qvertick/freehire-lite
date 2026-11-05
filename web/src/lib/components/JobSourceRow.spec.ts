import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import JobSourceRow from './JobSourceRow.svelte';

const props = { source: 'smartrecruiters', jobUrl: 'https://example.com/job/1' };

describe('JobSourceRow', () => {
  it('shows the display name and its brand mark', () => {
    const { container, getByText } = render(JobSourceRow, props);

    expect(getByText('SmartRecruiters')).toBeTruthy();
    expect(container.querySelector('img')?.getAttribute('src')).toContain('SmartRecruiters');
  });

  it('keeps the source filter link', () => {
    const { getByRole } = render(JobSourceRow, props);

    expect(getByRole('link').getAttribute('href')).toContain('source=smartrecruiters');
  });

  it('shows required attribution only for sources that require it', () => {
    const adzuna = render(JobSourceRow, { ...props, source: 'adzuna' });
    expect(adzuna.container.textContent).toContain('Adzuna');

    const devGlobalJobs = render(JobSourceRow, { ...props, source: 'devglobaljobs' });
    expect(devGlobalJobs.container.textContent).toContain('Powered by Dev Global Jobs');

    const other = render(JobSourceRow, props);
    expect(other.container.textContent).not.toContain('Powered by Dev Global Jobs');
  });
});
