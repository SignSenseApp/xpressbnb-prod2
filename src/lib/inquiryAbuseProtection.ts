/**
 * Client-side inquiry abuse signals — honeypot, interaction timing, submit cooldown.
 * Server re-validates in submit-booking-inquiry edge function.
 */

export const INQUIRY_HONEYPOT_FIELD = 'company_website';

export const INQUIRY_MIN_INTERACTION_MS = 3000;

export const INQUIRY_SUBMIT_COOLDOWN_MS = 45_000;

const COOLDOWN_STORAGE_KEY = 'xpx_inquiry_submit_cooldown_v1';

export type InquiryAbuseClientPayload = {
  form_opened_at: number;
  company_website: string;
};

export function createInquiryFormOpenedAt(): number {
  return Date.now();
}

export function buildInquiryAbusePayload(
  formOpenedAt: number,
  honeypotValue: string,
): InquiryAbuseClientPayload {
  return {
    form_opened_at: formOpenedAt,
    company_website: honeypotValue,
  };
}

export function getInquiryInteractionMs(formOpenedAt: number, now = Date.now()): number {
  return Math.max(0, now - formOpenedAt);
}

export function isInquiryInteractionTooFast(formOpenedAt: number, now = Date.now()): boolean {
  return getInquiryInteractionMs(formOpenedAt, now) < INQUIRY_MIN_INTERACTION_MS;
}

export function getInquiryCooldownRemainingMs(now = Date.now()): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(COOLDOWN_STORAGE_KEY);
    if (!raw) return 0;
    const until = Number(raw);
    if (!Number.isFinite(until)) return 0;
    return Math.max(0, until - now);
  } catch {
    return 0;
  }
}

export function isInquirySubmitCooldownActive(now = Date.now()): boolean {
  return getInquiryCooldownRemainingMs(now) > 0;
}

export function markInquirySubmitCooldown(now = Date.now()): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(COOLDOWN_STORAGE_KEY, String(now + INQUIRY_SUBMIT_COOLDOWN_MS));
  } catch {
    /* private mode */
  }
}

export function inquiryCooldownMessage(remainingMs: number): string {
  const seconds = Math.max(1, Math.ceil(remainingMs / 1000));
  return `Please wait ${seconds} seconds before sending another inquiry.`;
}

export function inquiryTooFastMessage(): string {
  return 'Please take a moment to review your details, then try again.';
}
