/**
 * Anonymous saved listings — localStorage only (no guest accounts).
 * Stores property UUID + minimal display snapshot. No PII.
 */

import type { Property } from './database.types';

/** Canonical localStorage key for anonymous saved listings. */
export const SAVED_LISTINGS_STORAGE_KEY = 'xpressbnb_saved_listings';

/** Earlier milestone used this key — migrated once on read. */
const LEGACY_SAVED_LISTINGS_STORAGE_KEY = 'xpressbnb_saved_listings_v1';

export const SAVED_LISTINGS_CHANGE_EVENT = 'xpressbnb-saved-listings-change';

export type SavedListingSnapshot = {
  v: 1;
  id: string;
  title: string;
  city: string;
  imageUrl: string | null;
  pricePerDay: number;
  rating: number | null;
  isVerified: boolean;
  savedAt: number;
};

type SavedMap = Record<string, SavedListingSnapshot>;

export function firstImageUrl(images: Property['images']): string | null {
  if (!Array.isArray(images)) return null;
  for (const item of images) {
    if (typeof item === 'string' && item.trim().length > 0) return item.trim();
  }
  return null;
}

export function snapshotFromProperty(property: Property): SavedListingSnapshot {
  return {
    v: 1,
    id: property.id,
    title: property.title,
    city: property.city,
    imageUrl: firstImageUrl(property.images),
    pricePerDay: Number(property.price_per_day || property.price_full_day || 0),
    rating: property.rating != null ? Number(property.rating) : null,
    isVerified: Boolean(property.is_verified),
    savedAt: Date.now(),
  };
}

export function snapshotFromStayLike(input: {
  id: string;
  name: string;
  city?: string;
  images?: string[];
  pricePerNight: number;
  rating?: number;
  isVerified?: boolean;
}): SavedListingSnapshot {
  const image =
    input.images?.find((u) => typeof u === 'string' && u.trim().length > 0)?.trim() ?? null;
  return {
    v: 1,
    id: input.id,
    title: input.name,
    city: input.city ?? 'Rishikesh',
    imageUrl: image,
    pricePerDay: input.pricePerNight,
    rating: input.rating != null ? Number(input.rating) : null,
    isVerified: Boolean(input.isVerified),
    savedAt: Date.now(),
  };
}

function migrateLegacySavedListings(): string | null {
  const legacy = localStorage.getItem(LEGACY_SAVED_LISTINGS_STORAGE_KEY);
  if (!legacy) return null;
  try {
    localStorage.setItem(SAVED_LISTINGS_STORAGE_KEY, legacy);
    localStorage.removeItem(LEGACY_SAVED_LISTINGS_STORAGE_KEY);
    return legacy;
  } catch {
    return legacy;
  }
}

const EMPTY_STORE_SNAPSHOT = '{}';

function parseMapFromRaw(raw: string): SavedMap {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const map: SavedMap = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (
        value &&
        typeof value === 'object' &&
        (value as SavedListingSnapshot).v === 1 &&
        typeof (value as SavedListingSnapshot).id === 'string' &&
        (value as SavedListingSnapshot).id === key
      ) {
        map[key] = value as SavedListingSnapshot;
      }
    }
    return map;
  } catch {
    return {};
  }
}

function readRawFromStorage(): string {
  if (typeof window === 'undefined') return EMPTY_STORE_SNAPSHOT;
  try {
    let raw = localStorage.getItem(SAVED_LISTINGS_STORAGE_KEY);
    if (!raw) raw = migrateLegacySavedListings();
    return raw ?? EMPTY_STORE_SNAPSHOT;
  } catch {
    return EMPTY_STORE_SNAPSHOT;
  }
}

function readMap(): SavedMap {
  return parseMapFromRaw(readRawFromStorage());
}

function writeMap(map: SavedMap): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SAVED_LISTINGS_STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent(SAVED_LISTINGS_CHANGE_EVENT));
  } catch {
    // Quota or private mode — fail silently
  }
}

export function listSavedListings(): SavedListingSnapshot[] {
  const map = readMap();
  return Object.values(map).sort((a, b) => b.savedAt - a.savedAt);
}

export function isListingSaved(propertyId: string): boolean {
  return Boolean(readMap()[propertyId]);
}

export function saveListing(snapshot: SavedListingSnapshot): void {
  const map = readMap();
  map[snapshot.id] = { ...snapshot, savedAt: Date.now() };
  writeMap(map);
}

export function removeSavedListing(propertyId: string): void {
  const map = readMap();
  if (!map[propertyId]) return;
  delete map[propertyId];
  writeMap(map);
}

/** Toggle save; returns true if now saved. */
export function toggleSavedListing(snapshot: SavedListingSnapshot): boolean {
  const map = readMap();
  if (map[snapshot.id]) {
    delete map[snapshot.id];
    writeMap(map);
    return false;
  }
  map[snapshot.id] = { ...snapshot, savedAt: Date.now() };
  writeMap(map);
  return true;
}

export function subscribeSavedListings(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const onCustom = () => onStoreChange();
  const onStorage = (e: StorageEvent) => {
    if (
      e.key === SAVED_LISTINGS_STORAGE_KEY ||
      e.key === LEGACY_SAVED_LISTINGS_STORAGE_KEY
    ) {
      onStoreChange();
    }
  };

  window.addEventListener(SAVED_LISTINGS_CHANGE_EVENT, onCustom);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(SAVED_LISTINGS_CHANGE_EVENT, onCustom);
    window.removeEventListener('storage', onStorage);
  };
}

/** Stable primitive snapshot for `useSyncExternalStore` — same string until storage changes. */
export function getSavedListingsStoreSnapshot(): string {
  return readRawFromStorage();
}

export function getSavedListingsServerSnapshot(): string {
  return EMPTY_STORE_SNAPSHOT;
}

/** Parse store JSON into sorted listing array (use inside `useMemo` after subscribing). */
export function parseSavedListingsFromStore(raw: string): SavedListingSnapshot[] {
  const map = parseMapFromRaw(raw);
  return Object.values(map).sort((a, b) => b.savedAt - a.savedAt);
}

export function getSavedListingsSnapshot(): SavedListingSnapshot[] {
  return parseSavedListingsFromStore(getSavedListingsStoreSnapshot());
}
