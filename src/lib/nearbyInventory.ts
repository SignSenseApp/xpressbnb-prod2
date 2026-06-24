/**
 * Nearby inventory logic — haversine distance, serviced-city fallbacks, property ranking.
 */

import { normalizeCityBucket, type HomepageCityBucket } from './cityBuckets';
import { LIVE_EXPLORE_CITIES } from '../config/exploreCities';
import { isMappableProperty } from './propertyCoords';
import type { PublicPropertyListing } from './publicListings';

export type ServicedCityCoord = {
  city: HomepageCityBucket;
  slug: string;
  lat: number;
  lng: number;
};

/** Approximate centroids for live serviced destinations. */
export const SERVICED_CITY_COORDS: ServicedCityCoord[] = [
  { city: 'Delhi', slug: 'delhi', lat: 28.6139, lng: 77.209 },
  { city: 'Gurgaon', slug: 'gurgaon', lat: 28.4595, lng: 77.0266 },
  { city: 'Noida', slug: 'noida', lat: 28.5355, lng: 77.391 },
  { city: 'Greater Noida', slug: 'greater-noida', lat: 28.4744, lng: 77.504 },
  { city: 'Ghaziabad', slug: 'ghaziabad', lat: 28.6692, lng: 77.4538 },
  { city: 'Rishikesh', slug: 'rishikesh', lat: 30.0869, lng: 78.2676 },
];

const EARTH_RADIUS_KM = 6_371;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export type RankedProperty = PublicPropertyListing & {
  distanceKm: number;
};

export type NearestServicedCity = ServicedCityCoord & {
  distanceKm: number;
  exploreImage?: string;
  tagline?: string;
};

export function findNearestServicedCities(
  lat: number,
  lng: number,
  limit = 3,
): NearestServicedCity[] {
  const exploreBySlug = new Map(LIVE_EXPLORE_CITIES.map((c) => [c.slug, c]));

  return SERVICED_CITY_COORDS.map((entry) => {
    const explore = exploreBySlug.get(entry.slug);
    return {
      ...entry,
      distanceKm: haversineKm(lat, lng, entry.lat, entry.lng),
      exploreImage: explore?.image,
      tagline: explore?.tagline,
    };
  })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

export function matchDetectedCityToBucket(city: string | null | undefined): HomepageCityBucket | null {
  const bucket = normalizeCityBucket(city);
  if (!bucket) return null;
  const serviced = SERVICED_CITY_COORDS.find((c) => c.city === bucket);
  return serviced ? (bucket as HomepageCityBucket) : null;
}

export function rankPropertiesByDistance(
  originLat: number,
  originLng: number,
  properties: PublicPropertyListing[],
  options?: {
    limit?: number;
    maxKm?: number;
    excludeId?: string;
    cityBucket?: string | null;
  },
): RankedProperty[] {
  const limit = options?.limit ?? 12;
  const maxKm = options?.maxKm ?? 80;
  const excludeId = options?.excludeId;

  const ranked: RankedProperty[] = [];

  for (const property of properties) {
    if (excludeId && property.id === excludeId) continue;
    if (!isMappableProperty(property)) continue;

    const distanceKm = haversineKm(originLat, originLng, property.latitude, property.longitude);
    if (distanceKm > maxKm) continue;

    if (options?.cityBucket) {
      const bucket = normalizeCityBucket(property.city);
      if (bucket !== options.cityBucket) continue;
    }

    ranked.push({ ...property, distanceKm });
  }

  return ranked
    .sort((a, b) => {
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1;
      if (a.is_premium !== b.is_premium) return a.is_premium ? -1 : 1;
      return 0;
    })
    .slice(0, limit);
}

export function filterPropertiesInCityBucket(
  properties: PublicPropertyListing[],
  bucket: string,
): PublicPropertyListing[] {
  return properties.filter((p) => normalizeCityBucket(p.city) === bucket);
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return 'Less than 1 km away';
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}
