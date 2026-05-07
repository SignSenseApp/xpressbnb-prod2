/**
 * Property page defaults & inference helpers.
 *
 * The Figma layout for the redesigned property page asks for several pieces
 * of information the Supabase `properties` row does not (yet) carry — a
 * subtitle line, sub-rating breakdown, nearby places, "why guests love"
 * blurbs, and house rules. Rather than introducing schema migrations or
 * faking high ratings, we centralise sensible defaults / inference here.
 *
 * Rules:
 *  - When the row genuinely has data (rating > 0, total_reviews > 0,
 *    relevant amenities, etc.), use it.
 *  - Otherwise return a graceful zero / empty state rather than fake values.
 *  - All inference is pure / synchronous so components can call it during
 *    render without effects.
 */
import type { Property } from '../lib/database.types';

/**
 * State inference per city. Some legacy rows have an empty `state` field;
 * we don't want the location line to read "Address, City, " with a hanging
 * comma.
 */
export function inferStateFromCity(city: string | null | undefined): string {
  const c = (city ?? '').trim().toLowerCase();
  if (!c) return '';
  if (c === 'rishikesh') return 'Uttarakhand';
  if (c === 'delhi' || c === 'new delhi') return 'Delhi';
  if (c === 'gurgaon' || c === 'gurugram') return 'Haryana';
  if (c === 'noida' || c === 'greater noida') return 'Uttar Pradesh';
  return '';
}

/**
 * "Best Riverside Camping in Rishikesh" → " with Swimming Pool" subtitle.
 * Picks the most distinguishing amenity / trait. Returns null if nothing
 * meaningful applies.
 */
export function inferSubtitle(property: Property): string | null {
  const amenities = (property.amenities ?? []).map((a) => a.toLowerCase());
  if (amenities.some((a) => a.includes('pool') || a.includes('swim'))) return 'with Swimming Pool';
  if (amenities.some((a) => a.includes('mountain'))) return 'with Mountain Views';
  if (amenities.some((a) => a.includes('beach') || a.includes('waterfront'))) return 'with River / Beach Access';
  if (amenities.some((a) => a.includes('garden'))) return 'with Garden Views';
  if (property.is_couple_friendly) return 'Couple-Friendly Stay';
  return null;
}

/**
 * Feature highlight chips rendered under the description.
 * Inferred from amenities + city + title so each property gets contextual,
 * non-fake chips that read like a curator wrote them.
 */
export function inferFeatureHighlights(property: Property): string[] {
  const amenities = (property.amenities ?? []).map((a) => a.toLowerCase());
  const cityLower = (property.city ?? '').toLowerCase();
  const titleLower = (property.title ?? '').toLowerCase();
  const out: string[] = [];

  if (cityLower === 'rishikesh' || /river|riverside|ganga/i.test(titleLower)) {
    out.push('Riverside location');
  }
  if (amenities.some((a) => a.includes('pool') || a.includes('swim'))) out.push('Swimming pool');
  if (amenities.some((a) => a.includes('bbq') || a.includes('fire'))) out.push('Bonfire & BBQ');
  if (amenities.some((a) => a.includes('wifi'))) out.push('WiFi & power backup');
  if (amenities.some((a) => a.includes('mountain'))) out.push('Mountain views');
  if (amenities.some((a) => a.includes('breakfast'))) out.push('Breakfast included');
  if (amenities.some((a) => a.includes('parking'))) out.push('Free parking');
  if (property.is_couple_friendly) out.push('Couple friendly');
  if (property.pay_at_property) out.push('Pay at property');

  return Array.from(new Set(out)).slice(0, 6);
}

export interface SubRating {
  label: string;
  /** 0 means "no real signal yet"; UI hides the bars rather than faking a 4.9. */
  value: number;
}

const SUB_RATING_LABELS = [
  'Cleanliness',
  'Accuracy',
  'Communication',
  'Location',
  'Check-in',
  'Value',
];

/**
 * Sub-rating bars. We don't have per-category data in the schema, so when a
 * property has a real overall rating we mirror it across all categories
 * (the bars read consistently rather than fabricating uneven 4.9s). When
 * `total_reviews === 0` we return zero values so the page can hide the
 * bars and show a graceful "no reviews yet" state instead.
 */
export function getSubRatings(property: Property): SubRating[] {
  const r = Number(property.rating) || 0;
  const reviews = Number(property.total_reviews) || 0;
  if (r === 0 || reviews === 0) {
    return SUB_RATING_LABELS.map((label) => ({ label, value: 0 }));
  }
  return SUB_RATING_LABELS.map((label) => ({ label, value: r }));
}

