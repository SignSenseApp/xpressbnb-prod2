import { describe, expect, it } from 'vitest';
import { computeNearbyRankScore, rankPropertiesForNearby } from './nearbyRanking';
import type { PublicPropertyListing } from './publicListings';

function mockListing(
  overrides: Partial<PublicPropertyListing> & { id: string; lat: number; lng: number },
): PublicPropertyListing {
  return {
    id: overrides.id,
    title: 'Stay',
    slug: null,
    city: overrides.city ?? 'Gurgaon',
    state: 'Haryana',
    country: 'India',
    address: '',
    description: '',
    images: ['a.jpg', 'b.jpg', 'c.jpg', 'd.jpg', 'e.jpg'],
    amenities: ['wifi'],
    external_listings: null,
    bedrooms: 2,
    bathrooms: 1,
    max_guests: 4,
    price_per_day: 3000,
    price_full_day: null,
    host_id: 'h1',
    is_active: true,
    is_verified: true,
    created_at: null,
    latitude: overrides.lat,
    longitude: overrides.lng,
    is_premium: overrides.is_premium ?? false,
    premium_plan: null,
    premium_expiry: null,
    is_couple_friendly: true,
    hourly_stay_available: true,
    instant_booking: overrides.instant_booking ?? false,
    is_private_space: true,
    no_brokerage: true,
    pay_at_property: null,
    property_type: 'apartment',
    listing_type: null,
    accepts_local_ids: null,
    expert_listed: null,
    external_calendars: null,
    premium_stats: null,
    rating: null,
    stats: null,
    total_reviews: null,
    updated_at: null,
  };
}

describe('computeNearbyRankScore', () => {
  it('prefers closer verified listings', () => {
    const near = mockListing({ id: 'n', lat: 28.46, lng: 77.03 });
    const far = mockListing({ id: 'f', lat: 28.55, lng: 77.12 });
    const nearScore = computeNearbyRankScore(near, 1, 50);
    const farScore = computeNearbyRankScore(far, 12, 50);
    expect(nearScore).toBeGreaterThan(farScore);
  });
});

describe('rankPropertiesForNearby', () => {
  it('returns ranked results with distanceKm', () => {
    const ranked = rankPropertiesForNearby(28.4595, 77.0266, [
      mockListing({ id: 'a', lat: 28.47, lng: 77.04 }),
      mockListing({ id: 'b', lat: 28.61, lng: 77.2 }),
    ]);
    expect(ranked[0].id).toBe('a');
    expect(ranked[0].distanceKm).toBeLessThan(5);
    expect(ranked[0].rankScore).toBeGreaterThan(0);
  });
});
