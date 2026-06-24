/**
 * Location-aware destination rails — rule-based "AI" recommendations.
 */

import { LIVE_EXPLORE_CITIES } from '../config/exploreCities';
import { findNearestServicedCities, haversineKm, type NearestServicedCity } from './nearbyInventory';
import type { PublicPropertyListing } from './publicListings';
import { rankPropertiesForNearby } from './nearbyRanking';

export type DestinationRailKind =
  | 'weekend'
  | 'mountain'
  | 'family'
  | 'romantic'
  | 'workation'
  | 'nearby';

export type DestinationRail = {
  id: string;
  kind: DestinationRailKind;
  title: string;
  subtitle: string;
  properties: Array<PublicPropertyListing & { distanceKm?: number }>;
  citySlug?: string;
};

const RISHIKESH = { lat: 30.0869, lng: 78.2676, slug: 'rishikesh', name: 'Rishikesh' };

function isFamilyFriendly(p: PublicPropertyListing): boolean {
  return (p.max_guests ?? 0) >= 4 || (p.bedrooms ?? 0) >= 2;
}

function isRomanticFriendly(p: PublicPropertyListing): boolean {
  return Boolean(p.is_couple_friendly) || (p.max_guests ?? 0) <= 3;
}

function isLuxury(p: PublicPropertyListing): boolean {
  return Boolean(p.is_premium) || (p.price_per_day ?? 0) >= 4500;
}

function isWorkation(p: PublicPropertyListing): boolean {
  const amenities = Array.isArray(p.amenities) ? p.amenities.map((a) => String(a).toLowerCase()) : [];
  return amenities.some((a) => a.includes('wifi') || a.includes('wi-fi') || a.includes('desk'));
}

export function buildPersonalizedDestinationRails(input: {
  originLat: number;
  originLng: number;
  originCity?: string | null;
  allListings: PublicPropertyListing[];
  nearestCities?: NearestServicedCity[];
}): DestinationRail[] {
  const { originLat, originLng, originCity, allListings } = input;
  const cityLabel = originCity?.split(',')[0] ?? 'your area';
  const nearest = input.nearestCities ?? findNearestServicedCities(originLat, originLng, 5);

  const ranked = rankPropertiesForNearby(originLat, originLng, allListings, {
    limit: 40,
    maxKm: 200,
  });

  const rails: DestinationRail[] = [];

  const nearby = ranked.slice(0, 8);
  if (nearby.length > 0) {
    rails.push({
      id: 'nearby',
      kind: 'nearby',
      title: `Stays near ${cityLabel}`,
      subtitle: 'Handpicked around your location',
      properties: nearby,
    });
  }

  const weekendDistance = haversineKm(originLat, originLng, RISHIKESH.lat, RISHIKESH.lng);
  const weekendProps = ranked.filter(
    (p) => p.distanceKm >= 40 && p.distanceKm <= 180,
  ).slice(0, 6);
  if (weekendProps.length > 0) {
    rails.push({
      id: 'weekend',
      kind: 'weekend',
      title: `Perfect weekend escapes from ${cityLabel}`,
      subtitle:
        weekendDistance < 300
          ? `Riverside retreats · ~${Math.round(weekendDistance)} km away`
          : 'Curated short trips worth the drive',
      properties: weekendProps,
      citySlug: 'rishikesh',
    });
  }

  const mountain = ranked.filter((p) => {
    const c = (p.city ?? '').toLowerCase();
    return c.includes('rishikesh') || p.distanceKm > 80;
  }).slice(0, 6);
  if (mountain.length > 0) {
    rails.push({
      id: 'mountain',
      kind: 'mountain',
      title: 'Mountain stays within a few hours',
      subtitle: 'Fresh air, serene views, exceptional hosts',
      properties: mountain,
      citySlug: 'rishikesh',
    });
  }

  const family = ranked.filter(isFamilyFriendly).slice(0, 6);
  if (family.length > 0) {
    rails.push({
      id: 'family',
      kind: 'family',
      title: 'Family-friendly homes nearby',
      subtitle: 'Spacious stays guests love',
      properties: family,
    });
  }

  const romantic = ranked.filter(isRomanticFriendly).slice(0, 6);
  if (romantic.length > 0) {
    rails.push({
      id: 'romantic',
      kind: 'romantic',
      title: 'Romantic getaways nearby',
      subtitle: 'Couple-friendly, private, premium',
      properties: romantic,
    });
  }

  const workation = ranked.filter(isWorkation).slice(0, 6);
  if (workation.length > 0) {
    rails.push({
      id: 'workation',
      kind: 'workation',
      title: 'Workation-ready stays',
      subtitle: 'Fast Wi‑Fi and quiet spaces',
      properties: workation,
    });
  }

  const luxury = ranked.filter(isLuxury).slice(0, 6);
  if (luxury.length > 0) {
    rails.push({
      id: 'luxury',
      kind: 'nearby',
      title: 'Luxury picks near you',
      subtitle: 'Premium verified homes',
      properties: luxury,
    });
  }

  const longStay = ranked
    .filter((p) => (p.price_full_day ?? p.price_per_day ?? 0) > 0)
    .sort((a, b) => (a.price_per_day ?? 0) - (b.price_per_day ?? 0))
    .slice(0, 6);
  if (longStay.length > 0) {
    rails.push({
      id: 'longstay',
      kind: 'nearby',
      title: 'Great for longer stays',
      subtitle: 'Value homes for extended visits',
      properties: longStay,
    });
  }

  void LIVE_EXPLORE_CITIES;
  void nearest;

  return rails;
}
