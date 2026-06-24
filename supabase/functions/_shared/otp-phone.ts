/** India mobile normalization for OTP flows. */

export function normalizeIndia10(phone: string): string | null {
  const d = phone.replace(/\D/g, '').slice(-10);
  return d.length === 10 ? d : null;
}

export function e164India(d10: string): string {
  return `+91${d10}`;
}

/** MSG91 expects country code without '+' (e.g. 919876543210). */
export function msg91Mobile(d10: string): string {
  return `91${d10}`;
}
