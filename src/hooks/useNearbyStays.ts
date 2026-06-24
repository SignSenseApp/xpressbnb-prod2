import { useCallback, useEffect, useRef, useState } from 'react';
import { trackXpressEvent, bucketResponseMs } from '../lib/analytics';
import {
  getCurrentPosition,
  isGeolocationSupported,
  queryGeolocationPermission,
} from '../lib/geolocation';
import {
  shouldSilentRefreshLocation,
  shouldForceRefreshLocation,
} from '../lib/locationMemory';
import {
  readLocationPreference,
  saveGrantedLocation,
  markPermissionDenied,
  markPromptShown,
  markPromptDismissed,
  shouldShowLocationPrompt,
  subscribeLocationPreference,
  LOCATION_PROMPT_DELAY_MS,
  type StoredLocationPreference,
} from '../lib/locationPreferences';
import {
  filterPropertiesInCityBucket,
  findNearestServicedCities,
  matchDetectedCityToBucket,
  type NearestServicedCity,
  type RankedProperty,
} from '../lib/nearbyInventory';
import { rankPropertiesForNearby } from '../lib/nearbyRanking';
import { getPublicListings } from '../lib/publicListings';
import { reverseGeocode } from '../lib/reverseGeocode';

export type NearbyStaysPhase =
  | 'idle'
  | 'prompt_visible'
  | 'locating'
  | 'geocoding'
  | 'loading_inventory'
  | 'ready'
  | 'coming_soon'
  | 'fallback'
  | 'unavailable';

export type NearbyStaysState = {
  phase: NearbyStaysPhase;
  permission: StoredLocationPreference['permission'];
  coords: { lat: number; lng: number } | null;
  detectedCity: string | null;
  detectedState: string | null;
  locationLabel: string | null;
  cityBucket: string | null;
  properties: RankedProperty[];
  nearestCities: NearestServicedCity[];
  trendingProperties: RankedProperty[];
  errorReason: string | null;
  isPromptOpen: boolean;
  /** True once after fresh permission grant — triggers auto-scroll to #nearby */
  shouldScrollToNearby: boolean;
};

const INITIAL_STATE: NearbyStaysState = {
  phase: 'idle',
  permission: 'unknown',
  coords: null,
  detectedCity: null,
  detectedState: null,
  locationLabel: null,
  cityBucket: null,
  properties: [],
  nearestCities: [],
  trendingProperties: [],
  errorReason: null,
  isPromptOpen: false,
  shouldScrollToNearby: false,
};

function labelFromPref(pref: StoredLocationPreference): string | null {
  if (pref.label) return pref.label;
  if (pref.city && pref.state) return `${pref.city}, ${pref.state}`;
  return pref.city ?? null;
}