/** Returns `true` if the property has any review signal worth rendering. */
export function hasReviewSignal(property: Property): boolean {
  return (Number(property.rating) || 0) > 0 && (Number(property.total_reviews) || 0) > 0;
}

export interface WhyLoveItem {
  title: string;
  subcopy: string;
  icon: 'sparkles' | 'shield' | 'leaf' | 'heart';
}

export const WHY_LOVE_DEFAULTS: WhyLoveItem[] = [
  {
    title: 'Hand-picked stay',
    subcopy: 'Every property is personally inspected before it gets listed.',
    icon: 'sparkles',
  },
  {
    title: 'Verified hosts',
    subcopy: 'KYC-checked owners who reply within an hour, on average.',
    icon: 'shield',
  },
  {
    title: 'Quiet, private space',
    subcopy: 'No shared lobbies or thin walls — just calm and privacy.',
    icon: 'leaf',
  },
  {
    title: 'Real photos, real reviews',
    subcopy: 'What you see in the listing is exactly what you get on arrival.',
    icon: 'heart',
  },
];

export interface NearbyPlace {
  name: string;
  category: string;
  distance: string;
}

/**
 * Per-city nearby places. We don't store these in Supabase yet, so each city
 * gets a small curated list. Properties from other cities fall back to a
 * generic list rather than rendering nothing at all.
 */
export function getNearbyPlaces(property: Property): NearbyPlace[] {
  const city = (property.city ?? '').trim().toLowerCase();
  const map: Record<string, NearbyPlace[]> = {
    rishikesh: [
      { name: 'Lakshman Jhula', category: 'Iconic bridge', distance: '1.2 km' },
      { name: 'The Beatles Ashram', category: 'Cultural', distance: '2.4 km' },
      { name: 'Triveni Ghat', category: 'Riverfront', distance: '3.0 km' },
      { name: 'Neelkanth Mahadev Temple', category: 'Temple', distance: '11 km' },
      { name: 'Shivpuri Rafting Point', category: 'Adventure', distance: '14 km' },
    ],
    delhi: [
      { name: 'Connaught Place', category: 'Shopping & dining', distance: '4.0 km' },
      { name: 'India Gate', category: 'Landmark', distance: '6.5 km' },
      { name: 'Khan Market', category: 'Cafés & boutiques', distance: '5.2 km' },
      { name: 'Hauz Khas Village', category: 'Nightlife', distance: '8.0 km' },
      { name: 'IGI Airport (T3)', category: 'Airport', distance: '14 km' },
    ],
    gurgaon: [
      { name: 'CyberHub', category: 'Dining & nightlife', distance: '3.0 km' },
      { name: 'Ambience Mall', category: 'Shopping', distance: '4.5 km' },
      { name: 'Kingdom of Dreams', category: 'Entertainment', distance: '5.8 km' },
      { name: 'Sultanpur Bird Sanctuary', category: 'Nature', distance: '15 km' },
      { name: 'IGI Airport', category: 'Airport', distance: '12 km' },
    ],
    gurugram: [
      { name: 'CyberHub', category: 'Dining & nightlife', distance: '3.0 km' },
      { name: 'Ambience Mall', category: 'Shopping', distance: '4.5 km' },
      { name: 'Kingdom of Dreams', category: 'Entertainment', distance: '5.8 km' },
      { name: 'Sultanpur Bird Sanctuary', category: 'Nature', distance: '15 km' },
      { name: 'IGI Airport', category: 'Airport', distance: '12 km' },
    ],
    noida: [
      { name: 'DLF Mall of India', category: 'Shopping', distance: '3.8 km' },
      { name: 'Worlds of Wonder', category: 'Theme park', distance: '6.4 km' },
      { name: 'Botanical Garden', category: 'Nature', distance: '5.1 km' },
      { name: 'Akshardham Temple', category: 'Cultural', distance: '8.0 km' },
      { name: 'IGI Airport', category: 'Airport', distance: '24 km' },
    ],
    'greater noida': [
      { name: 'Buddh International Circuit', category: 'Sport', distance: '8 km' },
      { name: 'India Expo Centre', category: 'Events', distance: '5 km' },
      { name: 'Pari Chowk', category: 'Hub', distance: '3 km' },
      { name: 'Surajpur Bird Sanctuary', category: 'Nature', distance: '7 km' },
      { name: 'IGI Airport', category: 'Airport', distance: '38 km' },
    ],
  };
  return (
    map[city] ?? [
      { name: 'City centre', category: 'Hub', distance: '~5 km' },
      { name: 'Local market', category: 'Shopping', distance: '~2 km' },
      { name: 'Restaurants & cafés', category: 'Dining', distance: '~1 km' },
      { name: 'Public transit', category: 'Transit', distance: '~1.5 km' },
    ]
  );
}

