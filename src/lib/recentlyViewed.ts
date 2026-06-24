/**
 * Anonymous recently viewed listings — localStorage, powers "Recently viewed" rails.
 */

import type { Property } from './database.types';

const STORAGE_KEY = 'xpressbnb_recent_properties';
const MAX_ITEMS = 12;

export type RecentPropertyRef = {
  id: string;
  title: string;
  city: string;
  viewedAt: number;
};

export function recordRecentlyViewed(property: Pick<Property, 'id' | 'title' | 'city'>): void {
  if (typeof window === 'undefined') return;
  try {
    const list = readRecentlyViewed();
    const next: RecentPropertyRef[] = [
      {
        id: property.id,
        title: property.title,
        city: property.city,
        viewedAt: Date.now(),
      },
      ...list.filter((item) => item.id !== property.id),
    ].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* non-fatal */
  }
}

export function readRecentlyViewed(): RecentPropertyRef[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentPropertyRef[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
