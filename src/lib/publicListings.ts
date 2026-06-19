import type { Property } from './database.types';
import { logSupabaseError, supabase } from './supabase';

/** Fields required for homepage/city listing cards — avoids heavy `select('*')` payloads. */
export const PUBLIC_LISTING_SELECT =
  'id,title,city,images,price_per_day,price_full_day,rating,total_reviews,is_verified,max_guests,is_couple_friendly,hourly_stay_available,instant_booking,is_private_space,no_brokerage,pay_at_property,description,address,bedrooms,bathrooms,host_id,is_active';

const RETRY_DELAY_MS = 700;

/**
 * Fetch active public inventory with one automatic retry for transient network errors.
 * Pass `signal` from an AbortController so stale responses are ignored after unmount.
 */
export async function fetchActiveProperties(options?: {
  cityIn?: string[];
  signal?: AbortSignal;
}): Promise<Property[]> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    if (options?.signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    let query = supabase
      .from('properties')
      .select(PUBLIC_LISTING_SELECT)
      .eq('is_active', true)
      .order('is_verified', { ascending: false })
      .order('rating', { ascending: false });

    if (options?.cityIn?.length) {
      query = query.in('city', options.cityIn);
    }

    const { data, error } = await query;
    if (!error) {
      return (data ?? []) as Property[];
    }

    lastError = error;
    logSupabaseError(`fetchActiveProperties attempt ${attempt}`, error);

    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  throw lastError ?? new Error('Failed to load properties');
}
