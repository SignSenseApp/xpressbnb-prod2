/**
 * Browser geolocation wrapper — fast timeout, permission-aware, no duplicate inflight.
 */

import type { LocationPermissionStatus } from './locationPreferences';

export type GeoCoords = {
  lat: number;
  lng: number;
};

export type GeolocationResult =
  | { status: 'success'; coords: GeoCoords; accuracyM?: number }
  | { status: 'denied' }
  | { status: 'blocked' }
  | { status: 'unavailable'; reason: string }
  | { status: 'timeout' };

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;

let inflightPosition: Promise<GeolocationResult> | null = null;

export function isGeolocationSupported(): boolean {
  return typeof window !== 'undefined' && 'geolocation' in navigator;
}

export async function queryGeolocationPermission(): Promise<LocationPermissionStatus> {
  if (!isGeolocationSupported()) return 'blocked';

  try {
    const permissions = navigator.permissions;
    if (!permissions?.query) return 'unknown';

    const status = await permissions.query({ name: 'geolocation' });
    if (status.state === 'granted') return 'granted';
    if (status.state === 'denied') return 'denied';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function mapGeolocationError(error: GeolocationPositionError): GeolocationResult {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return { status: 'denied' };
    case error.POSITION_UNAVAILABLE:
      return { status: 'unavailable', reason: 'position_unavailable' };
    case error.TIMEOUT:
      return { status: 'timeout' };
    default:
      return { status: 'unavailable', reason: 'unknown' };
  }
}

export type GetPositionOptions = {
  timeoutMs?: number;
  maximumAgeMs?: number;
  highAccuracy?: boolean;
  forceRefresh?: boolean;
};

/**
 * Request current position — dedupes concurrent calls unless forceRefresh.
 * Target: resolve within ~2s on good networks via maximumAge + reasonable timeout.
 */
export function getCurrentPosition(options?: GetPositionOptions): Promise<GeolocationResult> {
  if (!isGeolocationSupported()) {
    return Promise.resolve({ status: 'unavailable', reason: 'unsupported' });
  }

  if (!options?.forceRefresh && inflightPosition) {
    return inflightPosition;
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maximumAgeMs = options?.maximumAgeMs ?? DEFAULT_MAX_AGE_MS;
  const highAccuracy = options?.highAccuracy ?? false;

  inflightPosition = new Promise<GeolocationResult>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          status: 'success',
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          accuracyM: position.coords.accuracy,
        });
      },
      (error) => resolve(mapGeolocationError(error)),
      {
        enableHighAccuracy: highAccuracy,
        timeout: timeoutMs,
        maximumAge: maximumAgeMs,
      },
    );
  }).finally(() => {
    inflightPosition = null;
  });

  return inflightPosition;
}
