/**
 * Guest-side host display safety utilities.
 *
 * Why this exists:
 *  Some hosts (especially older / migrated accounts) have entered their phone
 *  number into the `hosts.name` or `hosts.bio` fields. If we render those
 *  values raw, guests bypass the platform and contact the host directly,
 *  which kills the subscription monetization model.
 *
 *  Every guest-facing surface (HostCard on property page, BookingForm success
 *  screen, etc.) MUST pipe host text through these helpers. Host-facing
 *  surfaces (their own dashboard / settings) are fine to render raw.
 */

// Captures international and local phone formats: +91 98765 43210, 9876543210,
// 98765-43210, (987) 654-3210, 91 98765 43210, etc. Requires 7+ digits in a
// row of allowed phone characters.
const PHONE_LIKE_RE = /\+?\d[\d\s\-().]{6,}\d/g;

const NON_PHONE_CHAR_RE = /[^+\d\s\-().]/;

/**
 * True when the entire string looks like a phone number with no other content.
 */
export function isPhoneLike(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const digits = (trimmed.match(/\d/g) || []).length;
  if (digits < 7) return false;
  // If there's any non-phone character (a letter, an emoji), it's not pure phone.
  return !NON_PHONE_CHAR_RE.test(trimmed);
}

/**
 * Removes any phone-number-shaped substrings from a longer text. Useful for
 * bios where a host might have written "Hi I am Raj, contact me at 9876543210".
 */
export function stripPhoneLike(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(PHONE_LIKE_RE, '').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Returns a guest-safe display name for a host.
 *  1. Pure phone in name field      -> fallback ("Verified Host")
 *  2. Phone embedded in name        -> strip the phone, keep the rest
 *  3. Empty after cleaning          -> fallback
 */
export function safeHostDisplayName(
  name: string | null | undefined,
  fallback = 'Verified Host',
): string {
  if (!name) return fallback;
  const trimmed = name.trim();
  if (!trimmed) return fallback;
  if (isPhoneLike(trimmed)) return fallback;
  const cleaned = stripPhoneLike(trimmed);
  if (!cleaned || cleaned.length < 2) return fallback;
  return cleaned;
}

/**
 * Initial letter for the avatar bubble. Uses safeHostDisplayName so a phone
 * number in the name field doesn't render as a digit avatar.
 */
export function safeHostInitial(name: string | null | undefined, fallback = 'H'): string {
  const safe = safeHostDisplayName(name, '');
  if (!safe) return fallback;
  const first = safe.charAt(0).toUpperCase();
  return /[A-Z]/.test(first) ? first : fallback;
}
