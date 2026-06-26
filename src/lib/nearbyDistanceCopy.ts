/**
 * Distance bucketing for analytics — no guest-facing marketing copy.
 */

export function bucketDistanceKm(km: number): string {
  if (km < 1) return 'under_1km';
  if (km < 5) return '1_5km';
  if (km < 15) return '5_15km';
  if (km < 40) return '15_40km';
  return 'over_40km';
}
