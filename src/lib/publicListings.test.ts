import { describe, expect, it } from 'vitest';
import {
  CARD_LISTING_CITY_EXTRA_FIELDS,
  CARD_LISTING_FIELDS,
  CARD_LISTING_SELECT,
  DETAIL_LISTING_SELECT,
  PUBLIC_LISTING_CORE_FIELDS,
  PUBLIC_LISTING_OPTIONAL_FIELDS,
  PUBLIC_LISTING_SELECT,
  normalizePublicPropertyListing,
  resolvePublicListingsFetchResult,
} from './publicListings';

const COMPLETE_ROW = {
  id: '11111111-1111-1111-1111-111111111111',
  title: 'Test Stay',
  slug: 'test-stay',
  city: 'Delhi',
  state: 'Delhi',
  country: 'India',
  images: ['https://example.com/a.jpg', ''],
  price_per_day: 3200,
  price_full_day: 4500,
  bedrooms: 2,
  bathrooms: 1,
  max_guests: 4,
  host_id: '22222222-2222-2222-2222-222222222222',
  is_active: true,
  is_verified: true,
  created_at: '2025-01-01T00:00:00Z',
  description: 'A nice stay',
  address: 'Connaught Place',
  amenities: ['WiFi', 'AC', 42, null],
  external_listings: [
    {
      source: 'airbnb',
      url: 'https://airbnb.com/rooms/1',
      listing_title: 'Test Stay',
      rating: 4.8,
      review_count: 12,
      verified_by_ops: true,
      checked_at: new Date().toISOString(),
    },
  ],
  latitude: 28.6,
  longitude: 77.2,
  is_premium: true,
  premium_plan: 'PAID',
  premium_expiry: new Date(Date.now() + 86_400_000).toISOString(),
  property_type: 'apartment',
};

describe('CARD_LISTING_SELECT contract', () => {
  it('includes approved card and city-extra fields only', () => {
    const allowed = new Set([...CARD_LISTING_FIELDS, ...CARD_LISTING_CITY_EXTRA_FIELDS]);
    const selected = CARD_LISTING_SELECT.split(',').map((f) => f.trim());
    expect(selected.length).toBe(allowed.size);
    for (const field of selected) {
      expect(allowed.has(field as (typeof CARD_LISTING_FIELDS)[number])).toBe(true);
    }
  });

  it('is a proper subset of the detail projection', () => {
    const card = new Set(CARD_LISTING_SELECT.split(',').map((f) => f.trim()));
    const detail = new Set(DETAIL_LISTING_SELECT.split(',').map((f) => f.trim()));
    for (const field of card) {
      expect(detail.has(field)).toBe(true);
    }
    expect(card.size).toBeLessThan(detail.size);
  });

  it('omits property-page-only scalar fields', () => {
    expect(CARD_LISTING_SELECT).not.toContain('country');
    expect(CARD_LISTING_SELECT).not.toContain('listing_type');
    expect(CARD_LISTING_SELECT).not.toContain('no_brokerage');
    expect(CARD_LISTING_SELECT).not.toContain('pay_at_property');
    expect(CARD_LISTING_SELECT).not.toContain('accepts_local_ids');
    expect(CARD_LISTING_SELECT).not.toContain('is_active');
  });
});

describe('DETAIL_LISTING_SELECT contract', () => {
  it('matches legacy PUBLIC_LISTING_SELECT', () => {
    expect(DETAIL_LISTING_SELECT).toBe(PUBLIC_LISTING_SELECT);
  });

  it('includes only approved core and optional fields', () => {
    const allowed = new Set([
      ...PUBLIC_LISTING_CORE_FIELDS,
      ...PUBLIC_LISTING_OPTIONAL_FIELDS,
    ]);
    const selected = DETAIL_LISTING_SELECT.split(',').map((f) => f.trim());
    expect(selected.length).toBe(allowed.size);
    for (const field of selected) {
      expect(allowed.has(field as (typeof PUBLIC_LISTING_CORE_FIELDS)[number])).toBe(true);
    }
  });

  it('does not include experimental or guest-review fields', () => {
    expect(DETAIL_LISTING_SELECT).not.toContain('rating');
    expect(DETAIL_LISTING_SELECT).not.toContain('total_reviews');
    expect(DETAIL_LISTING_SELECT).not.toContain('stats');
    expect(DETAIL_LISTING_SELECT).not.toContain('discount_percent');
  });
});

