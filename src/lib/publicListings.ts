/**
 * Public guest listing contract — single source of truth for marketplace inventory.
 * Grid/card fetches use CARD_LISTING_SELECT; property detail uses DETAIL_LISTING_SELECT.
 */

import type { Json, Property } from './database.types';
import { cityDbInList } from './cityBuckets';
import { trackXpressEvent } from './analytics';
import { logSupabaseError, supabase } from './supabase';
import { invalidatePublicHostCache } from './hostPublicCache';

/**
 * Card/grid projection — homepage, city listings, featured carousel.
 * Changing this list requires updating publicListings.test.ts.
 */
export const CARD_LISTING_FIELDS = [
  'id',
  'title',
  'slug',
  'city',
  'state',
  'images',
  'price_per_day',
  'price_full_day',
  'bedrooms',
  'bathrooms',
  'max_guests',
  'host_id',
  'is_verified',
  'amenities',
  'latitude',
  'longitude',
  'is_premium',
  'premium_plan',
  'premium_expiry',
  'is_couple_friendly',
  'hourly_stay_available',
  'instant_booking',
  'is_private_space',
] as const;

/**
 * Extra fields required by RishikeshStaysPage mapPublicListingToStay on city grid fetch.
 * Omitted from homepage-only paths but included in shared city/card inventory queries.
 */
export const CARD_LISTING_CITY_EXTRA_FIELDS = [
  'description',
  'address',
  'property_type',
  'external_listings',
  'created_at',
] as const;

export const CARD_LISTING_SELECT = [
  ...CARD_LISTING_FIELDS,
  ...CARD_LISTING_CITY_EXTRA_FIELDS,
].join(',');

/** Stable core fields — changing this list requires updating publicListings.test.ts */
export const PUBLIC_LISTING_CORE_FIELDS = [
  'id',
  'title',
  'slug',
  'city',
  'state',
  'country',
  'images',
  'price_per_day',
  'price_full_day',
  'bedrooms',
  'bathrooms',
  'max_guests',
  'host_id',
  'is_active',
  'is_verified',
  'created_at',
] as const;

/**
 * Optional feature fields — nullable in rows; omitted from DB must not fail list fetch.
 * Stay Score / trust / premium / coordinates derive from these when present.
 */
export const PUBLIC_LISTING_OPTIONAL_FIELDS = [
  'description',
  'address',
  'amenities',
  'external_listings',
  'latitude',
  'longitude',
  'is_premium',
  'premium_plan',
  'premium_expiry',
  'is_couple_friendly',
  'hourly_stay_available',
  'instant_booking',
  'is_private_space',
  'no_brokerage',
  'pay_at_property',
  'property_type',
  'listing_type',
  'accepts_local_ids',
] as const;

/** Full property detail projection — PropertyPage, slug routes, prefetch warm. */
export const DETAIL_LISTING_SELECT = [
  ...PUBLIC_LISTING_CORE_FIELDS,
  ...PUBLIC_LISTING_OPTIONAL_FIELDS,
].join(',');

/** @deprecated Use DETAIL_LISTING_SELECT for detail; CARD_LISTING_SELECT for grids. */
export const PUBLIC_LISTING_SELECT = DETAIL_LISTING_SELECT;

/** Detail pages — full allowlisted projection. */
export const PUBLIC_PROPERTY_DETAIL_SELECT = DETAIL_LISTING_SELECT;

export type PublicPropertyListing = Property;

export type PublicListingsFetchResult =
  | { status: 'success'; listings: PublicPropertyListing[] }
  | { status: 'error'; code: 'load_failed' };

export type PublicPropertyFetchResult =
  | { status: 'success'; property: PublicPropertyListing }
  | { status: 'not_found' }
  | { status: 'error'; code: 'load_failed' };

const RETRY_DELAY_MS = 700;
const CACHE_TTL_MS = 60_000;
const LOCATION_FALLBACK = 'Location coming soon';

/** Card-light grid inventory — must not satisfy property detail cache lookups. */
let memoryCardCache: PublicPropertyListing[] | null = null;
let cardCacheAt = 0;
let inflightAll: Promise<PublicListingsFetchResult> | null = null;

/** Full detail rows only — PropertyPage cache-hit path. */
const propertyDetailCache = new Map<string, { at: number; property: PublicPropertyListing }>();
const inflightByPropertyId = new Map<string, Promise<PublicPropertyFetchResult>>();

function findCachedDetailById(id: string): PublicPropertyListing | null {
  const entry = propertyDetailCache.get(id);
  if (entry && Date.now() - entry.at < CACHE_TTL_MS) {
    return entry.property;
  }
  return null;
}

function cachePropertyDetail(property: PublicPropertyListing): void {
  propertyDetailCache.set(property.id, { at: Date.now(), property });
}

function safeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function safeNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function safeNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function safeNullableNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function safeNullableBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1) return true;
  if (value === 'false' || value === 0) return false;
  return null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim());
}

function normalizeImages(value: unknown): Json {
  return normalizeStringArray(value);
}

function normalizeAmenities(value: unknown): Json {
  return normalizeStringArray(value);
}

