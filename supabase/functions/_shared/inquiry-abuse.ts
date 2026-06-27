/**
 * Server-side inquiry abuse checks — replaces Cloudflare Turnstile gate.
 * Ops review remains the primary human verification layer.
 */

export const MIN_INQUIRY_FORM_MS = 3000;
export const MAX_INQUIRY_FORM_AGE_MS = 24 * 60 * 60 * 1000;
export const IP_INQUIRIES_PER_HOUR = 5;

export type InquiryAbuseInput = {
  honeypot?: string | null;
  form_opened_at?: number | null;
  check_in?: string | null;
  check_out?: string | null;
};

export type InquiryAbuseFailure = {
  ok: false;
  status: number;
  message: string;
};

export type InquiryAbuseSuccess = { ok: true };

export function validateInquiryAbuse(
  input: InquiryAbuseInput,
  nowMs = Date.now(),
): InquiryAbuseSuccess | InquiryAbuseFailure {
  if (String(input.honeypot ?? '').trim()) {
    return {
      ok: false,
      status: 400,
      message: 'Could not submit your inquiry. Please try again.',
    };
  }

  const opened = Number(input.form_opened_at);
  if (!Number.isFinite(opened) || opened <= 0) {
    return {
      ok: false,
      status: 400,
      message: 'Could not submit your inquiry. Please try again.',
    };
  }

  const elapsed = nowMs - opened;
  if (elapsed < MIN_INQUIRY_FORM_MS) {
    return {
      ok: false,
      status: 429,
      message: 'Please take a moment to review your details, then try again.',
    };
  }

  if (elapsed > MAX_INQUIRY_FORM_AGE_MS) {
    return {
      ok: false,
      status: 400,
      message: 'This form session expired. Please refresh and try again.',
    };
  }

  const checkIn = String(input.check_in ?? '').trim();
  const checkOut = String(input.check_out ?? '').trim();
  if (checkIn && checkOut) {
    const cin = new Date(`${checkIn}T12:00:00`);
    const cout = new Date(`${checkOut}T12:00:00`);
    if (Number.isNaN(cin.getTime()) || Number.isNaN(cout.getTime()) || cout <= cin) {
      return {
        ok: false,
        status: 400,
        message: 'Please select valid check-in and check-out dates.',
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (cin < today) {
      return {
        ok: false,
        status: 400,
        message: 'Check-in cannot be in the past.',
      };
    }
  }

  return { ok: true };
}