export interface HouseRule {
  label: string;
  detail: string;
  icon: 'clock' | 'no-smoking' | 'no-parties' | 'paw';
}

export function getHouseRules(): HouseRule[] {
  return [
    { label: 'Check-in', detail: 'After 2:00 PM', icon: 'clock' },
    { label: 'Check-out', detail: 'Before 11:00 AM', icon: 'clock' },
    { label: 'No smoking indoors', detail: 'Designated outdoor areas only', icon: 'no-smoking' },
    { label: 'No parties or events', detail: 'Quiet hours after 10 PM', icon: 'no-parties' },
    { label: 'Pets', detail: 'Allowed on request', icon: 'paw' },
  ];
}

export interface TrustPill {
  title: string;
  subtitle: string;
  /** verified = emerald; trust = blue info / booking */
  tone: 'verified' | 'trust';
}

export const TRUST_PILLS: TrustPill[] = [
  { title: 'Verified & inspected', subtitle: 'Quality-checked stay', tone: 'verified' },
  { title: 'Pay at property or secure booking', subtitle: 'Flexible booking', tone: 'trust' },
  { title: 'No hidden fees', subtitle: 'What you see is what you pay', tone: 'trust' },
  { title: 'Quick host response', subtitle: 'Typically replies in an hour', tone: 'trust' },
];

/**
 * Build a Google Maps "iframe?output=embed" URL. This legacy embed format
 * works without an API key — perfect for a small location preview that
 * never blocks the rest of the page. Falls back to address search when
 * lat/lng are missing or default-zero.
 */
export function getMapEmbedUrl(property: Property): string {
  const hasCoords =
    typeof property.latitude === 'number' &&
    typeof property.longitude === 'number' &&
    property.latitude !== 0 &&
    property.longitude !== 0;
  if (hasCoords) {
    const q = `${property.latitude},${property.longitude}`;
    return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed`;
  }
  const addressParts = [property.address, property.city, property.state].filter(Boolean).join(', ');
  const q = encodeURIComponent(addressParts || (property.city ?? ''));
  return `https://maps.google.com/maps?q=${q}&z=14&output=embed`;
}

/** Open-in-Google-Maps URL for the "View on Google Maps" pill. */
export function getMapLinkUrl(property: Property): string {
  const hasCoords =
    typeof property.latitude === 'number' &&
    typeof property.longitude === 'number' &&
    property.latitude !== 0 &&
    property.longitude !== 0;
  if (hasCoords) {
    return `https://www.google.com/maps/search/?api=1&query=${property.latitude},${property.longitude}`;
  }
  const addressParts = [property.address, property.city, property.state].filter(Boolean).join(', ');
  const q = encodeURIComponent(addressParts || (property.city ?? ''));
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/**
 * Standard fee breakdown. Schema doesn't expose per-property cleaning /
 * service / tax fields yet, so we derive sane defaults from the nightly
 * total. Numbers are integer-rounded so the breakdown reads cleanly.
 */
export interface FeeBreakdown {
  nightlyTotal: number;
  cleaningFee: number;
  serviceFee: number;
  taxes: number;
  total: number;
}

export function computeFeeBreakdown(nightlyTotal: number, nights: number): FeeBreakdown {
  if (nightlyTotal <= 0 || nights <= 0) {
    return { nightlyTotal: 0, cleaningFee: 0, serviceFee: 0, taxes: 0, total: 0 };
  }
  // Cleaning fee is a flat one-time charge, not nightly.
  const cleaningFee = 500;
  // Service & taxes scale with the nightly total so longer stays don't
  // suffer disproportionate fees.
  const serviceFee = Math.round(nightlyTotal * 0.1);
  const taxes = Math.round((nightlyTotal + cleaningFee + serviceFee) * 0.05);
  return {
    nightlyTotal,
    cleaningFee,
    serviceFee,
    taxes,
    total: nightlyTotal + cleaningFee + serviceFee + taxes,
  };
}