function normalizeExternalListings(value: unknown): Json | null {
  if (value == null) return null;
  if (Array.isArray(value) || (typeof value === 'object' && !Array.isArray(value))) {
    return value as Json;
  }
  return null;
}

/**
 * Safe row normalizer — never throws. Returns null when id/title are unusable.
 */
export function normalizePublicPropertyListing(raw: unknown): PublicPropertyListing | null {
  if (!raw || typeof raw !== 'object') return null;

  const row = raw as Record<string, unknown>;
  const id = safeString(row.id).trim();
  const title = safeString(row.title).trim();
  if (!id || !title) return null;

  const cityRaw = safeString(row.city).trim();

  return {
    id,
    title,
    slug: safeNullableString(row.slug),
    city: cityRaw || LOCATION_FALLBACK,
    state: safeString(row.state),
    country: safeString(row.country, 'India'),
    address: safeString(row.address),
    description: safeString(row.description),
    images: normalizeImages(row.images),
    amenities: normalizeAmenities(row.amenities),
    external_listings: normalizeExternalListings(row.external_listings),
    bedrooms: safeNumber(row.bedrooms, 0),
    bathrooms: safeNumber(row.bathrooms, 0),
    max_guests: safeNumber(row.max_guests, 1),
    price_per_day: safeNumber(row.price_per_day, 0),
    price_full_day: safeNullableNumber(row.price_full_day),
    host_id: safeNullableString(row.host_id),
    is_active: safeNullableBoolean(row.is_active) ?? true,
    is_verified: safeNullableBoolean(row.is_verified),
    created_at: safeNullableString(row.created_at),
    latitude: safeNullableNumber(row.latitude),
    longitude: safeNullableNumber(row.longitude),
    is_premium: safeNullableBoolean(row.is_premium),
    premium_plan: safeNullableString(row.premium_plan),
    premium_expiry: safeNullableString(row.premium_expiry),
    is_couple_friendly: safeNullableBoolean(row.is_couple_friendly),
    hourly_stay_available: safeNullableBoolean(row.hourly_stay_available),
    instant_booking: safeNullableBoolean(row.instant_booking),
    is_private_space: safeNullableBoolean(row.is_private_space),
    no_brokerage: safeNullableBoolean(row.no_brokerage),
    pay_at_property: safeNullableBoolean(row.pay_at_property),
    property_type: safeString(row.property_type, 'apartment'),
    listing_type: safeNullableString(row.listing_type),
    accepts_local_ids: safeNullableBoolean(row.accepts_local_ids),
    // Fields not in public select — safe defaults for Property shape
    expert_listed: null,
    external_calendars: null,
    premium_stats: null,
    rating: null,
    stats: null,
    total_reviews: null,
    updated_at: null,
  };
}

/** Pure result resolver for tests and fetch pipeline. */
export function resolvePublicListingsFetchResult(
  rawRows: unknown[] | null | undefined,
  error: unknown | null | undefined,
): PublicListingsFetchResult {
  if (error) {
    return { status: 'error', code: 'load_failed' };
  }

  const listings = (rawRows ?? [])
    .map(normalizePublicPropertyListing)
    .filter((listing): listing is PublicPropertyListing => listing != null);

  return { status: 'success', listings };
}

function filterByCityValues(
  properties: PublicPropertyListing[],
  cityValues: string[],
): PublicPropertyListing[] {
  const allowed = new Set(cityValues.map((c) => c.trim().toLowerCase()));
  return properties.filter((p) => allowed.has((p.city ?? '').trim().toLowerCase()));
}

async function queryActiveProperties(select: string): Promise<PublicListingsFetchResult> {
  const { data, error } = await supabase
    .from('properties')
    .select(select)
    .eq('is_active', true)
    .order('is_verified', { ascending: false })
    .order('created_at', { ascending: false });

  return resolvePublicListingsFetchResult(data, error);
}

async function loadAllActiveProperties(forceRefresh = false): Promise<PublicListingsFetchResult> {
  if (!forceRefresh && memoryCardCache && Date.now() - cardCacheAt < CACHE_TTL_MS) {
    return { status: 'success', listings: memoryCardCache };
  }

  if (!forceRefresh && inflightAll) {
    return inflightAll;
  }

  const run = async (): Promise<PublicListingsFetchResult> => {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const result = await queryActiveProperties(CARD_LISTING_SELECT);
      if (result.status === 'success') {
        return result;
      }

      logSupabaseError(`getPublicListings attempt ${attempt}`, result);
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }

    trackXpressEvent('property_list_load_failed', { error_category: 'public_listings' });
    return { status: 'error', code: 'load_failed' };
  };

  inflightAll = run()
    .then((result) => {
      if (result.status === 'success') {
        memoryCardCache = result.listings;
        cardCacheAt = Date.now();
      }
      return result;
    })
    .finally(() => {
      inflightAll = null;
    });

  return inflightAll;
}

/** Fetch all active public listings with retry + short TTL card cache. */
export async function getPublicListings(options?: {
  forceRefresh?: boolean;
}): Promise<PublicListingsFetchResult> {
  return loadAllActiveProperties(options?.forceRefresh);
}

