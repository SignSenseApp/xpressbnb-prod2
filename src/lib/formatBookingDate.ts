/** Shared guest-facing date label for booking UI. */
export function formatBookingDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
