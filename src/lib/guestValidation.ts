/** Shared guest contact validation — mirror rules in edge function + RPC. */

const EMAIL_RE = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export function normalizeGuestEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidGuestEmail(raw: string): boolean {
  const email = normalizeGuestEmail(raw);
  return email.length >= 5 && email.length <= 254 && EMAIL_RE.test(email);
}

export function guestEmailError(raw: string): string | null {
  if (!raw.trim()) return 'Please enter your email';
  if (!isValidGuestEmail(raw)) return 'Please enter a valid email address';
  return null;
}

/** Normalize to last 10 digits (India mobile). */
export function normalizePhoneDigits(phone: string): string {
  const d = String(phone ?? '').replace(/\D/g, '');
  return d.length >= 10 ? d.slice(-10) : d;
}
