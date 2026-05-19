import { supabase } from './supabase';

export type BookingOtpVerifyResult = {
  verificationToken: string;
  expiresAt: string;
  phoneDigits: string;
};

function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

type EdgeErrorBody = { error?: string };

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
    if (error.message.includes('non-2xx')) {
      return 'SMS verification is not available yet. Twilio must be configured in Supabase Edge secrets before OTP can be sent.';
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

  const payload = data as { ok?: boolean; masked_phone?: string; error?: string } | null;
  if (!payload?.ok) {
    return { ok: false, error: payload?.error || 'Could not send OTP' };
  }

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
  if (!/^\d{6}$/.test(otp.trim())) {
    return { ok: false, error: 'Enter the 6-digit code' };
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
  } | null;

  if (!payload?.ok || !payload.verification_token) {
    return { ok: false, error: payload?.error || 'Invalid or expired code' };
  }

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
