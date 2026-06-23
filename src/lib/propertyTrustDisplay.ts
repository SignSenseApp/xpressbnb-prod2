/**
 * Guest-facing property trust display — parses ops-verified external_listings
 * ratings only. Never uses properties.rating, total_reviews, hosts.rating,
 * or external_reviews.
 */

import type { Json } from './database.types';

export type ExternalRatingSource = 'airbnb' | 'google' | 'booking' | 'other';

export type PropertyTrustDisplay =
  | {
      kind: 'verified_external_rating';
      source: ExternalRatingSource;
      rating: number;
      reviewCount: number;
      checkedAt: string;
      label: string;
    }
  | {
      kind: 'trust_chip';
      label: 'Host verified' | 'New on XpressBNB' | 'Direct host booking';
    };

export const TRUST_RATING_MAX_AGE_DAYS = 90;

export type PropertyTrustInput = {
  external_listings?: Json | null;
  is_verified?: boolean | null;
  created_at?: string | null;
};

type ParsedVerifiedRating = {
  source: ExternalRatingSource;
  rating: number;
  reviewCount: number;
  checkedAt: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function readBoolean(obj: Record<string, unknown>, keys: string[]): boolean {
  for (const key of keys) {
    const v = obj[key];
    if (v === true) return true;
    if (v === 'true' || v === 1) return true;
  }
  return false;
}

function readRating(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 5) return v;
    if (typeof v === 'string') {
      const n = Number(v.replace(/[^\d.]/g, ''));
      if (Number.isFinite(n) && n >= 0 && n <= 5) return n;
    }
  }
  return null;
}

function readNonNegativeInteger(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0) return v;
    if (typeof v === 'string' && /^\d+$/.test(v.trim())) {
      const n = Number(v);
      if (Number.isInteger(n) && n >= 0) return n;
    }
  }
  return null;
}

function isSafeHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function normalizeSource(raw: string): ExternalRatingSource | null {
  const s = raw.trim().toLowerCase();
  if (s === 'airbnb') return 'airbnb';
  if (s === 'google' || s === 'google reviews' || s === 'google_maps') return 'google';
  if (s === 'booking' || s === 'booking.com' || s === 'bookingcom') return 'booking';
  if (s === 'other') return 'other';
  return null;
}

function isStale(checkedAt: string): boolean {
  const checked = new Date(checkedAt);
  if (Number.isNaN(checked.getTime())) return true;
  const ageMs = Date.now() - checked.getTime();
  return ageMs > TRUST_RATING_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

function buildVerifiedLabel(
  source: ExternalRatingSource,
  rating: number,
  reviewCount: number,
): string {
  const star = `★ ${rating.toFixed(1)}`;
  if (source === 'other') {
    return `${star} · ${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'}`;
  }
  const platform =
    source === 'airbnb' ? 'Airbnb' : source === 'google' ? 'Google' : 'Booking';
  return `${star} · ${reviewCount} ${platform} ${reviewCount === 1 ? 'review' : 'reviews'}`;
}

function parseVerifiedRatingEntry(raw: unknown): ParsedVerifiedRating | null {
  const obj = asRecord(raw);
  if (!obj) return null;

  const sourceRaw = readString(obj, ['source', 'platform', 'platform_name', 'platformName']);
  if (!sourceRaw) return null;
  const source = normalizeSource(sourceRaw);
  if (!source) return null;

  const url = readString(obj, ['url', 'listing_url', 'listingUrl', 'link', 'href']);
  if (!url || !isSafeHttpUrl(url)) return null;

  const listingTitle = readString(obj, [
    'listing_title',
    'listingTitle',
    'title',
    'listing_name',
    'listingName',
    'name',
  ]);
  if (!listingTitle) return null;

  const rating = readRating(obj, ['rating', 'star_rating', 'starRating', 'average_rating']);
  if (rating == null) return null;

  const reviewCount = readNonNegativeInteger(obj, [
    'review_count',
    'reviewCount',
    'reviews_count',
    'reviewsCount',
    'total_reviews',
    'totalReviews',
  ]);
  if (reviewCount == null) return null;

  const verifiedByOps = readBoolean(obj, [
    'verified_by_ops',
    'ops_verified',
    'verified',
    'xpressbnb_verified',
    'checked_by_xpressbnb',
  ]);
  if (!verifiedByOps) return null;

  const checkedAt = readString(obj, ['checked_at', 'last_checked', 'lastChecked', 'checkedAt']);
  if (!checkedAt || isStale(checkedAt)) return null;

  return { source, rating, reviewCount, checkedAt };
}

function pickVerifiedExternalRating(
  raw: Json | null | undefined,
): ParsedVerifiedRating | null {
  if (raw == null) return null;
  const items = Array.isArray(raw) ? raw : [raw];
  for (const item of items) {
    const parsed = parseVerifiedRatingEntry(item);
    if (parsed) return parsed;
  }
  return null;
}

function isNewListing(createdAt?: string | null): boolean {
  if (!createdAt) return true;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return true;
  const ageMs = Date.now() - created.getTime();
  return ageMs <= TRUST_RATING_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
}

function resolveFallbackChip(
  input: PropertyTrustInput,
): 'Host verified' | 'New on XpressBNB' | 'Direct host booking' {
  if (input.is_verified === true) return 'Host verified';
  if (isNewListing(input.created_at)) return 'New on XpressBNB';
  return 'Direct host booking';
}

/** Pure guest-facing trust resolver for cards, property page, homepage, and SEO. */
export function getPropertyTrustDisplay(input: PropertyTrustInput): PropertyTrustDisplay {
  const verified = pickVerifiedExternalRating(input.external_listings);
  if (verified) {
    return {
      kind: 'verified_external_rating',
      source: verified.source,
      rating: verified.rating,
      reviewCount: verified.reviewCount,
      checkedAt: verified.checkedAt,
      label: buildVerifiedLabel(verified.source, verified.rating, verified.reviewCount),
    };
  }
  return { kind: 'trust_chip', label: resolveFallbackChip(input) };
}
