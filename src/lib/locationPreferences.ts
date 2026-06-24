/**
 * Persisted guest location preference — localStorage only, no PII sent to server.
 * Follows Airbnb/VRBO trust patterns: never aggressively re-prompt after denial.
 */

export const LOCATION_PREF_STORAGE_KEY = 'xpx_location_pref';

export type LocationPermissionStatus = 'unknown' | 'granted' | 'denied' | 'blocked';

export type StoredCoords = {
  lat: number;
  lng: number;
};

export type StoredLocationPreference = {
  v: 1;
  permission: LocationPermissionStatus;
  coords?: StoredCoords;
  city?: string;
  state?: string;
  /** ISO-ish display label e.g. "Gurgaon, Haryana" */
  label?: string;
  detectedAt: number;
  promptShownAt?: number;
  promptDismissedAt?: number;
  /** Last time we resolved location (geocode/GPS). */
  lastLookupAt?: number;
  /** Homepage / feed visits with stored location. */
  visitCount?: number;
};

/** Revalidate GPS periodically — 6 hours. */
export const LOCATION_REVALIDATE_MS = 6 * 60 * 60 * 1000;

/** After explicit deny/dismiss, wait 7 days before auto-prompting again. */
export const LOCATION_DENY_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/** Delay before first prompt so hero LCP is not blocked. */
export const LOCATION_PROMPT_DELAY_MS = 2_500;

const subscribers = new Set<() => void>();

export function subscribeLocationPreference(listener: () => void): () => void {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

function notifySubscribers(): void {
  subscribers.forEach((fn) => fn());
}

export function readLocationPreference(): StoredLocationPreference | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCATION_PREF_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredLocationPreference;
    if (parsed?.v !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeLocationPreference(pref: StoredLocationPreference): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCATION_PREF_STORAGE_KEY, JSON.stringify(pref));
    notifySubscribers();
  } catch {
    /* quota / private mode — non-fatal */
  }
}

export function isLocationStale(pref: StoredLocationPreference): boolean {
  if (!pref.coords || pref.permission !== 'granted') return true;
  return Date.now() - pref.detectedAt > LOCATION_REVALIDATE_MS;
}

export function shouldShowLocationPrompt(pref: StoredLocationPreference | null): boolean {
  if (typeof window === 'undefined') return false;
  if (!('geolocation' in navigator)) return false;

  if (!pref) return true;

  if (pref.permission === 'granted' && pref.coords && !isLocationStale(pref)) {
    return false;
  }

  if (pref.permission === 'denied' || pref.permission === 'blocked') {
    const anchor = pref.promptDismissedAt ?? pref.detectedAt;
    if (Date.now() - anchor < LOCATION_DENY_COOLDOWN_MS) return false;
    return false;
  }

  if (pref.promptDismissedAt) {
    if (Date.now() - pref.promptDismissedAt < LOCATION_DENY_COOLDOWN_MS) return false;
  }

  if (pref.permission === 'unknown' && pref.promptShownAt) {
    return false;
  }

  return pref.permission === 'unknown' && !pref.promptDismissedAt;
}

export function markPromptShown(): void {
  const existing = readLocationPreference();
  writeLocationPreference({
    v: 1,
    permission: existing?.permission ?? 'unknown',
    coords: existing?.coords,
    city: existing?.city,
    state: existing?.state,
    label: existing?.label,
    detectedAt: existing?.detectedAt ?? Date.now(),
    promptShownAt: Date.now(),
    promptDismissedAt: existing?.promptDismissedAt,
  });
}

export function markPromptDismissed(): void {
  const existing = readLocationPreference();
  writeLocationPreference({
    v: 1,
    permission: existing?.permission === 'granted' ? 'granted' : 'denied',
    coords: existing?.coords,
    city: existing?.city,
    state: existing?.state,
    label: existing?.label,
    detectedAt: existing?.detectedAt ?? Date.now(),
    promptShownAt: existing?.promptShownAt,
    promptDismissedAt: Date.now(),
  });
}

export function saveGrantedLocation(input: {
  coords: StoredCoords;
  city?: string;
  state?: string;
  label?: string;
}): StoredLocationPreference {
  const existing = readLocationPreference();
  const pref: StoredLocationPreference = {
    v: 1,
    permission: 'granted',
    coords: input.coords,
    city: input.city,
    state: input.state,
    label: input.label,
    detectedAt: Date.now(),
    lastLookupAt: Date.now(),
    visitCount: existing?.visitCount ?? 0,
  };
  writeLocationPreference(pref);
  return pref;
}

export function markPermissionDenied(status: 'denied' | 'blocked' = 'denied'): void {
  const existing = readLocationPreference();
  writeLocationPreference({
    v: 1,
    permission: status,
    coords: existing?.coords,
    city: existing?.city,
    state: existing?.state,
    label: existing?.label,
    detectedAt: Date.now(),
    promptShownAt: existing?.promptShownAt,
    promptDismissedAt: Date.now(),
  });
}
