/**
 * Ephemeral confirmation payloads for /booking/:id.
 *
 * RLS (see supabase/migrations/20251127105513_fix_security_issues_indexes_and_rls_v2.sql)
 * only allows authenticated users to SELECT bookings when guest_email matches
 * JWT email or the user is the host. Anonymous guests cannot re-fetch a row
 * by id alone, so we persist a minimal snapshot in sessionStorage right after
 * insert — same device/session can reopen the confirmation URL.
 */

export const BOOKING_SNAPSHOT_MAP_KEY = 'xpx_booking_confirmations_v1';

export type BookingConfirmationSnapshot = {
  v: 1;
  savedAt: number;
  bookingId: string;
  propertyId: string;
  propertyTitle: string;
  propertyCity: string;
  propertySlug: string | null;
  checkIn: string;
  checkOut: string;
  numGuests: number;
  estimatedTotal: number;
  guestEmail: string;
  hostContactName: string | null;
  includeDecoration: boolean;
  paymentStatus: string;
  bookingStatus: string;
};

function readMap(): Record<string, BookingConfirmationSnapshot> {
  try {
    const raw = sessionStorage.getItem(BOOKING_SNAPSHOT_MAP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, BookingConfirmationSnapshot>;
    }
    return {};
  } catch {
    return {};
  }
}

export function saveBookingConfirmationSnapshot(snapshot: BookingConfirmationSnapshot): void {
  try {
    const map = readMap();
    map[snapshot.bookingId] = { ...snapshot, savedAt: Date.now() };
    sessionStorage.setItem(BOOKING_SNAPSHOT_MAP_KEY, JSON.stringify(map));
  } catch {
    // private mode / quota — page still works if authenticated fetch succeeds
  }
}

export function loadBookingConfirmationSnapshot(bookingId: string): BookingConfirmationSnapshot | null {
  const row = readMap()[bookingId];
  if (!row || row.v !== 1 || row.bookingId !== bookingId) return null;
  return row;
}
