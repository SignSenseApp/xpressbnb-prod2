/** Shared booking-inquiry OTP constants (provider-agnostic). */

export const PURPOSE_BOOKING = 'booking_inquiry';

export const BOOKING_OTP_CODE_LENGTH = 4;
export const BOOKING_OTP_PATTERN = /^\d{4}$/;

export const OTP_SEND_WINDOW_MS = 60 * 60 * 1000;
export const MAX_OTP_SENDS_PER_PHONE = 3;
export const MAX_OTP_SENDS_PER_IP = 20;
export const OTP_TTL_MIN = 10;
export const VERIFY_TOKEN_TTL_MIN = 15;
export const MAX_OTP_ATTEMPTS = 8;

/** Provider-managed OTP sessions (MSG91, Twilio Verify). */
export const EXTERNAL_OTP_MARKER = 'external_otp';

/** Legacy marker from pre-migration Twilio Verify rows — still rejected by local hash path. */
export const LEGACY_TWILIO_VERIFY_MARKER = 'twilio_verify';

export function isExternalOtpMarker(codeHash: string): boolean {
  const h = String(codeHash ?? '');
  return h === EXTERNAL_OTP_MARKER || h === LEGACY_TWILIO_VERIFY_MARKER;
}

export type OtpProviderName = 'msg91' | 'twilio';

export function resolveOtpProvider(): OtpProviderName {
  const flag = Deno.env.get('OTP_PROVIDER')?.trim().toLowerCase();
  if (flag === 'msg91') return 'msg91';
  if (flag === 'twilio') return 'twilio';
  // Safe default: preserve existing production behavior until OTP_PROVIDER=msg91 is set.
  return 'twilio';
}