export function useNearbyStays(options?: { autoPrompt?: boolean }) {
  const autoPrompt = options?.autoPrompt ?? true;
  const [state, setState] = useState<NearbyStaysState>(() => {
    const pref = readLocationPreference();
    if (pref?.permission === 'granted' && pref.coords) {
      return {
        ...INITIAL_STATE,
        permission: 'granted',
        coords: pref.coords,
        detectedCity: pref.city ?? null,
        detectedState: pref.state ?? null,
        locationLabel: labelFromPref(pref),
        cityBucket: matchDetectedCityToBucket(pref.city),
        phase: 'loading_inventory',
      };
    }
    if (pref) {
      return {
        ...INITIAL_STATE,
        permission: pref.permission,
      };
    }
    return INITIAL_STATE;
  });

  const loadSeqRef = useRef(0);
  const promptTimerRef = useRef<number | null>(null);
  const hasAutoPromptedRef = useRef(false);
  const freshGrantRef = useRef(false);

  const loadInventory = useCallback(
    async (
      coords: { lat: number; lng: number },
      meta: {
        city?: string;
        state?: string;
        label?: string;
        cityBucket?: string | null;
      },
    ) => {
      const seq = ++loadSeqRef.current;
      const started = performance.now();

      setState((prev) => ({
        ...prev,
        phase: 'loading_inventory',
        coords,
        detectedCity: meta.city ?? prev.detectedCity,
        detectedState: meta.state ?? prev.detectedState,
        locationLabel: meta.label ?? prev.locationLabel,
        cityBucket: meta.cityBucket ?? prev.cityBucket,
        errorReason: null,
      }));

      const listingsResult = await getPublicListings();
      if (seq !== loadSeqRef.current) return;

      if (listingsResult.status === 'error') {
        setState((prev) => ({
          ...prev,
          phase: 'fallback',
          nearestCities: findNearestServicedCities(coords.lat, coords.lng, 3),
          trendingProperties: [],
          errorReason: 'inventory_load_failed',
        }));
        trackXpressEvent('nearby_fallback_shown', {
          city: meta.city,
          error_category: 'inventory_load_failed',
        });
        return;
      }

      const allListings = listingsResult.listings;
      const bucket = meta.cityBucket ?? matchDetectedCityToBucket(meta.city);
      const nearestCities = findNearestServicedCities(coords.lat, coords.lng, 3);

      let nearby: RankedProperty[] = [];
      if (bucket) {
        const inCity = filterPropertiesInCityBucket(allListings, bucket);
        nearby = rankPropertiesForNearby(coords.lat, coords.lng, inCity, {
          limit: 12,
          maxKm: 60,
        });
      }

      if (nearby.length === 0) {
        nearby = rankPropertiesForNearby(coords.lat, coords.lng, allListings, {
          limit: 8,
          maxKm: 120,
        });
      }

      const trending = rankPropertiesForNearby(coords.lat, coords.lng, allListings, {
        limit: 8,
        maxKm: 200,
      });

      const elapsed = performance.now() - started;

      const scrollAfterGrant = freshGrantRef.current;
      freshGrantRef.current = false;

      if (nearby.length > 0 && bucket && filterPropertiesInCityBucket(allListings, bucket).length > 0) {
        setState((prev) => ({
          ...prev,
          phase: 'ready',
          properties: nearby,
          nearestCities,
          trendingProperties: trending,
          cityBucket: bucket,
          shouldScrollToNearby: scrollAfterGrant,
        }));
        trackXpressEvent('nearby_results_loaded', {
          city: meta.city ?? bucket,
          response_time_bucket: bucketResponseMs(elapsed),
        });
        return;
      }

      if (nearby.length > 0) {
        setState((prev) => ({
          ...prev,
          phase: 'fallback',
          properties: nearby,
          nearestCities,
          trendingProperties: trending,
          shouldScrollToNearby: scrollAfterGrant,
        }));
        trackXpressEvent('nearby_fallback_shown', {
          city: meta.city ?? undefined,
          response_time_bucket: bucketResponseMs(elapsed),
        });
        return;
      }

      setState((prev) => ({
        ...prev,
        phase: 'coming_soon',
        properties: [],
        nearestCities,
        trendingProperties: trending,
        cityBucket: bucket,
        shouldScrollToNearby: scrollAfterGrant,
      }));
      trackXpressEvent('nearby_fallback_shown', {
        city: meta.city ?? undefined,
        error_category: 'coming_soon',
        response_time_bucket: bucketResponseMs(elapsed),
      });
    },
    [],
  );

  const resolveLocation = useCallback(
    async (forceRefresh = false) => {
      const seq = ++loadSeqRef.current;
      setState((prev) => ({
        ...prev,
        phase: 'locating',
        isPromptOpen: false,
        errorReason: null,
      }));

      const geo = await getCurrentPosition({
        forceRefresh,
        timeoutMs: 8_000,
        maximumAgeMs: forceRefresh ? 0 : 5 * 60 * 1000,
      });

      if (seq !== loadSeqRef.current) return;

      if (geo.status === 'denied') {
        markPermissionDenied('denied');
        trackXpressEvent('location_permission_denied');
        setState((prev) => ({
          ...prev,
          phase: 'unavailable',
          permission: 'denied',
          isPromptOpen: false,
          errorReason: 'permission_denied',
        }));
        return;
      }

      if (geo.status === 'blocked') {
        markPermissionDenied('blocked');
        trackXpressEvent('location_permission_denied', { error_category: 'blocked' });
        setState((prev) => ({
          ...prev,
          phase: 'unavailable',
          permission: 'blocked',
          isPromptOpen: false,
          errorReason: 'permission_blocked',
        }));
        return;
      }

      if (geo.status === 'timeout' || geo.status === 'unavailable') {
        setState((prev) => ({
          ...prev,
          phase: 'unavailable',
          isPromptOpen: false,
          errorReason: geo.status === 'timeout' ? 'timeout' : geo.reason,
        }));
        return;
      }

      trackXpressEvent('location_permission_granted');
      freshGrantRef.current = true;

      setState((prev) => ({ ...prev, phase: 'geocoding', coords: geo.coords }));

      const place = await reverseGeocode(geo.coords.lat, geo.coords.lng);
      if (seq !== loadSeqRef.current) return;

      const city = place?.city ?? undefined;
      const stateName = place?.state ?? undefined;
      const label = place?.displayName ?? (city && stateName ? `${city}, ${stateName}` : city);
      const bucket = matchDetectedCityToBucket(city);

      saveGrantedLocation({
        coords: geo.coords,
        city,
        state: stateName,
        label,
      });

      if (city) {
        trackXpressEvent('nearby_city_detected', { city });
      }

      setState((prev) => ({
        ...prev,
        permission: 'granted',
        detectedCity: city ?? null,
        detectedState: stateName ?? null,
        locationLabel: label ?? null,
        cityBucket: bucket,
      }));

      await loadInventory(geo.coords, {
        city,
        state: stateName,
        label,
        cityBucket: bucket,
      });
    },
    [loadInventory],
  );

  const openPrompt = useCallback(() => {
    markPromptShown();
    trackXpressEvent('location_prompt_shown');
    setState((prev) => ({ ...prev, isPromptOpen: true, phase: 'prompt_visible' }));
  }, []);

  const dismissPrompt = useCallback(() => {
    markPromptDismissed();
    setState((prev) => ({
      ...prev,
      isPromptOpen: false,
      phase: prev.properties.length > 0 ? prev.phase : 'idle',
    }));
  }, []);

  const acceptPrompt = useCallback(() => {
    void resolveLocation(true);
  }, [resolveLocation]);

  const requestLocation = useCallback(() => {
    void resolveLocation(true);
  }, [resolveLocation]);

  useEffect(() => {
    const pref = readLocationPreference();

    if (pref?.permission === 'granted' && pref.coords) {
      const bucket = matchDetectedCityToBucket(pref.city);
      void loadInventory(pref.coords, {
        city: pref.city,
        state: pref.state,
        label: labelFromPref(pref) ?? undefined,
        cityBucket: bucket,
      });

      if (shouldForceRefreshLocation(pref)) {
        void resolveLocation(true);
      } else if (shouldSilentRefreshLocation(pref)) {
        void resolveLocation(false);
      }
      return;
    }

    if (!autoPrompt || hasAutoPromptedRef.current) return;
    if (!isGeolocationSupported()) return;

    void queryGeolocationPermission().then((perm) => {
      if (perm === 'denied' || perm === 'blocked') {
        markPermissionDenied(perm === 'blocked' ? 'blocked' : 'denied');
        setState((prev) => ({ ...prev, permission: perm }));
        return;
      }

      const currentPref = readLocationPreference();
      if (!shouldShowLocationPrompt(currentPref)) return;

      hasAutoPromptedRef.current = true;
      promptTimerRef.current = window.setTimeout(() => {
        openPrompt();
      }, LOCATION_PROMPT_DELAY_MS);
    });

    return () => {
      if (promptTimerRef.current != null) {
        window.clearTimeout(promptTimerRef.current);
      }
    };
  }, [autoPrompt, loadInventory, openPrompt, resolveLocation]);

  useEffect(() => {
    return subscribeLocationPreference(() => {
      const pref = readLocationPreference();
      if (!pref) return;
      setState((prev) => ({
        ...prev,
        permission: pref.permission,
        coords: pref.coords ?? prev.coords,
        detectedCity: pref.city ?? prev.detectedCity,
        detectedState: pref.state ?? prev.detectedState,
        locationLabel: labelFromPref(pref) ?? prev.locationLabel,
      }));
    });
  }, []);

  const clearScrollToNearby = useCallback(() => {
    setState((prev) => ({ ...prev, shouldScrollToNearby: false }));
  }, []);

  return {
    ...state,
    isLoading:
      state.phase === 'locating' ||
      state.phase === 'geocoding' ||
      state.phase === 'loading_inventory',
    openPrompt,
    dismissPrompt,
    acceptPrompt,
    requestLocation,
    refreshLocation: () => void resolveLocation(true),
    clearScrollToNearby,
  };
}

export type UseNearbyStaysReturn = ReturnType<typeof useNearbyStays>;