/** Fetch active listings for a display city bucket (e.g. "Delhi", "Rishikesh"). */
export async function getPublicListingsByCity(
  city: string,
  options?: { forceRefresh?: boolean },
): Promise<PublicListingsFetchResult> {
  const cityIn = cityDbInList(city);

  const allResult = await loadAllActiveProperties(options?.forceRefresh);
  if (allResult.status === 'error') {
    return allResult;
  }

  const filtered = filterByCityValues(allResult.listings, cityIn);
  if (filtered.length > 0) {
    return { status: 'success', listings: filtered };
  }

  // Cache may be stale — one direct city query before giving up.
  let lastResult: PublicListingsFetchResult = { status: 'error', code: 'load_failed' };
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { data, error } = await supabase
      .from('properties')
      .select(CARD_LISTING_SELECT)
      .eq('is_active', true)
      .in('city', cityIn)
      .order('is_verified', { ascending: false })
      .order('created_at', { ascending: false });

    const result = resolvePublicListingsFetchResult(data, error);
    if (result.status === 'success') {
      return result;
    }

    lastResult = result;
    logSupabaseError(`getPublicListingsByCity attempt ${attempt}`, error);
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }

  trackXpressEvent('property_list_load_failed', {
    error_category: 'public_listings_city',
    city,
  });
  return lastResult;
}

/** Fetch a single active listing by URL slug. */
export async function getPublicPropertyBySlug(slug: string): Promise<PublicPropertyFetchResult> {
  const trimmed = slug.trim();
  if (!trimmed) {
    return { status: 'not_found' };
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    const { data, error } = await supabase
      .from('properties')
      .select(DETAIL_LISTING_SELECT)
      .eq('slug', trimmed)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      logSupabaseError(`getPublicPropertyBySlug attempt ${attempt}`, error);
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }
      trackXpressEvent('property_list_load_failed', { error_category: 'public_property_slug' });
      return { status: 'error', code: 'load_failed' };
    }

    if (!data) {
      return { status: 'not_found' };
    }

    const property = normalizePublicPropertyListing(data);
    if (!property) {
      return { status: 'not_found' };
    }

    cachePropertyDetail(property);
    return { status: 'success', property };
  }

  return { status: 'error', code: 'load_failed' };
}

/**
 * Warm full property detail for navigation — never seeds detail cache from card rows.
 * Safe to call from card hover/touch; no-op when detail is already cached.
 */
export function prefetchPublicPropertyById(
  id: string,
  knownListing?: PublicPropertyListing | null,
): void {
  const trimmed = id.trim();
  if (!trimmed) return;
  void knownListing;
  if (findCachedDetailById(trimmed)) return;
  void getPublicPropertyById(trimmed);
}

/** Fetch a single active listing by id (current /property/:id routes). */
export async function getPublicPropertyById(id: string): Promise<PublicPropertyFetchResult> {
  const trimmed = id.trim();
  if (!trimmed) {
    return { status: 'not_found' };
  }

  const cached = findCachedDetailById(trimmed);
  if (cached) {
    return { status: 'success', property: cached };
  }

  const inflight = inflightByPropertyId.get(trimmed);
  if (inflight) {
    return inflight;
  }

  const run = async (): Promise<PublicPropertyFetchResult> => {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const { data, error } = await supabase
        .from('properties')
        .select(DETAIL_LISTING_SELECT)
        .eq('id', trimmed)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        logSupabaseError(`getPublicPropertyById attempt ${attempt}`, error);
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }
        trackXpressEvent('property_load_failed', {
          property_id: trimmed,
          error_category: 'public_property_id',
        });
        return { status: 'error', code: 'load_failed' };
      }

      if (!data) {
        return { status: 'not_found' };
      }

      const property = normalizePublicPropertyListing(data);
      if (!property) {
        return { status: 'not_found' };
      }

      cachePropertyDetail(property);
      return { status: 'success', property };
    }

    return { status: 'error', code: 'load_failed' };
  };

  const promise = run().finally(() => {
    inflightByPropertyId.delete(trimmed);
  });
  inflightByPropertyId.set(trimmed, promise);
  return promise;
}

/** Clear cached public inventory (e.g. manual retry after error). */
export function invalidatePublicListingsCache(): void {
  memoryCardCache = null;
  cardCacheAt = 0;
  propertyDetailCache.clear();
  inflightByPropertyId.clear();
  invalidatePublicHostCache();
}

/**
 * @deprecated Prefer getPublicListings() which returns explicit success/error.
 * Throws on load failure for legacy callers during migration.
 */
export async function fetchActiveProperties(options?: {
  cityIn?: string[];
  forceRefresh?: boolean;
}): Promise<PublicPropertyListing[]> {
  const cityIn = options?.cityIn?.filter(Boolean);
  const result = await getPublicListings({ forceRefresh: options?.forceRefresh });
  if (result.status === 'error') {
    throw new Error('Failed to load properties');
  }
  if (cityIn?.length) {
    return filterByCityValues(result.listings, cityIn);
  }
  return result.listings;
}
