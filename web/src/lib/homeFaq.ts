// Shared by the visible About page and its FAQPage JSON-LD.

import type { FaqItem } from './seo';

export const HOME_FAQ: FaqItem[] = [
  {
    question: 'What is Job Searcher?',
    answer:
      'Job Searcher combines vacancies from supported job platforms in one searchable catalogue. Listings are normalized and deduplicated where the available data allows.',
  },
  {
    question: 'Do I need an account to search?',
    answer:
      'No. The public vacancy search can be used without creating an account.',
  },
  {
    question: 'Where do vacancies come from?',
    answer:
      'Vacancies come from the job platforms and public career boards that have an active integration. Coverage and available fields vary by source.',
  },
  {
    question: 'How do I apply?',
    answer:
      'Open a vacancy to follow its original listing. Job Searcher helps discover and search vacancies; the employer or source site handles the application.',
  },
];