describe('normalizePublicPropertyListing', () => {
  it('normalizes a card-light row with safe defaults for omitted detail fields', () => {
    const cardRow = {
      id: COMPLETE_ROW.id,
      title: COMPLETE_ROW.title,
      slug: COMPLETE_ROW.slug,
      city: COMPLETE_ROW.city,
      state: COMPLETE_ROW.state,
      images: COMPLETE_ROW.images,
      price_per_day: COMPLETE_ROW.price_per_day,
      price_full_day: COMPLETE_ROW.price_full_day,
      bedrooms: COMPLETE_ROW.bedrooms,
      bathrooms: COMPLETE_ROW.bathrooms,
      max_guests: COMPLETE_ROW.max_guests,
      host_id: COMPLETE_ROW.host_id,
      is_verified: COMPLETE_ROW.is_verified,
      amenities: COMPLETE_ROW.amenities,
      latitude: COMPLETE_ROW.latitude,
      longitude: COMPLETE_ROW.longitude,
      is_premium: COMPLETE_ROW.is_premium,
      premium_plan: COMPLETE_ROW.premium_plan,
      premium_expiry: COMPLETE_ROW.premium_expiry,
      is_couple_friendly: true,
      hourly_stay_available: false,
      instant_booking: true,
      is_private_space: false,
    };
    const listing = normalizePublicPropertyListing(cardRow);
    expect(listing?.description).toBe('');
    expect(listing?.external_listings).toBeNull();
    expect(listing?.listing_type).toBeNull();
    expect(listing?.country).toBe('India');
  });

  it('normalizes a complete property', () => {
    const listing = normalizePublicPropertyListing(COMPLETE_ROW);
    expect(listing).not.toBeNull();
    expect(listing?.title).toBe('Test Stay');
    expect(listing?.images).toEqual(['https://example.com/a.jpg']);
    expect(listing?.amenities).toEqual(['WiFi', 'AC']);
    expect(listing?.price_per_day).toBe(3200);
  });

  it('handles missing amenities', () => {
    const listing = normalizePublicPropertyListing({ ...COMPLETE_ROW, amenities: null });
    expect(listing?.amenities).toEqual([]);
  });

  it('handles null images', () => {
    const listing = normalizePublicPropertyListing({ ...COMPLETE_ROW, images: null });
    expect(listing?.images).toEqual([]);
  });

  it('ignores malformed external_listings without throwing', () => {
    expect(() =>
      normalizePublicPropertyListing({ ...COMPLETE_ROW, external_listings: 'bad' }),
    ).not.toThrow();
    const listing = normalizePublicPropertyListing({ ...COMPLETE_ROW, external_listings: 'bad' });
    expect(listing?.external_listings).toBeNull();
  });

  it('handles missing premium fields', () => {
    const listing = normalizePublicPropertyListing({
      ...COMPLETE_ROW,
      is_premium: undefined,
      premium_plan: undefined,
      premium_expiry: undefined,
    });
    expect(listing?.is_premium).toBeNull();
    expect(listing?.premium_plan).toBeNull();
  });

  it('handles null coordinates', () => {
    const listing = normalizePublicPropertyListing({
      ...COMPLETE_ROW,
      latitude: null,
      longitude: null,
    });
    expect(listing?.latitude).toBeNull();
    expect(listing?.longitude).toBeNull();
  });

  it('uses safe fallbacks for null bedrooms/bathrooms/max_guests', () => {
    const listing = normalizePublicPropertyListing({
      ...COMPLETE_ROW,
      bedrooms: null,
      bathrooms: null,
      max_guests: null,
    });
    expect(listing?.bedrooms).toBe(0);
    expect(listing?.bathrooms).toBe(0);
    expect(listing?.max_guests).toBe(1);
  });

  it('uses location fallback for null city', () => {
    const listing = normalizePublicPropertyListing({ ...COMPLETE_ROW, city: null });
    expect(listing?.city).toBe('Location coming soon');
  });

  it('returns null for partial payload without id/title', () => {
    expect(normalizePublicPropertyListing({ city: 'Delhi' })).toBeNull();
    expect(normalizePublicPropertyListing(null)).toBeNull();
  });

  it('never throws on arbitrary partial payload', () => {
    expect(() => normalizePublicPropertyListing({ id: 'x', title: 'Y', images: 123 })).not.toThrow();
  });
});

describe('resolvePublicListingsFetchResult', () => {
  it('returns success with cards for valid rows', () => {
    const result = resolvePublicListingsFetchResult([COMPLETE_ROW], null);
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.listings).toHaveLength(1);
    }
  });

  it('returns success with empty array for empty success', () => {
    const result = resolvePublicListingsFetchResult([], null);
    expect(result).toEqual({ status: 'success', listings: [] });
  });

  it('returns error state for Supabase failure', () => {
    const result = resolvePublicListingsFetchResult(null, { message: 'boom' });
    expect(result).toEqual({ status: 'error', code: 'load_failed' });
  });

  it('drops malformed rows without failing the whole page', () => {
    const result = resolvePublicListingsFetchResult([COMPLETE_ROW, { city: 'only city' }], null);
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.listings).toHaveLength(1);
    }
  });
});
