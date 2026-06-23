import type { Property } from './database.types';
import { logSupabaseError, supabase } from './supabase';

/** Fields required for homepage/city listing cards — avoids heavy `select('*')` payloads. */
export const PUBLIC_LISTING_SELECT =
  'id,title,city,images,price_per_day,price_full_day,is_verified,external_listings,created_at,max_guests,is_couple_friendly,hourly_stay_available,instant_booking,is_private_space,no_brokerage,pay_at_property,description,address,bedrooms,bathrooms,host_id,is_active';

const RETRY_DELAY_MS = 700;
const CACHE_TTL_MS = 60_000;

let memoryCache: Property[] | null = null;
let cacheAt = 0;
let inflightAll: Promise<Property[]> | null = null;

function filterByCityValues(properties: Property[], cityValues: string[]): Property[] {
  const allowed = new Set(cityValues.map((c) => c.trim().toLowerCase()));
  return properties.filter((p) => allowed.has((p.city ?? '').trim().toLowerCase()));
}

async function queryActiveProperties(select: string): Promise<Property[]> {
  const { data, error } = await supabase
    .from('properties')
    .select(select)
    .eq('is_active', true)
    .order('is_verified', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Property[];
}

async function loadAllActiveProperties(forceRefresh = false): Promise<Property[]> {
  if (!forceRefresh && memoryCache && Date.now() - cacheAt < CACHE_TTL_MS) {
    return memoryCache;
  }

  if (!forceRefresh && inflightAll) {
    return inflightAll;
  }

  const run = async (): Promise<Property[]> => {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        try {
          return await queryActiveProperties(PUBLIC_LISTING_SELECT);
        } catch (narrowError) {
          logSupabaseError('fetchActiveProperties narrow select failed; retrying with *', narrowError);
          return await queryActiveProperties('*');
        }
      } catch (err) {
        lastError = err;
        logSupabaseError(`fetchActiveProperties attempt ${attempt}`, err);
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }

    throw lastError ?? new Error('Failed to load properties');
  };

  inflightAll = run()
    .then((data) => {
      memoryCache = data;
      cacheAt = Date.now();
      return data;
    })
    .finally(() => {
      inflightAll = null;
    });

  return inflightAll;
}

/**
 * Fetch active public inventory with deduped in-flight requests, short TTL cache,
 * automatic retry, and a safe fallback to `select('*')` if the narrow column list fails.
 */
export async function fetchActiveProperties(options?: {
  cityIn?: string[];
  forceRefresh?: boolean;
}): Promise<Property[]> {
  const cityIn = options?.cityIn?.filter(Boolean);

  if (cityIn?.length) {
    const all = await loadAllActiveProperties(options?.forceRefresh);
    const filtered = filterByCityValues(all, cityIn);
    if (filtered.length > 0) return filtered;

    // Cache may be stale vs DB — one direct city query before giving up.
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select(PUBLIC_LISTING_SELECT)
          .eq('is_active', true)
          .in('city', cityIn)
          .order('is_verified', { ascending: false })
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? []) as Property[];
      } catch (err) {
        lastError = err;
        logSupabaseError(`fetchActiveProperties city attempt ${attempt}`, err);
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }
    throw lastError ?? new Error('Failed to load city properties');
  }

  return loadAllActiveProperties(options?.forceRefresh);
}

/** Clear cached public inventory (e.g. manual retry after error). */
export function invalidatePublicListingsCache(): void {
  memoryCache = null;
  cacheAt = 0;
}
