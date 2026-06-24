/**
 * Reverse geocode lat/lng → city/state via OpenStreetMap Nominatim.
 * In-memory + sessionStorage cache to avoid duplicate requests.
 */

export type GeocodedPlace = {
  city: string;
  state: string;
  displayName: string;
};

const CACHE_PREFIX = 'xpx_revgeo_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const ROUND_PRECISION = 3;

const memoryCache = new Map<string, { at: number; place: GeocodedPlace }>();
let inflight = new Map<string, Promise<GeocodedPlace | null>>();

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(ROUND_PRECISION)},${lng.toFixed(ROUND_PRECISION)}`;
}

function readSessionCache(key: string): GeocodedPlace | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw) as { at: number; place: GeocodedPlace };
    if (Date.now() - entry.at > CACHE_TTL_MS) return null;
    return entry.place;
  } catch {
    return null;
  }
}

function writeSessionCache(key: string, place: GeocodedPlace): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), place }));
  } catch {
    /* non-fatal */
  }
}

type NominatimAddress = {
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  state_district?: string;
  state?: string;
  county?: string;
};

type NominatimReverseResponse = {
  display_name?: string;
  address?: NominatimAddress;
};

function pickCity(address: NominatimAddress): string {
  return (
    address.city?.trim() ||
    address.town?.trim() ||
    address.village?.trim() ||
    address.suburb?.trim() ||
    address.state_district?.trim() ||
    address.county?.trim() ||
    ''
  );
}

function normalizePlace(data: NominatimReverseResponse): GeocodedPlace | null {
  const address = data.address;
  if (!address) return null;

  const city = pickCity(address);
  const state = (address.state ?? '').trim();
  const displayName = (data.display_name ?? '').trim();

  if (!city && !state) return null;

  return {
    city: city || state,
    state: state || city,
    displayName: displayName || [city, state].filter(Boolean).join(', '),
  };
}

/**
 * Reverse geocode coordinates — cached, deduped, India-biased via accept-language.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodedPlace | null> {
  const key = cacheKey(lat, lng);

  const mem = memoryCache.get(key);
  if (mem && Date.now() - mem.at < CACHE_TTL_MS) {
    return mem.place;
  }

  const session = readSessionCache(key);
  if (session) {
    memoryCache.set(key, { at: Date.now(), place: session });
    return session;
  }

  const existing = inflight.get(key);
  if (existing) return existing;

  const run = (async (): Promise<GeocodedPlace | null> => {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('format', 'json');
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lng));
      url.searchParams.set('zoom', '10');
      url.searchParams.set('addressdetails', '1');

      const response = await fetch(url.toString(), {
        headers: { 'Accept-Language': 'en' },
      });

      if (!response.ok) return null;

      const data = (await response.json()) as NominatimReverseResponse;
      const place = normalizePlace(data);
      if (!place) return null;

      memoryCache.set(key, { at: Date.now(), place });
      writeSessionCache(key, place);
      return place;
    } catch {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, run);
  return run;
}
