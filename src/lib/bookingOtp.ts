import { supabase } from './supabase';

/** Booking inquiry OTP is always 4 digits (MSG91 / Twilio). */
export const BOOKING_OTP_CODE_LENGTH = 4;

const BOOKING_OTP_PATTERN = /^\d{4}$/;

export function sanitizeBookingOtpInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, BOOKING_OTP_CODE_LENGTH);
}

export function isValidBookingOtpCode(otp: string): boolean {
  return BOOKING_OTP_PATTERN.test(otp.trim());
}

export type BookingOtpVerifyResult = {
  verificationToken: string;
  expiresAt: string;
  phoneDigits: string;
};

function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

type EdgeErrorBody = { error?: string };

type OtpEdgeMeta = {
  provider?: string;
  latency_ms?: number;
};

function logOtpTiming(
  phase: 'send' | 'verify',
  meta: OtpEdgeMeta | undefined,
  ok: boolean,
): void {
  if (!meta?.latency_ms && !meta?.provider) return;
  if (import.meta.env.DEV) {
    console.info(`[otp_${phase}]`, { ok, provider: meta.provider, latency_ms: meta.latency_ms });
  }
}

/** Supabase client often hides the JSON body behind a generic non-2xx error. */
async function messageFromEdgeInvoke(
  error: unknown,
  data: unknown,
  fallback: string,
): Promise<string> {
  const fromData = (data as EdgeErrorBody | null)?.error;
  if (fromData) return fromData;

  if (error && typeof error === 'object' && 'context' in error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = (await ctx.json()) as EdgeErrorBody;
        if (body?.error) return body.error;
      } catch {
        // ignore parse errors
      }
    }
  }

  if (error instanceof Error) {
    if (error.message.toLowerCase().includes('failed to send a request')) {
      return 'Could not reach the OTP service. Check your internet connection and try again.';
    }
    if (error.message.includes('non-2xx')) {
      return 'Failed to send verification SMS. Please try again in a moment.';
    }
    return error.message;
  }

  return fallback;
}

/** Invoke send-booking-otp edge function. Never returns the OTP code. */
export async function sendBookingInquiryOtp(phone: string): Promise<{
  ok: boolean;
  maskedPhone?: string;
  error?: string;
}> {
  const digits = normalizePhoneDigits(phone);
  if (digits.length !== 10) {
    return { ok: false, error: 'Enter a valid 10-digit mobile number' };
  }

  const { data, error } = await supabase.functions.invoke('send-booking-otp', {
    body: { phone: digits, purpose: 'booking_inquiry' },
  });

  if (error) {
    return {
      ok: false,
      error: await messageFromEdgeInvoke(error, data, 'Could not send OTP'),
    };
  }

  const payload = data as {
    ok?: boolean;
    masked_phone?: string;
    error?: string;
    provider?: string;
    latency_ms?: number;
  } | null;
  if (!payload?.ok) {
    return { ok: false, error: payload?.error || 'Could not send OTP' };
  }

  logOtpTiming('send', payload, true);
  return { ok: true, maskedPhone: payload.masked_phone };
}

/** Invoke verify-booking-otp; returns a single-use token for create_pending_booking RPCs. */
export async function verifyBookingInquiryOtp(
  phone: string,
  otp: string,
): Promise<{ ok: true; result: BookingOtpVerifyResult } | { ok: false; error: string }> {
  const digits = normalizePhoneDigits(phone);
  if (digits.length !== 10) {
    return { ok: false, error: 'Enter a valid 10-digit mobile number' };
  }
  if (!isValidBookingOtpCode(otp)) {
    return { ok: false, error: `Enter the ${BOOKING_OTP_CODE_LENGTH}-digit code` };
  }

  const { data, error } = await supabase.functions.invoke('verify-booking-otp', {
    body: { phone: digits, otp: otp.trim() },
  });

  if (error) {
    return {
      ok: false,
      error: await messageFromEdgeInvoke(error, data, 'Verification failed'),
    };
  }

  const payload = data as {
    ok?: boolean;
    verification_token?: string;
    expires_at?: string;
    error?: string;
    provider?: string;
    latency_ms?: number;
  } | null;

  if (!payload?.ok || !payload.verification_token) {
    return { ok: false, error: payload?.error || 'Invalid or expired code' };
  }

  logOtpTiming('verify', payload, true);
  return {
    ok: true,
    result: {
      verificationToken: payload.verification_token,
      expiresAt: payload.expires_at ?? '',
      phoneDigits: digits,
    },
  };
}

export { normalizePhoneDigits };
