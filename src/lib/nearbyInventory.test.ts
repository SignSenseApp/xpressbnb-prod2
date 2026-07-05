import { describe, expect, it } from 'vitest';
import {
  haversineKm,
  findNearestServicedCities,
  rankPropertiesByDistance,
  matchDetectedCityToBucket,
  formatDistanceKm,
} from './nearbyInventory';
import type { PublicPropertyListing } from './publicListings';

function mockProperty(
  overrides: Partial<PublicPropertyListing> & { id: string; latitude: number; longitude: number },
): PublicPropertyListing {
  return {
    id: overrides.id,
    title: overrides.title ?? 'Test Stay',
    slug: null,
    city: overrides.city ?? 'Gurgaon',
    state: 'Haryana',
    country: 'India',
    address: '',
    description: '',
    images: [],
    amenities: [],
    external_listings: null,
    bedrooms: 1,
    bathrooms: 1,
    max_guests: 2,
    price_per_day: 2000,
    price_full_day: null,
    host_id: null,
    is_active: true,
    is_verified: true,
    created_at: null,
    latitude: overrides.latitude,
    longitude: overrides.longitude,
    is_premium: false,
    premium_plan: null,
    premium_expiry: null,
    is_couple_friendly: null,
    hourly_stay_available: null,
    instant_booking: null,
    is_private_space: null,
    no_brokerage: null,
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

describe('haversineKm', () => {
  it('returns ~0 for identical coordinates', () => {
    expect(haversineKm(28.4595, 77.0266, 28.4595, 77.0266)).toBeLessThan(0.01);
  });

  it('computes Delhi to Gurgaon roughly 28km', () => {
    const km = haversineKm(28.6139, 77.209, 28.4595, 77.0266);
    expect(km).toBeGreaterThan(20);
    expect(km).toBeLessThan(40);
  });
});

describe('findNearestServicedCities', () => {
  it('returns cities sorted by distance', () => {
    const cities = findNearestServicedCities(28.4595, 77.0266, 3);
    expect(cities).toHaveLength(3);
    expect(cities[0].city).toBe('Gurgaon');
    expect(cities[0].distanceKm).toBeLessThan(cities[1].distanceKm);
  });
});

describe('rankPropertiesByDistance', () => {
  it('sorts mappable properties by proximity', () => {
    const originLat = 28.4595;
    const originLng = 77.0266;
    const near = mockProperty({ id: 'near', latitude: 28.46, longitude: 77.03, city: 'Gurgaon' });
    const far = mockProperty({ id: 'far', latitude: 28.6139, longitude: 77.209, city: 'Delhi' });

    const ranked = rankPropertiesByDistance(originLat, originLng, [far, near], { limit: 5 });
    expect(ranked[0].id).toBe('near');
    expect(ranked[0].distanceKm).toBeLessThan(ranked[1].distanceKm);
  });

  it('excludes properties beyond maxKm', () => {
    const ranked = rankPropertiesByDistance(
      28.4595,
      77.0266,
      [mockProperty({ id: 'rishikesh', latitude: 30.0869, longitude: 78.2676, city: 'Rishikesh' })],
      { maxKm: 50 },
    );
    expect(ranked).toHaveLength(0);
  });
});

describe('matchDetectedCityToBucket', () => {
  it('maps Gurugram to Gurgaon bucket', () => {
    expect(matchDetectedCityToBucket('Gurugram')).toBe('Gurgaon');
  });

  it('maps Dehradun (including Dehra Dun spelling) to Dehradun bucket', () => {
    expect(matchDetectedCityToBucket('Dehradun')).toBe('Dehradun');
    expect(matchDetectedCityToBucket('Dehra Dun')).toBe('Dehradun');
  });

  it('returns null for unserviced cities', () => {
    expect(matchDetectedCityToBucket('Mumbai')).toBeNull();
  });
});

describe('findNearestServicedCities — Dehradun', () => {
  it('returns Dehradun as nearest serviced city from Dehradun coords', () => {
    const cities = findNearestServicedCities(30.3165, 78.0322, 2);
    expect(cities[0].city).toBe('Dehradun');
    expect(cities[1].city).toBe('Rishikesh');
  });
});

describe('formatDistanceKm', () => {
  it('formats sub-km distances', () => {
    expect(formatDistanceKm(0.4)).toBe('Less than 1 km away');
  });

  it('formats medium distances with one decimal', () => {
    expect(formatDistanceKm(5.3)).toBe('5.3 km away');
  });
});
