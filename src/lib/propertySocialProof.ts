/**
 * Real engagement signals from view_events — never fabricate counts.
 */

import { supabase } from './supabase';

export type PropertyEngagement = {
  viewsToday: number;
  viewsThisWeek: number;
  bookingsThisWeek: number;
  hasData: boolean;
};

const cache = new Map<string, { at: number; data: PropertyEngagement }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function fetchPropertyEngagement(propertyId: string): Promise<PropertyEngagement> {
  const cached = cache.get(propertyId);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.data;
  }

  const empty: PropertyEngagement = {
    viewsToday: 0,
    viewsThisWeek: 0,
    bookingsThisWeek: 0,
    hasData: false,
  };

  try {
    const { data, error } = await supabase.rpc('get_public_property_engagement', {
      p_property_id: propertyId,
    });

    if (error || !data) {
      return empty;
    }

    const row = data as {
      views_today?: number;
      views_this_week?: number;
      bookings_this_week?: number;
    };

    const result: PropertyEngagement = {
      viewsToday: Number(row.views_today ?? 0),
      viewsThisWeek: Number(row.views_this_week ?? 0),
      bookingsThisWeek: Number(row.bookings_this_week ?? 0),
      hasData:
        Number(row.views_today ?? 0) > 0 ||
        Number(row.views_this_week ?? 0) > 0 ||
        Number(row.bookings_this_week ?? 0) > 0,
    };

    cache.set(propertyId, { at: Date.now(), data: result });
    return result;
  } catch {
    return empty;
  }
}

export function formatViewsTodayCopy(views: number): string | null {
  if (views < 3) return null;
  if (views < 10) return `${views} people viewed this stay today`;
  return `${views}+ travelers viewed this stay today`;
}

export function formatBookingsWeekCopy(bookings: number): string | null {
  if (bookings < 2) return null;
  return `Booked ${bookings} times this week`;
}

export function formatCityTrendingCopy(city: string, viewsWeek: number): string | null {
  if (viewsWeek < 5 || !city.trim()) return null;
  return `Popular near ${city.trim()}`;
}
