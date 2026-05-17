/**
 * Canonical city buckets for homepage cards, `/stays/:slug`, and DB filters.
 * Legacy rows use mixed spellings (Gurugram vs Gurgaon, New Delhi vs Delhi).
 */

export const HOMEPAGE_CITY_BUCKETS = [
  'Delhi',
  'Gurgaon',
  'Noida',
  'Greater Noida',
  'Rishikesh',
] as const;

export type HomepageCityBucket = (typeof HOMEPAGE_CITY_BUCKETS)[number];

/** Raw `city` values that may appear in Supabase for each canonical stays page. */
export const CITY_VALUE_VARIANTS: Record<string, string[]> = {
  Delhi: ['Delhi', 'New Delhi', 'delhi', 'new delhi', 'NEW DELHI'],
  Gurgaon: ['Gurgaon', 'Gurugram', 'gurgaon', 'gurugram', 'GURGAON', 'GURUGRAM'],
  Noida: ['Noida', 'noida'],
  'Greater Noida': ['Greater Noida', 'greater noida'],
  Rishikesh: ['Rishikesh', 'rishikesh'],
};

/**
 * Map a raw `properties.city` string to the canonical bucket label, or null if unknown.
 */
export function normalizeCityBucket(city: string | null | undefined): string | null {
  const c = (city ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!c) return null;
  if (c === 'new delhi' || c === 'delhi') return 'Delhi';
  if (c === 'gurugram' || c === 'gurgaon') return 'Gurgaon';
  if (c === 'noida') return 'Noida';
  if (c === 'greater noida') return 'Greater Noida';
  if (c === 'rishikesh') return 'Rishikesh';
  if (c === 'ghaziabad') return 'Ghaziabad';
  return null;
}

/** Values to pass to `.in('city', …)` for a canonical city page. */
export function cityDbInList(canonicalCity: string): string[] {
  const base = CITY_VALUE_VARIANTS[canonicalCity] ?? [canonicalCity];
  return [...new Set(base)];
}
