/**
 * Tiered location memory — instant cache, silent refresh, forced revalidation.
 */

import {
  readLocationPreference,
  writeLocationPreference,
  type StoredLocationPreference,
} from './locationPreferences';

export const LOCATION_FRESH_MS = 6 * 60 * 60 * 1000;
export const LOCATION_SILENT_REFRESH_MS = 24 * 60 * 60 * 1000;

export type LocationRefreshTier = 'fresh' | 'silent' | 'immediate';

export function getLocationAgeMs(pref: StoredLocationPreference): number {
  return Date.now() - pref.detectedAt;
}

export function getLocationRefreshTier(pref: StoredLocationPreference | null): LocationRefreshTier {
  if (!pref?.coords || pref.permission !== 'granted') return 'immediate';
  const age = getLocationAgeMs(pref);
  if (age < LOCATION_FRESH_MS) return 'fresh';
  if (age < LOCATION_SILENT_REFRESH_MS) return 'silent';
  return 'immediate';
}

export function shouldUseCachedLocationInstantly(pref: StoredLocationPreference | null): boolean {
  return getLocationRefreshTier(pref) !== 'immediate' && Boolean(pref?.coords);
}

export function shouldSilentRefreshLocation(pref: StoredLocationPreference | null): boolean {
  return getLocationRefreshTier(pref) === 'silent';
}

export function shouldForceRefreshLocation(pref: StoredLocationPreference | null): boolean {
  return getLocationRefreshTier(pref) === 'immediate';
}

export function touchLocationLookup(): void {
  const pref = readLocationPreference();
  if (!pref) return;
  writeLocationPreference({
    ...pref,
    lastLookupAt: Date.now(),
    visitCount: (pref.visitCount ?? 0) + 1,
  });
}

export function isReturningNearbyUser(): boolean {
  const pref = readLocationPreference();
  return Boolean(pref && pref.permission === 'granted' && (pref.visitCount ?? 0) > 1);
}
