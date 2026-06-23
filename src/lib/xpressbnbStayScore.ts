/**
 * Deterministic XpressBNB listing-quality score — not a guest review rating.
 * Computed from real listing/host signals only; never persisted or randomized.
 */

import type { Json } from './database.types';
import { hasPremiumAccess } from './premium';

export const STAY_SCORE_BASE = 4.2;
export const STAY_SCORE_MIN = 4.2;
export const STAY_SCORE_MAX = 4.8;

export const STAY_SCORE_MICROCOPY =
  'Based on listing details, amenities, photos and host verification';

export type ListingQualitySignals = {
  is_verified?: boolean | null;
  images?: Json | null;
  price_per_day?: number | null;
  price_full_day?: number | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  max_guests?: number | null;
  amenities?: Json | null;
  is_premium?: boolean | null;
  premium_plan?: string | null;
  premium_expiry?: string | null;
  /** When host phone is known to the caller; never exposed in guest UI. */
  host_has_phone?: boolean | null;
};

export type XpressbnbStayScoreResult = {
  score: number;
  label: string;
  microcopy: string;
};

function countValidImages(images: Json | null | undefined): number {
  if (!Array.isArray(images)) return 0;
  return images.filter((item) => typeof item === 'string' && item.trim().length > 0).length;
}

function countValidAmenities(amenities: Json | null | undefined): number {
  if (!Array.isArray(amenities)) return 0;
  return amenities.filter((item) => typeof item === 'string' && item.trim().length > 0).length;
}

function hasRoomCapacitySignals(signals: ListingQualitySignals): boolean {
  const { bedrooms, bathrooms, max_guests } = signals;
  return (
    (typeof bedrooms === 'number' && bedrooms > 0) ||
    (typeof bathrooms === 'number' && bathrooms > 0) ||
    (typeof max_guests === 'number' && max_guests > 0)
  );
}

function hasActivePaidSubscription(signals: ListingQualitySignals): boolean {
  if (signals.is_premium == null && signals.premium_plan == null) return false;
  return hasPremiumAccess({
    id: '',
    is_premium: Boolean(signals.is_premium),
    premium_plan: signals.premium_plan ?? '',
    premium_expiry: signals.premium_expiry ?? null,
  });
}

function clampAndRound(raw: number): number {
  const rounded = Number(raw.toFixed(1));
  return Math.min(STAY_SCORE_MAX, Math.max(STAY_SCORE_MIN, rounded));
}

/** Pure, deterministic listing-quality score for guest-facing display. */
export function computeXpressbnbStayScore(
  signals: ListingQualitySignals,
): XpressbnbStayScoreResult {
  let raw = STAY_SCORE_BASE;

  if (signals.is_verified === true) raw += 0.15;
  if (signals.host_has_phone === true) raw += 0.1;

  const imageCount = countValidImages(signals.images);
  if (imageCount >= 8) raw += 0.1;
  else if (imageCount >= 4) raw += 0.05;

  const price = Number(signals.price_per_day) || Number(signals.price_full_day) || 0;
  if (price > 0) raw += 0.1;

  if (typeof signals.city === 'string' && signals.city.trim().length > 0) raw += 0.05;

  if (
    typeof signals.latitude === 'number' &&
    Number.isFinite(signals.latitude) &&
    typeof signals.longitude === 'number' &&
    Number.isFinite(signals.longitude)
  ) {
    raw += 0.05;
  }

  if (hasRoomCapacitySignals(signals)) raw += 0.05;

  if (countValidAmenities(signals.amenities) >= 5) raw += 0.05;

  if (hasActivePaidSubscription(signals)) raw += 0.05;

  const score = clampAndRound(raw);

  return {
    score,
    label: `XpressBNB Stay Score ${score.toFixed(1)}`,
    microcopy: STAY_SCORE_MICROCOPY,
  };
}
