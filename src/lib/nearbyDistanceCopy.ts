/**
 * Emotional distance microcopy — feels human, not mathematical.
 */

export type NearbyDistanceBadge = {
  primary: string;
  secondary?: string;
  emotionalTag?: string;
  distanceKmBucket: string;
};

export function bucketDistanceKm(km: number): string {
  if (km < 1) return 'under_1km';
  if (km < 5) return '1_5km';
  if (km < 15) return '5_15km';
  if (km < 40) return '15_40km';
  return 'over_40km';
}

export function estimateDriveMinutes(km: number): number {
  return Math.max(1, Math.round((km / 28) * 60));
}

export type EmotionalBadgeOptions = {
  userCity?: string | null;
  veryNearKm?: number;
  weekendEscapeKm?: number;
};

/**
 * Premium emotional labels — Airbnb/VRBO tone.
 */
export function formatEmotionalNearbyBadge(
  distanceKm: number,
  options?: EmotionalBadgeOptions,
): NearbyDistanceBadge {
  const userCity = options?.userCity?.trim();
  const mins = estimateDriveMinutes(distanceKm);
  const bucket = bucketDistanceKm(distanceKm);

  if (distanceKm < 1) {
    return {
      primary: 'Near you',
      secondary: 'Just around the corner',
      emotionalTag: userCity ? `Popular near ${userCity}` : 'Popular in your area',
      distanceKmBucket: bucket,
    };
  }

  if (distanceKm < 5) {
    return {
      primary: `${mins} mins from you`,
      secondary: 'An easy ride away',
      emotionalTag: userCity ? `Guests from ${userCity} love this` : undefined,
      distanceKmBucket: bucket,
    };
  }

  if (distanceKm < 15) {
    return {
      primary: `${mins} mins from you`,
      secondary: 'Worth the short trip',
      emotionalTag: 'Popular near your area',
      distanceKmBucket: bucket,
    };
  }

  if (distanceKm < 40) {
    return {
      primary: `${mins} mins from you`,
      secondary: 'Great for a spontaneous night out',
      emotionalTag: userCity ? `Trending with ${userCity} travelers` : 'Trending nearby',
      distanceKmBucket: bucket,
    };
  }

  if (distanceKm < 120) {
    return {
      primary: 'Perfect for a weekend escape',
      secondary: `~${mins} min drive · ${Math.round(distanceKm)} km`,
      emotionalTag: userCity ? `Weekend pick from ${userCity}` : 'Weekend getaway',
      distanceKmBucket: bucket,
    };
  }

  return {
    primary: 'Destination escape',
    secondary: `~${Math.round(mins / 60)} hr drive`,
    emotionalTag: 'Carefully curated stay',
    distanceKmBucket: bucket,
  };
}

/** @deprecated Use formatEmotionalNearbyBadge */
export function formatNearbyBadge(
  distanceKm: number,
  options?: { veryNearKm?: number },
): NearbyDistanceBadge {
  return formatEmotionalNearbyBadge(distanceKm, options);
}
