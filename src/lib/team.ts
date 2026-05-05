/**
 * Centralized routing line for all guest-host contact on the platform.
 *
 * BUSINESS RULE — read this before changing anything in this file:
 *
 *  Every "Call host" / "Message host" / booking confirmation contact on the
 *  guest-facing surfaces resolves to ONE number defined here. That number is
 *  the founder / concierge line. The guest is shown this number as if it
 *  were the host's direct contact (psychological trust). In reality the boss
 *  receives the call, contacts the actual host privately, and brokers the
 *  conversation. This is what protects the host-subscription model.
 *
 *  DO NOT label this number as "team" / "founder" / "concierge" on the
 *  property page or the booking success screen — it must read as the host's
 *  contact in those contexts. The "team" framing is only used in footer /
 *  /contact / host dashboard support page.
 *
 * To go live: replace TEAM_PHONE_E164 with the actual phone (digits only,
 * with country code, no spaces). The display version is auto-derived but
 * you can override TEAM_PHONE_DISPLAY for nicer formatting.
 */

// E.164 format, digits only with leading +. Used for tel: and wa.me deep links.
export const TEAM_PHONE_E164 = '+917078605755';

// Human-friendly version that gets rendered in the UI as the "host's contact".
export const TEAM_PHONE_DISPLAY = '+91 70786 05755';

// Where automated emails should land (booking confirmations, offer alerts).
export const TEAM_EMAIL = 'support@xpressbnb.com';

// ONLY used in footer / contact / host dashboard support page copy.
// NEVER use this string near the host card on the property page.
export const TEAM_BRAND_NAME = 'XpressBnB Concierge';
export const TEAM_HOURS = '9 AM to 11 PM IST';

/** Build a wa.me deep link to the team line with arbitrary prefilled copy (B2B, support, etc.). */
export function buildTeamWhatsAppLink(prefilledBody: string): string {
  const cleaned = TEAM_PHONE_E164.replace(/[^\d]/g, '');
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(prefilledBody)}`;
}

/** Build a wa.me deep link with a pre-filled, host-context message. */
export function buildHostWhatsAppLink(propertyTitle: string, hostFirstName?: string): string {
  const greet = hostFirstName ? `Hi ${hostFirstName}` : 'Hi';
  const message = `${greet}, I am interested in your property "${propertyTitle}" on XpressBnB. Is it available for the dates I have in mind?`;
  const cleaned = TEAM_PHONE_E164.replace(/[^\d]/g, '');
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

/** Build a tel: link for the team phone (rendered as host contact). */
export function buildHostCallLink(): string {
  return `tel:${TEAM_PHONE_E164}`;
}
