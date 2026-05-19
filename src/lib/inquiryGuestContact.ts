/** Host-side helpers for verified guest phone on inquiry bookings. */

function normalizeGuestPhoneDigits(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length >= 10) return d.slice(-10);
  return d;
}

export function formatGuestPhoneDisplay(raw: string): string {
  const d = normalizeGuestPhoneDigits(raw);
  if (d.length !== 10) return raw;
  return `${d.slice(0, 5)} ${d.slice(5)}`;
}

export function guestPhoneToE164(raw: string): string {
  const d = normalizeGuestPhoneDigits(raw);
  return d.startsWith('91') && d.length > 10 ? `+${d}` : `+91${d}`;
}

export function buildGuestDirectWhatsAppLink(
  guestPhoneDigits: string,
  propertyTitle: string,
  guestFirstName?: string,
): string {
  const greet = guestFirstName ? `Hi ${guestFirstName}` : 'Hi';
  const message = `${greet}, regarding your inquiry for "${propertyTitle}" on XpressBnB —`;
  const cleaned = normalizeGuestPhoneDigits(guestPhoneDigits);
  const wa = cleaned.length > 10 ? cleaned : `91${cleaned}`;
  return `https://wa.me/${wa}?text=${encodeURIComponent(message)}`;
}
