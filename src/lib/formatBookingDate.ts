/** Shared guest-facing date label for booking UI. */
export function formatBookingDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Calendar date key in the viewer's local timezone — never UTC.
 * IST midnight must stay the same civil day (not the previous UTC date).
 */
export function toLocalYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Add calendar days on the local date (avoids UTC / DST day shifts). */
export function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}
