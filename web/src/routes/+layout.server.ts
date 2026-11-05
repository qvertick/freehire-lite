import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => ({ locale: 'en' as const });
